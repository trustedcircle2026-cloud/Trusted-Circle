var TC_MAX_ORDER_VALUE=2000;
var TC_PAYMENT_LINK_TTL_MS=3*60*60*1000;
var OrderService={
 placeOrder:function(data){
  var user=authenticate_(data.token),paymentMethod=String(data.paymentMethod||'upiapps').toLowerCase(),lock=LockService.getScriptLock();
  lock.waitLock(10000);
  try{
   var cartRows=getRows_(TC_CONFIG.SHEETS.CART).filter(function(r){return String(r.UserID)===String(user.UserID)&&Number(r.Quantity||0)>0;});
   require_(cartRows.length>0,'Your cart is empty.');
   var items=[],subtotal=0,cashback=0;
   cartRows.forEach(function(cart){
    var product=findOne_(TC_CONFIG.SHEETS.PRODUCTS,'ProductID',cart.ProductID);
    require_(product&&String(product.Active).toUpperCase()!=='FALSE','A cart item is no longer available.');
    require_(String(product.InventoryStatus||'AVAILABLE').toUpperCase()!=='OUT_OF_STOCK','A cart item is out of stock.');
    var qty=Number(cart.Quantity||0),face=Number(cart.Denomination||1000);
    normalizeDenomination_(face,1000);
    var rate=Number(product.DiscountPercent||0),line=face*qty;
    subtotal+=line;
    cashback+=Math.max(0,Math.round(face*rate)/100*qty);
    items.push({product:product,quantity:qty,faceValue:face,total:line});
   });
   subtotal=Math.round(subtotal*100)/100;
   cashback=Math.round(cashback*100)/100;
   require_(subtotal<=TC_MAX_ORDER_VALUE,'Maximum order value is ₹2,000. Please remove some items from your cart.');
   var stock=null;
   if(paymentMethod==='link'){
    stock=reservePaymentLinkForAmount_(subtotal);
    if(!stock){
      require_(false,'Payment link stock is not available for this order value.');
    }
   }
   var total=subtotal,now=isoNow(),orderId=newId_('TCORD'),orderNumber='TC-'+Utilities.formatDate(new Date(),TC_CONFIG.TIMEZONE,'yyyyMMdd')+'-'+Utilities.getUuid().replace(/-/g,'').substring(0,8).toUpperCase();
   appendRowObject_(TC_CONFIG.SHEETS.ORDERS,{OrderID:orderId,UserID:user.UserID,OrderNumber:orderNumber,Status:'PENDING_PAYMENT',Subtotal:subtotal,Discount:cashback,Total:total,Currency:'INR',CreatedAt:now,UpdatedAt:now});
   items.forEach(function(item){appendRowObject_(TC_CONFIG.SHEETS.ORDER_ITEMS,{OrderItemID:newId_('TCORI'),OrderID:orderId,ProductID:item.product.ProductID,Quantity:item.quantity,FaceValue:item.faceValue,UnitPrice:item.faceValue,Denomination:item.faceValue,Total:item.total});});
   cartRows.forEach(function(cart){updateRowById_(TC_CONFIG.SHEETS.CART,'CartID',cart.CartID,{Quantity:0,UpdatedAt:now});});
   appendRowObject_(TC_CONFIG.SHEETS.NOTIFICATIONS,{NotificationID:newId_('TCNOT'),UserID:user.UserID,Type:'ORDER',Title:'Order received',Message:'Your order '+orderNumber+' is ready for payment.',ReadAt:'',CreatedAt:now});
   if(paymentMethod==='link'){
    var plId=newId_('TCPL'),expiresAt=new Date(Date.now()+TC_PAYMENT_LINK_TTL_MS).toISOString();
    appendRowObject_(TC_CONFIG.SHEETS.PAYMENT_LINKS,{PaymentLinkID:plId,OrderID:orderId,Link:stock.Link,Label:stock.Label||'Pay securely',Status:'ACTIVE',PaymentLinkStockID:stock.PaymentLinkStockID,ProviderLinkID:stock.ProviderLinkID||'',CreatedAt:now,UpdatedAt:now});
    updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',stock.PaymentLinkStockID,{Status:'RESERVED',OrderID:orderId,PaymentLinkID:plId,ReservedAt:now,ExpiresAt:expiresAt,UpdatedAt:now});
    var payments=getRows_(TC_CONFIG.SHEETS.PAYMENTS).filter(function(r){return String(r.OrderID)===orderId;});
    if(!payments.length)appendRowObject_(TC_CONFIG.SHEETS.PAYMENTS,{PaymentID:newId_('TCPAY'),OrderID:orderId,Provider:'PAYMENT_LINK',ProviderOrderID:orderNumber,ProviderPaymentID:'',Amount:subtotal,Currency:'INR',Status:'PENDING',VerifiedAt:'',CreatedAt:now,UpdatedAt:now});
    var createdOrder=getOrder_(user.UserID,orderId);
    if(typeof sendAdminOrderActionEmailOnce_==='function')sendAdminOrderActionEmailOnce_(createdOrder.order,user,stock.Link,stock.Label||'Pay securely');
    return createdOrder;
   }
   return getOrder_(user.UserID,orderId);
  }finally{lock.releaseLock();}
 },
 listOrders:function(data){
  var user=authenticate_(data.token);
  expirePaymentLinkReservations_();
  var rows=getRows_(TC_CONFIG.SHEETS.ORDERS).filter(function(r){return String(r.UserID)===String(user.UserID);});
  rows.sort(function(a,b){return new Date(b.CreatedAt).getTime()-new Date(a.CreatedAt).getTime();});
  var limit=Math.min(50,Math.max(1,Number(data.limit||4)));
  var offset=Math.max(0,Number(data.offset||0));
  return{items:rows.slice(offset,offset+limit).map(function(order){
   var payments=getRows_(TC_CONFIG.SHEETS.PAYMENTS).filter(function(r){return String(r.OrderID)===String(order.OrderID);}),payment=payments.length?payments[payments.length-1]:null;
   return Object.assign({},order,{PaymentStatus:payment?String(payment.Status||'PENDING').toUpperCase():'PENDING'});
  }),totalCount:rows.length,offset:offset,limit:limit,hasMore:offset+limit<rows.length};
 },
 getOrderDetails:function(data){
  var user=authenticate_(data.token),orderId=cleanText_(data.orderId,100);
  require_(orderId,'Order ID is required.');
  return getOrder_(user.UserID,orderId);
 },
 cancelOrder:function(data){
  var user=authenticate_(data.token),orderId=cleanText_(data.orderId,100),order=findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderID',orderId);
  require_(order&&String(order.UserID)===String(user.UserID),'Order not found.');
  require_(String(order.Status||'').toUpperCase()==='PENDING_PAYMENT','This order can no longer be cancelled.');
  var payments=getRows_(TC_CONFIG.SHEETS.PAYMENTS).filter(function(r){return String(r.OrderID)===orderId&&['PAID','VERIFIED','SUCCESS','CAPTURED'].indexOf(String(r.Status||'').toUpperCase())>=0;});
  require_(payments.length===0,'A paid order cannot be cancelled here.');
  var now=isoNow();
  updateRowById_(TC_CONFIG.SHEETS.ORDERS,'OrderID',orderId,{Status:'CANCELLED',UpdatedAt:now});
  try{getRows_(TC_CONFIG.SHEETS.PAYMENT_LINKS).filter(function(r){return String(r.OrderID)===orderId;}).forEach(function(l){if(l.PaymentLinkStockID)updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',l.PaymentLinkStockID,{Status:'AVAILABLE',OrderID:'',PaymentLinkID:'',ReservedAt:'',ExpiresAt:'',UpdatedAt:now});});}catch(ignore){}
  return{order:getOrder_(user.UserID,orderId).order};
 }
};
function ensurePaymentLinkStockSheet_(){
 var headers=['PaymentLinkStockID','Denomination','Link','Label','Status','OrderID','PaymentLinkID','ProviderLinkID','ReservedAt','ExpiresAt','CreatedAt','UpdatedAt'];
 var sheet=ensureSheet_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,headers);
 ensureColumns_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,headers);
 return sheet;
}
function reservePaymentLinkForAmount_(amount){
 ensurePaymentLinkStockSheet_();
 expirePaymentLinkReservations_();
 var rows=getRows_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK).filter(function(r){return Number(r.Denomination||0)===Number(amount)&&String(r.Status||'AVAILABLE').toUpperCase()==='AVAILABLE';});
 return rows.length?rows[0]:null;
}
function expirePaymentLinkReservations_(){
 ensurePaymentLinkStockSheet_();
 var now=Date.now(),rows=getRows_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK);
 rows.forEach(function(stock){
  if(String(stock.Status||'').toUpperCase()!=='RESERVED')return;
  var expires=new Date(stock.ExpiresAt||0).getTime();
  if(!expires||expires>now)return;
  var orderId=String(stock.OrderID||''),paymentLinkId=String(stock.PaymentLinkID||''),updated=isoNow();
  updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',stock.PaymentLinkStockID,{Status:'AVAILABLE',OrderID:'',PaymentLinkID:'',ReservedAt:'',ExpiresAt:'',UpdatedAt:updated});
  if(paymentLinkId){try{updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINKS,'PaymentLinkID',paymentLinkId,{Status:'EXPIRED',UpdatedAt:updated});}catch(ignore){}}
  if(orderId){try{var order=findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderID',orderId);if(order&&String(order.Status||'').toUpperCase()==='PENDING_PAYMENT')updateRowById_(TC_CONFIG.SHEETS.ORDERS,'OrderID',orderId,{UpdatedAt:updated});}catch(ignore2){}}
  });
}
function ensurePaymentLinkExpiryTrigger_(){
 var triggers=ScriptApp.getProjectTriggers();
 var exists=triggers.some(function(t){return t.getHandlerFunction()==='expirePaymentLinkReservations_';});
 if(!exists)ScriptApp.newTrigger('expirePaymentLinkReservations_').timeBased().everyHours(1).create();
}
function getOrder_(userId,orderId){
 var order=findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderID',orderId);
 require_(order&&String(order.UserID)===String(userId),'Order not found.');
 var items=getRows_(TC_CONFIG.SHEETS.ORDER_ITEMS).filter(function(r){return String(r.OrderID)===String(orderId);}),payments=getRows_(TC_CONFIG.SHEETS.PAYMENTS).filter(function(r){return String(r.OrderID)===String(orderId);}),links=[];
 try{links=getRows_(TC_CONFIG.SHEETS.PAYMENT_LINKS).filter(function(r){var status=String(r.Status||'ACTIVE').toUpperCase();return String(r.OrderID)===String(orderId)&&['DISABLED','EXPIRED','RELEASED','CANCELLED'].indexOf(status)<0;});}catch(ignore){}
 return{order:order,items:items,payment:payments.length?payments[payments.length-1]:null,paymentLink:links.length?links[links.length-1]:null};
}

/**
 * Verifies the Paytm link assigned to an authenticated shopper's order and,
 * only on a positive Paytm success marker, runs the existing paid-order updates.
 */
function verifyOrderPaymentLink_(data){
 var user=authenticate_(data.token),orderId=cleanText_(data.orderId,100);
 var order=findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderID',orderId);
 require_(order&&String(order.UserID)===String(user.UserID),'Order not found.');
 return verifyAndApplyPaytmStatusForOrder_(orderId,'SHOPPER_STATUS_CHECK');
}
function verifyAndApplyPaytmStatusForOrder_(orderId,source){
 var order=findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderID',orderId);
 if(!order)return{status:'UNKNOWN',message:'Order not found.'};
 var current=String(order.Status||'').toUpperCase();
 if(['PAID','PROCESSING','DELIVERED'].indexOf(current)>=0)return{status:'PAID',orderStatus:current,orderNumber:order.OrderNumber,message:'Order is already marked paid.'};
 if(current!=='PENDING_PAYMENT')return{status:'PENDING',orderStatus:current,orderNumber:order.OrderNumber,message:'Order is not awaiting payment.'};
 var payments=getRows_(TC_CONFIG.SHEETS.PAYMENTS).filter(function(p){return String(p.OrderID)===String(orderId);});
 var payment=payments.length?payments[payments.length-1]:null;
 if(payment&&String(payment.Status||'').toUpperCase()==='PAYTM_STATUS_REJECTED'){
  return{status:'PENDING',orderStatus:current,orderNumber:order.OrderNumber,message:'Automatic Paytm status was rejected by admin; manual review is required.'};
 }
 var links=getRows_(TC_CONFIG.SHEETS.PAYMENT_LINKS).filter(function(r){return String(r.OrderID)===String(orderId)&&['ACTIVE','USED'].indexOf(String(r.Status||'').toUpperCase())>=0;});
 var link=links.length?links[links.length-1]:null;
 if(!link||!link.Link)return{status:'UNKNOWN',message:'No active Paytm payment link is assigned to this order.'};
 var result=verifyPaytmLinkStatus_({paymentLink:link.Link});
 var linkStatus=String(result&&result.status||'UNKNOWN').toUpperCase();
 if(linkStatus!=='PAID')return{status:linkStatus==='PENDING'?'PENDING':'UNKNOWN',orderStatus:current,orderNumber:order.OrderNumber,message:result&&result.message||'Paytm status could not be confirmed.'};
 var lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  var fresh=findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderID',orderId);
  if(!fresh)return{status:'UNKNOWN',message:'Order not found.'};
  var freshStatus=String(fresh.Status||'').toUpperCase();
  if(['PAID','PROCESSING','DELIVERED'].indexOf(freshStatus)>=0)return{status:'PAID',orderStatus:freshStatus,orderNumber:fresh.OrderNumber,message:'Order is already marked paid.'};
  if(freshStatus!=='PENDING_PAYMENT')return{status:'PENDING',orderStatus:freshStatus,orderNumber:fresh.OrderNumber,message:'Order is no longer awaiting payment.'};
  var freshPayments=getRows_(TC_CONFIG.SHEETS.PAYMENTS).filter(function(p){return String(p.OrderID)===String(orderId);});
  var freshPayment=freshPayments.length?freshPayments[freshPayments.length-1]:null;
  if(!freshPayment)return{status:'UNKNOWN',message:'Payment record is missing; order was not updated.'};
  if(String(freshPayment.Status||'').toUpperCase()==='PAYTM_STATUS_REJECTED')return{status:'PENDING',orderStatus:freshStatus,orderNumber:fresh.OrderNumber,message:'Automatic Paytm status was rejected by admin; manual review is required.'};
  if(String(freshPayment.Status||'').toUpperCase()==='PAYTM_PAID_DETECTED')return{status:'PAID',orderStatus:freshStatus,orderNumber:fresh.OrderNumber,message:'Paytm link is detected as paid; waiting for admin confirmation.'};
  if(Math.abs(Number(freshPayment.Amount||0)-Number(fresh.Total||0))>=0.01)return{status:'UNKNOWN',message:'Payment amount does not match the order; order was not updated.'};
  var now=isoNow_();
  if(String(freshPayment.Status||'').toUpperCase()!=='PAYTM_PAID_DETECTED'){
   updateRowById_(TC_CONFIG.SHEETS.PAYMENTS,'PaymentID',freshPayment.PaymentID,{Provider:'PAYTM_LINK_STATUS',ProviderPaymentID:link.ProviderLinkID||link.PaymentLinkID||'',Status:'PAYTM_PAID_DETECTED',VerifiedAt:'',UpdatedAt:now});
  }
  if(typeof sendAdminPaytmStatusChangedEmailOnce_==='function'){
   try{sendAdminPaytmStatusChangedEmailOnce_(fresh,link.Link,link.Label||'Pay securely',Number(fresh.Total||0));}
   catch(emailError){console.error('Could not send Paytm status-change action email: '+String(emailError&&emailError.message||emailError));}
  }
  if(typeof appendAudit_==='function')appendAudit_(source==='SCHEDULED_PAYTM_STATUS'?'SYSTEM':fresh.UserID,'PAYTM_LINK_PAID_DETECTED_AWAITING_ADMIN','Order',orderId,{source:source||'AUTO',amount:Number(fresh.Total||0)});
  return{status:'PAID',orderStatus:'PENDING_PAYMENT',orderNumber:fresh.OrderNumber,message:'Paytm link appears paid. An admin confirmation email has been sent; the order will be marked paid after Confirm is selected.'};
 }finally{lock.releaseLock();}
}
/** Runs every minute while admin payment-action emails are in use. */
function ensurePaytmPaymentStatusTrigger_(){
 var triggers=ScriptApp.getProjectTriggers();
 var exists=triggers.some(function(t){return t.getHandlerFunction()==='processPendingPaytmPaymentStatuses_';});
 if(!exists)ScriptApp.newTrigger('processPendingPaytmPaymentStatuses_').timeBased().everyMinutes(1).create();
}
function processPendingPaytmPaymentStatuses_(){
 // Do not hold the script lock around UrlFetchApp calls; each successful
 // payment update obtains its own lock inside verifyAndApplyPaytmStatusForOrder_.
 var orders=getRows_(TC_CONFIG.SHEETS.ORDERS).filter(function(o){return String(o.Status||'').toUpperCase()==='PENDING_PAYMENT';});
 orders.sort(function(a,b){return new Date(a.CreatedAt||0).getTime()-new Date(b.CreatedAt||0).getTime();});
 orders.slice(0,10).forEach(function(order){
  try{verifyAndApplyPaytmStatusForOrder_(order.OrderID,'SCHEDULED_PAYTM_STATUS');}
  catch(err){console.error('Paytm status check failed for '+order.OrderID+': '+String(err&&err.message||err));}
 });
}

function requestPaymentLink_(data){
 var user=authenticate_(data.token),orderId=cleanText_(data.orderId,100),lock=LockService.getScriptLock();
 lock.waitLock(10000);
 try{
  var order=findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderID',orderId);
  require_(order&&String(order.UserID)===String(user.UserID),'Order not found.');
  require_(String(order.Status).toUpperCase()==='PENDING_PAYMENT','Payment link can only be used for a pending-payment order.');
  ensurePaymentLinkStockSheet_();
  expirePaymentLinkReservations_();
  var existing=getRows_(TC_CONFIG.SHEETS.PAYMENT_LINKS).filter(function(r){return String(r.OrderID)===orderId&&String(r.Status||'ACTIVE').toUpperCase()==='ACTIVE';});
  if(existing.length){
   var existingLink=existing[existing.length-1],
       existingStock=existingLink.PaymentLinkStockID?findOne_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',existingLink.PaymentLinkStockID):null;
   if(existingStock&&String(existingStock.Status||'').toUpperCase()==='RESERVED'&&new Date(existingStock.ExpiresAt||0).getTime()>Date.now()){
    if(typeof sendAdminOrderActionEmailOnce_==='function')sendAdminOrderActionEmailOnce_(order,user,existingLink.Link,existingLink.Label||'Pay securely');
    return{paymentLink:existingLink,expiresAt:existingStock.ExpiresAt,order:getOrder_(user.UserID,orderId)};
   }
  }
  var stock=reservePaymentLinkForAmount_(Number(order.Total||0));
  require_(stock,'Payment link stock is not available for this order value.');
  var now=isoNow(),expiresAt=new Date(Date.now()+TC_PAYMENT_LINK_TTL_MS).toISOString(),plId=newId_('TCPL');
  appendRowObject_(TC_CONFIG.SHEETS.PAYMENT_LINKS,{PaymentLinkID:plId,OrderID:orderId,Link:stock.Link,Label:stock.Label||'Pay securely',Status:'ACTIVE',PaymentLinkStockID:stock.PaymentLinkStockID,ProviderLinkID:stock.ProviderLinkID||'',CreatedAt:now,UpdatedAt:now});
  updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',stock.PaymentLinkStockID,{Status:'RESERVED',OrderID:orderId,PaymentLinkID:plId,ReservedAt:now,ExpiresAt:expiresAt,UpdatedAt:now});
  var payments=getRows_(TC_CONFIG.SHEETS.PAYMENTS).filter(function(r){return String(r.OrderID)===orderId;});
  if(!payments.length)appendRowObject_(TC_CONFIG.SHEETS.PAYMENTS,{PaymentID:newId_('TCPAY'),OrderID:orderId,Provider:'PAYMENT_LINK',ProviderOrderID:order.OrderNumber,ProviderPaymentID:'',Amount:Number(order.Total||0),Currency:'INR',Status:'PENDING',VerifiedAt:'',CreatedAt:now,UpdatedAt:now});
  if(typeof sendAdminOrderActionEmailOnce_==='function')sendAdminOrderActionEmailOnce_(order,user,stock.Link,stock.Label||'Pay securely');
  return{paymentLink:findOne_(TC_CONFIG.SHEETS.PAYMENT_LINKS,'PaymentLinkID',plId),expiresAt:expiresAt,order:getOrder_(user.UserID,orderId)};
 }
 finally{lock.releaseLock();}
}
function markPaymentLinkStockUsedForOrder_(orderId,now){
 ensurePaymentLinkStockSheet_();
 var rows=getRows_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK).filter(function(r){return String(r.OrderID)===String(orderId)&&String(r.Status||'').toUpperCase()==='RESERVED';});
 rows.forEach(function(r){updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',r.PaymentLinkStockID,{Status:'USED',ReservedAt:'',ExpiresAt:'',UpdatedAt:now});});
 rows.forEach(function(stock){try{var denomination=Number(stock.Denomination||0);if(typeof maybeAlertPaymentLinkStockLow_==='function')maybeAlertPaymentLinkStockLow_(denomination,{requestedAmount:denomination,orderId:orderId});}catch(alertIgnore){}});
 try{getRows_(TC_CONFIG.SHEETS.PAYMENT_LINKS).filter(function(r){return String(r.OrderID)===String(orderId)&&String(r.Status||'').toUpperCase()==='ACTIVE';}).forEach(function(r){updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINKS,'PaymentLinkID',r.PaymentLinkID,{Status:'USED',UpdatedAt:now});});}catch(ignore){}
}