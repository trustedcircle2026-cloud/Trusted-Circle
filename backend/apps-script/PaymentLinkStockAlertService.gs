/** Trusted Circle — payment-link stock alert and email replenishment workflow.
 *  Add this file to the same Apps Script project as the existing backend files.
 *
 *  Flow:
 *   1) Low stock (< 2 AVAILABLE links) => immediate admin email with one-time add form.
 *   2) Customer requests an unavailable amount => immediate admin email with one-time add form.
 *   3) Admin pastes the payment URL and submits from the email.
 *   4) The backend validates the signed/hashed one-time action token and amount.
 *   5) The link is inserted into PaymentLinkStock as AVAILABLE and the token is consumed.
 *
 *  Existing payment/order APIs are intentionally left intact.
 */

var TC_STOCK_ALERT_THRESHOLD=2;
var TC_STOCK_ALERT_TTL_MS=7*24*60*60*1000;

function ensurePaymentLinkStockAlertSheet_(){
  var headers=[
    'AlertID','TokenHash','Denomination','RequestedAmount','OrderID','UserID','UserEmail',
    'UserName','Reason','Status','ExpiresAt','CreatedAt','UsedAt','UsedBy'
  ];
  ensureSheet_(TC_CONFIG.SHEETS.ADMIN_EMAIL_ACTIONS,headers);
  ensureColumns_(TC_CONFIG.SHEETS.ADMIN_EMAIL_ACTIONS,headers);
}

function createPaymentLinkStockAlertToken_(payload){
  ensurePaymentLinkStockAlertSheet_();
  var raw=Utilities.getUuid()+'.'+Utilities.getUuid(),
      now=isoNow_(),
      expires=new Date(Date.now()+TC_STOCK_ALERT_TTL_MS).toISOString();
  appendRowObject_(TC_CONFIG.SHEETS.ADMIN_EMAIL_ACTIONS,{
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
          '<tr><td style="padding:8px 0;color:#68736d">Customer</td><td style="padding:8px 0;text-align:right">'+customer+(name?' · '+name:'')+'</td></tr>'+
          '<tr><td style="padding:8px 0;color:#68736d">Order ID</td><td style="padding:8px 0;text-align:right">'+order+'</td></tr>'+
        '</table>'+
        '<div style="padding:18px;background:#f5fbf7;border:1px solid #dce9e0;border-radius:14px">'+
          '<div style="font-weight:800;margin-bottom:8px">Paste the new payment link</div>'+
          '<p style="margin:0 0 14px;color:#68736d;font-size:13px;line-height:1.5">The amount above is locked to this request. The link must be HTTPS and must not already exist in stock.</p>'+
          '<form method="POST" action="'+emailEscape_(actionUrl)+'" style="margin:0">'+
            '<input type="hidden" name="stockAction" value="ADD_PAYMENT_LINK">'+
            '<input type="hidden" name="token" value="'+emailEscape_(token)+'">'+
            '<input type="url" name="link" required placeholder="https://..." style="width:100%;box-sizing:border-box;padding:13px;border:1px solid #cfdad3;border-radius:10px;font-size:15px;margin-bottom:12px">'+
            '<input type="text" name="label" value="Pay securely" placeholder="Button label (optional)" style="width:100%;box-sizing:border-box;padding:13px;border:1px solid #cfdad3;border-radius:10px;font-size:15px;margin-bottom:12px">'+
            '<button type="submit" style="border:0;cursor:pointer;padding:13px 20px;border-radius:10px;background:#173c2a;color:#fff;font-weight:800;font-size:14px">ADD LINK TO STOCK</button>'+
          '</form>'+
        '</div>'+
        '<p style="font-size:12px;color:#7a847e;line-height:1.5;margin:16px 0 0">This one-time action expires automatically and cannot be reused after a successful add.</p>'+
      '</div>'+
      '<div style="padding:18px 8px;color:#68736d;font-size:12px">Trusted Circle · '+emailEscape_(TC_EMAIL.INFO)+'</div>'+
    '</div></body></html>';
}

function sendPaymentLinkStockAlert_(payload){
  var denomination=Number(payload.denomination||0),
      requestedAmount=Number(payload.requestedAmount||denomination||0);
  require_([500,1000,1500,2000].indexOf(denomination)>=0,'Invalid stock denomination.');
  require_(requestedAmount>0,'Requested amount is required.');

  var token=createPaymentLinkStockAlertToken_({
    denomination:denomination,
    requestedAmount:requestedAmount,
    orderId:payload.orderId||'',
    userId:payload.userId||'',
    userEmail:payload.userEmail||'',
    userName:payload.userName||'',
    reason:payload.reason||'LOW_STOCK'
  });

  var html=paymentLinkStockAlertHtml_({
    denomination:denomination,
    requestedAmount:requestedAmount,
    orderId:payload.orderId||'',
    userEmail:payload.userEmail||'',
    userName:payload.userName||'',
    reason:payload.reason||'LOW_STOCK'
  },token);

  var subject='[Action Required] Payment-link stock · '+emailMoney_(denomination);
  return sendTransactionalEmail_(getAdminEmail_(),subject,html,
    'Payment-link stock action required for '+emailMoney_(denomination)+'. Open the email in HTML mode to add the link.');
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
  if([500,1000,1500,2000].indexOf(d)<0||count>=TC_STOCK_ALERT_THRESHOLD)return false;

  ensurePaymentLinkStockAlertSheet_();
  var recentCutoff=Date.now()-30*60*1000;
  var recent=getRows_(TC_CONFIG.SHEETS.ADMIN_EMAIL_ACTIONS).some(function(r){
    return Number(r.Denomination||0)===d &&
      String(r.Reason||'').toUpperCase()==='LOW_STOCK' &&
      new Date(r.CreatedAt||0).getTime()>recentCutoff &&
      String(r.Status||'').toUpperCase()==='ACTIVE';
  });
  if(recent)return false;

  return sendPaymentLinkStockAlert_({
    denomination:d,
    requestedAmount:Number(context&&context.requestedAmount||d),
    orderId:context&&context.orderId||'',
    userId:context&&context.userId||'',
    userEmail:context&&context.userEmail||'',
    userName:context&&context.userName||'',
    reason:'LOW_STOCK'
  });
}

function notifyPaymentLinkStockUnavailable_(context){
  var d=Number(context&&context.denomination||0);
  require_([500,1000,1500,2000].indexOf(d)>=0,'Unsupported payment-link denomination.');
  ensurePaymentLinkStockAlertSheet_();

  var orderId=String(context&&context.orderId||'');
  var recent=getRows_(TC_CONFIG.SHEETS.ADMIN_EMAIL_ACTIONS).some(function(r){
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
    reason:'USER_REQUEST'
  });
}

function paymentLinkStockEmailActionResponse_(e){
  try{
    var p=e&&e.parameter?e.parameter:{};
    require_(String(p.stockAction||'').toUpperCase()==='ADD_PAYMENT_LINK','Invalid stock action.');
    var token=String(p.token||''),link=cleanText_(p.link||'',2000),label=cleanText_(p.label||'Pay securely',100);
    require_(token,'Payment-link stock action token is required.');
    require_(/^https:\/\//i.test(link),'Payment link must use HTTPS.');

    ensurePaymentLinkStockAlertSheet_();
    ensurePaymentLinkStockSheet_();

    var tokenHash=hash_(token),rows=getRows_(TC_CONFIG.SHEETS.ADMIN_EMAIL_ACTIONS),actionRow=null;
    for(var i=rows.length-1;i>=0;i--){
      if(String(rows[i].TokenHash||'')===tokenHash){actionRow=rows[i];break;}
    }
    require_(actionRow,'Payment-link stock action not found.');
    require_(String(actionRow.Status||'').toUpperCase()==='ACTIVE','This stock action has already been used.');
    require_(new Date(actionRow.ExpiresAt||0).getTime()>Date.now(),'This stock action has expired.');

    var denomination=Number(actionRow.Denomination||0);
    require_([500,1000,1500,2000].indexOf(denomination)>=0,'Invalid stock denomination.');
    require_(Number(actionRow.RequestedAmount||0)===Number(denomination),'Stock amount mismatch.');

    var lock=LockService.getScriptLock();
    lock.waitLock(10000);
    try{
      var duplicate=getRows_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK).some(function(r){
        return String(r.Link||'').trim()===link;
      });
      require_(!duplicate,'This payment link is already stocked.');

      var now=isoNow_(),id=newId_('TCPLS');
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

      updateRowById_(TC_CONFIG.SHEETS.ADMIN_EMAIL_ACTIONS,'AlertID',actionRow.AlertID,{
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
  [500,1000,1500,2000].forEach(function(d){
    try{maybeAlertPaymentLinkStockLow_(d,{requestedAmount:d});}catch(err){console.error('Low-stock alert failed for '+d+': '+String(err&&err.message||err));}
  });
}
