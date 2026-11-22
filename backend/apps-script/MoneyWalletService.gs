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
  return{transactionId:String(r.TransactionID||''),type:String(r.Type||''),amount:Number(r.Amount||0),status:String(r.Status||''),balanceBefore:Number(r.BalanceBefore||0),balanceAfter:Number(r.BalanceAfter||0),reservedBalance:Number(r.ReservedAfter||0),upiId:String(r.UPIId||''),paymentLinkLabel:String(r.PaymentProvider||'').toUpperCase()==='RAZORPAY'?'Razorpay Checkout':'Shopping Payment Link',paymentLink:String(r.PaymentLink||''),paymentProvider:String(r.PaymentProvider||''),gatewayOrderId:String(r.GatewayOrderID||''),attempt:Number(r.Attempt||1),parentTransactionId:String(r.ParentTransactionID||''),createdAt:r.CreatedAt,updatedAt:r.UpdatedAt,completedAt:r.CompletedAt||'',notes:String(r.Notes||'')};
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
function processPendingMoneyWalletPaytmStatuses_(){
  // Only assigned Paytm stock links can be verified automatically. Manual UPI
  // requests have no Paytm payment-link page and remain pending for manual review.
  var pending=getRows_(TC_MONEY_WALLET.TX).filter(function(t){
    return String(t.Type||'').toUpperCase()==='ADD_MONEY'&&
      String(t.Status||'').toUpperCase()==='PENDING_PAYMENT'&&
      String(t.PaymentLinkStockID||'').trim()!==''&&
      /^https?:\/\//i.test(String(t.PaymentLink||''));
  });
  pending.sort(function(a,b){return new Date(a.CreatedAt||0).getTime()-new Date(b.CreatedAt||0).getTime();});
  pending.slice(0,20).forEach(function(tx){
    try{
      var result=verifyPaytmLinkStatus_({paymentLink:String(tx.PaymentLink)});
      if(String(result&&result.status||'').toUpperCase()!=='PAID')return;
      var lock=LockService.getScriptLock();lock.waitLock(15000);
      var completed=null;
      try{
        var fresh=findOne_(TC_MONEY_WALLET.TX,'TransactionID',tx.TransactionID);
        if(!fresh||String(fresh.Type||'').toUpperCase()!=='ADD_MONEY'||String(fresh.Status||'').toUpperCase()!=='PENDING_PAYMENT')return;
        if(!fresh.PaymentLinkStockID||!/^https?:\/\//i.test(String(fresh.PaymentLink||'')))return;
        var amount=Number(fresh.Amount||0);
        if(!isFinite(amount)||amount<=0)return;
        var wallet=moneyWalletRow_(fresh.UserID),balance=Number(wallet.Balance||0),now=isoNow_();
        moneyWalletConsumeStock_(fresh);
        var after=balance+amount;
        updateRowById_(TC_MONEY_WALLET.WALLET,'UserID',fresh.UserID,{Balance:after,TotalAdded:Number(wallet.TotalAdded||0)+amount,UpdatedAt:now});
        updateRowById_(TC_MONEY_WALLET.TX,'TransactionID',fresh.TransactionID,{
          Status:'COMPLETED',BalanceBefore:balance,BalanceAfter:after,UpdatedAt:now,CompletedAt:now,
          Notes:'Payment automatically verified from Paytm success indicator'
        });
        completed=findOne_(TC_MONEY_WALLET.TX,'TransactionID',fresh.TransactionID)||fresh;
        if(typeof appendAudit_==='function')appendAudit_('SYSTEM','MONEY_WALLET_PAYTM_AUTO_MARKED_PAID','MoneyWallet',fresh.TransactionID,{amount:amount,source:'SCHEDULED_PAYTM_STATUS'});
      }finally{lock.releaseLock();}
      if(completed){
        try{notifyWalletTransaction_(completed.UserID,'Money Wallet','Add Money',Number(completed.Amount||0),'COMPLETED','Payment automatically verified',completed.TransactionID,'');}
        catch(notifyError){console.error('Wallet customer notification failed: '+String(notifyError&&notifyError.message||notifyError));}
        try{moneyWalletPaytmPaidInfoEmail_(completed);}
        catch(mailError){console.error('Wallet paid information email failed: '+String(mailError&&mailError.message||mailError));}
      }
    }catch(err){console.error('Wallet Paytm status check failed for '+String(tx.TransactionID)+': '+String(err&&err.message||err));}
  });
}
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
  // Informational email only when a wallet top-up payment link is created.
  // Payment status is checked automatically; no email action buttons are required.
  var customer='',u=findOne_(TC_CONFIG.SHEETS.USERS,'UserID',t.UserID);
  if(u&&u.Email)customer=String(u.Email);
  var amount=Number(t.Amount||0),link=String(t.PaymentLink||'');
  var source=String(t.PaymentProvider||'').toUpperCase()==='RAZORPAY'?'Razorpay Checkout Order':(t.PaymentLinkStockID?'Paytm Payment Link':'Legacy payment request');
  var instructions=String(t.PaymentProvider||'').toUpperCase()==='RAZORPAY'?'Razorpay will notify Trusted Circle after the order payment is captured. The wallet is credited only after the signed webhook is verified.':'This is a legacy payment request. New Money Wallet top-ups use dynamic Razorpay Orders and do not reserve payment-link stock.';
  var body='<p>A <b>Money Wallet Add Money</b> payment request has been created.</p>'+
    '<table style="border-collapse:collapse;width:100%;font-size:14px;margin:18px 0">'+
    '<tr><td style="padding:9px;border-bottom:1px solid #edf1ee">Transaction ID</td><td style="padding:9px;border-bottom:1px solid #edf1ee"><b>'+walletMailEscape_(t.TransactionID)+'</b></td></tr>'+
    '<tr><td style="padding:9px;border-bottom:1px solid #edf1ee">Customer</td><td style="padding:9px;border-bottom:1px solid #edf1ee">'+walletMailEscape_(customer||'—')+'</td></tr>'+
    '<tr><td style="padding:9px;border-bottom:1px solid #edf1ee">Amount</td><td style="padding:9px;border-bottom:1px solid #edf1ee"><b>'+walletMailMoney_(amount)+'</b></td></tr>'+
    '<tr><td style="padding:9px">Payment Source</td><td style="padding:9px">'+walletMailEscape_(source)+'</td></tr></table>'+
    '<p>'+walletMailEscape_(instructions)+'</p>'+
    (link&&!/^upi:\/\//i.test(link)?'<p><a href="'+walletMailEscape_(link)+'">Open Paytm payment link</a></p>':'');
  var html=walletMailShell_('Money Wallet · Add Money Request Created',body);
  var text='Trusted Circle Money Wallet Add Money request created.\nTransaction: '+t.TransactionID+'\nCustomer: '+(customer||'—')+'\nAmount: '+walletMailMoney_(amount)+'\nSource: '+source+'\n'+instructions+'\nPayment link: '+link;
  if(!walletMailSend_('Trusted Circle — Money Wallet Payment Request Created '+walletMailMoney_(amount),html,text))throw new Error('Wallet admin Add Money information email failed.');
  return true;
}
function moneyWalletPaytmPaidInfoEmail_(t){
  var customer='',u=findOne_(TC_CONFIG.SHEETS.USERS,'UserID',t.UserID);
  if(u&&u.Email)customer=String(u.Email);
  var amount=Number(t.Amount||0),link=String(t.PaymentLink||'');
  var body='<p>The system detected Paytm\'s successful-payment indicator and automatically marked this wallet top-up as <b>PAID</b>.</p>'+
    '<table style="border-collapse:collapse;width:100%;font-size:14px;margin:18px 0">'+
    '<tr><td style="padding:9px;border-bottom:1px solid #edf1ee">Transaction ID</td><td style="padding:9px;border-bottom:1px solid #edf1ee"><b>'+walletMailEscape_(t.TransactionID)+'</b></td></tr>'+
    '<tr><td style="padding:9px;border-bottom:1px solid #edf1ee">Customer</td><td style="padding:9px;border-bottom:1px solid #edf1ee">'+walletMailEscape_(customer||'—')+'</td></tr>'+
    '<tr><td style="padding:9px;border-bottom:1px solid #edf1ee">Amount</td><td style="padding:9px;border-bottom:1px solid #edf1ee"><b>'+walletMailMoney_(amount)+'</b></td></tr>'+
    '<tr><td style="padding:9px">Wallet Status</td><td style="padding:9px"><b>COMPLETED — Money Wallet credited</b></td></tr></table>'+
    '<p>Please verify the transaction manually in Paytm Business records when convenient. No action is required from this email.</p>'+
    (link&&!/^upi:\/\//i.test(link)?'<p><a href="'+walletMailEscape_(link)+'">Open Paytm payment link</a></p>':'');
  var html=walletMailShell_('Money Wallet · Automatically Marked Paid',body);
  var text='Money Wallet payment marked PAID automatically after Paytm success-indicator detection.\nTransaction: '+t.TransactionID+'\nCustomer: '+(customer||'—')+'\nAmount: '+walletMailMoney_(amount)+'\nWallet Status: COMPLETED — Money Wallet credited\nPlease verify manually in Paytm Business records. No action is required.\nPayment link: '+link;
  return walletMailSend_('Trusted Circle — Wallet Payment Marked PAID Automatically '+walletMailMoney_(amount),html,text);
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
  // Money Wallet top-ups now use dynamic Razorpay Orders only. No finite
  // PaymentLinkStock reservation or fixed Razorpay Payment Button is involved.
  return moneyWalletAddRazorpay_(data);
}

function moneyWalletRetryAdd_(data){
  var user=walletUserFromIdentity_(data),old=findOne_(TC_MONEY_WALLET.TX,'TransactionID',cleanText_(data.transactionId,100));
  require_(old&&String(old.UserID)===String(user.UserID),'Transaction not found.');
  require_(['PAYMENT_FAILED','NOT_RECEIVED','PAYMENT_SETUP_FAILED'].indexOf(String(old.Status||'').toUpperCase())>=0,'Only a failed or not-received payment can be retried.');
  updateRowById_(TC_MONEY_WALLET.TX,'TransactionID',old.TransactionID,{Status:'RETRY_CREATED',UpdatedAt:isoNow_(),Notes:'Razorpay retry initiated'});
  return moneyWalletAddRazorpay_({email:user.Email,userId:user.UserID,amount:Number(old.Amount),contact:data.contact||old.GatewayContact,parentTransactionId:old.TransactionID});
}

function moneyWalletCancelAdd_(data){
 var user=walletUserFromIdentity_(data),id=cleanText_(data.transactionId,100),tx=findOne_(TC_MONEY_WALLET.TX,'TransactionID',id);
 require_(tx&&String(tx.UserID)===String(user.UserID),'Wallet transaction was not found.');
 require_(String(tx.Type).toUpperCase()==='ADD_MONEY','Only Add Money requests can be cancelled.');
 require_(String(tx.Status).toUpperCase()==='PENDING_PAYMENT','Only pending payment requests can be cancelled.');
 var now=isoNow_();updateRowById_(TC_MONEY_WALLET.TX,'TransactionID',id,{Status:'CANCELLED',UpdatedAt:now,Notes:'Cancelled by customer'});
 return{transaction:moneyTxPublic_(findOne_(TC_MONEY_WALLET.TX,'TransactionID',id)),wallet:moneyWalletPublic_(user.UserID)};
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


/* RAZORPAY PAYMENT BUTTON → WEBHOOK → MONEY WALLET */
function ensureMoneyWalletRazorpaySchema_(){
  ensureMoneyWalletSheets_();
  var ss=getSpreadsheet_(),tx=ss.getSheetByName(TC_MONEY_WALLET.TX);
  var extra=['PaymentProvider','GatewayOrderID','GatewayPaymentID','GatewayEventID','GatewayEmail','GatewayContact','GatewayAmountPaise'];
  var headers=tx.getRange(1,1,1,Math.max(1,tx.getLastColumn())).getValues()[0].map(String);
  extra.forEach(function(name){if(headers.indexOf(name)<0){tx.getRange(1,tx.getLastColumn()+1).setValue(name);headers.push(name);}});
  ensureSheet_('MoneyWalletWebhookEvents',['EventID','EventType','PaymentID','OrderID','Email','Contact','AmountPaise','Currency','ProcessingStatus','TransactionID','ReceivedAt','Details']);
}
function razorpayDigits_(value){var digits=String(value||'').replace(/\D/g,'');if(digits.length===12&&digits.indexOf('91')===0)digits=digits.slice(2);if(digits.length===11&&digits.charAt(0)==='0')digits=digits.slice(1);return digits;}
function razorpayPhoneMatch_(value){
  var digits=razorpayDigits_(value);
  if(digits.length===12&&digits.indexOf('91')===0)digits=digits.slice(2);
  if(digits.length===11&&digits.charAt(0)==='0')digits=digits.slice(1);
  return digits;
}
function moneyWalletAddRazorpay_(data){
  var user=walletUserFromIdentity_(data);
  var amount=Math.round(Number(data.amount||0)*100)/100;
  var contact=razorpayPhoneMatch_(data.contact||data.mobile||'');
  require_(TC_MONEY_WALLET.ADD.indexOf(amount)>=0,'Choose ₹500, ₹1,000, ₹1,500 or ₹2,000.');
  require_(isValidEmail_(normalizeEmail_(user.Email)),'A valid account email is required for Razorpay Checkout.');
  require_(contact.length>=10&&contact.length<=15,'Enter a valid mobile number (10 to 15 digits).');
  var props=getScriptProperties_();
  var keyId=String(props.getProperty('RAZORPAY_KEY_ID')||'').trim();
  var keySecret=String(props.getProperty('RAZORPAY_KEY_SECRET')||'').trim();
  require_(keyId&&keySecret,'Razorpay API credentials are not configured in Apps Script Script Properties.');
  var tx,now=isoNow_(),lock=LockService.getScriptLock();
  lock.waitLock(20000);
  try{
    ensureMoneyWalletRazorpaySchema_();
    var existing=getRows_(TC_MONEY_WALLET.TX).filter(function(row){
      return String(row.UserID)===String(user.UserID)&&String(row.Type).toUpperCase()==='ADD_MONEY'&&
        String(row.PaymentProvider||'').toUpperCase()==='RAZORPAY'&&
        ['PENDING_PAYMENT','PAYMENT_REVIEW'].indexOf(String(row.Status).toUpperCase())>=0;
    });
    require_(existing.length===0,'You already have a Razorpay wallet payment awaiting confirmation or review. Check its status before starting another payment.');
    var wallet=moneyWalletRow_(user.UserID),balance=Number(wallet.Balance||0),tid=newId_('TCMWTX');
    tx={
      TransactionID:tid,UserID:user.UserID,Type:'ADD_MONEY',Amount:amount,Status:'PENDING_PAYMENT',
      BalanceBefore:balance,BalanceAfter:balance,ReservedBefore:Number(wallet.ReservedBalance||0),
      ReservedAfter:Number(wallet.ReservedBalance||0),UPIId:'',PaymentLink:'',PaymentLinkStockID:'',
      Attempt:1,ParentTransactionID:String(data.parentTransactionId||''),CreatedAt:now,UpdatedAt:now,CompletedAt:'',
      Notes:'Awaiting Razorpay Order payment and signed webhook verification',AdminNote:'',
      PaymentProvider:'RAZORPAY',GatewayOrderID:'',GatewayPaymentID:'',GatewayEventID:'',
      GatewayEmail:normalizeEmail_(user.Email),GatewayContact:contact,GatewayAmountPaise:''
    };
    appendRowObject_(TC_MONEY_WALLET.TX,tx);
  }finally{lock.releaseLock();}

  var orderResponse;
  try{
    var orderPayload={amount:Math.round(amount*100),currency:'INR',receipt:String(tx.TransactionID).slice(0,40),
      notes:{wallet_transaction_id:String(tx.TransactionID),trusted_circle_user_id:String(user.UserID)}};
    var response=UrlFetchApp.fetch('https://api.razorpay.com/v1/orders',{
      method:'post',contentType:'application/json',
      headers:{Authorization:'Basic '+Utilities.base64Encode(keyId+':'+keySecret)},
      payload:JSON.stringify(orderPayload),muteHttpExceptions:true
    });
    var status=response.getResponseCode(),body=response.getContentText()||'';
    orderResponse=safeJsonParse_(body)||{};
    if(status<200||status>=300||!orderResponse.id)throw new Error(orderResponse.error&&orderResponse.error.description||'Razorpay could not create the payment order.');
  }catch(orderError){
    updateRowById_(TC_MONEY_WALLET.TX,'TransactionID',tx.TransactionID,{Status:'PAYMENT_SETUP_FAILED',UpdatedAt:isoNow_(),Notes:'Razorpay order creation failed: '+String(orderError&&orderError.message||orderError)});
    throw new Error('Could not create Razorpay order. '+String(orderError&&orderError.message||orderError));
  }
  var orderId=String(orderResponse.id);
  updateRowById_(TC_MONEY_WALLET.TX,'TransactionID',tx.TransactionID,{GatewayOrderID:orderId,UpdatedAt:isoNow_()});
  tx.GatewayOrderID=orderId;
  var adminEmailSent=true;
  try{moneyWalletAdminActions_(tx);}catch(mailError){adminEmailSent=false;console.error('Razorpay wallet request email failed: '+String(mailError&&mailError.message||mailError));}
  var razorpayOrder={keyId:keyId,orderId:orderId,amount:Math.round(amount*100),currency:'INR',
    name:'Trusted Circle',description:'Money Wallet Top-up',prefill:{email:normalizeEmail_(user.Email),contact:contact},
    transactionId:String(tx.TransactionID)};
  return{paymentLink:'',expiresAt:'',adminEmailSent:adminEmailSent,transaction:moneyTxPublic_(tx),wallet:moneyWalletPublic_(user.UserID),
    razorpayOrder:razorpayOrder,data:{transaction:moneyTxPublic_(tx),razorpayOrder:razorpayOrder,adminEmailSent:adminEmailSent}};
}

/**
 * Internal webhook receiver. Only the AWS Lambda function may call this action.
 * Lambda verifies X-Razorpay-Signature against the raw request body first.
 * Script Property required: WALLET_RAZORPAY_INTERNAL_SECRET.
 */
function moneyWalletRazorpayWebhook_(data){
  var internalSecret=String(getScriptProperties_().getProperty('WALLET_RAZORPAY_INTERNAL_SECRET')||'');
  require_(internalSecret,'Wallet Razorpay webhook is not configured.');
  require_(constantTimeEquals_(String(data.webhookSecret||''),internalSecret),'Invalid internal wallet webhook secret.');
  ensureMoneyWalletRazorpaySchema_();
  var p=data.payment||{},eventType=String(data.event||'').toLowerCase();
  var paymentId=cleanText_(p.id||data.paymentId,120),eventId=cleanText_(data.eventId||'',180)||('evt_'+paymentId+'_'+eventType);
  var email=normalizeEmail_(p.email||data.email),contact=razorpayDigits_(p.contact||data.contact);
  var amountPaise=Math.round(Number(p.amount||data.amountPaise||0)),currency=String(p.currency||data.currency||'INR').toUpperCase();
  var paymentStatus=String(p.status||data.status||'').toLowerCase();
  require_(paymentId,'Razorpay payment ID is missing.');
  require_(isValidEmail_(email),'Razorpay checkout email is missing or invalid.');
  require_(contact.length>=10&&contact.length<=15,'Razorpay checkout mobile number is missing or invalid.');
  require_(Number.isFinite(amountPaise)&&amountPaise>0,'Razorpay payment amount is invalid.');
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  var completed=null,result;
  try{
    var logged=getRows_('MoneyWalletWebhookEvents');
    if(logged.some(function(x){return String(x.EventID)===eventId;}))return{ok:true,duplicate:true,eventId:eventId};
    var allTx=getRows_(TC_MONEY_WALLET.TX);
    var prior=allTx.find(function(x){return String(x.GatewayPaymentID||'')===paymentId;});
    if(prior){
      appendRowObject_('MoneyWalletWebhookEvents',{EventID:eventId,EventType:eventType,PaymentID:paymentId,OrderID:cleanText_(p.orderId||p.order_id||'',120),Email:email,Contact:contact,AmountPaise:amountPaise,Currency:currency,ProcessingStatus:'DUPLICATE_PAYMENT_ID',TransactionID:prior.TransactionID,ReceivedAt:isoNow_(),Details:'Payment ID already recorded'});
      return{ok:true,duplicate:true,transactionId:prior.TransactionID};
    }
    var isCaptured=eventType==='payment.captured'||eventType==='order.paid'||paymentStatus==='captured';
    var isFailed=eventType==='payment.failed'||paymentStatus==='failed';
    if(!isCaptured&&!isFailed){
      appendRowObject_('MoneyWalletWebhookEvents',{EventID:eventId,EventType:eventType,PaymentID:paymentId,OrderID:cleanText_(p.orderId||p.order_id||'',120),Email:email,Contact:contact,AmountPaise:amountPaise,Currency:currency,ProcessingStatus:'IGNORED_EVENT',TransactionID:'',ReceivedAt:isoNow_(),Details:'Event does not represent a captured or failed payment'});
      return{ok:true,ignored:true,eventId:eventId};
    }
    var orderId=cleanText_(p.orderId||p.order_id||data.orderId,120);
    var candidates=allTx.filter(function(x){
      var age=Date.now()-new Date(x.CreatedAt||0).getTime();
      var status=String(x.Status||'').toUpperCase();
      var storedOrderId=String(x.GatewayOrderID||'');
      // New dynamic Orders must match exactly. Legacy Payment Button attempts
      // have no stored Order ID and are matched only when all other fields are unique.
      var sameOrder=storedOrderId?storedOrderId===orderId:true;
      return String(x.Type).toUpperCase()==='ADD_MONEY'&&
        ['PENDING_PAYMENT','PAYMENT_FAILED'].indexOf(status)>=0&&
        String(x.PaymentProvider||'').toUpperCase()==='RAZORPAY'&&
        normalizeEmail_(x.GatewayEmail)===email&&razorpayPhoneMatch_(x.GatewayContact)===contact&&
        sameOrder&&age>=-60000&&age<=24*60*60*1000;
    });
    var matching=candidates.filter(function(x){return Math.round(Number(x.Amount||0)*100)===amountPaise;});
    if(matching.length!==1){
      var reason=matching.length>1?'AMBIGUOUS_PENDING_TRANSACTIONS':(candidates.length?'PAYMENT_AMOUNT_MISMATCH':'NO_MATCHING_WALLET_TRANSACTION');
      if(candidates.length&&matching.length===0){
        candidates.forEach(function(x){updateRowById_(TC_MONEY_WALLET.TX,'TransactionID',x.TransactionID,{Status:'PAYMENT_AMOUNT_MISMATCH',GatewayPaymentID:paymentId,GatewayEventID:eventId,GatewayEmail:email,GatewayContact:contact,GatewayAmountPaise:amountPaise,UpdatedAt:isoNow_(),Notes:'Razorpay amount did not match the requested wallet top-up. No balance was credited.'});});
      }
      appendRowObject_('MoneyWalletWebhookEvents',{EventID:eventId,EventType:eventType,PaymentID:paymentId,OrderID:cleanText_(p.orderId||p.order_id||'',120),Email:email,Contact:contact,AmountPaise:amountPaise,Currency:currency,ProcessingStatus:reason,TransactionID:candidates.length===1?candidates[0].TransactionID:'',ReceivedAt:isoNow_(),Details:'No wallet credit performed'});
      return{ok:true,credited:false,reason:reason};
    }
    var tx=matching[0],profile=findOne_(TC_CONFIG.SHEETS.USERS,'UserID',tx.UserID);
    var profilePhone=razorpayPhoneMatch_(profile&&(profile.Mobile||profile.MobileNo||profile.MobileNumber||profile.Phone||profile.PhoneNumber||profile.Contact)||'');
    if((profilePhone&&profilePhone!==contact)||razorpayPhoneMatch_(tx.GatewayContact)!==contact){
      updateRowById_(TC_MONEY_WALLET.TX,'TransactionID',tx.TransactionID,{Status:'PAYMENT_REVIEW',GatewayPaymentID:paymentId,GatewayEventID:eventId,GatewayEmail:email,GatewayContact:contact,GatewayAmountPaise:amountPaise,UpdatedAt:isoNow_(),Notes:'Razorpay mobile number did not match the registered account mobile. Manual review required.'});
      appendRowObject_('MoneyWalletWebhookEvents',{EventID:eventId,EventType:eventType,PaymentID:paymentId,OrderID:cleanText_(p.orderId||p.order_id||'',120),Email:email,Contact:contact,AmountPaise:amountPaise,Currency:currency,ProcessingStatus:'MOBILE_MISMATCH_REVIEW',TransactionID:tx.TransactionID,ReceivedAt:isoNow_(),Details:'No wallet credit performed'});
      return{ok:true,credited:false,reason:'MOBILE_MISMATCH_REVIEW'};
    }
    if(isFailed){
      updateRowById_(TC_MONEY_WALLET.TX,'TransactionID',tx.TransactionID,{Status:'PAYMENT_FAILED',GatewayPaymentID:paymentId,GatewayEventID:eventId,GatewayEmail:email,GatewayContact:contact,GatewayAmountPaise:amountPaise,UpdatedAt:isoNow_(),Notes:'Razorpay reported payment failed'});
      appendRowObject_('MoneyWalletWebhookEvents',{EventID:eventId,EventType:eventType,PaymentID:paymentId,OrderID:cleanText_(p.orderId||p.order_id||'',120),Email:email,Contact:contact,AmountPaise:amountPaise,Currency:currency,ProcessingStatus:'PAYMENT_FAILED',TransactionID:tx.TransactionID,ReceivedAt:isoNow_(),Details:'Payment failed; wallet not credited'});
      return{ok:true,credited:false,reason:'PAYMENT_FAILED'};
    }
    require_(currency==='INR','Only INR Razorpay wallet payments are accepted.');
    require_(paymentStatus==='captured'||eventType==='payment.captured'||eventType==='order.paid','Razorpay payment is not captured.');
    var wallet=moneyWalletRow_(tx.UserID),before=Number(wallet.Balance||0),credit=Number(tx.Amount||0),after=before+credit,now=isoNow_();
    updateRowById_(TC_MONEY_WALLET.WALLET,'UserID',tx.UserID,{Balance:after,TotalAdded:Number(wallet.TotalAdded||0)+credit,UpdatedAt:now});
    updateRowById_(TC_MONEY_WALLET.TX,'TransactionID',tx.TransactionID,{
      Status:'COMPLETED',BalanceBefore:before,BalanceAfter:after,UpdatedAt:now,CompletedAt:now,
      GatewayPaymentID:paymentId,GatewayEventID:eventId,GatewayEmail:email,GatewayContact:contact,
      GatewayAmountPaise:amountPaise,Notes:'Razorpay payment captured and verified by signed webhook'
    });
    completed=findOne_(TC_MONEY_WALLET.TX,'TransactionID',tx.TransactionID)||tx;
    appendRowObject_('MoneyWalletWebhookEvents',{EventID:eventId,EventType:eventType,PaymentID:paymentId,OrderID:cleanText_(p.orderId||p.order_id||'',120),Email:email,Contact:contact,AmountPaise:amountPaise,Currency:currency,ProcessingStatus:'CREDITED',TransactionID:tx.TransactionID,ReceivedAt:now,Details:'Wallet credited '+credit});
    result={ok:true,credited:true,transactionId:tx.TransactionID,amount:credit};
  }finally{lock.releaseLock();}
  if(completed){
    try{notifyWalletTransaction_(completed.UserID,'Money Wallet','Add Money',Number(completed.Amount||0),'COMPLETED','Razorpay payment captured and verified',completed.TransactionID,paymentId);}catch(e){console.error('Razorpay wallet notification failed: '+String(e&&e.message||e));}
  }
  return result||{ok:true,received:true};
}
