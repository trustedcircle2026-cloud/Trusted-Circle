/** Secure bridge called only by the separate Wallet Apps Script. */
function verifyWalletBridge_(data){
  var secret=String(data.bridgeSecret||'');
  var expected=getScriptProperties_().getProperty('WALLET_BRIDGE_SECRET')||'';
  require_(expected&&constantTimeEquals_(secret,expected),'Invalid wallet bridge authorization.');
}
function reserveWalletPaymentLink_(data){
  verifyWalletBridge_(data);
  var amount=Number(data.amount||0),tx=cleanText_(data.transactionId,100);
  require_([500,1000,1500,2000].indexOf(amount)>=0,'Invalid wallet denomination.');
  require_(tx,'Wallet transaction ID is required.');
  ensurePaymentLinkStockSheet_();
  var lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    expirePaymentLinkReservations_();
    ensureColumns_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,['WalletTransactionID','ReservationType']);
    var rows=getRows_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK).filter(function(r){
      return Number(r.Denomination||0)===amount&&String(r.Status||'').toUpperCase()==='AVAILABLE';
    });
    require_(rows.length>0,'Payment link stock is not available for ₹'+amount+'.');
    var stock=rows[0],now=isoNow_(),reservationId=stock.PaymentLinkStockID;
    var expiresAt=new Date(Date.now()+3*60*60*1000).toISOString();
    updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',reservationId,{
      Status:'RESERVED',WalletTransactionID:tx,ReservationType:'WALLET_SERVICE',
      ReservedAt:now,ExpiresAt:expiresAt,UpdatedAt:now
    });
    return{reservationId:reservationId,paymentLink:stock.Link,label:stock.Label||'Pay securely',denomination:amount,expiresAt:expiresAt};
  }finally{lock.releaseLock();}
}
function releaseWalletPaymentLink_(data){
  verifyWalletBridge_(data);
  var id=cleanText_(data.reservationId,100);
  require_(id,'Reservation ID is required.');
  var stock=findOne_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',id);
  require_(stock,'Payment reservation not found.');
  require_(String(stock.ReservationType||'').toUpperCase()==='WALLET_SERVICE','Not a wallet payment reservation.');
  if(String(stock.Status||'').toUpperCase()==='USED')return{released:false,status:'USED'};
  updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',id,{
    Status:'AVAILABLE',WalletTransactionID:'',ReservationType:'',ReservedAt:'',ExpiresAt:'',UpdatedAt:isoNow_()
  });
  return{released:true,status:'AVAILABLE'};
}
function consumeWalletPaymentLink_(data){
  verifyWalletBridge_(data);
  var id=cleanText_(data.reservationId,100);
  require_(id,'Reservation ID is required.');
  var stock=findOne_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',id);
  require_(stock,'Payment reservation not found.');
  require_(String(stock.ReservationType||'').toUpperCase()==='WALLET_SERVICE','Not a wallet payment reservation.');
  require_(['RESERVED','USED'].indexOf(String(stock.Status||'').toUpperCase())>=0,'Payment reservation is not active.');
  updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',id,{
    Status:'USED',WalletTransactionID:'',ReservationType:'',ReservedAt:'',ExpiresAt:'',UpdatedAt:isoNow_()
  });
  return{consumed:true,status:'USED'};
}
