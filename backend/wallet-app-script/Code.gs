/**
 * TRUSTED CIRCLE - WALLET SERVICES
 * Separate Apps Script backend for the Wallet Services Google Sheet.
 *
 * Script Properties:
 * SPREADSHEET_ID = 1Q5-xDelfCBiYldQAnToDTuQRy4c_rZlHoDvtsaP1mNI
 * ADMIN_EMAIL = trustedcircle2026@gmail.com
 * SHOPPING_PAYMENT_API_URL = existing Shopping Apps Script /exec URL
 * SHOPPING_PAYMENT_BRIDGE_SECRET = same value as Shopping WALLET_BRIDGE_SECRET
 *
 * First run: setupBackend
 */
var W={
  ADD:[500,1000,1500,2000],OTP_MS:600000,SESSION_MS:3600000,ACTION_MS:86400000,
  S:{U:'WalletUsers',O:'WalletOTP',S:'WalletSessions',W:'Wallets',T:'WalletTransactions',P:'WalletPaymentLinks',A:'WalletAdminActions',L:'WalletAuditLogs'}
};
function doGet(e){try{return e&&e.parameter&&e.parameter.adminAction?adminAction_(e.parameter):json_(route_(e&&e.parameter||{}));}catch(x){return json_({ok:false,error:x.message});}}
function doPost(e){try{return json_(route_(parse_(e)));}catch(x){return json_({ok:false,error:x.message});}}
function route_(d){
  var a=String(d.action||'health');
  if(a==='health')return{ok:true,service:'Trusted Circle Wallet Services',version:'1.0.0',status:'ok'};
  if(a==='setupBackend')return setup_();
  if(a==='requestOtp')return otpRequest_(d);
  if(a==='verifyOtp')return otpVerify_(d);
  if(a==='me')return{ok:true,data:{user:pubUser_(auth_(d.token))}};
  if(a==='wallet')return wallet_(d);
  if(a==='walletOrders')return orders_(d);
  if(a==='transactionStatus')return txStatus_(d);
  if(a==='addMoney')return add_(d);
  if(a==='retryAddMoney')return retry_(d);
  if(a==='withdrawMoney')return withdraw_(d);
  if(a==='logout')return{ok:true,data:{loggedOut:logout_(d.token)}};
  if(a==='adminAddPaymentLink')return adminAddPaymentLink_(d);
  if(a==='adminAddPaymentLinkBulk')return adminAddPaymentLinkBulk_(d);
  if(a==='adminPaymentStock')return adminPaymentStock_(d);
  if(a==='adminRemovePaymentLink')return adminRemovePaymentLink_(d);
  throw new Error('Unknown Wallet API action: '+a);
}

/* SHEETS */
function p_(){return PropertiesService.getScriptProperties();}
function ss_(){return SpreadsheetApp.openById(p_().getProperty('SPREADSHEET_ID')||'1Q5-xDelfCBiYldQAnToDTuQRy4c_rZlHoDvtsaP1mNI');}
function setup_(){
  var d={};
  d[W.S.U]=['UserID','Email','Name','Status','CreatedAt','UpdatedAt','LastLoginAt'];
  d[W.S.O]=['OTPId','Email','OtpHash','ExpiresAt','UsedAt','CreatedAt','LastSentAt'];
  d[W.S.S]=['SessionID','UserID','TokenHash','ExpiresAt','CreatedAt','RevokedAt','Status'];
  d[W.S.W]=['WalletID','UserID','Balance','ReservedBalance','Currency','Status','CreatedAt','UpdatedAt'];
  d[W.S.T]=['TransactionID','UserID','Type','Amount','Status','BalanceBefore','BalanceAfter','UPIId','PaymentLink','PaymentLinkLabel','PaymentReservationId','Attempt','ParentTransactionID','CreatedAt','UpdatedAt','CompletedAt','Notes','AdminNote'];
  d[W.S.P]=['PaymentLinkStockID','Denomination','Link','Label','Status','WalletTransactionID','ReservedAt','ExpiresAt','UsedAt','CreatedAt','UpdatedAt','Notes'];
  d[W.S.A]=['ActionID','TransactionID','Action','TokenHash','ExpiresAt','UsedAt','CreatedAt'];
  d[W.S.L]=['AuditID','UserID','TransactionID','Action','Actor','Metadata','CreatedAt'];
  Object.keys(d).forEach(function(n){var sh=ss_().getSheetByName(n)||ss_().insertSheet(n);if(sh.getLastRow()===0)sh.getRange(1,1,1,d[n].length).setValues([d[n]]);});
  return{ok:true,message:'Wallet backend setup completed.',spreadsheetId:ss_().getId(),sheets:Object.keys(d)};
}
function rows_(n){var sh=ss_().getSheetByName(n);if(!sh||sh.getLastRow()<2)return[];var v=sh.getDataRange().getValues(),h=v[0].map(String);return v.slice(1).filter(function(r){return r.some(function(x){return x!=='';});}).map(function(r){var o={};h.forEach(function(k,i){o[k]=r[i];});return o;});}
function addRow_(n,o){var sh=ss_().getSheetByName(n);if(!sh)throw new Error('Run setupBackend first. Missing sheet: '+n);var h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];sh.appendRow(h.map(function(k){return o[k]===undefined?'':o[k];}));}
function upd_(n,key,val,patch){var sh=ss_().getSheetByName(n),v=sh.getDataRange().getValues(),h=v[0].map(String),c=h.indexOf(key);for(var r=1;r<v.length;r++)if(String(v[r][c])===String(val)){Object.keys(patch).forEach(function(k){var i=h.indexOf(k);if(i>=0)sh.getRange(r+1,i+1).setValue(patch[k]);});return true;}return false;}
function find_(n,k,v){var a=rows_(n);for(var i=0;i<a.length;i++)if(String(a[i][k])===String(v))return a[i];return null;}
function id_(p){return p+'_'+Utilities.getUuid().replace(/-/g,'').slice(0,20);}
function now_(){return new Date().toISOString();}
function clean_(v,n){return String(v==null?'':v).trim().slice(0,n||500);}
function email_(v){return clean_(v,200).toLowerCase();}
function hash_(v){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(v),Utilities.Charset.UTF_8));}
function token_(){return Utilities.getUuid()+'.'+Utilities.getUuid();}
function req_(x,m){if(!x)throw new Error(m);}
function same_(a,b){a=String(a||'');b=String(b||'');if(a.length!==b.length)return false;var x=0;for(var i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0;}
function json_(x){return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON);}
function parse_(e){var b=e&&e.postData&&e.postData.contents;if(b){try{return JSON.parse(b);}catch(z){}}return e&&e.parameter||{};}

/* AUTH */
function otpRequest_(d){
  var em=email_(d.email);req_(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em),'Enter a valid email address.');
  var old=rows_(W.S.O).filter(function(x){return email_(x.Email)===em;}).pop();
  if(old&&old.LastSentAt&&Date.now()-new Date(old.LastSentAt).getTime()<60000)throw new Error('Please wait before requesting another OTP.');
  var otp=String(Math.floor(100000+Math.random()*900000));
  addRow_(W.S.O,{OTPId:id_('WOTP'),Email:em,OtpHash:hash_(otp),ExpiresAt:new Date(Date.now()+W.OTP_MS).toISOString(),UsedAt:'',CreatedAt:now_(),LastSentAt:now_()});
  MailApp.sendEmail({to:em,subject:'Trusted Circle Wallet Services - Login OTP',name:'Trusted Circle',replyTo:'info@trustedcircle.in',
    body:'Your Wallet Services OTP is '+otp+'. It expires in 10 minutes. Do not share it.',
    htmlBody:'<div style="font-family:Arial;padding:24px"><h2>Trusted Circle Wallet Services</h2><p>Your OTP is:</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f3f6f4;text-align:center">'+otp+'</div><p>Expires in 10 minutes. Do not share this OTP.</p></div>'});
  return{ok:true,data:{sent:true,email:em,expiresInSeconds:600}};
}
function otpVerify_(d){
  var em=email_(d.email),otp=clean_(d.otp,20),a=rows_(W.S.O).filter(function(x){return email_(x.Email)===em&&!x.UsedAt;});
  req_(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)&&/^\d{6}$/.test(otp),'Enter email and 6-digit OTP.');
  req_(a.length,'OTP not found. Request a new OTP.');var x=a[a.length-1];
  req_(new Date(x.ExpiresAt).getTime()>Date.now(),'OTP expired. Request a new OTP.');
  req_(same_(x.OtpHash,hash_(otp)),'Invalid OTP.');upd_(W.S.O,'OTPId',x.OTPId,{UsedAt:now_()});
  var u=find_(W.S.U,'Email',em),name=clean_(d.name,100);
  if(!u){u={UserID:id_('WUSR'),Email:em,Name:name||em.split('@')[0],Status:'ACTIVE',CreatedAt:now_(),UpdatedAt:now_(),LastLoginAt:now_()};addRow_(W.S.U,u);addRow_(W.S.W,{WalletID:id_('WAL'),UserID:u.UserID,Balance:0,ReservedBalance:0,Currency:'INR',Status:'ACTIVE',CreatedAt:now_(),UpdatedAt:now_()});}
  req_(String(u.Status)==='ACTIVE','Wallet account is inactive.');upd_(W.S.U,'UserID',u.UserID,{LastLoginAt:now_(),UpdatedAt:now_()});
  var raw=token_(),exp=new Date(Date.now()+W.SESSION_MS).toISOString();
  addRow_(W.S.S,{SessionID:id_('WSES'),UserID:u.UserID,TokenHash:hash_(raw),ExpiresAt:exp,CreatedAt:now_(),RevokedAt:'',Status:'ACTIVE'});
  return{ok:true,data:{user:pubUser_(u),session:{token:raw,expiresAt:exp}}};
}
function auth_(raw){
  req_(raw,'Authentication required.');var h=hash_(raw),a=rows_(W.S.S);
  for(var i=a.length-1;i>=0;i--)if(a[i].Status==='ACTIVE'&&same_(a[i].TokenHash,h)){req_(new Date(a[i].ExpiresAt).getTime()>Date.now(),'Session expired.');var u=find_(W.S.U,'UserID',a[i].UserID);req_(u&&u.Status==='ACTIVE','Wallet account is inactive.');return u;}
  throw new Error('Invalid session.');
}
function logout_(raw){if(!raw)return false;var h=hash_(raw),a=rows_(W.S.S);for(var i=a.length-1;i>=0;i--)if(same_(a[i].TokenHash,h)&&a[i].Status==='ACTIVE'){upd_(W.S.S,'SessionID',a[i].SessionID,{Status:'REVOKED',RevokedAt:now_()});return true;}return false;}
function pubUser_(u){return{userId:u.UserID,email:u.Email,name:u.Name,status:u.Status};}

/* WALLET READS */
function walletRow_(uid){var w=find_(W.S.W,'UserID',uid);req_(w,'Wallet not found.');return w;}
function pubTx_(t){return{transactionId:t.TransactionID,type:t.Type,amount:Number(t.Amount||0),status:t.Status,balanceBefore:Number(t.BalanceBefore||0),balanceAfter:Number(t.BalanceAfter||0),upiId:t.UPIId||'',paymentLink:t.PaymentLink||'',paymentLinkLabel:t.PaymentLinkLabel||'',attempt:Number(t.Attempt||1),parentTransactionId:t.ParentTransactionID||'',createdAt:t.CreatedAt,updatedAt:t.UpdatedAt,completedAt:t.CompletedAt||'',notes:t.Notes||''};}
function txs_(uid,n){var a=rows_(W.S.T).filter(function(x){return String(x.UserID)===String(uid);});a.sort(function(x,y){return new Date(y.CreatedAt)-new Date(x.CreatedAt);});return a.slice(0,n||100).map(pubTx_);}
function wallet_(d){var u=auth_(d.token),w=walletRow_(u.UserID);return{ok:true,data:{user:pubUser_(u),balance:Number(w.Balance||0),reservedBalance:Number(w.ReservedBalance||0),availableBalance:Number(w.Balance||0)-Number(w.ReservedBalance||0),currency:'INR',addAmounts:W.ADD,transactions:txs_(u.UserID,50)}};}
function orders_(d){var u=auth_(d.token);return{ok:true,data:{transactions:txs_(u.UserID,250)}};}
function txStatus_(d){var u=auth_(d.token),t=find_(W.S.T,'TransactionID',clean_(d.transactionId,100));req_(t&&String(t.UserID)===String(u.UserID),'Transaction not found.');return{ok:true,data:{transaction:pubTx_(t)}};}

/* EXISTING SHOPPING PAYMENT-LINK BRIDGE */
function bridge_(action,data){
  var url=p_().getProperty('SHOPPING_PAYMENT_API_URL')||'https://script.google.com/macros/s/AKfycbxkIICfsVN783oq04KPBTN73ATEYaBuMXPaPCDsbnvP4uTHFDKH2wglKNAj2nWo5He9/exec';
  var secret=p_().getProperty('SHOPPING_PAYMENT_BRIDGE_SECRET');req_(secret,'Set SHOPPING_PAYMENT_BRIDGE_SECRET in Script Properties.');
  var body={action:action,bridgeSecret:secret};Object.keys(data||{}).forEach(function(k){body[k]=data[k];});
  var r=UrlFetchApp.fetch(url,{method:'post',contentType:'application/json',payload:JSON.stringify(body),muteHttpExceptions:true}),o;
  try{o=JSON.parse(r.getContentText());}catch(z){throw new Error('Shopping payment bridge returned invalid response.');}
  if(!o.ok)throw new Error(o.error||'Shopping payment bridge failed.');return o.data||o;
}

/* ADD MONEY */
function add_(d){
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var u=auth_(d.token),amt=Number(d.amount);req_(W.ADD.indexOf(amt)>=0,'Invalid amount. Choose ₹500, ₹1,000, ₹1,500 or ₹2,000.');
    var tid=id_('WTXN'),b=reservePaymentLink_(amt,tid),w=walletRow_(u.UserID),bal=Number(w.Balance||0);
    var t={TransactionID:tid,UserID:u.UserID,Type:'ADD_MONEY',Amount:amt,Status:'PENDING_PAYMENT',BalanceBefore:bal,BalanceAfter:bal,UPIId:'',PaymentLink:b.paymentLink||b.link||'',PaymentLinkLabel:b.label||'',PaymentReservationId:b.reservationId||'',Attempt:1,ParentTransactionID:'',CreatedAt:now_(),UpdatedAt:now_(),CompletedAt:'',Notes:'',AdminNote:''};
    addRow_(W.S.T,t);adminAddMail_(t,u);audit_(u.UserID,tid,'ADD_MONEY_CREATED','USER',JSON.stringify({amount:amt}));
    return{ok:true,data:{transaction:pubTx_(t),paymentLink:t.PaymentLink,expiresAt:b.expiresAt||''}};
  }finally{lock.releaseLock();}
}
function retry_(d){
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var u=auth_(d.token),old=find_(W.S.T,'TransactionID',clean_(d.transactionId,100));req_(old&&String(old.UserID)===String(u.UserID),'Transaction not found.');req_(old.Status==='NOT_RECEIVED','Only a Not Received payment can be retried.');
    var tid=id_('WTXN'),b=reservePaymentLink_(Number(old.Amount),tid),w=walletRow_(u.UserID),bal=Number(w.Balance||0);
    upd_(W.S.T,'TransactionID',old.TransactionID,{Status:'RETRY_CREATED',UpdatedAt:now_()});
    var t={TransactionID:tid,UserID:u.UserID,Type:'ADD_MONEY',Amount:Number(old.Amount),Status:'PENDING_PAYMENT',BalanceBefore:bal,BalanceAfter:bal,UPIId:'',PaymentLink:b.paymentLink||b.link||'',PaymentLinkLabel:b.label||'',PaymentReservationId:b.reservationId||'',Attempt:Number(old.Attempt||1)+1,ParentTransactionID:old.TransactionID,CreatedAt:now_(),UpdatedAt:now_(),CompletedAt:'',Notes:'Retry payment',AdminNote:''};
    addRow_(W.S.T,t);adminAddMail_(t,u);return{ok:true,data:{transaction:pubTx_(t),paymentLink:t.PaymentLink,expiresAt:b.expiresAt||''}};
  }finally{lock.releaseLock();}
}

/* WITHDRAW */
function withdraw_(d){
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var u=auth_(d.token),amt=Number(d.amount),upi=clean_(d.upiId,200),w=walletRow_(u.UserID),bal=Number(w.Balance||0),res=Number(w.ReservedBalance||0);
    req_(amt>0&&isFinite(amt),'Enter a valid withdrawal amount.');req_(/^[\w.-]+@[\w.-]+$/.test(upi),'Enter a valid UPI ID.');req_(amt<=bal-res,'Insufficient available wallet balance.');
    upd_(W.S.W,'UserID',u.UserID,{ReservedBalance:res+amt,UpdatedAt:now_()});
    var t={TransactionID:id_('WTXN'),UserID:u.UserID,Type:'WITHDRAW',Amount:amt,Status:'WITHDRAWAL_REQUESTED',BalanceBefore:bal,BalanceAfter:bal,UPIId:upi,PaymentLink:'',PaymentLinkLabel:'',PaymentReservationId:'',Attempt:1,ParentTransactionID:'',CreatedAt:now_(),UpdatedAt:now_(),CompletedAt:'',Notes:'Withdrawal requested',AdminNote:''};
    addRow_(W.S.T,t);adminWithdrawMail_(t,u);audit_(u.UserID,t.TransactionID,'WITHDRAW_REQUESTED','USER',JSON.stringify({amount:amt,upiId:upi}));return{ok:true,data:{transaction:pubTx_(t)}};
  }finally{lock.releaseLock();}
}

/* ADMIN ACTIONS */
function adminEmail_(){return p_().getProperty('ADMIN_EMAIL')||'trustedcircle2026@gmail.com';}
function actionToken_(tid,act){var raw=token_();addRow_(W.S.A,{ActionID:id_('WACT'),TransactionID:tid,Action:act,TokenHash:hash_(raw),ExpiresAt:new Date(Date.now()+W.ACTION_MS).toISOString(),UsedAt:'',CreatedAt:now_()});return raw;}
function actionUrl_(raw,act){return ScriptApp.getService().getUrl()+'?adminAction='+encodeURIComponent(act)+'&token='+encodeURIComponent(raw);}
function adminAddMail_(t,u){
  var r=actionToken_(t.TransactionID,'RECEIVED'),n=actionToken_(t.TransactionID,'NOT_RECEIVED'),x=actionToken_(t.TransactionID,'REJECTED');
  var h=shell_('Wallet Add Money Request','<p><b>Customer:</b> '+esc_(u.Name)+' ('+esc_(u.Email)+')</p><p><b>Amount:</b> ₹'+t.Amount+'</p><p><b>Transaction:</b> '+t.TransactionID+'</p>'+btn_('✓ Received',actionUrl_(r,'RECEIVED'))+btn_('! Not Received',actionUrl_(n,'NOT_RECEIVED'))+btn_('✕ Rejected',actionUrl_(x,'REJECTED')));
  MailApp.sendEmail({to:adminEmail_(),subject:'Trusted Circle Wallet - Add Money ₹'+t.Amount,body:'Wallet transaction '+t.TransactionID,htmlBody:h,name:'Trusted Circle',replyTo:'info@trustedcircle.in'});
}
function adminWithdrawMail_(t,u){
  var a=actionToken_(t.TransactionID,'WITHDRAW_APPROVE'),r=actionToken_(t.TransactionID,'WITHDRAW_REJECT');
  var h=shell_('Wallet Withdrawal Request','<p><b>Customer:</b> '+esc_(u.Name)+' ('+esc_(u.Email)+')</p><p><b>Amount:</b> ₹'+t.Amount+'</p><p><b>UPI ID:</b> '+esc_(t.UPIId)+'</p><p><b>Transaction:</b> '+t.TransactionID+'</p>'+btn_('✓ Approve Withdrawal',actionUrl_(a,'WITHDRAW_APPROVE'))+btn_('✕ Reject Withdrawal',actionUrl_(r,'WITHDRAW_REJECT')));
  MailApp.sendEmail({to:adminEmail_(),subject:'Trusted Circle Wallet - Withdrawal ₹'+t.Amount,body:'Wallet transaction '+t.TransactionID,htmlBody:h,name:'Trusted Circle',replyTo:'info@trustedcircle.in'});
}
function adminAction_(p){
  try{
    var h=hash_(clean_(p.token,500)),a=rows_(W.S.A),row=null;for(var i=a.length-1;i>=0;i--)if(same_(a[i].TokenHash,h)){row=a[i];break;}
    req_(row,'Admin action not found.');req_(!row.UsedAt,'This action has already been used.');req_(new Date(row.ExpiresAt)>new Date(),'This admin action has expired.');req_(row.Action===p.adminAction,'Invalid admin action.');
    var t=find_(W.S.T,'TransactionID',row.TransactionID);req_(t,'Transaction not found.');var lock=LockService.getScriptLock();lock.waitLock(20000);
    try{if(p.adminAction==='RECEIVED')received_(t);else if(p.adminAction==='NOT_RECEIVED')notReceived_(t);else if(p.adminAction==='REJECTED')rejected_(t);else if(p.adminAction==='WITHDRAW_APPROVE')withdrawApprove_(t);else if(p.adminAction==='WITHDRAW_REJECT')withdrawReject_(t);else throw new Error('Unsupported admin action.');upd_(W.S.A,'ActionID',row.ActionID,{UsedAt:now_()});audit_(t.UserID,t.TransactionID,'ADMIN_'+p.adminAction,'ADMIN','');return html_('Trusted Circle Wallet','Action completed successfully.',true);}
    finally{lock.releaseLock();}
  }catch(x){return html_('Trusted Circle Wallet',x.message,false);}
}
function received_(t){req_(t.Status==='PENDING_PAYMENT','Transaction is already '+t.Status+'.');var w=walletRow_(t.UserID),before=Number(w.Balance||0),after=before+Number(t.Amount);if(t.PaymentReservationId)consumePaymentLink_(t.PaymentReservationId,t.TransactionID);upd_(W.S.W,'UserID',t.UserID,{Balance:after,UpdatedAt:now_()});upd_(W.S.T,'TransactionID',t.TransactionID,{Status:'COMPLETED',BalanceBefore:before,BalanceAfter:after,UpdatedAt:now_(),CompletedAt:now_(),Notes:'Payment received'});}
function notReceived_(t){req_(t.Status==='PENDING_PAYMENT','Transaction is already '+t.Status+'.');if(t.PaymentReservationId)releasePaymentLink_(t.PaymentReservationId,t.TransactionID);upd_(W.S.T,'TransactionID',t.TransactionID,{Status:'NOT_RECEIVED',UpdatedAt:now_(),Notes:'Admin marked payment not received'});}
function rejected_(t){req_(t.Status==='PENDING_PAYMENT','Transaction is already '+t.Status+'.');if(t.PaymentReservationId)releasePaymentLink_(t.PaymentReservationId,t.TransactionID);upd_(W.S.T,'TransactionID',t.TransactionID,{Status:'REJECTED',UpdatedAt:now_(),Notes:'Payment rejected'});}
function withdrawApprove_(t){req_(t.Status==='WITHDRAWAL_REQUESTED','Withdrawal is already '+t.Status+'.');var w=walletRow_(t.UserID),r=Number(w.ReservedBalance||0),amt=Number(t.Amount),bal=Number(w.Balance||0);req_(r>=amt,'Reserved balance mismatch.');upd_(W.S.W,'UserID',t.UserID,{Balance:bal-amt,ReservedBalance:r-amt,UpdatedAt:now_()});upd_(W.S.T,'TransactionID',t.TransactionID,{Status:'WITHDRAWAL_COMPLETED',BalanceAfter:bal-amt,UpdatedAt:now_(),CompletedAt:now_(),Notes:'Withdrawal approved'});}
function withdrawReject_(t){req_(t.Status==='WITHDRAWAL_REQUESTED','Withdrawal is already '+t.Status+'.');var w=walletRow_(t.UserID),r=Number(w.ReservedBalance||0);upd_(W.S.W,'UserID',t.UserID,{ReservedBalance:Math.max(0,r-Number(t.Amount)),UpdatedAt:now_()});upd_(W.S.T,'TransactionID',t.TransactionID,{Status:'WITHDRAWAL_REJECTED',UpdatedAt:now_(),CompletedAt:now_(),Notes:'Withdrawal rejected; amount released'});}

/* HELPERS */
function audit_(u,t,a,actor,m){addRow_(W.S.L,{AuditID:id_('WAUD'),UserID:u,TransactionID:t,Action:a,Actor:actor,Metadata:m||'',CreatedAt:now_()});}
function esc_(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function btn_(label,url){return'<a href="'+esc_(url)+'" style="display:inline-block;margin:6px;padding:12px 18px;background:#0f5132;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">'+esc_(label)+'</a>';}
function shell_(title,body){return'<div style="font-family:Arial;max-width:620px;margin:auto;padding:25px;background:#f4f7f5"><div style="background:white;padding:28px;border-radius:14px"><h2 style="color:#0f5132">'+esc_(title)+'</h2>'+body+'<p style="font-size:12px;color:#777">Admin links expire after 24 hours.</p></div></div>';}
function html_(title,msg,success){return HtmlService.createHtmlOutput('<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Arial;background:#f4f7f5"><div style="max-width:520px;margin:15vh auto;padding:40px;background:#fff;border-radius:18px;text-align:center"><div style="font-size:50px;color:'+(success?'#0f5132':'#b42318')+'">'+(success?'✓':'!')+'</div><h2>'+esc_(title)+'</h2><p>'+esc_(msg)+'</p><a href="https://trustedcircle.shop/" style="display:inline-block;padding:12px 20px;background:#0f5132;color:white;text-decoration:none;border-radius:8px">Open Trusted Circle</a></div></body></html>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}/* ADD MONEY */
function add_(d){
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var u=auth_(d.token),amt=Number(d.amount);req_(W.ADD.indexOf(amt)>=0,'Invalid amount. Choose ₹500, ₹1,000, ₹1,500 or ₹2,000.');
    var tid=id_('WTXN'),b=reservePaymentLink_(amt,tid),w=walletRow_(u.UserID),bal=Number(w.Balance||0);
    var t={TransactionID:tid,UserID:u.UserID,Type:'ADD_MONEY',Amount:amt,Status:'PENDING_PAYMENT',BalanceBefore:bal,BalanceAfter:bal,UPIId:'',PaymentLink:b.paymentLink||b.link||'',PaymentLinkLabel:b.label||'',PaymentReservationId:b.reservationId||'',Attempt:1,ParentTransactionID:'',CreatedAt:now_(),UpdatedAt:now_(),CompletedAt:'',Notes:'',AdminNote:''};
    addRow_(W.S.T,t);adminAddMail_(t,u);audit_(u.UserID,tid,'ADD_MONEY_CREATED','USER',JSON.stringify({amount:amt}));
    return{ok:true,data:{transaction:pubTx_(t),paymentLink:t.PaymentLink,expiresAt:b.expiresAt||''}};
  }finally{lock.releaseLock();}
}
function retry_(d){
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var u=auth_(d.token),old=find_(W.S.T,'TransactionID',clean_(d.transactionId,100));req_(old&&String(old.UserID)===String(u.UserID),'Transaction not found.');req_(old.Status==='NOT_RECEIVED','Only a Not Received payment can be retried.');
    var tid=id_('WTXN'),b=reservePaymentLink_(Number(old.Amount),tid),w=walletRow_(u.UserID),bal=Number(w.Balance||0);
    upd_(W.S.T,'TransactionID',old.TransactionID,{Status:'RETRY_CREATED',UpdatedAt:now_()});
    var t={TransactionID:tid,UserID:u.UserID,Type:'ADD_MONEY',Amount:Number(old.Amount),Status:'PENDING_PAYMENT',BalanceBefore:bal,BalanceAfter:bal,UPIId:'',PaymentLink:b.paymentLink||b.link||'',PaymentLinkLabel:b.label||'',PaymentReservationId:b.reservationId||'',Attempt:Number(old.Attempt||1)+1,ParentTransactionID:old.TransactionID,CreatedAt:now_(),UpdatedAt:now_(),CompletedAt:'',Notes:'Retry payment',AdminNote:''};
    addRow_(W.S.T,t);adminAddMail_(t,u);return{ok:true,data:{transaction:pubTx_(t),paymentLink:t.PaymentLink,expiresAt:b.expiresAt||''}};
  }finally{lock.releaseLock();}
}

/* WITHDRAW */
function withdraw_(d){
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var u=auth_(d.token),amt=Number(d.amount),upi=clean_(d.upiId,200),w=walletRow_(u.UserID),bal=Number(w.Balance||0),res=Number(w.ReservedBalance||0);
    req_(amt>0&&isFinite(amt),'Enter a valid withdrawal amount.');req_(/^[\w.-]+@[\w.-]+$/.test(upi),'Enter a valid UPI ID.');req_(amt<=bal-res,'Insufficient available wallet balance.');
    upd_(W.S.W,'UserID',u.UserID,{ReservedBalance:res+amt,UpdatedAt:now_()});
    var t={TransactionID:id_('WTXN'),UserID:u.UserID,Type:'WITHDRAW',Amount:amt,Status:'WITHDRAWAL_REQUESTED',BalanceBefore:bal,BalanceAfter:bal,UPIId:upi,PaymentLink:'',PaymentLinkLabel:'',PaymentReservationId:'',Attempt:1,ParentTransactionID:'',CreatedAt:now_(),UpdatedAt:now_(),CompletedAt:'',Notes:'Withdrawal requested',AdminNote:''};
    addRow_(W.S.T,t);adminWithdrawMail_(t,u);audit_(u.UserID,t.TransactionID,'WITHDRAW_REQUESTED','USER',JSON.stringify({amount:amt,upiId:upi}));return{ok:true,data:{transaction:pubTx_(t)}};
  }finally{lock.releaseLock();}
}

/* ADMIN ACTIONS */
function adminEmail_(){return p_().getProperty('ADMIN_EMAIL')||'trustedcircle2026@gmail.com';}
function actionToken_(tid,act){var raw=token_();addRow_(W.S.A,{ActionID:id_('WACT'),TransactionID:tid,Action:act,TokenHash:hash_(raw),ExpiresAt:new Date(Date.now()+W.ACTION_MS).toISOString(),UsedAt:'',CreatedAt:now_()});return raw;}
function actionUrl_(raw,act){return ScriptApp.getService().getUrl()+'?adminAction='+encodeURIComponent(act)+'&token='+encodeURIComponent(raw);}
function adminAddMail_(t,u){
  var r=actionToken_(t.TransactionID,'RECEIVED'),n=actionToken_(t.TransactionID,'NOT_RECEIVED'),x=actionToken_(t.TransactionID,'REJECTED');
  var h=shell_('Wallet Add Money Request','<p><b>Customer:</b> '+esc_(u.Name)+' ('+esc_(u.Email)+')</p><p><b>Amount:</b> ₹'+t.Amount+'</p><p><b>Transaction:</b> '+t.TransactionID+'</p>'+btn_('✓ Received',actionUrl_(r,'RECEIVED'))+btn_('! Not Received',actionUrl_(n,'NOT_RECEIVED'))+btn_('✕ Rejected',actionUrl_(x,'REJECTED')));
  MailApp.sendEmail({to:adminEmail_(),subject:'Trusted Circle Wallet - Add Money ₹'+t.Amount,body:'Wallet transaction '+t.TransactionID,htmlBody:h,name:'Trusted Circle',replyTo:'info@trustedcircle.in'});
}
function adminWithdrawMail_(t,u){
  var a=actionToken_(t.TransactionID,'WITHDRAW_APPROVE'),r=actionToken_(t.TransactionID,'WITHDRAW_REJECT');
  var h=shell_('Wallet Withdrawal Request','<p><b>Customer:</b> '+esc_(u.Name)+' ('+esc_(u.Email)+')</p><p><b>Amount:</b> ₹'+t.Amount+'</p><p><b>UPI ID:</b> '+esc_(t.UPIId)+'</p><p><b>Transaction:</b> '+t.TransactionID+'</p>'+btn_('✓ Approve Withdrawal',actionUrl_(a,'WITHDRAW_APPROVE'))+btn_('✕ Reject Withdrawal',actionUrl_(r,'WITHDRAW_REJECT')));
  MailApp.sendEmail({to:adminEmail_(),subject:'Trusted Circle Wallet - Withdrawal ₹'+t.Amount,body:'Wallet transaction '+t.TransactionID,htmlBody:h,name:'Trusted Circle',replyTo:'info@trustedcircle.in'});
}
function adminAction_(p){
  try{
    var h=hash_(clean_(p.token,500)),a=rows_(W.S.A),row=null;for(var i=a.length-1;i>=0;i--)if(same_(a[i].TokenHash,h)){row=a[i];break;}
    req_(row,'Admin action not found.');req_(!row.UsedAt,'This action has already been used.');req_(new Date(row.ExpiresAt)>new Date(),'This admin action has expired.');req_(row.Action===p.adminAction,'Invalid admin action.');
    var t=find_(W.S.T,'TransactionID',row.TransactionID);req_(t,'Transaction not found.');var lock=LockService.getScriptLock();lock.waitLock(20000);
    try{if(p.adminAction==='RECEIVED')received_(t);else if(p.adminAction==='NOT_RECEIVED')notReceived_(t);else if(p.adminAction==='REJECTED')rejected_(t);else if(p.adminAction==='WITHDRAW_APPROVE')withdrawApprove_(t);else if(p.adminAction==='WITHDRAW_REJECT')withdrawReject_(t);else throw new Error('Unsupported admin action.');upd_(W.S.A,'ActionID',row.ActionID,{UsedAt:now_()});audit_(t.UserID,t.TransactionID,'ADMIN_'+p.adminAction,'ADMIN','');return html_('Trusted Circle Wallet','Action completed successfully.',true);}
    finally{lock.releaseLock();}
  }catch(x){return html_('Trusted Circle Wallet',x.message,false);}
}
function received_(t){req_(t.Status==='PENDING_PAYMENT','Transaction is already '+t.Status+'.');var w=walletRow_(t.UserID),before=Number(w.Balance||0),after=before+Number(t.Amount);if(t.PaymentReservationId)consumePaymentLink_(t.PaymentReservationId,t.TransactionID);upd_(W.S.W,'UserID',t.UserID,{Balance:after,UpdatedAt:now_()});upd_(W.S.T,'TransactionID',t.TransactionID,{Status:'COMPLETED',BalanceBefore:before,BalanceAfter:after,UpdatedAt:now_(),CompletedAt:now_(),Notes:'Payment received'});}
function notReceived_(t){req_(t.Status==='PENDING_PAYMENT','Transaction is already '+t.Status+'.');if(t.PaymentReservationId)releasePaymentLink_(t.PaymentReservationId,t.TransactionID);upd_(W.S.T,'TransactionID',t.TransactionID,{Status:'NOT_RECEIVED',UpdatedAt:now_(),Notes:'Admin marked payment not received'});}
function rejected_(t){req_(t.Status==='PENDING_PAYMENT','Transaction is already '+t.Status+'.');if(t.PaymentReservationId)releasePaymentLink_(t.PaymentReservationId,t.TransactionID);upd_(W.S.T,'TransactionID',t.TransactionID,{Status:'REJECTED',UpdatedAt:now_(),Notes:'Payment rejected'});}
function withdrawApprove_(t){req_(t.Status==='WITHDRAWAL_REQUESTED','Withdrawal is already '+t.Status+'.');var w=walletRow_(t.UserID),r=Number(w.ReservedBalance||0),amt=Number(t.Amount),bal=Number(w.Balance||0);req_(r>=amt,'Reserved balance mismatch.');upd_(W.S.W,'UserID',t.UserID,{Balance:bal-amt,ReservedBalance:r-amt,UpdatedAt:now_()});upd_(W.S.T,'TransactionID',t.TransactionID,{Status:'WITHDRAWAL_COMPLETED',BalanceAfter:bal-amt,UpdatedAt:now_(),CompletedAt:now_(),Notes:'Withdrawal approved'});}
function withdrawReject_(t){req_(t.Status==='WITHDRAWAL_REQUESTED','Withdrawal is already '+t.Status+'.');var w=walletRow_(t.UserID),r=Number(w.ReservedBalance||0);upd_(W.S.W,'UserID',t.UserID,{ReservedBalance:Math.max(0,r-Number(t.Amount)),UpdatedAt:now_()});upd_(W.S.T,'TransactionID',t.TransactionID,{Status:'WITHDRAWAL_REJECTED',UpdatedAt:now_(),CompletedAt:now_(),Notes:'Withdrawal rejected; amount released'});}

/* HELPERS */
function audit_(u,t,a,actor,m){addRow_(W.S.L,{AuditID:id_('WAUD'),UserID:u,TransactionID:t,Action:a,Actor:actor,Metadata:m||'',CreatedAt:now_()});}
function esc_(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function btn_(label,url){return'<a href="'+esc_(url)+'" style="display:inline-block;margin:6px;padding:12px 18px;background:#0f5132;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">'+esc_(label)+'</a>';}
function shell_(title,body){return'<div style="font-family:Arial;max-width:620px;margin:auto;padding:25px;background:#f4f7f5"><div style="background:white;padding:28px;border-radius:14px"><h2 style="color:#0f5132">'+esc_(title)+'</h2>'+body+'<p style="font-size:12px;color:#777">Admin links expire after 24 hours.</p></div></div>';}
function html_(title,msg,success){return HtmlService.createHtmlOutput('<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Arial;background:#f4f7f5"><div style="max-width:520px;margin:15vh auto;padding:40px;background:#fff;border-radius:18px;text-align:center"><div style="font-size:50px;color:'+(success?'#0f5132':'#b42318')+'">'+(success?'✓':'!')+'</div><h2>'+esc_(title)+'</h2><p>'+esc_(msg)+'</p><a href="https://trustedcircle.shop/" style="display:inline-block;padding:12px 20px;background:#0f5132;color:white;text-decoration:none;border-radius:8px">Open Trusted Circle</a></div></body></html>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
