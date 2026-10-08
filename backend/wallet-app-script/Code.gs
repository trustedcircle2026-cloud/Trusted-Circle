/**
 * TRUSTED CIRCLE — WALLET SERVICES
 * Completely independent from Shopping.
 *
 * Script Properties:
 * SPREADSHEET_ID   = 1hM8CAV5olKIJEWhXlXhEobpAXy1VUUoeOPzU-dequag
 * ADMIN_EMAIL      = trustedcircle2026@gmail.com
 * WALLET_ADMIN_KEY = private key (never commit)
 */

const WALLET_DEFAULT_SPREADSHEET_ID='1hM8CAV5olKIJEWhXlXhEobpAXy1VUUoeOPzU-dequag';
const WALLET_DEFAULT_WEB_APP_URL='https://script.google.com/macros/s/AKfycbx4jcs_F9miW2R1RMKY8N8cbFB7GA52rfQacdPhCY8xtlf9lQvagNXSUD3036qmvi04/exec';

const W = {
  ADD:[500,1000,1500,2000],
  OTP_MS:10*60*1000,
  LOGIN_CHALLENGE_MS:10*60*1000,
  LOGIN_MAX_ATTEMPTS:5,
  SESSION_MS:24*60*60*1000,
  RESERVATION_MS:15*60*1000,
  ACTION_MS:24*60*60*1000,
  S:{U:'WalletUsers',O:'WalletOTP',C:'WalletLoginChallenges',S:'WalletSessions',W:'Wallets',T:'WalletTransactions',P:'WalletPaymentLinks',G:'WalletGateways',A:'WalletAdminActions',L:'WalletAuditLogs'}
};

function doGet(e){
  try{
    if(e&&e.parameter&&e.parameter.adminAction)return adminAction_(e.parameter);
    return json_(route_(e&&e.parameter||{}));
  }catch(err){return json_({ok:false,error:err.message});}
}
function doPost(e){
  const d=parse_(e);
  try{
    const result=route_(d);
    return String(d.transport)==='iframe' ? iframeResponse_(result,d.requestId) : json_(result);
  }catch(err){
    const result={ok:false,error:err.message};
    return String(d.transport)==='iframe' ? iframeResponse_(result,d.requestId) : json_(result);
  }
}
function iframeResponse_(result,requestId){
  const safeId=clean_(requestId,120);
  const ok=!!(result&&result.ok);
  const d=ok&&result.data&&typeof result.data==='object'?result.data:{};
  const s=d&&d.session&&typeof d.session==='object'?d.session:null;
  // Payment fields may live at the route result root or inside data.
  // Prefer the root fields because they are the least ambiguous iframe contract.
  const paymentLink=ok?String(result.paymentLink||d.paymentLink||''):'';
  const paymentExpiresAt=ok?String(result.expiresAt||d.expiresAt||''):'';
  const transaction=ok&&result.transaction&&typeof result.transaction==='object'
    ?result.transaction
    :(ok&&d.transaction&&typeof d.transaction==='object'?d.transaction:null);
  const u=d&&d.user&&typeof d.user==='object'?d.user:null;
  // Keep the iframe contract deliberately flat. Login must never depend on
  // nested response parsing: token/user/expiresAt are always top-level.
  // Expose login challenge fields at the top level as well as inside data.
  // This avoids iframe/Apps Script response-normalization issues.
  const challenge=d&&d.challengeId?{
    challengeId:String(d.challengeId),
    number1:d.Number1!==undefined?String(d.Number1):'',
    number2:d.Number2!==undefined?String(d.Number2):'',
    number3:d.Number3!==undefined?String(d.Number3):'',
    options:Array.isArray(d.options)?d.options.map(String):[],
    email:d.email?String(d.email):'',
    isNewUser:!!d.isNewUser,
    expiresInSeconds:Number(d.expiresInSeconds||0)
  }:null;
  const payload=JSON.stringify({
    source:'trusted-circle-wallet',
    responseVersion:'4',
    requestId:safeId,
    ok:ok,
    token:s&&s.token?String(s.token):'',
    expiresAt:s&&s.expiresAt?String(s.expiresAt):'',
    user:u||null,
    challengeId:challenge?challenge.challengeId:'',
    options:challenge?challenge.options:[],
    number1:challenge?challenge.number1:'',
    number2:challenge?challenge.number2:'',
    number3:challenge?challenge.number3:'',
    email:challenge?challenge.email:'',
    isNewUser:challenge?challenge.isNewUser:false,
    expiresInSeconds:challenge?challenge.expiresInSeconds:0,
    // Payment responses are also promoted to top-level fields so browser
    // transports cannot lose the gateway URL during response normalization.
    paymentLink:paymentLink,
    paymentExpiresAt:paymentExpiresAt,
    transaction:transaction,
    data:ok?d:{},
    error:ok?'':String(result&&result.error||'Wallet Services request failed.')
  }).split('<').join('\\u003c');
  const html='<!doctype html><html><head><meta charset="utf-8"></head><body><script>(function(){var message='+payload+';try{window.top.postMessage(message, "https://trustedcircle.shop");}catch(e){window.parent.postMessage(message, "https://trustedcircle.shop");}})();</script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function route_(d){
  const a=String(d.action||'health');
  if(a==='health')return{ok:true,service:'Trusted Circle Wallet Services',version:'2.2.0',status:'ok'};
  if(a==='requestOtp')return requestOtp_(d);
  if(a==='verifyOtp')return verifyOtp_(d);
  if(a==='requestLoginChallenge')return requestLoginChallenge_(d);
  if(a==='verifyLoginChallenge')return verifyLoginChallenge_(d);
  if(a==='bootstrapShoppingSession')return bootstrapShoppingSession_(d);
  if(a==='bootstrapShoppingIdentity')return bootstrapShoppingIdentity_(d);
  if(a==='me')return{ok:true,data:{user:pubUser_(auth_(d.token))}};
  if(a==='wallet')return wallet_(d);
  if(a==='walletGateway')return walletGateway_(d);
  if(a==='walletOrders')return walletOrders_(d);
  if(a==='transactionStatus')return transactionStatus_(d);
  if(a==='addMoney')return addMoney_(d);
  if(a==='retryAddMoney')return retryAddMoney_(d);
  if(a==='withdrawMoney')return withdrawMoney_(d);
  if(a==='logout')return{ok:true,data:{loggedOut:logout_(d.token)}};
  if(a==='adminAddPaymentLink')return adminAddPaymentLink_(d);
  if(a==='adminAddPaymentLinkBulk')return adminAddPaymentLinkBulk_(d);
  if(a==='adminPaymentStock')return adminPaymentStock_(d);
  if(a==='adminRemovePaymentLink')return adminRemovePaymentLink_(d);
  throw new Error('Unknown Wallet API action: '+a);
}

/* CONFIG / SETUP */
function props_(){return PropertiesService.getScriptProperties();}
function requiredProp_(name){const v=String(props_().getProperty(name)||'').trim();if(!v)throw new Error('Missing Script Property: '+name);return v;}
let WALLET_SS_CACHE=null;
function spreadsheet_(){
  if(!WALLET_SS_CACHE){
    const configured=String(props_().getProperty('SPREADSHEET_ID')||'').trim();
    WALLET_SS_CACHE=SpreadsheetApp.openById(configured||WALLET_DEFAULT_SPREADSHEET_ID);
  }
  return WALLET_SS_CACHE;
}
function cacheKey_(prefix,value){return prefix+hash_(String(value||'')).slice(0,40);}
function cacheJson_(key,value,seconds){try{CacheService.getScriptCache().put(key,JSON.stringify(value),seconds);}catch(_){}} 
function readCacheJson_(key){try{const v=CacheService.getScriptCache().get(key);return v?JSON.parse(v):null;}catch(_){return null;}}
function setupPaymentGatewayBackend(){
  props_().setProperty('SPREADSHEET_ID',WALLET_DEFAULT_SPREADSHEET_ID);
  props_().setProperty('WALLET_WEB_APP_URL',WALLET_DEFAULT_WEB_APP_URL);
  const ss=SpreadsheetApp.openById(WALLET_DEFAULT_SPREADSHEET_ID);
  const schemas={
    WalletPaymentLinks:['PaymentLinkStockID','Denomination','Link','Label','Status','WalletTransactionID','ReservedAt','ExpiresAt','UsedAt','CreatedAt','UpdatedAt','Notes']
  };
  Object.entries(schemas).forEach(([name,headers])=>{
    const sh=ss.getSheetByName(name)||ss.insertSheet(name);
    if(sh.getLastRow()===0) sh.getRange(1,1,1,headers.length).setValues([headers]);
    else { const existing=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String); headers.forEach(h=>{if(existing.indexOf(h)<0)sh.getRange(1,sh.getLastColumn()+1).setValue(h);}); }
    sh.setFrozenRows(1);sh.getRange(1,1,1,sh.getLastColumn()).setFontWeight('bold');
  });
  return {ok:true,spreadsheetId:WALLET_DEFAULT_SPREADSHEET_ID,sheets:Object.keys(schemas),denominations:W.ADD,webAppUrl:WALLET_DEFAULT_WEB_APP_URL};
}

function resetWalletBackend(){
  const ss=spreadsheet_();
  const headers={
    WalletUsers:['UserID','Email','Name','Status','CreatedAt','UpdatedAt','LastLoginAt'],
    WalletOTP:['OTPId','Email','OTP','ExpiresAt','UsedAt','CreatedAt','LastSentAt'],
    WalletLoginChallenges:['ChallengeID','Email','Number1','Number2','Number3','AnswerHash','ExpiresAt','UsedAt','Attempts','CreatedAt','LastSentAt'],
    WalletSessions:['SessionID','UserID','TokenHash','ExpiresAt','CreatedAt','RevokedAt','Status'],
    Wallets:['WalletID','UserID','Balance','ReservedBalance','Currency','Status','CreatedAt','UpdatedAt'],
    WalletTransactions:['TransactionID','UserID','Type','Amount','Status','BalanceBefore','BalanceAfter','UPIId','PaymentLink','PaymentLinkLabel','PaymentReservationId','Attempt','ParentTransactionID','CreatedAt','UpdatedAt','CompletedAt','Notes','AdminNote'],
    WalletPaymentLinks:['PaymentLinkStockID','Denomination','Link','Label','Status','WalletTransactionID','ReservedAt','ExpiresAt','UsedAt','CreatedAt','UpdatedAt','Notes'],
    WalletAdminActions:['ActionID','TransactionID','Action','TokenHash','ExpiresAt','UsedAt','CreatedAt'],
    WalletAuditLogs:['AuditID','UserID','TransactionID','Action','Actor','Metadata','CreatedAt']
  };
  // Google Sheets cannot contain zero sheets. Keep one temporary sheet while
  // deleting every old Wallet sheet, then build the exact current model.
  const tempName='__WALLET_RESET__'+Date.now();
  const temp=ss.insertSheet(tempName);
  ss.getSheets().forEach(sh=>{if(sh.getSheetId()!==temp.getSheetId())ss.deleteSheet(sh);});
  temp.setName('WalletUsers');
  Object.keys(headers).forEach((name,index)=>{
    const sh=index===0?temp:ss.insertSheet(name);
    const h=headers[name];
    sh.clear();
    sh.getRange(1,1,1,h.length).setValues([h]);
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,h.length).setFontWeight('bold');
  });
  props_().setProperty('SPREADSHEET_ID',WALLET_DEFAULT_SPREADSHEET_ID);
  props_().setProperty('WALLET_WEB_APP_URL',WALLET_DEFAULT_WEB_APP_URL);
  if(!props_().getProperty('SHOPPING_APPS_SCRIPT_URL'))
    props_().setProperty('SHOPPING_APPS_SCRIPT_URL','https://script.google.com/macros/s/AKfycbxkIICfsVN783oq04KPBTN73ATEYaBuMXPaPCDsbnvP4uTHFDKH2wglKNAj2nWo5He9/exec');
  try{CacheService.getScriptCache().removeAll([]);}catch(_){}
  return{ok:true,reset:true,spreadsheetId:ss.getId(),sheets:Object.keys(headers),paymentLinkSource:'WalletPaymentLinks'};
}

function setupBackend(){
  const headers={
    WalletUsers:['UserID','Email','Name','Status','CreatedAt','UpdatedAt','LastLoginAt'],
    WalletOTP:['OTPId','Email','OTP','ExpiresAt','UsedAt','CreatedAt','LastSentAt'],
    WalletLoginChallenges:['ChallengeID','Email','Number1','Number2','Number3','AnswerHash','ExpiresAt','UsedAt','Attempts','CreatedAt','LastSentAt'],
    WalletSessions:['SessionID','UserID','TokenHash','ExpiresAt','CreatedAt','RevokedAt','Status'],
    Wallets:['WalletID','UserID','Balance','ReservedBalance','Currency','Status','CreatedAt','UpdatedAt'],
    WalletTransactions:['TransactionID','UserID','Type','Amount','Status','BalanceBefore','BalanceAfter','UPIId','PaymentLink','PaymentLinkLabel','PaymentReservationId','Attempt','ParentTransactionID','CreatedAt','UpdatedAt','CompletedAt','Notes','AdminNote'],
    WalletPaymentLinks:['PaymentLinkStockID','Denomination','Link','Label','Status','WalletTransactionID','ReservedAt','ExpiresAt','UsedAt','CreatedAt','UpdatedAt','Notes'],
    WalletAdminActions:['ActionID','TransactionID','Action','TokenHash','ExpiresAt','UsedAt','CreatedAt'],
    WalletAuditLogs:['AuditID','UserID','TransactionID','Action','Actor','Metadata','CreatedAt']
  };
  const ss=spreadsheet_();
  props_().setProperty('SPREADSHEET_ID',WALLET_DEFAULT_SPREADSHEET_ID);
  props_().setProperty('WALLET_WEB_APP_URL',WALLET_DEFAULT_WEB_APP_URL);
  if(!props_().getProperty('SHOPPING_APPS_SCRIPT_URL')) props_().setProperty('SHOPPING_APPS_SCRIPT_URL','https://script.google.com/macros/s/AKfycbxkIICfsVN783oq04KPBTN73ATEYaBuMXPaPCDsbnvP4uTHFDKH2wglKNAj2nWo5He9/exec');
  Object.keys(headers).forEach(name=>{
    const sh=ss.getSheetByName(name)||ss.insertSheet(name),h=headers[name];
    if(sh.getLastRow()===0){
      sh.getRange(1,1,1,h.length).setValues([h]);
    }else{
      const existing=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
      if(name===W.S.O){
        const oldHashCol=existing.indexOf('OtpHash');
        const otpCol=existing.indexOf('OTP');
        if(oldHashCol>=0 && otpCol<0){
          sh.getRange(1,oldHashCol+1).setValue('OTP');
          if(sh.getLastRow()>1)sh.getRange(2,oldHashCol+1,sh.getLastRow()-1,1).clearContent();
        }
      }
      if(name===W.S.C){
        const oldOptionsCol=existing.indexOf('Options');
        const hasSeparateNumbers=existing.indexOf('Number1')>=0&&existing.indexOf('Number2')>=0&&existing.indexOf('Number3')>=0;
        if(oldOptionsCol>=0&&!hasSeparateNumbers){
          const values=sh.getDataRange().getValues();
          const oldHeaders=values[0].map(String);
          const migrated=[h];
          for(let ri=1;ri<values.length;ri++){
            const row=values[ri];
            if(!row.some(x=>x!=='')){
              migrated.push(h.map(()=>'')); continue;
            }
            const obj={};oldHeaders.forEach((k,ci)=>obj[k]=row[ci]);
            const nums=String(obj.Options||'').split(',').map(v=>String(v).trim()).filter(Boolean);
            migrated.push(h.map(k=>{
              if(k==='Number1')return nums[0]||'';
              if(k==='Number2')return nums[1]||'';
              if(k==='Number3')return nums[2]||'';
              if(k==='Options')return undefined;
              return obj[k]===undefined?'':obj[k];
            }));
          }
          sh.clearContents();
          sh.getRange(1,1,migrated.length,h.length).setValues(migrated);
        }
      }
    }
    sh.setFrozenRows(1);sh.getRange(1,1,1,h.length).setFontWeight('bold');
  });
  return{ok:true,spreadsheetId:ss.getId(),sheets:Object.keys(headers)};
}

/* HELPERS */
function parse_(e){
  const p=e&&e.parameter||{};
  if(String(p.transport)==='iframe'){
    let payload={};
    try{payload=p.payload?JSON.parse(p.payload):{};}catch(_){throw new Error('Invalid Wallet request payload.');}
    return Object.assign({},payload,{action:p.action||payload.action,transport:'iframe',requestId:p.requestId||''});
  }
  const body=e&&e.postData&&e.postData.contents;
  if(body){try{return JSON.parse(body);}catch(_){}}
  return p;
}
function json_(x){return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON);}
function now_(){return new Date().toISOString();}
function clean_(v,n){return String(v==null?'':v).trim().slice(0,n||500);}
function email_(v){return clean_(v,200).toLowerCase();}
function id_(p){return p+'_'+Utilities.getUuid().replace(/-/g,'').slice(0,20);}
function token_(){return Utilities.getUuid()+'.'+Utilities.getUuid();}
function hash_(v){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(v),Utilities.Charset.UTF_8));}
function same_(a,b){a=String(a||'');b=String(b||'');if(a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0;}
function req_(ok,msg){if(!ok)throw new Error(msg);}
function rows_(name){
  const sh=spreadsheet_().getSheetByName(name);if(!sh||sh.getLastRow()<2)return[];
  const v=sh.getDataRange().getValues(),h=v[0].map(String);
  return v.slice(1).filter(r=>r.some(x=>x!=='')).map(r=>{const o={};h.forEach((k,i)=>o[k]=r[i]);return o;});
}
function addRow_(name,obj){
  const sh=spreadsheet_().getSheetByName(name);if(!sh)throw new Error('Run setupBackend first. Missing sheet: '+name);
  const h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];sh.appendRow(h.map(k=>obj[k]===undefined?'':obj[k]));
}
function find_(name,key,value){const a=rows_(name);for(let i=0;i<a.length;i++)if(String(a[i][key])===String(value))return a[i];return null;}
function updateRow_(name,key,value,patch){
  const sh=spreadsheet_().getSheetByName(name),v=sh.getDataRange().getValues(),h=v[0].map(String),kc=h.indexOf(key);
  req_(kc>=0,'Missing column: '+key);
  for(let r=1;r<v.length;r++)if(String(v[r][kc])===String(value)){
    Object.keys(patch).forEach(k=>{const c=h.indexOf(k);if(c>=0)sh.getRange(r+1,c+1).setValue(patch[k]);});
    return true;
  }
  return false;
}
function audit_(uid,tid,action,actor,metadata){addRow_(W.S.L,{AuditID:id_('WAUD'),UserID:uid,TransactionID:tid,Action:action,Actor:actor,Metadata:metadata||'',CreatedAt:now_()});}
function pubUser_(u){return{userId:u.UserID,email:u.Email,name:u.Name,status:u.Status};}
function pubTx_(t){return{transactionId:t.TransactionID,type:t.Type,amount:Number(t.Amount||0),status:t.Status,balanceBefore:Number(t.BalanceBefore||0),balanceAfter:Number(t.BalanceAfter||0),upiId:t.UPIId||'',paymentLink:t.PaymentLink||'',paymentLinkLabel:t.PaymentLinkLabel||'',attempt:Number(t.Attempt||1),parentTransactionId:t.ParentTransactionID||'',createdAt:t.CreatedAt,updatedAt:t.UpdatedAt,completedAt:t.CompletedAt||'',notes:t.Notes||''};}

/* AUTH */
function requestOtp_(d){
  const em=email_(d.email);
  req_(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em),'Enter a valid email address.');
  const cooldownKey=cacheKey_('WALLET_OTP_COOLDOWN_',em);
  req_(!CacheService.getScriptCache().get(cooldownKey),'Please wait before requesting another OTP.');

  const otpRows=rows_(W.S.O);
  const previous=otpRows.filter(x=>email_(x.Email)===em).pop();
  if(previous&&previous.LastSentAt&&Date.now()-new Date(previous.LastSentAt).getTime()<60000)
    throw new Error('Please wait before requesting another OTP.');

  const users=rows_(W.S.U);
  let existingUser=null;
  for(let i=users.length-1;i>=0;i--)if(email_(users[i].Email)===em){existingUser=users[i];break;}

  const otp=String(Math.floor(100000+Math.random()*900000)),ts=now_(),otpId=id_('WOTP');
  const record={
    OTPId:otpId,Email:em,OTP:otp,ExpiresAt:new Date(Date.now()+W.OTP_MS).toISOString(),
    UsedAt:'',CreatedAt:ts,LastSentAt:ts
  };
  addRow_(W.S.O,record);

  // Cache the OTP record and user so verification normally avoids scanning sheets again.
  cacheJson_(cacheKey_('WALLET_OTP_',em),record,Math.ceil(W.OTP_MS/1000));
  cacheJson_(cacheKey_('WALLET_LOGIN_USER_',em),existingUser||{isNewUser:true},Math.ceil(W.OTP_MS/1000));
  CacheService.getScriptCache().put(cooldownKey,'1',60);

  MailApp.sendEmail({
    to:em,
    subject:'Trusted Circle Wallet Services — Login OTP',
    name:'Trusted Circle',
    replyTo:'info@trustedcircle.in',
    body:'Your Trusted Circle Wallet Services OTP is '+otp+'. It expires in 10 minutes. Do not share this OTP.',
    htmlBody:'<div style="font-family:Arial;padding:24px"><h2 style="color:#0f5132">Trusted Circle Wallet Services</h2><p>Your OTP is:</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f3f6f4;text-align:center">'+otp+'</div><p>Expires in 10 minutes. Do not share this OTP.</p></div>'
  });
  return{ok:true,data:{sent:true,email:em,isNewUser:!existingUser,expiresInSeconds:600}};
}
function randomLoginNumber_(){
  return String(Math.floor(Math.random()*99)+1).padStart(2,'0');
}

function loginChallengeNumbers_(){
  const set={};
  while(Object.keys(set).length<3)set[randomLoginNumber_()]=true;
  return Object.keys(set);
}

function createWalletSession_(u){
  const ts=now_(),raw=token_(),exp=new Date(Date.now()+W.SESSION_MS).toISOString();
  addRow_(W.S.S,{
    SessionID:id_('WSES'),UserID:u.UserID,TokenHash:hash_(raw),
    ExpiresAt:exp,CreatedAt:ts,RevokedAt:'',Status:'ACTIVE'
  });
  cacheJson_(cacheKey_('WALLET_SESSION_',raw),u,Math.min(300,Math.ceil(W.SESSION_MS/1000)));
  return{token:raw,expiresAt:exp};
}

function requestLoginChallenge_(d){
  const em=email_(d.email);
  req_(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em),'Enter a valid email address.');

  const cooldownKey=cacheKey_('WALLET_LOGIN_CHALLENGE_COOLDOWN_',em);
  req_(!CacheService.getScriptCache().get(cooldownKey),'Please wait before requesting another login challenge.');

  const users=rows_(W.S.U);
  let existingUser=null;
  for(let i=users.length-1;i>=0;i--){
    if(email_(users[i].Email)===em){existingUser=users[i];break;}
  }

  const options=loginChallengeNumbers_();
  const answer=options[Math.floor(Math.random()*options.length)];
  const challengeId=id_('WCH');
  const ts=now_();
  const expiresAt=new Date(Date.now()+W.LOGIN_CHALLENGE_MS).toISOString();

  addRow_(W.S.C,{
    ChallengeID:challengeId,
    Email:em,
    Number1:options[0],
    Number2:options[1],
    Number3:options[2],
    AnswerHash:hash_(answer),
    ExpiresAt:expiresAt,
    UsedAt:'',
    Attempts:0,
    CreatedAt:ts,
    LastSentAt:ts
  });

  cacheJson_(cacheKey_('WALLET_LOGIN_CHALLENGE_',challengeId),{
    ChallengeID:challengeId,
    Email:em,
    Number1:options[0],
    Number2:options[1],
    Number3:options[2],
    AnswerHash:hash_(answer),
    ExpiresAt:expiresAt,
    UsedAt:'',
    Attempts:0
  },Math.ceil(W.LOGIN_CHALLENGE_MS/1000));

  CacheService.getScriptCache().put(cooldownKey,'1',60);

  MailApp.sendEmail({
    to:em,
    subject:'Trusted Circle Wallet Services — Login Verification',
    name:'Trusted Circle',
    replyTo:'info@trustedcircle.in',
    body:'Your Trusted Circle Wallet Services login verification number is '+answer+'. Select the matching number from the three options shown on the Wallet Services page. This number expires in 10 minutes. Do not share it.',
    htmlBody:'<div style="font-family:Arial;padding:24px"><h2 style="color:#0f5132">Trusted Circle Wallet Services</h2><p>Your login verification number is:</p><div style="font-size:36px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f3f6f4;text-align:center">'+answer+'</div><p>Return to Wallet Services and select this same number from the three options shown.</p><p>This verification expires in 10 minutes. Do not share this number.</p></div>'
  });

  return{ok:true,data:{
    challengeId:challengeId,
    email:em,
    Number1:options[0],
    Number2:options[1],
    Number3:options[2],
    options:options,
    isNewUser:!existingUser,
    expiresInSeconds:Math.floor(W.LOGIN_CHALLENGE_MS/1000)
  }};
}

function shoppingApiUrl_(){
  return String(props_().getProperty('SHOPPING_APPS_SCRIPT_URL')||'https://script.google.com/macros/s/AKfycbxkIICfsVN783oq04KPBTN73ATEYaBuMXPaPCDsbnvP4uTHFDKH2wglKNAj2nWo5He9/exec').trim();
}
function handoffSecret_(){return requiredProp_('WALLET_HANDOFF_SECRET');}
function bootstrapShoppingIdentity_(d){
  const email=email_(d.email);
  const name=clean_(d.name,100);
  const issuedAt=clean_(d.issuedAt,30);
  const signature=clean_(d.signature,500);
  req_(email&&/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email),'Trusted Circle account email is invalid.');
  const age=Date.now()-Number(issuedAt);
  req_(isFinite(age)&&age>=-30000&&age<=120000,'Trusted Circle account handoff expired. Please refresh the page.');
  const payload=email+'|'+name+'|'+issuedAt;
  const expected=Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(payload,handoffSecret_(),Utilities.Charset.UTF_8));
  req_(same_(signature,expected),'Invalid Trusted Circle account handoff.');
  let u=find_(W.S.U,'Email',email);
  const ts=now_();
  if(!u){
    u={UserID:id_('WUSR'),Email:email,Name:name||email.split('@')[0],Status:'ACTIVE',CreatedAt:ts,UpdatedAt:ts,LastLoginAt:ts};
    addRow_(W.S.U,u);
    addRow_(W.S.W,{WalletID:id_('WAL'),UserID:u.UserID,Balance:0,ReservedBalance:0,Currency:'INR',Status:'ACTIVE',CreatedAt:ts,UpdatedAt:ts});
  }else{
    req_(String(u.Status||'ACTIVE').toUpperCase()==='ACTIVE','Wallet account is inactive.');
    updateRow_(W.S.U,'UserID',u.UserID,{Name:name||u.Name,UpdatedAt:ts,LastLoginAt:ts});
    u=find_(W.S.U,'UserID',u.UserID);
  }
  req_(String(u.Status||'ACTIVE').toUpperCase()==='ACTIVE','Wallet account is inactive.');
  const session=createWalletSession_(u);
  return{ok:true,data:{user:pubUser_(u),session:session,linkedToShopping:true}};
}
function bootstrapShoppingSession_(d){
  const shoppingToken=clean_(d.shoppingToken,500);
  req_(shoppingToken,'Trusted Circle account login is required.');
  let response;
  try{
    response=UrlFetchApp.fetch(shoppingApiUrl_()+'?action=me&token='+encodeURIComponent(shoppingToken),{
      method:'get',muteHttpExceptions:true,followRedirects:true
    });
  }catch(err){throw new Error('Could not verify the Trusted Circle account. Please try again.');}
  req_(response.getResponseCode()>=200&&response.getResponseCode()<300,'Could not verify the Trusted Circle account (HTTP '+response.getResponseCode()+').');
  let body;
  try{body=JSON.parse(response.getContentText()||'{}');}catch(_){throw new Error('Invalid response from Trusted Circle account service.');}
  req_(body.ok&&body.data,'Trusted Circle account verification failed: '+String(body.error&&body.error.message||body.error||'Please sign in again.'));
  const source=body.data;
  const su=source.user||source;
  const em=email_(su.email||su.Email);
  req_(em&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em),'Trusted Circle account email is invalid.');
  const users=rows_(W.S.U);
  let u=null;
  for(let i=users.length-1;i>=0;i--)if(email_(users[i].Email)===em){u=users[i];break;}
  const ts=now_();
  if(!u){
    u={UserID:id_('WUSR'),Email:em,Name:clean_(su.name||su.Name,100)||em.split('@')[0],Status:'ACTIVE',CreatedAt:ts,UpdatedAt:ts,LastLoginAt:ts};
    addRow_(W.S.U,u);
    addRow_(W.S.W,{WalletID:id_('WAL'),UserID:u.UserID,Balance:0,ReservedBalance:0,Currency:'INR',Status:'ACTIVE',CreatedAt:ts,UpdatedAt:ts});
  }else{
    updateRow_(W.S.U,'UserID',u.UserID,{Name:clean_(su.name||su.Name,100)||u.Name,UpdatedAt:ts,LastLoginAt:ts});
    u=find_(W.S.U,'UserID',u.UserID);
  }
  req_(String(u.Status||'ACTIVE').toUpperCase()==='ACTIVE','Wallet account is inactive.');
  const session=createWalletSession_(u);
  return{ok:true,data:{user:pubUser_(u),session:session,linkedToShopping:true}};
}

function verifyLoginChallenge_(d){
  const em=email_(d.email);
  const challengeId=clean_(d.challengeId,100);
  const selected=clean_(d.selectedNumber,2);

  req_(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em),'Enter a valid email address.');
  req_(/^WCH_[A-Za-z0-9]+$/.test(challengeId),'Invalid login challenge.');
  req_(/^\d{2}$/.test(selected)&&Number(selected)>=1&&Number(selected)<=99,'Select one of the three numbers.');

  const cacheKey=cacheKey_('WALLET_LOGIN_CHALLENGE_',challengeId);
  let x=readCacheJson_(cacheKey);
  if(!x){
    x=find_(W.S.C,'ChallengeID',challengeId);
  }

  req_(x&&email_(x.Email)===em,'Login challenge not found. Please request a new one.');
  req_(!x.UsedAt,'This login challenge has already been used. Please request a new one.');
  req_(new Date(x.ExpiresAt).getTime()>Date.now(),'Login challenge expired. Please request a new one.');

  const options=[x.Number1,x.Number2,x.Number3].map(v=>String(v||'').trim()).filter(Boolean);
  req_(options.length===3&&options.indexOf(selected)>=0,'Select one of the three displayed numbers.');

  const attempts=Number(x.Attempts||0);
  req_(attempts<W.LOGIN_MAX_ATTEMPTS,'Too many incorrect attempts. Please request a new login challenge.');

  const correct=same_(x.AnswerHash,hash_(selected));
  if(!correct){
    const nextAttempts=attempts+1;
    updateRow_(W.S.C,'ChallengeID',challengeId,{Attempts:nextAttempts});
    cacheJson_(cacheKey,{...x,Attempts:nextAttempts},Math.ceil(Math.max(1,new Date(x.ExpiresAt).getTime()-Date.now())/1000));
    if(nextAttempts>=W.LOGIN_MAX_ATTEMPTS)throw new Error('Incorrect number. Too many attempts. Please request a new login challenge.');
    throw new Error('Incorrect number. Please select the number sent to your email.');
  }

  updateRow_(W.S.C,'ChallengeID',challengeId,{UsedAt:now_()});
  CacheService.getScriptCache().remove(cacheKey);

  let u=find_(W.S.U,'Email',em);
  const ts=now_();
  if(!u){
    u={
      UserID:id_('WUSR'),
      Email:em,
      Name:clean_(d.name,100)||em.split('@')[0],
      Status:'ACTIVE',
      CreatedAt:ts,
      UpdatedAt:ts,
      LastLoginAt:ts
    };
    addRow_(W.S.U,u);
    addRow_(W.S.W,{
      WalletID:id_('WAL'),UserID:u.UserID,Balance:0,ReservedBalance:0,
      Currency:'INR',Status:'ACTIVE',CreatedAt:ts,UpdatedAt:ts
    });
  }
  req_(u.Status==='ACTIVE','Wallet account is inactive.');

  const session=createWalletSession_(u);
  return{ok:true,data:{user:pubUser_(u),session:session}};
}

function verifyOtp_(d){
  const em=email_(d.email),otp=clean_(d.otp,20);
  req_(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)&&/^\d{6}$/.test(otp),'Enter email and 6-digit OTP.');

  const cache=CacheService.getScriptCache();
  const otpKey=cacheKey_('WALLET_OTP_',em);
  let x=readCacheJson_(otpKey);
  if(!x){
    const a=rows_(W.S.O).filter(row=>email_(row.Email)===em&&!row.UsedAt);
    req_(a.length,'OTP not found. Request a new OTP.');
    x=a[a.length-1];
  }
  req_(new Date(x.ExpiresAt).getTime()>Date.now(),'OTP expired. Request a new OTP.');
  req_(String(x.OTP||'')===otp,'Invalid OTP.');

  cache.remove(otpKey);
  // Mark the OTP used in the ledger for audit/replay protection.
  updateRow_(W.S.O,'OTPId',x.OTPId,{UsedAt:now_()});

  let u=readCacheJson_(cacheKey_('WALLET_LOGIN_USER_',em));
  if(u&&u.isNewUser)u=null;
  if(!u)u=find_(W.S.U,'Email',em);

  const ts=now_();
  if(!u){
    u={
      UserID:id_('WUSR'),Email:em,Name:clean_(d.name,100)||em.split('@')[0],
      Status:'ACTIVE',CreatedAt:ts,UpdatedAt:ts,LastLoginAt:ts
    };
    addRow_(W.S.U,u);
    addRow_(W.S.W,{
      WalletID:id_('WAL'),UserID:u.UserID,Balance:0,ReservedBalance:0,
      Currency:'INR',Status:'ACTIVE',CreatedAt:ts,UpdatedAt:ts
    });
  }
  req_(u.Status==='ACTIVE','Wallet account is inactive.');

  // LastLoginAt is informational; don't perform an extra sheet read/write on every login.
  const session=createWalletSession_(u);
  const user=pubUser_(u);

  // Cache the session and return only the minimum login payload.
  // The Wallet Home loads its balance/transactions after the page is already visible.
  return{ok:true,data:{user,session:session}};
}
function auth_(raw){
  req_(raw,'Authentication required.');
  const cached=readCacheJson_(cacheKey_('WALLET_SESSION_',raw));
  if(cached&&cached.UserID&&cached.Status==='ACTIVE')return cached;

  const h=hash_(raw),a=rows_(W.S.S);
  for(let i=a.length-1;i>=0;i--){
    if(a[i].Status==='ACTIVE'&&same_(a[i].TokenHash,h)){
      req_(new Date(a[i].ExpiresAt).getTime()>Date.now(),'Session expired.');
      const u=find_(W.S.U,'UserID',a[i].UserID);
      req_(u&&u.Status==='ACTIVE','Wallet account is inactive.');
      cacheJson_(cacheKey_('WALLET_SESSION_',raw),u,300);
      return u;
    }
  }
  throw new Error('Invalid session.');
}
function logout_(raw){if(!raw)return false;CacheService.getScriptCache().remove(cacheKey_('WALLET_SESSION_',raw));const h=hash_(raw),a=rows_(W.S.S);for(let i=a.length-1;i>=0;i--)if(a[i].Status==='ACTIVE'&&same_(a[i].TokenHash,h)){updateRow_(W.S.S,'SessionID',a[i].SessionID,{Status:'REVOKED',RevokedAt:now_()});return true;}return false;}

/* WALLET */
function walletRow_(uid){const w=find_(W.S.W,'UserID',uid);req_(w,'Wallet not found.');return w;}
function txs_(uid,limit){
  const a=rows_(W.S.T).filter(x=>String(x.UserID)===String(uid));a.sort((x,y)=>new Date(y.CreatedAt)-new Date(x.CreatedAt));return a.slice(0,limit||250).map(pubTx_);
}
function wallet_(d){
  const u=auth_(d.token),w=walletRow_(u.UserID),balance=Number(w.Balance||0),reserved=Number(w.ReservedBalance||0),tx=rows_(W.S.T).filter(x=>String(x.UserID)===String(u.UserID));
  const cashbackEarned=tx.filter(x=>String(x.Type)==='CASHBACK_EARNED'&&String(x.Status||'')==='COMPLETED').reduce((s,x)=>s+Number(x.Amount||0),0);
  const cashbackUsed=tx.filter(x=>String(x.Type)==='CASHBACK_REDEEMED'&&String(x.Status||'')==='COMPLETED').reduce((s,x)=>s+Number(x.Amount||0),0);
  const cashbackBalance=Math.max(0,cashbackEarned-cashbackUsed);
  return{ok:true,data:{user:pubUser_(u),balance:balance,reservedBalance:reserved,availableBalance:balance-reserved,currency:'INR',addAmounts:W.ADD,cashbackBalance:cashbackBalance,cashbackEarned:cashbackEarned,cashbackUsed:cashbackUsed,totalBalance:(balance-reserved)+cashbackBalance,transactions:txs_(u.UserID,100)}};
}
function availablePaymentLink_(amount){
  const sh=paymentLinkStockSheet_();
  if(!sh||sh.getLastRow()<2)return null;
  const values=sh.getDataRange().getValues();
  const headers=values[0].map(x=>String(x||'').trim().toLowerCase().replace(/[^a-z0-9]/g,''));
  const idx={
    id:headers.indexOf('paymentlinkstockid'),
    amount:headers.indexOf('denomination'),
    link:headers.indexOf('link'),
    label:headers.indexOf('label'),
    status:headers.indexOf('status'),
    tx:headers.indexOf('wallettransactionid'),
    reserved:headers.indexOf('reservedat'),
    expires:headers.indexOf('expiresat'),
    updated:headers.indexOf('updatedat'),
    notes:headers.indexOf('notes')
  };
  if(idx.id<0||idx.amount<0||idx.link<0||idx.status<0)return null;
  const now=Date.now();
  for(let r=1;r<values.length;r++){
    const row=values[r];
    if(Number(row[idx.amount])!==Number(amount))continue;
    const link=String(row[idx.link]||'').trim();
    if(!/^https?:\/\//i.test(link))continue;
    const status=String(row[idx.status]||'').trim().toUpperCase();
    if(status==='RESERVED'&&idx.expires>=0&&row[idx.expires]){
      const exp=new Date(row[idx.expires]).getTime();
      if(isFinite(exp)&&exp<=now){
        // Recycle only the expired row we encounter; avoid scanning and writing
        // every expired reservation before finding a new link.
        const ts=now_();
        sh.getRange(r+1,idx.status+1).setValue('AVAILABLE');
        if(idx.tx>=0)sh.getRange(r+1,idx.tx+1).setValue('');
        if(idx.reserved>=0)sh.getRange(r+1,idx.reserved+1).setValue('');
        if(idx.expires>=0)sh.getRange(r+1,idx.expires+1).setValue('');
        if(idx.updated>=0)sh.getRange(r+1,idx.updated+1).setValue(ts);
        if(idx.notes>=0)sh.getRange(r+1,idx.notes+1).setValue('');
        return{row:r+1,stockId:String(row[idx.id]||'').trim(),paymentLink:link,label:idx.label>=0?String(row[idx.label]||'').trim():'',sheet:sh};
      }
    }
    if(status==='AVAILABLE')
      return{row:r+1,stockId:String(row[idx.id]||'').trim(),paymentLink:link,label:idx.label>=0?String(row[idx.label]||'').trim():'',sheet:sh};
  }
  return null;
}

function walletGateway_(d){
  const u=auth_(d.token),amount=Number(d.amount);
  req_(W.ADD.indexOf(amount)>=0,'Choose ₹500, ₹1,000, ₹1,500 or ₹2,000.');
  const x=availablePaymentLink_(amount);
  req_(x&&/^https?:\/\//i.test(x.paymentLink),'No payment gateway is available for ₹'+amount+'. Please add a payment link in WalletPaymentLinks.');
  const paymentLink=String(x.paymentLink),label=String(x.label||('Trusted Circle ₹'+amount+' Gateway')),gatewayId=String(x.stockId||'');
  return{ok:true,paymentLink:paymentLink,data:{denomination:amount,paymentLink:paymentLink,label:label,gatewayId:gatewayId,source:'WalletPaymentLinks'}};
}

function releaseExpiredReservations_(){
  // Kept for compatibility/admin cleanup. Normal Add Money no longer performs
  // a full-sheet expiry scan, which makes link allocation much faster.
  const sh=paymentLinkStockSheet_();
  if(!sh||sh.getLastRow()<2)return;
  const values=sh.getDataRange().getValues(),headers=values[0].map(String);
  const si=headers.indexOf('Status'),ei=headers.indexOf('ExpiresAt'),ti=headers.indexOf('WalletTransactionID'),ri=headers.indexOf('ReservedAt'),ui=headers.indexOf('UpdatedAt'),ni=headers.indexOf('Notes');
  if(si<0||ei<0)return;
  const ts=now_(),now=Date.now();
  for(let r=1;r<values.length;r++){
    const exp=values[r][ei];
    if(String(values[r][si]).toUpperCase()==='RESERVED'&&exp&&new Date(exp).getTime()<=now){
      sh.getRange(r+1,si+1).setValue('AVAILABLE');
      if(ti>=0)sh.getRange(r+1,ti+1).setValue('');
      if(ri>=0)sh.getRange(r+1,ri+1).setValue('');
      if(ei>=0)sh.getRange(r+1,ei+1).setValue('');
      if(ui>=0)sh.getRange(r+1,ui+1).setValue(ts);
      if(ni>=0)sh.getRange(r+1,ni+1).setValue('Reservation expired');
    }
  }
}
function reservePaymentLink_(amount,tid){
  const x=availablePaymentLink_(amount);
  req_(x&&x.paymentLink,'No payment gateway is available for ₹'+amount+'. Please add a payment link in WalletPaymentLinks.');
  const ts=now_(),exp=new Date(Date.now()+W.RESERVATION_MS).toISOString();
  const h=x.sheet.getRange(1,1,1,x.sheet.getLastColumn()).getValues()[0].map(String);
  const set=(name,value)=>{const col=h.indexOf(name);if(col>=0)x.sheet.getRange(x.row,col+1).setValue(value);};
  set('Status','RESERVED');set('WalletTransactionID',tid);set('ReservedAt',ts);set('ExpiresAt',exp);set('UpdatedAt',ts);set('Notes','');
  return{reservationId:x.stockId,paymentLink:x.paymentLink,label:x.label||'',expiresAt:exp,source:'WalletPaymentLinks'};
}


