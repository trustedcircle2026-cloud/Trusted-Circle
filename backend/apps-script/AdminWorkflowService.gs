/** Admin workflow actions. Manual provider verification is an explicit admin step. */
function adminVerifyPayment_(data){
  var admin=adminAuthenticate_(data.token),orderId=cleanText_(data.orderId,100),provider=cleanText_(data.provider||'PAYTM_MANUAL',80),providerPaymentId=cleanText_(data.providerPaymentId||'',200),order=findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderID',orderId);
  require_(order,'Order not found.');
  var status=String(order.Status||'').toUpperCase();
  if(['PAID','PROCESSING','DELIVERED'].indexOf(status)>=0)return{ok:true,alreadyVerified:true,orderNumber:order.OrderNumber,status:status};
  require_(status==='PENDING_PAYMENT','Only pending-payment orders can be verified.');
  var lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    var fresh=findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderID',orderId);require_(fresh&&String(fresh.Status||'').toUpperCase()==='PENDING_PAYMENT','Order is no longer awaiting payment.');
    var payments=getRows_(TC_CONFIG.SHEETS.PAYMENTS).filter(function(r){return String(r.OrderID)===String(orderId);}),payment=payments.length?payments[payments.length-1]:null,now=isoNow_();
    require_(payment,'Payment record not found for this order.');
    require_(Math.abs(Number(payment.Amount||0)-Number(fresh.Total||0))<0.01,'Payment amount does not match the order.');
    if(String(fresh.PaymentMethod||'').toLowerCase()==='link'){
      var links=[];try{links=getRows_(TC_CONFIG.SHEETS.PAYMENT_LINKS).filter(function(r){return String(r.OrderID)===String(orderId)&&String(r.Status||'').toUpperCase()==='ACTIVE';});}catch(ignore){}
      if(links.length){var stock=links[links.length-1].PaymentLinkStockID?findOne_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',links[links.length-1].PaymentLinkStockID):null;require_(stock&&String(stock.Status||'').toUpperCase()==='RESERVED'&&(!stock.ExpiresAt||new Date(stock.ExpiresAt).getTime()>Date.now()),'Payment link has expired. Do not verify this order until a valid payment is confirmed.');}
    }
    updateRowById_(TC_CONFIG.SHEETS.PAYMENTS,'PaymentID',payment.PaymentID,{Provider:provider,ProviderPaymentID:providerPaymentId,Status:'VERIFIED',VerifiedAt:now,UpdatedAt:now});
    updateRowById_(TC_CONFIG.SHEETS.ORDERS,'OrderID',orderId,{Status:'PAID',UpdatedAt:now});
    creditCashbackForOrder_(findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderID',orderId));
    if(typeof markPaymentLinkStockUsedForOrder_==='function')markPaymentLinkStockUsedForOrder_(orderId,now);
    appendAudit_(admin.UserID,'PAYMENT_VERIFIED_MANUALLY','Order',orderId,{provider:provider,providerPaymentId:providerPaymentId,amount:Number(fresh.Total||0)});
    return{ok:true,orderNumber:fresh.OrderNumber,status:'PAID'};
  }finally{lock.releaseLock();}
}
