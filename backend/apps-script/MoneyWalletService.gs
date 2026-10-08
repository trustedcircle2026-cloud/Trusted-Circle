/** Integrated money wallet for the main Trusted Circle account.
 * Uses the SAME Shopping GSheet, Shopping session, and PaymentLinkStock.
 * CashbackWallet remains the cashback ledger; MoneyWallet is the cash ledger.
 */
var TC_MONEY_WALLET={
  WALLET:'MoneyWallets',
  TX:'MoneyWalletTransactions',
  ACTIONS:'MoneyWalletActions',
  ADD:[500,1000,1500,2000],
  RESERVATION_MS:15*60*1000,
  ACTION_MS:24*60*60*1000
};

function ensureMoneyWalletSheets_(){
  ensureSheet_(TC_MONEY_WALLET.WALLET,['WalletID','UserID','Balance','ReservedBalance','TotalAdded','TotalWithdrawn','UpdatedAt']);
  ensureSheet_(TC_MONEY_WALLET.TX,['TransactionID','UserID','Type','Amount','Status','BalanceBefore','BalanceAfter','ReservedBefore','ReservedAfter','UPIId','PaymentLink','PaymentLinkStockID','Attempt','ParentTransactionID','CreatedAt','UpdatedAt','CompletedAt','Notes','AdminNote']);
  ensureSheet_(TC_MONEY_WALLET.ACTIONS,['ActionID','TransactionID','Action','TokenHash','ExpiresAt','UsedAt','CreatedAt']);
}
function moneyWalletRow_(userId){
  ensureMoneyWalletSheets_();
  var row=getRows_(TC_MONEY_WALLET.WALLET).filter(function(r){return String(r.UserID)===String(userId);})[0];
  if(row)return row;
  var now=isoNow_(),wallet={WalletID:newId_('TCMW'),UserID:userId,Balance:0,ReservedBalance:0,TotalAdded:0,TotalWithdrawn:0,UpdatedAt:now};
  appendRowObject_(TC_MONEY_WALLET.WALLET,wallet);
  return findOne_(TC_MONEY_WALLET.WALLET,'WalletID',wallet.WalletID);
}
function moneyWalletPublic_(userId){
  var w=moneyWalletRow_(userId),balance=Number(w.Balance||0),reserved=Number(w.ReservedBalance||0);
  return{walletId:String(w.WalletID||''),balance:balance,reservedBalance:reserved,availableBalance:Math.max(0,balance-reserved),totalAdded:Number(w.TotalAdded||0),totalWithdrawn:Number(w.TotalWithdrawn||0)};
}
function moneyTxPublic_(r){
  return{transactionId:String(r.TransactionID||''),type:String(r.Type||''),amount:Number(r.Amount||0),status:String(r.Status||''),balanceBefore:Number(r.BalanceBefore||0),balanceAfter:Number(r.BalanceAfter||0),reservedBalance:Number(r.ReservedAfter||0),upiId:String(r.UPIId||''),paymentLinkLabel:'Shopping Payment Link',paymentLink:String(r.PaymentLink||''),attempt:Number(r.Attempt||1),parentTransactionId:String(r.ParentTransactionID||''),createdAt:r.CreatedAt,updatedAt:r.UpdatedAt,completedAt:r.CompletedAt||'',notes:String(r.Notes||'')};
}
function moneyWalletData_(data){
  var user=authenticate_(data.token);ensureMoneyWalletSheets_();
  var rows=getRows_(TC_MONEY_WALLET.TX).filter(function(r){return String(r.UserID)===String(user.UserID);});
  rows.sort(function(a,b){return new Date(b.CreatedAt).getTime()-new Date(a.CreatedAt).getTime();});
  return{wallet:moneyWalletPublic_(user.UserID),transactions:rows.slice(0,100).map(moneyTxPublic_)};
}
function moneyWalletOrders_(data){return moneyWalletData_(data);}
function moneyWalletTransactionStatus_(data){
  var user=authenticate_(data.token),id=cleanText_(data.transactionId,100),row=findOne_(TC_MONEY_WALLET.TX,'TransactionID',id);
  require_(row&&String(row.UserID)===String(user.UserID),'Transaction not found.');
  return{transaction:moneyTxPublic_(row),wallet:moneyWalletPublic_(user.UserID)};
}
function moneyWalletReserveStock_(amount,txId){
  ensurePaymentLinkStockSheet_();
  expirePaymentLinkReservations_();
  var stock=reservePaymentLinkForAmount_(amount);
  require_(stock,'Payment link stock is not available for this amount.');
  var now=isoNow(),expires=new Date(Date.now()+TC_MONEY_WALLET.RESERVATION_MS).toISOString();
  updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',stock.PaymentLinkStockID,{
    Status:'RESERVED',OrderID:'MONEY-'+txId,PaymentLinkID:'MONEY-'+txId,
    ReservedAt:now,ExpiresAt:expires,UpdatedAt:now
  });
  return{stockId:String(stock.PaymentLinkStockID),link:String(stock.Link),label:String(stock.Label||'Pay securely'),expiresAt:expires};
}
function moneyWalletReleaseStock_(tx){
  if(!tx||!tx.PaymentLinkStockID)return false;
  var stock=findOne_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',tx.PaymentLinkStockID);
  if(!stock)return false;
  if(String(stock.Status||'').toUpperCase()!=='RESERVED')return false;
  if(String(stock.OrderID)!=='MONEY-'+String(tx.TransactionID))return false;
  return updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',stock.PaymentLinkStockID,{Status:'AVAILABLE',OrderID:'',PaymentLinkID:'',ReservedAt:'',ExpiresAt:'',UpdatedAt:isoNow_()});
}
function moneyWalletConsumeStock_(tx){
  if(!tx||!tx.PaymentLinkStockID)return false;
  var stock=findOne_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',tx.PaymentLinkStockID);
  if(!stock)return false;
  if(String(stock.Status||'').toUpperCase()==='USED')return true;
  require_(String(stock.Status||'').toUpperCase()==='RESERVED','Payment link is not reserved.');
  require_(String(stock.OrderID)==='MONEY-'+String(tx.TransactionID),'Payment link reservation mismatch.');
  var ok=updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',stock.PaymentLinkStockID,{Status:'USED',OrderID:'',ReservedAt:'',ExpiresAt:'',UpdatedAt:isoNow_()});
  try{var d=Number(stock.Denomination||0);if(typeof maybeAlertPaymentLinkStockLow_==='function')maybeAlertPaymentLinkStockLow_(d,{requestedAmount:d,orderId:'MONEY-'+tx.TransactionID});}catch(_){}
  return ok;
}
function moneyWalletActionToken_(transactionId,action){
  var raw=Utilities.getUuid()+'.'+Utilities.getUuid();
  appendRowObject_(TC_MONEY_WALLET.ACTIONS,{ActionID:newId_('TCMWA'),TransactionID:transactionId,Action:action,TokenHash:hash_(raw),ExpiresAt:new Date(Date.now()+TC_MONEY_WALLET.ACTION_MS).toISOString(),UsedAt:'',CreatedAt:isoNow_()});
  return raw;
}
function moneyWalletActionUrl_(raw,action){return ScriptApp.getService().getUrl()+'?moneyWalletAction='+encodeURIComponent(action)+'&token='+encodeURIComponent(raw);}
function moneyWalletAdminActions_(t){
  var received=moneyWalletActionToken_(t.TransactionID,'RECEIVED');
  var notReceived=moneyWalletActionToken_(t.TransactionID,'NOT_RECEIVED');
  var rejected=moneyWalletActionToken_(t.TransactionID,'REJECTED');
  var body='<p><b>Transaction:</b> '+esc_(t.TransactionID)+'</p><p><b>Customer:</b> '+esc_(userEmail_(t.UserID))+'</p><p><b>Amount:</b> ₹'+Number(t.Amount||0).toLocaleString('en-IN')+'</p><p><b>Payment source:</b> Existing Shopping Payment Link Stock</p>'+
    btn_('✓ Received',moneyWalletActionUrl_(received,'RECEIVED'),'#0f5132')+
    btn_('! Not Received',moneyWalletActionUrl_(notReceived,'NOT_RECEIVED'),'#a66a00')+
    btn_('✕ Rejected',moneyWalletActionUrl_(rejected,'REJECTED'),'#b42318');
  MailApp.sendEmail({to:getAdminEmail_(),subject:'Trusted Circle — Money Wallet Add Money ₹'+t.Amount,body:'Money Wallet Add Money request '+t.TransactionID,htmlBody:shell_('Money Wallet Add Money',body)});
}
function moneyWalletWithdrawalActions_(t){
  var approve=moneyWalletActionToken_(t.TransactionId||t.TransactionID,'WITHDRAW_APPROVE');
  var reject=moneyWalletActionToken_(t.TransactionId||t.TransactionID,'WITHDRAW_REJECT');
  var body='<p><b>Transaction:</b> '+esc_(t.TransactionID)+'</p><p><b>Customer:</b> '+esc_(userEmail_(t.UserID))+'</p><p><b>Amount:</b> ₹'+Number(t.Amount||0).toLocaleString('en-IN')+'</p><p><b>UPI:</b> '+esc_(t.UPIId||'')+'</p>'+
    btn_('✓ Approve Withdrawal',moneyWalletActionUrl_(approve,'WITHDRAW_APPROVE'),'#0f5132')+
    btn_('✕ Reject Withdrawal',moneyWalletActionUrl_(reject,'WITHDRAW_REJECT'),'#b42318');
  MailApp.sendEmail({to:getAdminEmail_(),subject:'Trusted Circle — Money Wallet Withdrawal ₹'+t.Amount,body:'Money Wallet Withdrawal request '+t.TransactionID,htmlBody:shell_('Money Wallet Withdrawal',body)});
}
function moneyWalletAdd_(data){
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var user=authenticate_(data.token),amount=Number(data.amount);
    require_(TC_MONEY_WALLET.ADD.indexOf(amount)>=0,'Choose ₹500, ₹1,000, ₹1,500 or ₹2,000.');
    ensureMoneyWalletSheets_();
    var tid=newId_('TCMWTX'),stock=moneyWalletReserveStock_(amount,tid),w=moneyWalletRow_(user.UserID),balance=Number(w.Balance||0),reserved=Number(w.ReservedBalance||0),now=isoNow_();
    var tx={TransactionID:tid,UserID:user.UserID,Type:'ADD_MONEY',Amount:amount,Status:'PENDING_PAYMENT',BalanceBefore:balance,BalanceAfter:balance,ReservedBefore:reserved,ReservedAfter:reserved,UPIId:'',PaymentLink:stock.link,PaymentLinkStockID:stock.stockId,Attempt:1,ParentTransactionID:'',CreatedAt:now,UpdatedAt:now,CompletedAt:'',Notes:'Awaiting payment',AdminNote:''};
    appendRowObject_(TC_MONEY_WALLET.TX,tx);
    try{moneyWalletAdminActions_(tx);}catch(e){appendRowObject_(TC_MONEY_WALLET.TX,{TransactionID:newId_('TCMWLOG'),UserID:user.UserID,Type:'SYSTEM',Amount:0,Status:'ADMIN_EMAIL_FAILED',BalanceBefore:balance,BalanceAfter:balance,ReservedBefore:reserved,ReservedAfter:reserved,UPIId:'',PaymentLink:'',PaymentLinkStockID:'',Attempt:1,ParentTransactionID:tid,CreatedAt:now,UpdatedAt:now,CompletedAt:'',Notes:String(e&&e.message||e),AdminNote:''});}
    return{paymentLink:stock.link,expiresAt:stock.expiresAt,transaction:moneyTxPublic_(tx),wallet:moneyWalletPublic_(user.UserID),data:{paymentLink:stock.link,expiresAt:stock.expiresAt,transaction:moneyTxPublic_(tx)}};
  }finally{lock.releaseLock();}
}
function moneyWalletRetryAdd_(data){
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var user=authenticate_(data.token),old=findOne_(TC_MONEY_WALLET.TX,'TransactionID',cleanText_(data.transactionId,100));
    require_(old&&String(old.UserID)===String(user.UserID),'Transaction not found.');
    require_(String(old.Status).toUpperCase()==='NOT_RECEIVED','Only a Not Received payment can be retried.');
    var tid=newId_('TCMWTX'),stock=moneyWalletReserveStock_(Number(old.Amount),tid),w=moneyWalletRow_(user.UserID),balance=Number(w.Balance||0),reserved=Number(w.ReservedBalance||0),now=isoNow_();
    updateRowById_(TC_MONEY_WALLET.TX,'TransactionID',old.TransactionID,{Status:'RETRY_CREATED',UpdatedAt:now,Notes:'Retry created'});
    var tx={TransactionID:tid,UserID:user.UserID,Type:'ADD_MONEY',Amount:Number(old.Amount),Status:'PENDING_PAYMENT',BalanceBefore:balance,BalanceAfter:balance,ReservedBefore:reserved,ReservedAfter:reserved,UPIId:'',PaymentLink:stock.link,PaymentLinkStockID:stock.stockId,Attempt:Number(old.Attempt||1)+1,ParentTransactionID:old.TransactionID,CreatedAt:now,UpdatedAt:now,CompletedAt:'',Notes:'Retry payment',AdminNote:''};
    appendRowObject_(TC_MONEY_WALLET.TX,tx);moneyWalletAdminActions_(tx);
    return{paymentLink:stock.link,expiresAt:stock.expiresAt,transaction:moneyTxPublic_(tx),wallet:moneyWalletPublic_(user.UserID),data:{paymentLink:stock.link,expiresAt:stock.expiresAt,transaction:moneyTxPublic_(tx)}};
  }finally{lock.releaseLock();}
}
function moneyWalletWithdraw_(data){
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var user=authenticate_(data.token),amount=Math.round(Number(data.amount||0)*100)/100,upi=cleanText_(data.upiId,200),w=moneyWalletRow_(user.UserID),balance=Number(w.Balance||0),reserved=Number(w.ReservedBalance||0);
    require_(amount>0&&isFinite(amount),'Enter a valid withdrawal amount.');
    require_(/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/.test(upi),'Enter a valid UPI ID.');
    require_(amount<=balance-reserved,'Insufficient available wallet balance.');
    var now=isoNow_(),tid=newId_('TCMWTX');
    updateRowById_(TC_MONEY_WALLET.WALLET,'UserID',user.UserID,{ReservedBalance:reserved+amount,UpdatedAt:now});
    var tx={TransactionID:tid,UserID:user.UserID,Type:'WITHDRAW',Amount:amount,Status:'WITHDRAWAL_REQUESTED',BalanceBefore:balance,BalanceAfter:balance,ReservedBefore:reserved,ReservedAfter:reserved+amount,UPIId:upi,PaymentLink:'',PaymentLinkStockID:'',Attempt:1,ParentTransactionID:'',CreatedAt:now,UpdatedAt:now,CompletedAt:'',Notes:'Withdrawal requested',AdminNote:''};
    appendRowObject_(TC_MONEY_WALLET.TX,tx);moneyWalletWithdrawalActions_(tx);
    return{transaction:moneyTxPublic_(tx),wallet:moneyWalletPublic_(user.UserID)};
  }finally{lock.releaseLock();}
}
function moneyWalletAdminAction_(params){
  var action=cleanText_(params.moneyWalletAction,50),raw=cleanText_(params.token,500),tokenHash=hash_(raw),rows=getRows_(TC_MONEY_WALLET.ACTIONS),row=null;
  for(var i=rows.length-1;i>=0;i--)if(String(rows[i].TokenHash)===tokenHash){row=rows[i];break;}
  require_(row,'Admin action not found.');require_(!row.UsedAt,'This admin action has already been used.');require_(new Date(row.ExpiresAt).getTime()>Date.now(),'This admin action has expired.');require_(String(row.Action)===action,'Invalid admin action.');
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var tx=findOne_(TC_MONEY_WALLET.TX,'TransactionID',row.TransactionID);require_(tx,'Transaction not found.');
    var w=moneyWalletRow_(tx.UserID),balance=Number(w.Balance||0),reserved=Number(w.ReservedBalance||0),now=isoNow_();
    if(action==='RECEIVED'){
      require_(tx.Status==='PENDING_PAYMENT','Transaction is already '+tx.Status+'.');
      moneyWalletConsumeStock_(tx);
      var after=balance+Number(tx.Amount||0);
      updateRowById_(TC_MONEY_WALLET.WALLET,'UserID',tx.UserID,{Balance:after,TotalAdded:Number(w.TotalAdded||0)+Number(tx.Amount||0),UpdatedAt:now});
      updateRowById_(TC_MONEY_WALLET.TX,'TransactionID',tx.TransactionID,{Status:'COMPLETED',BalanceBefore:balance,BalanceAfter:after,UpdatedAt:now,CompletedAt:now,Notes:'Payment received'});
    }else if(action==='NOT_RECEIVED'||action==='REJECTED'){
      require_(tx.Status==='PENDING_PAYMENT','Transaction is already '+tx.Status+'.');
      moneyWalletReleaseStock_(tx);
      updateRowById_(TC_MONEY_WALLET.TX,'TransactionID',tx.TransactionID,{Status:action==='NOT_RECEIVED'?'NOT_RECEIVED':'REJECTED',UpdatedAt:now,Notes:action==='NOT_RECEIVED'?'Payment not received':'Payment rejected'});
    }else if(action==='WITHDRAW_APPROVE'){
      require_(tx.Status==='WITHDRAWAL_REQUESTED','Withdrawal is already '+tx.Status+'.');
      require_(reserved>=Number(tx.Amount||0),'Reserved balance mismatch.');
      var newBalance=balance-Number(tx.Amount||0);
      updateRowById_(TC_MONEY_WALLET.WALLET,'UserID',tx.UserID,{Balance:newBalance,ReservedBalance:Math.max(0,reserved-Number(tx.Amount||0)),TotalWithdrawn:Number(w.TotalWithdrawn||0)+Number(tx.Amount||0),UpdatedAt:now});
      updateRowById_(TC_MONEY_WALLET.TX,'TransactionID',tx.TransactionID,{Status:'WITHDRAWAL_COMPLETED',BalanceAfter:newBalance,ReservedAfter:Math.max(0,reserved-Number(tx.Amount||0)),UpdatedAt:now,CompletedAt:now,Notes:'Withdrawal approved'});
    }else if(action==='WITHDRAW_REJECT'){
      require_(tx.Status==='WITHDRAWAL_REQUESTED','Withdrawal is already '+tx.Status+'.');
      var released=Math.max(0,reserved-Number(tx.Amount||0));
      updateRowById_(TC_MONEY_WALLET.WALLET,'UserID',tx.UserID,{ReservedBalance:released,UpdatedAt:now});
      updateRowById_(TC_MONEY_WALLET.TX,'TransactionID',tx.TransactionID,{Status:'WITHDRAWAL_REJECTED',ReservedAfter:released,UpdatedAt:now,CompletedAt:now,Notes:'Withdrawal rejected; amount released'});
    }else throw new Error('Unsupported admin action.');
    updateRowById_(TC_MONEY_WALLET.ACTIONS,'ActionID',row.ActionID,{UsedAt:now});
    return html_('Trusted Circle Money Wallet','Action completed successfully.',true);
  }finally{lock.releaseLock();}
}
