/** Trusted Circle — payment-link stock alert and email replenishment workflow.
 *  Add this file to the same Apps Script project as the existing backend files.
 *
 *  Flow:
 *   1) Low stock (< 2 AVAILABLE links) => immediate admin email with one-time add form.
 *   2) Customer requests an unavailable amount => immediate admin email with one-time add form.
 *   3) Admin opens the secure stock form from email, pastes the payment URL, and submits.
 *   4) The backend validates the hashed one-time action token, expiry, and bound denomination.
 *   5) The link is inserted into PaymentLinkStock as AVAILABLE and the token is consumed.
 *
 *  Existing order/payment/admin action APIs remain separate and intact.
 */

var TC_STOCK_ALERT_THRESHOLD=2;
var TC_STOCK_ALERT_TTL_MS=7*24*60*60*1000;
function paymentLinkStockDenominations_(){
  return typeof TC_ALLOWED_STOCK_DENOMS!=='undefined'?TC_ALLOWED_STOCK_DENOMS.slice():[500,1000,1500,2000];
}

function ensurePaymentLinkStockAlertSheet_(){
  var headers=[
    'AlertID','TokenHash','Denomination','RequestedAmount','OrderID','UserID','UserEmail',
    'UserName','Reason','Status','ExpiresAt','CreatedAt','UsedAt','UsedBy'
  ];
  var sheetName=TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK_ALERTS;
  ensureSheet_(sheetName,headers);
  ensureColumns_(sheetName,headers);
}

function createPaymentLinkStockAlertToken_(payload){
  ensurePaymentLinkStockAlertSheet_();
  var raw=Utilities.getUuid()+'.'+Utilities.getUuid(),
      now=isoNow_(),
      expires=new Date(Date.now()+TC_STOCK_ALERT_TTL_MS).toISOString();
  appendRowObject_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK_ALERTS,{
    AlertID:newId_('TCPLA'),
    TokenHash:hash_(raw),
    Denomination:Number(payload.denomination||0),
    RequestedAmount:Number(payload.requestedAmount||payload.denomination||0),
    OrderID:String(payload.orderId||''),
    UserID:String(payload.userId||''),
    UserEmail:normalizeEmail_(payload.userEmail||''),
    UserName:String(payload.userName||''),
    Reason:String(payload.reason||'LOW_STOCK'),
    Status:'ACTIVE',
    ExpiresAt:expires,
    CreatedAt:now,
    UsedAt:'',
    UsedBy:''
  });
  return{token:raw,expiresAt:expires};
}

function paymentLinkStockAlertUrl_(token){
  var base='';
  try{base=ScriptApp.getService().getUrl()||'';}catch(ignore){}
  if(!base){
    base='https://script.google.com/macros/s/AKfycbxkIICfsVN783oq04KPBTN73ATEYaBuMXPaPCDsbnvP4uTHFDKH2wglKNAj2nWo5He9/exec';
  }
  return base+'?stockAction=ADD_PAYMENT_LINK&token='+encodeURIComponent(token);
}

function paymentLinkStockAlertHtml_(payload,token){
  var amount=emailMoney_(payload.requestedAmount||payload.denomination),
      denomination=emailMoney_(payload.denomination),
      availableStock=payload.availableStock===undefined?'':String(payload.availableStock),
      order=payload.orderId?emailEscape_(payload.orderId):'Not linked to a specific order',
      customer=payload.userEmail?emailEscape_(payload.userEmail):'Customer request',
      name=payload.userName?emailEscape_(payload.userName):'',
      reason=String(payload.reason||'LOW_STOCK')==='USER_REQUEST'
        ?'A customer requested a payment link, but no available stock was found for this amount.'
        :'Available payment-link stock has fallen below the configured threshold.';
  var actionUrl=paymentLinkStockAlertUrl_(token);
  return '<!doctype html><html><body style="margin:0;background:#f4f7f5;font-family:Arial,sans-serif;color:#18241e">'+
    '<div style="max-width:680px;margin:24px auto;padding:0 12px">'+
      '<div style="background:#173c2a;color:#fff;border-radius:18px;padding:24px 26px">'+
        '<div style="font-size:22px;font-weight:800">Trusted Circle</div>'+
        '<div style="margin-top:5px;opacity:.8">Payment-link stock action required</div>'+
      '</div>'+
      '<div style="background:#fff;margin-top:14px;border:1px solid #dce9e0;border-radius:18px;padding:26px">'+
        '<p style="font-size:17px;margin:0 0 10px"><b>Payment Link Stock Alert</b></p>'+
        '<p style="color:#5f6b64;line-height:1.6;margin:0 0 18px">'+reason+'</p>'+
        '<table style="border-collapse:collapse;width:100%;margin:0 0 20px">'+
          '<tr><td style="padding:8px 0;color:#68736d">Required amount</td><td style="padding:8px 0;text-align:right;font-weight:800">'+amount+'</td></tr>'+
          '<tr><td style="padding:8px 0;color:#68736d">Stock denomination</td><td style="padding:8px 0;text-align:right;font-weight:800">'+denomination+'</td></tr>'+
          (availableStock!==''?'<tr><td style="padding:8px 0;color:#68736d">Available now</td><td style="padding:8px 0;text-align:right;font-weight:800">'+availableStock+'</td></tr>':'')+
          '<tr><td style="padding:8px 0;color:#68736d">Customer</td><td style="padding:8px 0;text-align:right">'+customer+(name?' · '+name:'')+'</td></tr>'+
          '<tr><td style="padding:8px 0;color:#68736d">Order ID</td><td style="padding:8px 0;text-align:right">'+order+'</td></tr>'+
        '</table>'+
        '<div style="margin:0 0 14px">'+
          '<a href="'+emailEscape_(actionUrl)+'" style="display:inline-block;padding:13px 20px;border-radius:10px;background:#173c2a;color:#fff;text-decoration:none;font-weight:800;font-size:14px">OPEN SECURE STOCK FORM</a>'+
          '<p style="margin:10px 0 0;color:#68736d;font-size:12px;line-height:1.5">This browser form is the reliable option when your mail app blocks interactive HTML email forms.</p>'+
        '</div>'+
        '<div style="padding:18px;background:#f5fbf7;border:1px solid #dce9e0;border-radius:14px">'+
          '<div style="font-weight:800;margin-bottom:8px">Add the payment link from the secure browser form</div>'+
          '<p style="margin:0;color:#68736d;font-size:13px;line-height:1.5">Gmail does not allow interactive forms inside emails. Open the secure Apps Script page below, then paste the new payment link there.</p>'+
          '<a href="'+emailEscape_(actionUrl)+'" style="display:inline-block;margin-top:14px;padding:13px 20px;border-radius:10px;background:#173c2a;color:#fff;text-decoration:none;font-weight:800;font-size:14px">OPEN SECURE STOCK FORM</a>'+
        '</div>'+
        '<p style="font-size:12px;color:#7a847e;line-height:1.5;margin:16px 0 0">This one-time action expires automatically and cannot be reused after a successful add.</p>'+
      '</div>'+
      '<div style="padding:18px 8px;color:#68736d;font-size:12px">Trusted Circle · '+emailEscape_(TC_EMAIL.INFO)+'</div>'+
    '</div></body></html>';
}

function sendPaymentLinkStockAlert_(payload){
  var denomination=Number(payload.denomination||0),
      requestedAmount=Number(payload.requestedAmount||denomination||0);
  require_(paymentLinkStockDenominations_().indexOf(denomination)>=0,'Invalid stock denomination.');
  require_(requestedAmount===denomination,'Requested amount must match the supported stock denomination.');

  var token=createPaymentLinkStockAlertToken_({
    denomination:denomination,
    requestedAmount:requestedAmount,
    orderId:payload.orderId||'',
    userId:payload.userId||'',
    userEmail:payload.userEmail||'',
    userName:payload.userName||'',
    reason:payload.reason||'LOW_STOCK',
    availableStock:payload.availableStock
  });

  var html=paymentLinkStockAlertHtml_({
    denomination:denomination,
    requestedAmount:requestedAmount,
    orderId:payload.orderId||'',
    userEmail:payload.userEmail||'',
    userName:payload.userName||'',
    reason:payload.reason||'LOW_STOCK',
    availableStock:payload.availableStock
  },token);

  var subject='[Action Required] Payment-link stock · '+emailMoney_(denomination);
  return sendTransactionalEmail_(getAdminEmail_(),subject,html,
    'Payment-link stock action required for '+emailMoney_(denomination)+'. Use the secure stock form to add the link.');
}

function getAvailablePaymentLinkStockCount_(denomination){
  ensurePaymentLinkStockSheet_();
  return getRows_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK).filter(function(r){
    return Number(r.Denomination||0)===Number(denomination)&&
      String(r.Status||'').toUpperCase()==='AVAILABLE';
  }).length;
}

function maybeAlertPaymentLinkStockLow_(denomination,context){
  var d=Number(denomination||0),count=getAvailablePaymentLinkStockCount_(d);
  if(paymentLinkStockDenominations_().indexOf(d)<0||count>=TC_STOCK_ALERT_THRESHOLD)return false;

  ensurePaymentLinkStockAlertSheet_();
  var recentCutoff=Date.now()-30*60*1000;
  var recent=getRows_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK_ALERTS).some(function(r){
    var created=new Date(r.CreatedAt||0).getTime();
    return Number(r.Denomination||0)===d &&
      String(r.Reason||'').toUpperCase()==='LOW_STOCK' &&
      created>recentCutoff;
  });
  if(recent)return false;

  return sendPaymentLinkStockAlert_({
    denomination:d,
    requestedAmount:Number(context&&context.requestedAmount||d),
    orderId:context&&context.orderId||'',
    userId:context&&context.userId||'',
    userEmail:context&&context.userEmail||'',
    userName:context&&context.userName||'',
    reason:'LOW_STOCK',
    availableStock:count
  });
}

function notifyPaymentLinkStockUnavailable_(context){
  var d=Number(context&&context.denomination||0);
  require_(paymentLinkStockDenominations_().indexOf(d)>=0,'Unsupported payment-link denomination.');
  ensurePaymentLinkStockAlertSheet_();

  var orderId=String(context&&context.orderId||'');
  var recent=getRows_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK_ALERTS).some(function(r){
    return Number(r.Denomination||0)===d &&
      String(r.OrderID||'')===orderId &&
      String(r.Reason||'').toUpperCase()==='USER_REQUEST' &&
      String(r.Status||'').toUpperCase()==='ACTIVE';
  });
  if(recent)return false;

  return sendPaymentLinkStockAlert_({
    denomination:d,
    requestedAmount:Number(context&&context.requestedAmount||d),
    orderId:orderId,
    userId:context&&context.userId||'',
    userEmail:context&&context.userEmail||'',
    userName:context&&context.userName||'',
    reason:'USER_REQUEST',
    availableStock:0
  });
}

function validatePaymentLinkStockAlertToken_(token){
  ensurePaymentLinkStockAlertSheet_();
  var raw=String(token||'');
  require_(raw,'Payment-link stock action token is required.');
  var tokenHash=hash_(raw),rows=getRows_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK_ALERTS),actionRow=null;
  for(var i=rows.length-1;i>=0;i--){
    if(String(rows[i].TokenHash||'')===tokenHash){actionRow=rows[i];break;}
  }
  require_(actionRow,'Payment-link stock action not found.');
  require_(String(actionRow.Status||'').toUpperCase()==='ACTIVE','This stock action has already been used.');
  require_(new Date(actionRow.ExpiresAt||0).getTime()>Date.now(),'This stock action has expired.');
  var d=Number(actionRow.Denomination||0);
  require_([500,1000,1500,2000].indexOf(d)>=0,'Invalid stock denomination.');
  require_(Number(actionRow.RequestedAmount||0)===d,'Stock amount mismatch.');
  return actionRow;
}

function paymentLinkStockEmailActionResponse_(e){
  try{
    var p=e&&e.parameter?e.parameter:{},
        action=String(p.stockAction||'').toUpperCase(),
        token=String(p.token||''),
        link=cleanText_(p.link||'',2000),
        label=cleanText_(p.label||'Pay securely',100),
        selectedDenomination=Number(p.denomination||0);
    require_(action==='ADD_PAYMENT_LINK','Invalid stock action.');
    var actionRow=validatePaymentLinkStockAlertToken_(token);

    // A GET/open from the email shows the form. A POST with the link performs the add.
    if(!link){
      return HtmlService.createHtmlOutput(paymentLinkStockBrowserFormHtml_({
        denomination:Number(actionRow.Denomination||0),
        requestedAmount:Number(actionRow.RequestedAmount||actionRow.Denomination||0),
        orderId:actionRow.OrderID||'',
        userEmail:actionRow.UserEmail||'',
        userName:actionRow.UserName||'',
        reason:actionRow.Reason||'LOW_STOCK',
        availableStock:getAvailablePaymentLinkStockCount_(Number(actionRow.Denomination||0)),
        selectedDenomination:Number(actionRow.Denomination||0)
      },token)).setTitle('Trusted Circle · Add Payment Link');
    }

    require_(/^https:\/\//i.test(link),'Payment link must use HTTPS.');
    require_([500,1000,1500,2000].indexOf(selectedDenomination)>=0,'Choose ₹500, ₹1,000, ₹1,500 or ₹2,000.');
    ensurePaymentLinkStockSheet_();

    var lock=LockService.getScriptLock();
    lock.waitLock(10000);
    try{
      // Re-read the action inside the lock so two browser requests cannot use the same token.
      actionRow=validatePaymentLinkStockAlertToken_(token);
      var duplicate=getRows_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK).some(function(r){
        return String(r.Link||'').trim()===link;
      });
      require_(!duplicate,'This payment link is already stocked.');

      var denomination=selectedDenomination,now=isoNow_(),id=newId_('TCPLS');
      appendRowObject_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,{
        PaymentLinkStockID:id,
        Denomination:denomination,
        Link:link,
        Label:label||'Pay securely',
        Status:'AVAILABLE',
        OrderID:'',
        PaymentLinkID:'',
        ProviderLinkID:'',
        ReservedAt:'',
        ExpiresAt:'',
        CreatedAt:now,
        UpdatedAt:now
      });

      updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK_ALERTS,'AlertID',actionRow.AlertID,{
        Status:'USED',
        UsedAt:now,
        UsedBy:getAdminEmail_()
      });

      appendAudit_('', 'PAYMENT_LINK_STOCK_ADDED_FROM_EMAIL','PaymentLinkStock',id,{
        denomination:denomination,
        alertId:actionRow.AlertID,
        orderId:actionRow.OrderID||'',
        requestedAmount:actionRow.RequestedAmount||denomination
      });

      var remaining=getAvailablePaymentLinkStockCount_(denomination);
      return HtmlService.createHtmlOutput(paymentLinkStockEmailResultHtml_(
        'Payment link added to stock',
        'The payment link for '+emailMoney_(denomination)+' has been added successfully.',
        actionRow.OrderID||'',
        remaining
      ));
    }finally{lock.releaseLock();}
  }catch(err){
    return HtmlService.createHtmlOutput(paymentLinkStockEmailResultHtml_(
      'Payment link was not added',
      String(err&&err.message||err),
      '',
      null,
      true
    ));
  }
}

function paymentLinkStockBrowserFormHtml_(payload,token){
  var selected=Number(payload.selectedDenomination||payload.denomination||500),
      order=payload.orderId?emailEscape_(payload.orderId):'Not linked to a specific order',
      customer=payload.userEmail?emailEscape_(payload.userEmail):'Customer request',
      name=payload.userName?emailEscape_(payload.userName):'',
      actionUrl=paymentLinkStockAlertUrl_(token),
      options=[500,1000,1500,2000].map(function(d){
        return '<option value="'+d+'"'+(d===selected?' selected':'')+'>₹'+Number(d).toLocaleString('en-IN')+'</option>';
      }).join('');
  return '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Trusted Circle · Add Payment Link</title><style>'+
    'body{margin:0;background:#f4f7f5;font-family:Arial,sans-serif;color:#18241e}.wrap{max-width:620px;margin:0 auto;padding:20px}.head{background:#173c2a;color:#fff;border-radius:18px;padding:22px}.card{background:#fff;margin-top:14px;border:1px solid #dce9e0;border-radius:18px;padding:24px;box-shadow:0 12px 35px rgba(20,51,31,.08)}.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}.meta div{padding:12px;border-radius:12px;background:#f5f8f6}.meta small{display:block;color:#68736d;font-size:11px}.meta b{display:block;margin-top:4px;font-size:15px}.field{margin-top:16px}.field label{display:block;font-weight:800;font-size:13px;margin-bottom:7px}.field input,.field select{width:100%;box-sizing:border-box;padding:14px;border:1px solid #cfdad3;border-radius:11px;font-size:15px;outline:none;background:#fff}.field input:focus,.field select:focus{border-color:#4aa878;box-shadow:0 0 0 3px #eaf7ef}.btn{margin-top:18px;width:100%;border:0;border-radius:11px;padding:14px;background:#173c2a;color:#fff;font-weight:800;font-size:14px;cursor:pointer}.note{margin-top:14px;color:#68736d;font-size:12px;line-height:1.55}.lock{margin-top:14px;text-align:center;color:#7a847e;font-size:11px}'+
    '@media(max-width:600px){.wrap{padding:12px}.meta{grid-template-columns:1fr}.card{padding:18px}.head{padding:18px}}</style></head><body><main class="wrap">'+
    '<header class="head"><div style="font-size:21px;font-weight:800">Trusted Circle</div><div style="margin-top:5px;opacity:.8">Secure payment-link stock</div></header>'+
    '<section class="card"><div style="font-size:20px;font-weight:800">Add payment link to stock</div><p style="color:#5f6b64;line-height:1.55">Choose the voucher denomination and paste the new HTTPS payment link below.</p>'+
    '<div class="meta"><div><small>Customer</small><b>'+customer+(name?' · '+name:'')+'</b></div><div><small>Order ID</small><b>'+order+'</b></div></div>'+
    '<form method="POST" action="'+emailEscape_(actionUrl)+'"><input type="hidden" name="stockAction" value="ADD_PAYMENT_LINK"><input type="hidden" name="token" value="'+emailEscape_(token)+'">'+
    '<div class="field"><label>Voucher Denomination</label><select name="denomination" required>'+options+'</select></div>'+
    '<div class="field"><label>Payment Link</label><input type="url" name="link" required placeholder="https://..." autocomplete="off"></div>'+
    '<div class="field"><label>Button Label</label><input type="text" name="label" value="Pay securely" placeholder="Pay securely"></div>'+
    '<button class="btn" type="submit">ADD LINK TO STOCK</button></form>'+
    '<div class="note">Supported denominations: ₹500, ₹1,000, ₹1,500 and ₹2,000. The link must use HTTPS and must not already exist in stock. This secure action is one-time and expires automatically.</div>'+
    '<div class="lock">Trusted Circle · Secure Apps Script action</div></section></main></body></html>';
}

function paymentLinkStockEmailResultHtml_(title,message,orderId,remaining,isError){
  return '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f4f7f5;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:20px;box-sizing:border-box">'+
    '<main style="max-width:560px;width:100%;background:#fff;border:1px solid '+(isError?'#ead4d4':'#dce9e0')+';border-radius:18px;padding:30px;box-shadow:0 14px 40px rgba(0,0,0,.08);text-align:center">'+
      '<div style="font-size:13px;font-weight:800;letter-spacing:.08em;color:#68736d">TRUSTED CIRCLE · PAYMENT STOCK</div>'+
      '<h1 style="margin:10px 0;color:'+(isError?'#b42318':'#173c2a')+'">'+emailEscape_(title)+'</h1>'+
      '<p style="color:#5f6b64;line-height:1.6">'+emailEscape_(message)+'</p>'+
      (orderId?'<p style="font-size:12px;color:#7a847e">Order '+emailEscape_(orderId)+'</p>':'')+
      (remaining===null||remaining===undefined?'':'<p style="font-size:13px;color:#5f6b64">Current available stock: <b>'+String(remaining)+'</b></p>')+
    '</main></body></html>';
}

function sendLowStockAlertsForAllPaymentLinkDenominations_(){
  paymentLinkStockDenominations_().forEach(function(d){
    try{maybeAlertPaymentLinkStockLow_(d,{requestedAmount:d});}catch(err){console.error('Low-stock alert failed for '+d+': '+String(err&&err.message||err));}
  });
}