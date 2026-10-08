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
  // Wallet Services intentionally does NOT use Shopping session tokens.
  // Identity is resolved only from the Shopping account Email + UserID pair.
  var email=normalizeEmail_(data&&data.email);
  var userId=cleanText_(data&&(data.userId||data.UserID),100);
  require_(isValidEmail_(email),'A valid Trusted Circle account email is required.');
  require_(userId,'Trusted Circle UserID is required.');
  var user=findOne_(TC_CONFIG.SHEETS.USERS,'UserID',userId);
  require_(user,'Trusted Circle account was not found.');
  require_(normalizeEmail_(user.Email)===email,'Email and UserID do not match.');
  require_(String(user.Status||'ACTIVE').toUpperCase()==='ACTIVE','User account is inactive.');
  return user;
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
function walletMailEscape_(v){
  return String(v===undefined||v===null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function walletMailMoney_(v){
  var n=Number(v||0);if(!isFinite(n))n=0;
  return '₹'+n.toLocaleString('en-IN',{maximumFractionDigits:2});
}
function walletMailAdminEmail_(){return 'trustedcircle2026@gmail.com';}
function walletMailBaseUrl_(){
  var u='';try{u=String(ScriptApp.getService().getUrl()||'');}catch(e){}
  return u||'https://script.google.com/macros/s/AKfycbxkIICfsVN783oq04KPBTN73ATEYaBuMXPaPCDsbnvP4uTHFDKH2wglKNAj2nWo5He9/exec';
}
function walletMailActionUrl_(raw,action){
  return walletMailBaseUrl_()+'?moneyWalletAction='+encodeURIComponent(action)+'&token='+encodeURIComponent(raw);
}
function walletMailButton_(label,url,bg){
  return '<a href="'+walletMailEscape_(url)+'" style="display:inline-block;margin:6px 8px 6px 0;padding:13px 20px;border-radius:10px;background:'+bg+';color:#fff;text-decoration:none;font-family:Arial,sans-serif;font-weight:700">'+walletMailEscape_(label)+'</a>';
}
function walletMailShell_(title,body){
  return '<div style="margin:0;padding:24px;background:#f4f7f5;font-family:Arial,sans-serif;color:#18241e"><div style="max-width:680px;margin:auto;background:#fff;border:1px solid #dfe8e2;border-radius:18px;overflow:hidden"><div style="padding:24px;background:#173c2a;color:#fff"><div style="font-size:23px;font-weight:800">Trusted Circle</div><div style="margin-top:5px;color:#dcebe2">Money Wallet Administration</div></div><div style="padding:24px"><h2 style="margin:0 0 18px;color:#173c2a">'+walletMailEscape_(title)+'</h2>'+body+'</div><div style="padding:15px 24px;background:#f5f8f6;color:#68736d;font-size:12px">Trusted Circle · System generated notification</div></div></div>';
}
function walletMailSend_(subject,html,text){
  var to=walletMailAdminEmail_();
  try{
    if(MailApp.getRemainingDailyQuota()<=0)throw new Error('MailApp daily quota exhausted.');
  }catch(q){}
  try{
    MailApp.sendEmail({to:to,subject:String(subject),htmlBody:String(html),body:String(text),name:'Trusted Circle',replyTo:'info@trustedcircle.in'});
    return true;
  }catch(mailError){console.error('Wallet MailApp failed: '+String(mailError&&mailError.message||mailError));}
  try{
    GmailApp.sendEmail(to,String(subject),String(text),{htmlBody:String(html),name:'Trusted Circle',replyTo:'info@trustedcircle.in'});
    return true;
  }catch(gmailError){console.error('Wallet GmailApp failed: '+String(gmailError&&gmailError.message||gmailError));}
  return false;
}
function moneyWalletAdminActions_(t){
  var received=moneyWalletActionToken_(t.TransactionID,'RECEIVED');
  var notReceived=moneyWalletActionToken_(t.TransactionID,'NOT_RECEIVED');
  var rejected=moneyWalletActionToken_(t.TransactionID,'REJECTED');
  var customer='';
  var u=findOne_(TC_CONFIG.SHEETS.USERS,'UserID',t.UserID);
  if(u&&u.Email)customer=String(u.Email);
  var amount=Number(t.Amount||0);
  var body='<p>A <b>Money Wallet Add Money</b> request requires your action.</p>'+
    '<table style="border-collapse:collapse;width:100%;font-size:14px;margin:18px 0">'+
    '<tr><td style="padding:9px;border-bottom:1px solid #edf1ee">Transaction ID</td><td style="padding:9px;border-bottom:1px solid #edf1ee"><b>'+walletMailEscape_(t.TransactionID)+'</b></td></tr>'+
    '<tr><td style="padding:9px;border-bottom:1px solid #edf1ee">Customer</td><td style="padding:9px;border-bottom:1px solid #edf1ee">'+walletMailEscape_(customer||'—')+'</td></tr>'+
    '<tr><td style="padding:9px;border-bottom:1px solid #edf1ee">Amount</td><td style="padding:9px;border-bottom:1px solid #edf1ee"><b>'+walletMailMoney_(amount)+'</b></td></tr>'+
    '<tr><td style="padding:9px">Payment Source</td><td style="padding:9px">Shopping Payment Link Stock</td></tr></table>'+
    '<div style="margin-top:22px">'+
    walletMailButton_('✓ Received',walletMailActionUrl_(received,'RECEIVED'),'#0f5132')+
    walletMailButton_('! Not Received',walletMailActionUrl_(notReceived,'NOT_RECEIVED'),'#a66a00')+
    walletMailButton_('✕ Rejected',walletMailActionUrl_(rejected,'REJECTED'),'#b42318')+
    '</div><p style="font-size:12px;color:#68736d;margin-top:18px">Use one button to update this transaction.</p>';
  var html=walletMailShell_('Money Wallet · Add Money',body);
  var text='Trusted Circle Money Wallet Add Money\n\nTransaction: '+t.TransactionID+'\nCustomer: '+(customer||'—')+'\nAmount: '+walletMailMoney_(amount)+'\n\nReceived: '+walletMailActionUrl_(received,'RECEIVED')+'\nNot Received: '+walletMailActionUrl_(notReceived,'NOT_RECEIVED')+'\nRejected: '+walletMailActionUrl_(rejected,'REJECTED');
  if(!walletMailSend_('Trusted Circle — Action Required · Money Wallet Add Money '+walletMailMoney_(amount),html,text))throw new Error('Wallet admin Add Money email failed.');
  return true;
}
function moneyWalletWithdrawalActions_(t){
  var approve=moneyWalletActionToken_(t.TransactionID,'WITHDRAW_APPROVE');
  var reject=moneyWalletActionToken_(t.TransactionID,'WITHDRAW_REJECT');
  var customer='';
  var u=findOne_(TC_CONFIG.SHEETS.USERS,'UserID',t.UserID);
  if(u&&u.Email)customer=String(u.Email);
  var amount=Number(t.Amount||0),upi=String(t.UPIId||'');
  var body='<p>A <b>Money Wallet Withdrawal</b> request requires your action.</p>'+
    '<table style="border-collapse:collapse;width:100%;font-size:14px;margin:18px 0">'+
    '<tr><td style="padding:9px;border-bottom:1px solid #edf1ee">Transaction ID</td><td style="padding:9px;border-bottom:1px solid #edf1ee"><b>'+walletMailEscape_(t.TransactionID)+'</b></td></tr>'+
    '<tr><td style="padding:9px;border-bottom:1px solid #edf1ee">Customer</td><td style="padding:9px;border-bottom:1px solid #edf1ee">'+walletMailEscape_(customer||'—')+'</td></tr>'+
    '<tr><td style="padding:9px;border-bottom:1px solid #edf1ee">Amount</td><td style="padding:9px;border-bottom:1px solid #edf1ee"><b>'+walletMailMoney_(amount)+'</b></td></tr>'+
    '<tr><td style="padding:9px">UPI ID</td><td style="padding:9px"><b>'+walletMailEscape_(upi||'—')+'</b></td></tr></table>'+
    '<div style="margin-top:22px">'+
    walletMailButton_('✓ Approve Withdrawal',walletMailActionUrl_(approve,'WITHDRAW_APPROVE'),'#0f5132')+
    walletMailButton_('✕ Reject Withdrawal',walletMailActionUrl_(reject,'WITHDRAW_REJECT'),'#b42318')+
    '</div><p style="font-size:12px;color:#68736d;margin-top:18px">Use one button to update this withdrawal.</p>';
  var html=walletMailShell_('Money Wallet · Withdrawal Request',body);
  var text='Trusted Circle Money Wallet Withdrawal\n\nTransaction: '+t.TransactionID+'\nCustomer: '+(customer||'—')+'\nAmount: '+walletMailMoney_(amount)+'\nUPI: '+upi+'\n\nApprove: '+walletMailActionUrl_(approve,'WITHDRAW_APPROVE')+'\nReject: '+walletMailActionUrl_(reject,'WITHDRAW_REJECT');
  if(!walletMailSend_('Trusted Circle — Action Required · Money Wallet Withdrawal '+walletMailMoney_(amount),html,text))throw new Error('Wallet admin Withdrawal email failed.');
  return true;
}
function moneyWalletAdd_(data){
  var user=walletUserFromIdentity_(data),amount=Number(data.amount);
  require_(TC_MONEY_WALLET.ADD.indexOf(amount)>=0,'Choose ₹500, ₹1,000, ₹1,500 or ₹2,000.');
  var tx,stock,w,balance,reserved,now;
  // IMPORTANT: MailApp/GmailApp is intentionally called OUTSIDE the wallet ScriptLock.
  // This prevents the real transaction flow from failing even when the email service
  // is slow or temporarily unavailable.
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    ensureMoneyWalletSheets_();
    var tid=newId_('TCMWTX');
    stock=moneyWalletReserveStock_(amount,tid);
    w=moneyWalletRow_(user.UserID);
    balance=Number(w.Balance||0);
    reserved=Number(w.ReservedBalance||0);
    now=isoNow_();
    tx={TransactionID:tid,UserID:user.UserID,Type:'ADD_MONEY',Amount:amount,Status:'PENDING_PAYMENT',BalanceBefore:balance,BalanceAfter:balance,ReservedBefore:reserved,ReservedAfter:reserved,UPIId:'',PaymentLink:stock.link,PaymentLinkStockID:stock.stockId,Attempt:1,ParentTransactionID:'',CreatedAt:now,UpdatedAt:now,CompletedAt:'',Notes:'Awaiting payment',AdminNote:''};
    appendRowObject_(TC_MONEY_WALLET.TX,tx);
  }finally{lock.releaseLock();}
  var adminEmailSent=true;
  try{
    moneyWalletAdminActions_(tx);
  }catch(e){
    adminEmailSent=false;
    appendRowObject_(TC_MONEY_WALLET.TX,{TransactionID:newId_('TCMWLOG'),UserID:user.UserID,Type:'SYSTEM',Amount:0,Status:'ADMIN_EMAIL_FAILED',BalanceBefore:balance,BalanceAfter:balance,ReservedBefore:reserved,ReservedAfter:reserved,UPIId:'',PaymentLink:'',PaymentLinkStockID:'',Attempt:1,ParentTransactionID:tx.TransactionID,CreatedAt:isoNow_(),UpdatedAt:isoNow_(),CompletedAt:'',Notes:String(e&&e.message||e),AdminNote:''});
  }
  return{paymentLink:stock.link,expiresAt:stock.expiresAt,adminEmailSent:adminEmailSent,transaction:moneyTxPublic_(tx),wallet:moneyWalletPublic_(user.UserID),data:{paymentLink:stock.link,expiresAt:stock.expiresAt,adminEmailSent:adminEmailSent,transaction:moneyTxPublic_(tx)}};
}

function moneyWalletRetryAdd_(data){
  var user=walletUserFromIdentity_(data),old=findOne_(TC_MONEY_WALLET.TX,'TransactionID',cleanText_(data.transactionId,100));
  require_(old&&String(old.UserID)===String(user.UserID),'Transaction not found.');
  require_(String(old.Status).toUpperCase()==='NOT_RECEIVED','Only a Not Received payment can be retried.');
  var tx,stock,w,balance,reserved,now;
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var tid=newId_('TCMWTX');
    stock=moneyWalletReserveStock_(Number(old.Amount),tid);
    w=moneyWalletRow_(user.UserID);
    balance=Number(w.Balance||0);
    reserved=Number(w.ReservedBalance||0);
    now=isoNow_();
    updateRowById_(TC_MONEY_WALLET.TX,'TransactionID',old.TransactionID,{Status:'RETRY_CREATED',UpdatedAt:now,Notes:'Retry created'});
    tx={TransactionID:tid,UserID:user.UserID,Type:'ADD_MONEY',Amount:Number(old.Amount),Status:'PENDING_PAYMENT',BalanceBefore:balance,BalanceAfter:balance,ReservedBefore:reserved,ReservedAfter:reserved,UPIId:'',PaymentLink:stock.link,PaymentLinkStockID:stock.stockId,Attempt:Number(old.Attempt||1)+1,ParentTransactionID:old.TransactionID,CreatedAt:now,UpdatedAt:now,CompletedAt:'',Notes:'Retry payment',AdminNote:''};
    appendRowObject_(TC_MONEY_WALLET.TX,tx);
  }finally{lock.releaseLock();}
  var adminEmailSent=true;
  try{
    moneyWalletAdminActions_(tx);
  }catch(e){
    adminEmailSent=false;
    appendRowObject_(TC_MONEY_WALLET.TX,{TransactionID:newId_('TCMWLOG'),UserID:user.UserID,Type:'SYSTEM',Amount:0,Status:'ADMIN_EMAIL_FAILED',BalanceBefore:balance,BalanceAfter:balance,ReservedBefore:reserved,ReservedAfter:reserved,UPIId:'',PaymentLink:'',PaymentLinkStockID:'',Attempt:Number(tx.Attempt||1),ParentTransactionID:tx.TransactionID,CreatedAt:isoNow_(),UpdatedAt:isoNow_(),CompletedAt:'',Notes:String(e&&e.message||e),AdminNote:''});
  }
  return{paymentLink:stock.link,expiresAt:stock.expiresAt,adminEmailSent:adminEmailSent,transaction:moneyTxPublic_(tx),wallet:moneyWalletPublic_(user.UserID),data:{paymentLink:stock.link,expiresAt:stock.expiresAt,adminEmailSent:adminEmailSent,transaction:moneyTxPublic_(tx)}};
}

function moneyWalletWithdraw_(data){
  var user=walletUserFromIdentity_(data),amount=Math.round(Number(data.amount||0)*100)/100,upi=cleanText_(data.upiId,200);
  require_(amount>0&&isFinite(amount),'Enter a valid withdrawal amount.');
  require_(/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/.test(upi),'Enter a valid UPI ID.');
  var tx,w,balance,reserved,now;
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    w=moneyWalletRow_(user.UserID);
    balance=Number(w.Balance||0);
    reserved=Number(w.ReservedBalance||0);
    require_(amount<=balance-reserved,'Insufficient available wallet balance.');
    now=isoNow_();var tid=newId_('TCMWTX');
    updateRowById_(TC_MONEY_WALLET.WALLET,'UserID',user.UserID,{ReservedBalance:reserved+amount,UpdatedAt:now});
    tx={TransactionID:tid,UserID:user.UserID,Type:'WITHDRAW',Amount:amount,Status:'WITHDRAWAL_REQUESTED',BalanceBefore:balance,BalanceAfter:balance,ReservedBefore:reserved,ReservedAfter:reserved+amount,UPIId:upi,PaymentLink:'',PaymentLinkStockID:'',Attempt:1,ParentTransactionID:'',CreatedAt:now,UpdatedAt:now,CompletedAt:'',Notes:'Withdrawal requested',AdminNote:''};
    appendRowObject_(TC_MONEY_WALLET.TX,tx);
  }finally{lock.releaseLock();}
  // Send the admin email after releasing ScriptLock.
  // The wallet reservation is already committed, so a mail-service delay cannot
  // break or block the financial transaction.
  try{
    moneyWalletWithdrawalActions_(tx);
  }catch(e){
    appendRowObject_(TC_MONEY_WALLET.TX,{TransactionID:newId_('TCMWLOG'),UserID:user.UserID,Type:'SYSTEM',Amount:0,Status:'ADMIN_EMAIL_FAILED',BalanceBefore:balance,BalanceAfter:balance,ReservedBefore:reserved,ReservedAfter:reserved,UPIId:upi,PaymentLink:'',PaymentLinkStockID:'',Attempt:1,ParentTransactionID:tx.TransactionID,CreatedAt:isoNow_(),UpdatedAt:isoNow_(),CompletedAt:'',Notes:String(e&&e.message||e),AdminNote:''});
  }
  return{transaction:moneyTxPublic_(tx),wallet:moneyWalletPublic_(user.UserID)};
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
  var now=new Date(),addId='TEST-ADD-'+newId_('TCMW'),withdrawId='TEST-WITHDRAW-'+newId_('TCMW');
  var addHtml=walletMailShell_('Money Wallet · Add Money — TEST','<p><b>TEST EMAIL ONLY</b>. No wallet transaction was created.</p><p>Transaction: '+walletMailEscape_(addId)+'</p><p>Amount: '+walletMailMoney_(500)+'</p><p>Sent at: '+walletMailEscape_(now.toString())+'</p>');
  var withdrawHtml=walletMailShell_('Money Wallet · Withdrawal — TEST','<p><b>TEST EMAIL ONLY</b>. No wallet transaction was created.</p><p>Transaction: '+walletMailEscape_(withdrawId)+'</p><p>Amount: '+walletMailMoney_(500)+'</p><p>UPI: test@upi</p><p>Sent at: '+walletMailEscape_(now.toString())+'</p>');
  var a=walletMailSend_('Trusted Circle — TEST · Money Wallet Add Money',addHtml,'TEST Add Money\nTransaction: '+addId+'\nAmount: ₹500');
  var w=walletMailSend_('Trusted Circle — TEST · Money Wallet Withdrawal',withdrawHtml,'TEST Withdrawal\nTransaction: '+withdrawId+'\nAmount: ₹500\nUPI: test@upi');
  if(!a||!w)throw new Error('Standalone wallet mailing test failed.');
  return{ok:true,to:walletMailAdminEmail_(),addMoneyEmail:a,withdrawalEmail:w,sentAt:now,remainingQuota:MailApp.getRemainingDailyQuota()};
}
