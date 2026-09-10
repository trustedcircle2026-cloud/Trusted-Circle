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
    require_(stock,'Payment link stock is not available for this order value.');
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
    appendRowObject_(TC_CONFIG.SHEETS.PAYMENTS,{PaymentID:newId_('TCPAY'),OrderID:orderId,Provider:'PAYMENT_LINK',ProviderOrderID:orderNumber,ProviderPaymentID:'',Amount:subtotal,Currency:'INR',Status:'PENDING',VerifiedAt:'',CreatedAt:now,UpdatedAt:now});
    enqueuePaymentLinkEmail_(getOrder_(user.UserID,orderId).order,user,stock.Link,stock.Label||'Pay securely');
    return getOrder_(user.UserID,orderId);
   }
   return getOrder_(user.UserID,orderId);
  }finally{lock.releaseLock();}
 },
 listOrders:function(data){
  var user=authenticate_(data.token);
  expirePaymentLinkReservations_();
  var rows=getRows_(TC_CONFIG.SHEETS.ORDERS).filter(function(r){return String(r.UserID)===String(user.UserID);});
  rows.sort(function(a,b){return new Date(b.CreatedAt).getTime()-new Date(a.CreatedAt).getTime();});
  return{items:rows.slice(0,50).map(function(order){
   var items=getRows_(TC_CONFIG.SHEETS.ORDER_ITEMS).filter(function(r){return String(r.OrderID)===String(order.OrderID);}),payments=getRows_(TC_CONFIG.SHEETS.PAYMENTS).filter(function(r){return String(r.OrderID)===String(order.OrderID);}),links=[];
   try{links=getRows_(TC_CONFIG.SHEETS.PAYMENT_LINKS).filter(function(r){return String(r.OrderID)===String(order.OrderID)&&String(r.Status||'ACTIVE').toUpperCase()!=='DISABLED'&&String(r.Status||'ACTIVE').toUpperCase()!=='EXPIRED';});}catch(ignore){}
   var payment=payments.length?payments[payments.length-1]:null;
   return Object.assign({},order,{Items:items,Payment:payment,PaymentStatus:payment?String(payment.Status||'PENDING').toUpperCase():'PENDING',PaymentLink:links.length?links[links.length-1]:null});
  })};
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
 try{links=getRows_(TC_CONFIG.SHEETS.PAYMENT_LINKS).filter(function(r){return String(r.OrderID)===String(orderId)&&String(r.Status||'ACTIVE').toUpperCase()!=='DISABLED'&&String(r.Status||'ACTIVE').toUpperCase()!=='EXPIRED';});}catch(ignore){}
 return{order:order,items:items,payment:payments.length?payments[payments.length-1]:null,paymentLink:links.length?links[links.length-1]:null};
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
   var existingLink=existing[existing.length-1],existingStock=existingLink.PaymentLinkStockID?findOne_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',existingLink.PaymentLinkStockID):null;
   if(existingStock&&String(existingStock.Status||'').toUpperCase()==='RESERVED'&&new Date(existingStock.ExpiresAt||0).getTime()>Date.now())return{paymentLink:existingLink,expiresAt:existingStock.ExpiresAt,order:getOrder_(user.UserID,orderId)};
  }
  var stock=reservePaymentLinkForAmount_(Number(order.Total||0));
  require_(stock,'Payment link stock is not available for this order value.');
  var now=isoNow(),expiresAt=new Date(Date.now()+TC_PAYMENT_LINK_TTL_MS).toISOString(),plId=newId_('TCPL');
  appendRowObject_(TC_CONFIG.SHEETS.PAYMENT_LINKS,{PaymentLinkID:plId,OrderID:orderId,Link:stock.Link,Label:stock.Label||'Pay securely',Status:'ACTIVE',PaymentLinkStockID:stock.PaymentLinkStockID,ProviderLinkID:stock.ProviderLinkID||'',CreatedAt:now,UpdatedAt:now});
  updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',stock.PaymentLinkStockID,{Status:'RESERVED',OrderID:orderId,PaymentLinkID:plId,ReservedAt:now,ExpiresAt:expiresAt,UpdatedAt:now});
  var payments=getRows_(TC_CONFIG.SHEETS.PAYMENTS).filter(function(r){return String(r.OrderID)===orderId;});
  if(!payments.length)appendRowObject_(TC_CONFIG.SHEETS.PAYMENTS,{PaymentID:newId_('TCPAY'),OrderID:orderId,Provider:'PAYMENT_LINK',ProviderOrderID:order.OrderNumber,ProviderPaymentID:'',Amount:Number(order.Total||0),Currency:'INR',Status:'PENDING',VerifiedAt:'',CreatedAt:now,UpdatedAt:now});
  enqueuePaymentLinkEmail_(order,user,stock.Link,stock.Label||'Pay securely');
  return{paymentLink:findOne_(TC_CONFIG.SHEETS.PAYMENT_LINKS,'PaymentLinkID',plId),expiresAt:expiresAt,order:getOrder_(user.UserID,orderId)};
 }finally{lock.releaseLock();}
}
function markPaymentLinkStockUsedForOrder_(orderId,now){
 ensurePaymentLinkStockSheet_();
 var rows=getRows_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK).filter(function(r){return String(r.OrderID)===String(orderId)&&String(r.Status||'').toUpperCase()==='RESERVED';});
 rows.forEach(function(r){updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',r.PaymentLinkStockID,{Status:'USED',ReservedAt:'',ExpiresAt:'',UpdatedAt:now});});
 try{getRows_(TC_CONFIG.SHEETS.PAYMENT_LINKS).filter(function(r){return String(r.OrderID)===String(orderId)&&String(r.Status||'').toUpperCase()==='ACTIVE';}).forEach(function(r){updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINKS,'PaymentLinkID',r.PaymentLinkID,{Status:'USED',UpdatedAt:now});});}catch(ignore){}
}
