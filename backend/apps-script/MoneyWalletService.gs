function walletBalanceSnapshotForEmail_(userId){
  ensureMoneyWalletSheets_();ensureWalletSheets_();
  var mw=moneyWalletPublic_(userId),cw=walletPublic_(userId);
  return {moneyBalance:Number(mw.balance||0),moneyAvailable:Number(mw.availableBalance||0),moneyReserved:Number(mw.reservedBalance||0),cashbackBalance:Number(cw.balance||0),combinedBalance:Number(mw.balance||0)+Number(cw.balance||0)};
}
function notifyWalletTransaction_(userId,ledger,type,amount,status,description,transactionId,reference){
  try{
    var user=findOne_(TC_CONFIG.SHEETS.USERS,'UserID',userId);if(!user||!user.Email)return false;
    var b=walletBalanceSnapshotForEmail_(userId),amt=Number(amount||0),kind=Number(amt)>=0?'CREDIT':'DEBIT',abs=Math.abs(amt);
    var html='<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#18241e"><div style="padding:24px;border-radius:16px;background:#173c2a;color:#fff"><div style="font-size:22px;font-weight:800">Trusted Circle</div><div style="margin-top:5px;opacity:.85">Wallet Transaction Notification</div></div><div style="padding:24px"><h2 style="margin:0 0 8px">'+emailEscape_(kind==='CREDIT'?'Money Credited':'Money Debited')+'</h2><p style="color:#5f6b64">A '+emailEscape_(ledger)+' wallet transaction has been completed.</p><table style="border-collapse:collapse;width:100%;font-size:14px"><tr><td style="padding:9px;border-bottom:1px solid #edf1ee">Transaction ID</td><td style="padding:9px;border-bottom:1px solid #edf1ee"><b>'+emailEscape_(transactionId)+'</b></td></tr><tr><td style="padding:9px;border-bottom:1px solid #edf1ee">Type</td><td style="padding:9px;border-bottom:1px solid #edf1ee">'+emailEscape_(type)+'</td></tr><tr><td style="padding:9px;border-bottom:1px solid #edf1ee">Amount</td><td style="padding:9px;border-bottom:1px solid #edf1ee"><b>'+emailMoney_(abs)+'</b></td></tr><tr><td style="padding:9px;border-bottom:1px solid #edf1ee">Status</td><td style="padding:9px;border-bottom:1px solid #edf1ee">'+emailEscape_(status)+'</td></tr><tr><td style="padding:9px">Description</td><td style="padding:9px">'+emailEscape_(description||'')+'</td></tr></table><h3 style="margin:24px 0 10px">Current Account Balance</h3><table style="border-collapse:collapse;width:100%;font-size:14px"><tr><td style="padding:9px">Money Wallet</td><td style="padding:9px;text-align:right"><b>'+emailMoney_(b.moneyBalance)+'</b></td></tr><tr><td style="padding:9px">Cashback Wallet</td><td style="padding:9px;text-align:right"><b>'+emailMoney_(b.cashbackBalance)+'</b></td></tr><tr style="background:#eef8f1"><td style="padding:11px"><b>Combined Balance</b></td><td style="padding:11px;text-align:right"><b>'+emailMoney_(b.combinedBalance)+'</b></td></tr></table></div><div style="padding:18px 24px;background:#f5f8f6;color:#68736d;font-size:12px">Trusted Circle · System generated transaction notification</div></div>';
    var text='Trusted Circle Wallet Transaction\nTransaction ID: '+transactionId+'\nLedger: '+ledger+'\nType: '+type+'\nAmount: '+emailMoney_(abs)+'\nStatus: '+status+'\nDescription: '+(description||'')+'\n\nCurrent Money Wallet: '+emailMoney_(b.moneyBalance)+'\nCurrent Cashback Wallet: '+emailMoney_(b.cashbackBalance)+'\nCombined Balance: '+emailMoney_(b.combinedBalance);
    var subject='Trusted Circle — '+kind+' · '+ledger+' · '+emailMoney_(abs);
    var userSent=sendTransactionalEmail_(user.Email,subject,html,text);
    var adminSent=sendTransactionalEmail_(getAdminEmail_(),'[Admin] '+subject,html,text);
    return userSent&&adminSent;
  }catch(e){console.error('Wallet transaction notification failed: '+String(e&&e.message||e));return false;}
}
function walletUserFromIdentity_(data){
  var token=cleanText_(data&&data.token,500);
  require_(token,'Trusted Circle account authentication is required.');
  return authenticate_(token);
}
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
function walletServicesData_(data){
  var user=walletUserFromIdentity_(data);
  ensureMoneyWalletSheets_();
  ensureWalletSheets_();
  var money=moneyWalletPublic_(user.UserID);
  var cashback=walletPublic_(user.UserID);
  var moneyRows=getRows_(TC_MONEY_WALLET.TX).filter(function(r){return String(r.UserID)===String(user.UserID);});
  var cashRows=getRows_(TC_WALLET.TX).filter(function(r){return String(r.UserID)===String(user.UserID);});
  var transactions=[];
  moneyRows.forEach(function(r){transactions.push(moneyTxPublic_(r));});
  cashRows.forEach(function(r){
    transactions.push({
      transactionId:String(r.TransactionID||''),
      type:String(r.Type||''),
      amount:Number(r.Amount||0),
      status:String(r.Status||''),
      balanceBefore:'',
      balanceAfter:Number(r.BalanceAfter||0),
      reservedBalance:0,
      upiId:'',
      paymentLinkLabel:'',
      paymentLink:'',
      attempt:1,
      parentTransactionId:'',
      createdAt:r.CreatedAt,
      updatedAt:r.CreatedAt,
      completedAt:r.CreatedAt,
      notes:String(r.Description||''),
      source:'CASHBACK',
      orderId:String(r.OrderID||'')
    });
  });
  transactions.sort(function(a,b){return new Date(b.createdAt||0).getTime()-new Date(a.createdAt||0).getTime();});
  var currentBalances=walletBalanceSnapshotForEmail_(user.UserID);transactions.forEach(function(t){t.moneyBalance=currentBalances.moneyBalance;t.cashbackBalance=currentBalances.cashbackBalance;t.combinedBalance=currentBalances.combinedBalance;});
  return {
    user:publicUser_(user),
    moneyWallet:money,
    cashbackWallet:cashback,
    breakdown:{
      moneyBalance:money.balance,
      moneyAvailableBalance:money.availableBalance,
      moneyReservedBalance:money.reservedBalance,
      cashbackBalance:cashback.balance,
      combinedBalance:Number(money.balance||0)+Number(cashback.balance||0)
    },
    transactions:transactions.slice(0,200),
    moneyTransactions:moneyRows.slice().sort(function(a,b){return new Date(b.CreatedAt).getTime()-new Date(a.CreatedAt).getTime();}).slice(0,100).map(moneyTxPublic_),
    cashbackTransactions:cashRows.slice().sort(function(a,b){return new Date(b.CreatedAt).getTime()-new Date(a.CreatedAt).getTime();}).slice(0,100).map(function(r){return {
      transactionId:String(r.TransactionID||''),type:String(r.Type||''),orderId:String(r.OrderID||''),amount:Number(r.Amount||0),
      balanceAfter:Number(r.BalanceAfter||0),status:String(r.Status||''),description:String(r.Description||''),createdAt:r.CreatedAt
    };})
  };
}
function moneyWalletData_(data){
  var user=walletUserFromIdentity_(data);ensureMoneyWalletSheets_();
  var rows=getRows_(TC_MONEY_WALLET.TX).filter(function(r){return String(r.UserID)===String(user.UserID);});
  rows.sort(function(a,b){return new Date(b.CreatedAt).getTime()-new Date(a.CreatedAt).getTime();});
  return{wallet:moneyWalletPublic_(user.UserID),transactions:rows.slice(0,100).map(moneyTxPublic_)};
}
function moneyWalletOrders_(data){return moneyWalletData_(data);}
function moneyWalletTransactionStatus_(data){
  var user=walletUserFromIdentity_(data),id=cleanText_(data.transactionId,100),row=findOne_(TC_MONEY_WALLET.TX,'TransactionID',id);
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
function walletAdminEmailButton_(label,url,bg){
  return '<div style="margin:10px 0"><a href="'+escapeHtml_(url)+'" style="display:inline-block;padding:13px 20px;border-radius:10px;background:'+bg+';color:#fff;text-decoration:none;font-family:Arial,sans-serif;font-weight:700">'+escapeHtml_(label)+'</a></div>';
}
function walletAdminEmailShell_(title,body){
  return '<div style="font-family:Arial,sans-serif;background:#f4f7f5;padding:24px;color:#18241e"><div style="max-width:680px;margin:auto;background:#fff;border:1px solid #dfe8e2;border-radius:18px;overflow:hidden"><div style="padding:24px;background:#173c2a;color:#fff"><div style="font-size:22px;font-weight:800">Trusted Circle</div><div style="margin-top:5px;opacity:.85">Money Wallet Administration</div></div><div style="padding:24px"><h2 style="margin:0 0 18px;color:#173c2a">'+escapeHtml_(title)+'</h2>'+body+'</div><div style="padding:15px 24px;background:#f5f8f6;color:#68736d;font-size:12px">System generated notification · Trusted Circle</div></div></div>';
}
function moneyWalletAdminEmail_(){return 'trustedcircle2026@gmail.com';}
function moneyWalletAdminActions_(t){
  var received=moneyWalletActionToken_(t.TransactionID,'RECEIVED');
  var notReceived=moneyWalletActionToken_(t.TransactionID,'NOT_RECEIVED');
  var rejected=moneyWalletActionToken_(t.TransactionID,'REJECTED');
  var customer='';var customerRow=findOne_(TC_CONFIG.SHEETS.USERS,'UserID',t.UserID);if(customerRow&&customerRow.Email)customer=String(customerRow.Email);
  var body='<p><b>Transaction:</b> '+esc_(t.TransactionID)+'</p><p><b>Customer:</b> '+esc_(customer)+'</p><p><b>Amount:</b> ₹'+Number(t.Amount||0).toLocaleString('en-IN')+'</p><p><b>Payment source:</b> Existing Shopping Payment Link Stock</p>'+
    walletAdminEmailButton_('✓ Received',moneyWalletActionUrl_(received,'RECEIVED'),'#0f5132')+
    walletAdminEmailButton_('! Not Received',moneyWalletActionUrl_(notReceived,'NOT_RECEIVED'),'#a66a00')+
    walletAdminEmailButton_('✕ Rejected',moneyWalletActionUrl_(rejected,'REJECTED'),'#b42318');
  var subject='Trusted Circle — Money Wallet Add Money ₹'+t.Amount;
  var html=walletAdminEmailShell_('Money Wallet Add Money',body);
  var text='Money Wallet Add Money request '+t.TransactionID+'\nCustomer: '+customer+'\nAmount: ₹'+t.Amount+'\nTransaction: '+t.TransactionID+'\n\nAdmin action links:\nReceived: '+moneyWalletActionUrl_(received,'RECEIVED')+'\nNot Received: '+moneyWalletActionUrl_(notReceived,'NOT_RECEIVED')+'\nRejected: '+moneyWalletActionUrl_(rejected,'REJECTED');
  var adminEmail=moneyWalletAdminEmail_();var sent=sendTransactionalEmail_(adminEmail,subject,html,text);
  if(!sent)throw new Error('Admin email could not be sent. Please check Apps Script email authorization/quota.');
  return true;
}
function moneyWalletWithdrawalActions_(t){
  var approve=moneyWalletActionToken_(t.TransactionID,'WITHDRAW_APPROVE');
  var reject=moneyWalletActionToken_(t.TransactionID,'WITHDRAW_REJECT');
  var customerRow=findOne_(TC_CONFIG.SHEETS.USERS,'UserID',t.UserID);
  var customer=customerRow&&customerRow.Email?String(customerRow.Email):'';
  var body='<p><b>Transaction:</b> '+esc_(t.TransactionID)+'</p>'+
    '<p><b>Customer:</b> '+esc_(customer||'—')+'</p>'+
    '<p><b>Amount:</b> ₹'+Number(t.Amount||0).toLocaleString('en-IN')+'</p>'+
    '<p><b>UPI:</b> '+esc_(t.UPIId||'')+'</p>'+
    walletAdminEmailButton_('✓ Approve Withdrawal',moneyWalletActionUrl_(approve,'WITHDRAW_APPROVE'),'#0f5132')+
    walletAdminEmailButton_('✕ Reject Withdrawal',moneyWalletActionUrl_(reject,'WITHDRAW_REJECT'),'#b42318');
  var html=walletAdminEmailShell_('Money Wallet Withdrawal Request',body);
  var text='Money Wallet Withdrawal request '+t.TransactionID+
    '\nCustomer: '+(customer||'—')+
    '\nAmount: ₹'+t.Amount+
    '\nUPI: '+(t.UPIId||'')+
    '\n\nAdmin action links:\nApprove: '+moneyWalletActionUrl_(approve,'WITHDRAW_APPROVE')+
    '\nReject: '+moneyWalletActionUrl_(reject,'WITHDRAW_REJECT');
  var sent=sendTransactionalEmail_(moneyWalletAdminEmail_(),'Trusted Circle — Money Wallet Withdrawal ₹'+t.Amount,html,text);
  if(!sent)throw new Error('Admin withdrawal email could not be sent. Please check Apps Script email authorization/quota.');
  return true;
}
function moneyWalletAdd_(data){
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var user=walletUserFromIdentity_(data),amount=Number(data.amount);
    require_(TC_MONEY_WALLET.ADD.indexOf(amount)>=0,'Choose ₹500, ₹1,000, ₹1,500 or ₹2,000.');
    ensureMoneyWalletSheets_();
    var tid=newId_('TCMWTX'),stock=moneyWalletReserveStock_(amount,tid),w=moneyWalletRow_(user.UserID),balance=Number(w.Balance||0),reserved=Number(w.ReservedBalance||0),now=isoNow_();
    var tx={TransactionID:tid,UserID:user.UserID,Type:'ADD_MONEY',Amount:amount,Status:'PENDING_PAYMENT',BalanceBefore:balance,BalanceAfter:balance,ReservedBefore:reserved,ReservedAfter:reserved,UPIId:'',PaymentLink:stock.link,PaymentLinkStockID:stock.stockId,Attempt:1,ParentTransactionID:'',CreatedAt:now,UpdatedAt:now,CompletedAt:'',Notes:'Awaiting payment',AdminNote:''};
    appendRowObject_(TC_MONEY_WALLET.TX,tx);
    var adminEmailSent=true;
    try{moneyWalletAdminActions_(tx);}catch(e){
      adminEmailSent=false;
      appendRowObject_(TC_MONEY_WALLET.TX,{TransactionID:newId_('TCMWLOG'),UserID:user.UserID,Type:'SYSTEM',Amount:0,Status:'ADMIN_EMAIL_FAILED',BalanceBefore:balance,BalanceAfter:balance,ReservedBefore:reserved,ReservedAfter:reserved,UPIId:'',PaymentLink:'',PaymentLinkStockID:'',Attempt:1,ParentTransactionID:tid,CreatedAt:now,UpdatedAt:now,CompletedAt:'',Notes:String(e&&e.message||e),AdminNote:''});
    }
    return{paymentLink:stock.link,expiresAt:stock.expiresAt,adminEmailSent:adminEmailSent,transaction:moneyTxPublic_(tx),wallet:moneyWalletPublic_(user.UserID),data:{paymentLink:stock.link,expiresAt:stock.expiresAt,adminEmailSent:adminEmailSent,transaction:moneyTxPublic_(tx)}};
  }finally{lock.releaseLock();}
}
function moneyWalletRetryAdd_(data){
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var user=walletUserFromIdentity_(data),old=findOne_(TC_MONEY_WALLET.TX,'TransactionID',cleanText_(data.transactionId,100));
    require_(old&&String(old.UserID)===String(user.UserID),'Transaction not found.');
    require_(String(old.Status).toUpperCase()==='NOT_RECEIVED','Only a Not Received payment can be retried.');
    var tid=newId_('TCMWTX'),stock=moneyWalletReserveStock_(Number(old.Amount),tid),w=moneyWalletRow_(user.UserID),balance=Number(w.Balance||0),reserved=Number(w.ReservedBalance||0),now=isoNow_();
    updateRowById_(TC_MONEY_WALLET.TX,'TransactionID',old.TransactionID,{Status:'RETRY_CREATED',UpdatedAt:now,Notes:'Retry created'});
    var tx={TransactionID:tid,UserID:user.UserID,Type:'ADD_MONEY',Amount:Number(old.Amount),Status:'PENDING_PAYMENT',BalanceBefore:balance,BalanceAfter:balance,ReservedBefore:reserved,ReservedAfter:reserved,UPIId:'',PaymentLink:stock.link,PaymentLinkStockID:stock.stockId,Attempt:Number(old.Attempt||1)+1,ParentTransactionID:old.TransactionID,CreatedAt:now,UpdatedAt:now,CompletedAt:'',Notes:'Retry payment',AdminNote:''};
    appendRowObject_(TC_MONEY_WALLET.TX,tx);
    var adminEmailSent=true;
    try{moneyWalletAdminActions_(tx);}catch(e){
      adminEmailSent=false;
      appendRowObject_(TC_MONEY_WALLET.TX,{TransactionID:newId_('TCMWLOG'),UserID:user.UserID,Type:'SYSTEM',Amount:0,Status:'ADMIN_EMAIL_FAILED',BalanceBefore:balance,BalanceAfter:balance,ReservedBefore:reserved,ReservedAfter:reserved,UPIId:'',PaymentLink:'',PaymentLinkStockID:'',Attempt:Number(tx.Attempt||1),ParentTransactionID:tid,CreatedAt:now,UpdatedAt:now,CompletedAt:'',Notes:String(e&&e.message||e),AdminNote:''});
    }
    return{paymentLink:stock.link,expiresAt:stock.expiresAt,adminEmailSent:adminEmailSent,transaction:moneyTxPublic_(tx),wallet:moneyWalletPublic_(user.UserID),data:{paymentLink:stock.link,expiresAt:stock.expiresAt,adminEmailSent:adminEmailSent,transaction:moneyTxPublic_(tx)}};
  }finally{lock.releaseLock();}
}
function moneyWalletWithdraw_(data){
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var user=walletUserFromIdentity_(data),amount=Math.round(Number(data.amount||0)*100)/100,upi=cleanText_(data.upiId,200),w=moneyWalletRow_(user.UserID),balance=Number(w.Balance||0),reserved=Number(w.ReservedBalance||0);
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
      updateRowById_(TC_MONEY_WALLET.TX,'TransactionID',tx.TransactionID,{Status:'COMPLETED',BalanceBefore:balance,BalanceAfter:after,UpdatedAt:now,CompletedAt:now,Notes:'Payment received'}); notifyWalletTransaction_(tx.UserID,'Money Wallet','Add Money',Number(tx.Amount||0),'COMPLETED','Payment received',tx.TransactionID,'');
    }else if(action==='NOT_RECEIVED'||action==='REJECTED'){
      require_(tx.Status==='PENDING_PAYMENT','Transaction is already '+tx.Status+'.');
      moneyWalletReleaseStock_(tx);
      updateRowById_(TC_MONEY_WALLET.TX,'TransactionID',tx.TransactionID,{Status:action==='NOT_RECEIVED'?'NOT_RECEIVED':'REJECTED',UpdatedAt:now,Notes:action==='NOT_RECEIVED'?'Payment not received':'Payment rejected'});
    }else if(action==='WITHDRAW_APPROVE'){
      require_(tx.Status==='WITHDRAWAL_REQUESTED','Withdrawal is already '+tx.Status+'.');
      require_(reserved>=Number(tx.Amount||0),'Reserved balance mismatch.');
      var newBalance=balance-Number(tx.Amount||0);
      updateRowById_(TC_MONEY_WALLET.WALLET,'UserID',tx.UserID,{Balance:newBalance,ReservedBalance:Math.max(0,reserved-Number(tx.Amount||0)),TotalWithdrawn:Number(w.TotalWithdrawn||0)+Number(tx.Amount||0),UpdatedAt:now});
      updateRowById_(TC_MONEY_WALLET.TX,'TransactionID',tx.TransactionID,{Status:'WITHDRAWAL_COMPLETED',BalanceAfter:newBalance,ReservedAfter:Math.max(0,reserved-Number(tx.Amount||0)),UpdatedAt:now,CompletedAt:now,Notes:'Withdrawal approved'}); notifyWalletTransaction_(tx.UserID,'Money Wallet','Withdrawal',-Number(tx.Amount||0),'COMPLETED','Withdrawal approved',tx.TransactionID,tx.UPIId||'');
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


/**
 * Manual Apps Script test for Money Wallet admin email delivery.
 * Run this function once from the Apps Script editor to authorize MailApp/GmailApp,
 * then check trustedcircle2026@gmail.com.
 * This test sends email only; it does not create wallet transactions or change Sheets.
 */
function testMoneyWalletAdminEmails(){
  var to=moneyWalletAdminEmail_();
  var now=isoNow_();
  var sampleAdd='TEST-ADD-'+newId_('TCMW');
  var sampleWithdraw='TEST-WITHDRAW-'+newId_('TCMW');
  var addHtml=walletAdminEmailShell_('Money Wallet Add Money — TEST',
    '<p>This is a <b>TEST EMAIL ONLY</b>. No wallet transaction was created.</p>'+
    '<p><b>Transaction:</b> '+esc_(sampleAdd)+'</p>'+
    '<p><b>Customer:</b> Test Customer</p>'+
    '<p><b>Amount:</b> ₹500</p>'+
    '<p><b>Sent at:</b> '+esc_(now)+'</p>'+
    '<div style="padding:14px;border-radius:10px;background:#eef8f1;color:#175c40"><b>Admin mail delivery is working.</b><br>Real Add Money emails will contain the live Received / Not Received / Rejected actions.</div>');
  var withdrawHtml=walletAdminEmailShell_('Money Wallet Withdrawal — TEST',
    '<p>This is a <b>TEST EMAIL ONLY</b>. No wallet transaction was created.</p>'+
    '<p><b>Transaction:</b> '+esc_(sampleWithdraw)+'</p>'+
    '<p><b>Customer:</b> Test Customer</p>'+
    '<p><b>Amount:</b> ₹500</p>'+
    '<p><b>UPI:</b> test@upi</p>'+
    '<p><b>Sent at:</b> '+esc_(now)+'</p>'+
    '<div style="padding:14px;border-radius:10px;background:#eef8f1;color:#175c40"><b>Admin mail delivery is working.</b><br>Real Withdrawal emails will contain the live Approve / Reject actions.</div>');
  var addSent=sendTransactionalEmail_(to,'Trusted Circle — TEST · Money Wallet Add Money',addHtml,'TEST Money Wallet Add Money email\nTransaction: '+sampleAdd+'\nAmount: ₹500');
  var withdrawSent=sendTransactionalEmail_(to,'Trusted Circle — TEST · Money Wallet Withdrawal',withdrawHtml,'TEST Money Wallet Withdrawal email\nTransaction: '+sampleWithdraw+'\nAmount: ₹500\nUPI: test@upi');
  if(!addSent||!withdrawSent)throw new Error('One or both Money Wallet test emails failed. Check Apps Script Executions, authorization and MailApp quota.');
  return{ok:true,to:to,addMoneyEmail:true,withdrawalEmail:true,sentAt:now,remainingQuota:MailApp.getRemainingDailyQuota()};
}
