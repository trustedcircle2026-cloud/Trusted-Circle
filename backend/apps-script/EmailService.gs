/** Trusted Circle transactional email service. Only OTP, payment-link and voucher emails go to shoppers. */
var TC_EMAIL={PRIMARY:'trustedcircle2026@gmail.com',INFO:'info@trustedcircle.in',PROMOTER:'promoter@trustedcircle.in'};
function emailEscape_(value){return escapeHtml_(String(value===undefined||value===null?'':value));}
function emailMoney_(value){return '₹'+Number(value||0).toLocaleString('en-IN',{maximumFractionDigits:2});}
function emailAliasList_(){try{return GmailApp.getAliases().map(function(a){return normalizeEmail_(a);});}catch(e){return [];}}
function sendTransactionalEmail_(to,subject,htmlBody,textBody){
 if(!isValidEmail_(to))return false;
 try{
  MailApp.sendEmail({to:to,subject:subject,htmlBody:htmlBody,body:textBody,name:'Trusted Circle',replyTo:TC_EMAIL.INFO});
  return true;
 }catch(mailError){
  console.error('Transactional email failed: '+String(mailError&&mailError.message||mailError));
  return false;
 }
}
function sendDualTransactionalEmail_(subject,htmlBody,textBody,userEmail){return{userSent:sendTransactionalEmail_(userEmail,subject,htmlBody,textBody),infoSent:sendTransactionalEmail_(TC_EMAIL.INFO,'[Trusted Circle] '+subject,htmlBody,textBody)};}
function orderEmailItems_(items){return(items||[]).map(function(i){var product=findOne_(TC_CONFIG.SHEETS.PRODUCTS,'ProductID',i.ProductID)||{},brand=findOne_(TC_CONFIG.SHEETS.BRANDS,'BrandID',product.BrandID)||{};return{title:product.Title||'Gift voucher',brand:brand.Name||'',qty:Number(i.Quantity||1),value:Number(i.Denomination||i.FaceValue||0),total:Number(i.Total||0)};});}
function orderEmailDetails_(order,user,items){var lines=orderEmailItems_(items),rows=lines.map(function(i){return '<tr><td style="padding:10px;border-bottom:1px solid #edf1ee"><b>'+emailEscape_(i.brand)+'</b><br><span style="color:#5f6b64">'+emailEscape_(i.title)+'</span></td><td style="padding:10px;border-bottom:1px solid #edf1ee">'+i.qty+'</td><td style="padding:10px;border-bottom:1px solid #edf1ee">'+emailMoney_(i.value)+'</td><td style="padding:10px;border-bottom:1px solid #edf1ee">'+emailMoney_(i.total)+'</td></tr>';}).join('');return '<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#18241e"><div style="padding:24px;border-radius:16px;background:#173c2a;color:#fff"><div style="font-size:22px;font-weight:800">Trusted Circle</div><div style="margin-top:5px;opacity:.8">Secure digital gifting</div></div><div style="padding:24px"><p style="font-size:17px">Hi '+emailEscape_(user&&user.Name||'there')+',</p><p>Order <b>'+emailEscape_(order.OrderNumber)+'</b> · '+emailMoney_(order.Total)+'</p>'+(rows?'<table style="border-collapse:collapse;width:100%;margin-top:18px"><tr><th align="left" style="padding:10px">Voucher</th><th align="left" style="padding:10px">Qty</th><th align="left" style="padding:10px">Value</th><th align="left" style="padding:10px">Total</th></tr>'+rows+'</table>':'')+'</div><div style="padding:18px 24px;background:#f5f8f6;color:#68736d;font-size:12px">Trusted Circle · info@trustedcircle.in</div></div>';}
function sendOrderPlacedEmails_(){return false;}
function sendPaymentStatusEmails_(){return false;}
function sendPaymentLinkRequestEmails_(){return false;}
function sendPaymentLinkEmails_(order,user,link,label){var safeLink=emailEscape_(link),html=orderEmailDetails_(order,user,[])+'<div style="padding:0 24px 24px"><div style="padding:18px;border:1px solid #dce9e0;border-radius:14px;background:#f5fbf7"><h2 style="margin:0 0 8px">Your payment link is ready</h2><p style="margin:0 0 16px">Hi '+emailEscape_(user&&user.Name||'there')+', your payment link for this order is ready.</p><a href="'+safeLink+'" style="display:inline-block;padding:13px 20px;background:#173c2a;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">'+emailEscape_(label||'Make Payment')+'</a></div></div>',text='Hi '+(user&&user.Name||'there')+', your Trusted Circle payment link is ready: '+link;return sendDualTransactionalEmail_('Your payment link is ready · '+order.OrderNumber,html,text,user.Email);}
function enqueueOtpEmail_(otpId,email,subject,htmlBody,textBody){
 var sheet=ensureSheet_(TC_CONFIG.SHEETS.EMAIL_QUEUE,['EmailQueueID','Type','OrderID','UserID','Email','Link','Label','Subject','HtmlBody','TextBody','Status','Attempts','LastError','CreatedAt','UpdatedAt','SentAt']);
 ensureColumns_(TC_CONFIG.SHEETS.EMAIL_QUEUE,['EmailQueueID','Type','OrderID','UserID','Email','Link','Label','Subject','HtmlBody','TextBody','Status','Attempts','LastError','CreatedAt','UpdatedAt','SentAt']);
 var now=isoNow_();
 appendRowObject_(TC_CONFIG.SHEETS.EMAIL_QUEUE,{EmailQueueID:newId_('TCEMQ'),Type:'OTP',OrderID:'',UserID:'',Email:email,Link:'',Label:otpId,Subject:subject,HtmlBody:htmlBody,TextBody:textBody,Status:'QUEUED',Attempts:0,LastError:'',CreatedAt:now,UpdatedAt:now,SentAt:''});
 return true;
}
function enqueuePaymentLinkEmail_(order,user,link,label){var sheet=ensureSheet_(TC_CONFIG.SHEETS.EMAIL_QUEUE,['EmailQueueID','Type','OrderID','UserID','Email','Link','Label','Status','Attempts','LastError','CreatedAt','UpdatedAt','SentAt']);ensureColumns_(TC_CONFIG.SHEETS.EMAIL_QUEUE,['EmailQueueID','Type','OrderID','UserID','Email','Link','Label','Status','Attempts','LastError','CreatedAt','UpdatedAt','SentAt']);var now=isoNow_();appendRowObject_(TC_CONFIG.SHEETS.EMAIL_QUEUE,{EmailQueueID:newId_('TCEMQ'),Type:'PAYMENT_LINK',OrderID:order.OrderID,UserID:user.UserID,Email:user.Email,Link:link,Label:label||'Make Payment',Status:'QUEUED',Attempts:0,LastError:'',CreatedAt:now,UpdatedAt:now,SentAt:''});return true;}
function ensureEmailQueueTrigger_(){var triggers=ScriptApp.getProjectTriggers();var exists=triggers.some(function(t){return t.getHandlerFunction()==='processEmailQueue_';});if(!exists)ScriptApp.newTrigger('processEmailQueue_').timeBased().everyMinutes(1).create();}
function processEmailQueue_(){
 var lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
 try{
  var rows=getRows_(TC_CONFIG.SHEETS.EMAIL_QUEUE).filter(function(r){return String(r.Status||'').toUpperCase()==='QUEUED';}).slice(0,10);
  rows.forEach(function(row){
   var attempts=Number(row.Attempts||0)+1,now=isoNow_;
   updateRowById_(TC_CONFIG.SHEETS.EMAIL_QUEUE,'EmailQueueID',row.EmailQueueID,{Status:'PROCESSING',Attempts:attempts,UpdatedAt:now});
   try{
    var type=String(row.Type||'').toUpperCase();
    if(type==='OTP'){
      require_(row.Email&&row.Subject&&row.HtmlBody&&row.TextBody,'OTP email queue data is incomplete.');
      var userSent=sendTransactionalEmail_(row.Email,row.Subject,row.HtmlBody,row.TextBody);
      var infoSent=sendTransactionalEmail_(TC_EMAIL.INFO,'[Trusted Circle] OTP requested · '+row.Email,row.HtmlBody,row.TextBody);
      require_(userSent&&infoSent,'One or more OTP emails could not be sent.');
    }else{
      var order=findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderID',row.OrderID),user=findOne_(TC_CONFIG.SHEETS.USERS,'UserID',row.UserID);
      require_(order&&user,'Email queue order/user not found.');
      var result=sendPaymentLinkEmails_(order,user,row.Link,row.Label);
      require_(result.userSent&&result.infoSent,'One or more payment-link emails could not be sent.');
    }
    updateRowById_(TC_CONFIG.SHEETS.EMAIL_QUEUE,'EmailQueueID',row.EmailQueueID,{Status:'SENT',LastError:'',UpdatedAt:isoNow_(),SentAt:isoNow_()});
   }catch(e){
    var retry=attempts<5;
    updateRowById_(TC_CONFIG.SHEETS.EMAIL_QUEUE,'EmailQueueID',row.EmailQueueID,{Status:retry?'QUEUED':'FAILED',LastError:String(e.message||e),UpdatedAt:isoNow_()});
   }
  });
 }finally{lock.releaseLock();}
}
function sendVoucherEmails_(order,user,code,pin){var items=getRows_(TC_CONFIG.SHEETS.ORDER_ITEMS).filter(function(r){return String(r.OrderID)===String(order.OrderID);}),lines=orderEmailItems_(items),cards=lines.map(function(i){return '<div style="margin:12px 0;padding:16px;border:1px solid #dce9e0;border-radius:14px;background:#fbfdfb"><div style="font-weight:800">'+emailEscape_(i.brand)+'</div><div style="margin-top:3px;color:#65716a">'+emailEscape_(i.title)+' · ₹'+Number(i.value||0).toLocaleString('en-IN')+'</div></div>';}).join(''),html=orderEmailDetails_(order,user,items)+'<div style="padding:0 24px 24px"><div style="padding:18px;border-radius:14px;background:#eef8f1"><h2 style="margin:0 0 8px">Your voucher is ready 🎁</h2><p style="margin:0 0 14px">Hi '+emailEscape_(user&&user.Name||'there')+', your digital voucher is ready.</p>'+cards+'<div style="padding-top:10px;border-top:1px solid #cfe2d4"><b>Voucher Code</b><div style="font-size:20px;font-weight:800;letter-spacing:1px;margin-top:6px">'+emailEscape_(code)+'</div>'+(pin?'<div style="margin-top:10px"><b>PIN</b><div style="font-size:18px;font-weight:800">'+emailEscape_(pin)+'</div></div>':'')+'</div></div></div>',text='Hi '+(user&&user.Name||'there')+', your Trusted Circle voucher for '+order.OrderNumber+' is ready. Code: '+code+(pin?' | PIN: '+pin:'');return sendDualTransactionalEmail_('Your voucher is ready 🎁 · '+order.OrderNumber,html,text,user.Email);}


function ensureAdminEmailActionSheet_(){
 var headers=['ActionTokenID','TokenHash','OrderID','Action','Status','ExpiresAt','UsedAt','CreatedAt'];
 ensureSheet_(TC_CONFIG.SHEETS.ADMIN_EMAIL_ACTIONS,headers);
 ensureColumns_(TC_CONFIG.SHEETS.ADMIN_EMAIL_ACTIONS,headers);
}
function createAdminEmailActionToken_(orderId,action){
 ensureAdminEmailActionSheet_();
 var raw=Utilities.getUuid()+'.'+Utilities.getUuid(),now=isoNow_(),expires=new Date(Date.now()+7*24*60*60*1000).toISOString();
 appendRowObject_(TC_CONFIG.SHEETS.ADMIN_EMAIL_ACTIONS,{ActionTokenID:newId_('TCACT'),TokenHash:hash_(raw),OrderID:orderId,Action:String(action).toUpperCase(),Status:'ACTIVE',ExpiresAt:expires,UsedAt:'',CreatedAt:now});
 return{token:raw,expiresAt:expires};
}
function adminActionUrl_(token,action){
 var base='';
 try{base=ScriptApp.getService().getUrl()||'';}catch(ignore){}
 if(!base)base='https://script.google.com/macros/s/AKfycbxkIICfsVN783oq04KPBTN73ATEYaBuMXPaPCDsbnvP4uTHFDKH2wglKNAj2nWo5He9/exec';
 return base+'?emailAction='+encodeURIComponent(token)+'&action='+encodeURIComponent(String(action).toUpperCase());
}
function adminEmailButton_(url,label,bg){
 return '<a href="'+emailEscape_(url)+'" style="display:inline-block;margin:0 8px 10px 0;padding:13px 22px;border-radius:10px;background:'+bg+';color:#fff;text-decoration:none;font-weight:800;font-family:Arial,sans-serif">'+emailEscape_(label)+'</a>';
}
function sendAdminOrderActionEmailOnce_(order,user,link,label){
 ensureAdminEmailActionSheet_();
 var existing=getRows_(TC_CONFIG.SHEETS.ADMIN_EMAIL_ACTIONS).some(function(r){return String(r.OrderID)===String(order.OrderID);});
 if(existing)return false;
 return sendAdminOrderActionEmail_(order,user,link,label);
}
function sendAdminOrderActionEmail_(order,user,link,label){
 try{
  var received=createAdminEmailActionToken_(order.OrderID,'RECEIVED'),cancel=createAdminEmailActionToken_(order.OrderID,'CANCEL'),safeOrder=emailEscape_(order.OrderNumber),name=emailEscape_(user&&user.Name||'there'),amount=emailMoney_(order.Total);
  var items=getRows_(TC_CONFIG.SHEETS.ORDER_ITEMS).filter(function(r){return String(r.OrderID)===String(order.OrderID);});
  var lines=orderEmailItems_(items).map(function(i){return '<tr><td style="padding:8px;border-bottom:1px solid #edf1ee">'+emailEscape_(i.brand)+' · '+emailEscape_(i.title)+'</td><td style="padding:8px;border-bottom:1px solid #edf1ee">'+i.qty+'</td><td style="padding:8px;border-bottom:1px solid #edf1ee">'+emailMoney_(i.total)+'</td></tr>';}).join('');
  var html='<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#18241e"><div style="padding:24px;border-radius:16px;background:#173c2a;color:#fff"><div style="font-size:22px;font-weight:800">Trusted Circle · Order Action</div><div style="margin-top:5px;opacity:.8">Admin action required</div></div><div style="padding:24px"><p style="font-size:17px">A payment-link order is ready for action.</p><p><b>Order:</b> '+safeOrder+'<br><b>Customer:</b> '+name+'<br><b>Email:</b> '+emailEscape_(user.Email)+'<br><b>Total:</b> '+amount+'</p>'+(lines?'<table style="border-collapse:collapse;width:100%;margin:18px 0"><tr><th align="left" style="padding:8px">Item</th><th align="left" style="padding:8px">Qty</th><th align="left" style="padding:8px">Total</th></tr>'+lines+'</table>':'')+'<p style="color:#5f6b64">Payment link: <a href="'+emailEscape_(link)+'">Open payment link</a></p><div style="margin-top:22px">'+adminEmailButton_(adminActionUrl_(received.token,'RECEIVED'),'Received','#173c2a')+adminEmailButton_(adminActionUrl_(cancel.token,'CANCEL'),'Cancel Order','#b42318')+'</div><p style="font-size:12px;color:#7a847e;margin-top:14px">These buttons update the Trusted Circle backend directly. A cancelled order must be created again by the customer.</p></div><div style="padding:18px 24px;background:#f5f8f6;color:#68736d;font-size:12px">Trusted Circle · info@trustedcircle.in</div></div>';
  var text='Order '+order.OrderNumber+' · '+amount+'\nCustomer: '+(user.Name||'')+' · '+user.Email+'\nReceived: '+adminActionUrl_(received.token,'RECEIVED')+'\nCancel: '+adminActionUrl_(cancel.token,'CANCEL');
  return sendTransactionalEmail_(TC_EMAIL.PROMOTER,'[Action Required] Payment confirmation · '+order.OrderNumber,html,text);
 }catch(e){console.error('Admin order action email failed: '+String(e&&e.message||e));return false;}
}
function adminEmailActionResponse_(e){
 try{
  var token=String(e.parameter.emailAction||''),action=String(e.parameter.action||'').toUpperCase();
  require_(token&&['RECEIVED','CANCEL'].indexOf(action)>=0,'Invalid action link.');
  ensureAdminEmailActionSheet_();
  var tokenHash=hash_(token),rows=getRows_(TC_CONFIG.SHEETS.ADMIN_EMAIL_ACTIONS),row=null;
  for(var i=rows.length-1;i>=0;i--){if(String(rows[i].TokenHash)===tokenHash){row=rows[i];break;}}
  require_(row,'Action link not found.');
  require_(String(row.Status||'').toUpperCase()==='ACTIVE','This action link has already been used.');
  require_(String(row.Action||'').toUpperCase()===action,'This action link is not valid for this action.');
  require_(new Date(row.ExpiresAt||0).getTime()>Date.now(),'This action link has expired.');
  var order=findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderID',row.OrderID);require_(order,'Order not found.');
  var current=String(order.Status||'').toUpperCase();
  var now=isoNow_();
  if(action==='RECEIVED'){
   require_(['PENDING_PAYMENT','PAYMENT_PROCESSING','PROCESSING'].indexOf(current)>=0,'This order is no longer awaiting payment.');
   var payments=getRows_(TC_CONFIG.SHEETS.PAYMENTS).filter(function(p){return String(p.OrderID)===String(order.OrderID);});
   var payment=payments.length?payments[payments.length-1]:null;require_(payment,'Payment record not found.');
   updateRowById_(TC_CONFIG.SHEETS.PAYMENTS,'PaymentID',payment.PaymentID,{Status:'VERIFIED',VerifiedAt:now,Provider:'ADMIN_EMAIL_RECEIVED',UpdatedAt:now});
   updateRowById_(TC_CONFIG.SHEETS.ORDERS,'OrderID',order.OrderID,{Status:'PAID',UpdatedAt:now});
   if(typeof creditCashbackForOrder_==='function')creditCashbackForOrder_(order);
   if(typeof markPaymentLinkStockUsedForOrder_==='function')markPaymentLinkStockUsedForOrder_(order.OrderID,now);
  }else{
   require_(current==='PENDING_PAYMENT','Only a pending-payment order can be cancelled.');
   var paid=getRows_(TC_CONFIG.SHEETS.PAYMENTS).some(function(p){return String(p.OrderID)===String(order.OrderID)&&['PAID','VERIFIED','SUCCESS','CAPTURED'].indexOf(String(p.Status||'').toUpperCase())>=0;});
   require_(!paid,'A paid order cannot be cancelled.');
   updateRowById_(TC_CONFIG.SHEETS.ORDERS,'OrderID',order.OrderID,{Status:'CANCELLED',UpdatedAt:now});
   getRows_(TC_CONFIG.SHEETS.PAYMENT_LINKS).filter(function(l){return String(l.OrderID)===String(order.OrderID);}).forEach(function(l){try{updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINKS,'PaymentLinkID',l.PaymentLinkID,{Status:'CANCELLED',UpdatedAt:now});}catch(ignore){}if(l.PaymentLinkStockID)try{updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',l.PaymentLinkStockID,{Status:'AVAILABLE',OrderID:'',PaymentLinkID:'',ReservedAt:'',ExpiresAt:'',UpdatedAt:now});}catch(ignore2){}});
  }
  updateRowById_(TC_CONFIG.SHEETS.ADMIN_EMAIL_ACTIONS,'ActionTokenID',row.ActionTokenID,{Status:'USED',UsedAt:now});
  appendAudit_('', 'ADMIN_EMAIL_'+action, 'Orders', order.OrderID, {orderNumber:order.OrderNumber});
  var title=action==='RECEIVED'?'Payment marked as received':'Order cancelled';
  var body=action==='RECEIVED'?'The order is now marked PAID. Cashback has been processed.':'The order has been cancelled and its payment link stock released. The customer must create a new order.';
  return HtmlService.createHtmlOutput('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f5f8f6;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:20px;box-sizing:border-box"><main style="max-width:520px;background:#fff;border:1px solid #dce9e0;border-radius:18px;padding:30px;box-shadow:0 14px 40px rgba(0,0,0,.08);text-align:center"><h1 style="color:#173c2a;margin:0 0 10px">'+emailEscape_(title)+'</h1><p style="color:#5f6b64;line-height:1.6">'+emailEscape_(body)+'</p><p style="font-size:12px;color:#7a847e">Order '+emailEscape_(order.OrderNumber)+'</p></main></body></html>');
 }catch(err){return HtmlService.createHtmlOutput('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f7f7f7;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:20px;box-sizing:border-box"><main style="max-width:520px;background:#fff;border:1px solid #ead4d4;border-radius:18px;padding:30px;text-align:center"><h1 style="margin:0 0 10px;color:#b42318">Action not completed</h1><p style="color:#5f6b64;line-height:1.6">'+emailEscape_(String(err&&err.message||err))+'</p></main></body></html>');}
}
