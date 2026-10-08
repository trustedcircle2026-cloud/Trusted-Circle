/**
 * TRUSTED CIRCLE — WALLET SERVICES
 * Completely independent from Shopping.
 *
 * Script Properties:
 * SPREADSHEET_ID   = 1Q5-xDelfCBiYldQAnToDTuQRy4c_rZlHoDvtsaP1mNI
 * ADMIN_EMAIL      = trustedcircle2026@gmail.com
 * WALLET_ADMIN_KEY = private key (never commit)
 */

const W = {
  ADD:[500,1000,1500,2000],
  OTP_MS:10*60*1000,
  LOGIN_CHALLENGE_MS:10*60*1000,
  LOGIN_MAX_ATTEMPTS:5,
  SESSION_MS:24*60*60*1000,
  RESERVATION_MS:15*60*1000,
  ACTION_MS:24*60*60*1000,
  S:{U:'WalletUsers',O:'WalletOTP',C:'WalletLoginChallenges',S:'WalletSessions',W:'Wallets',T:'WalletTransactions',P:'WalletPaymentLinks',A:'WalletAdminActions',L:'WalletAuditLogs'}
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
    data:ok?d:{},
    error:ok?'':String(result&&result.error||'Wallet Services request failed.')
  }).split('<').join('\\u003c');
  const html='<!doctype html><html><head><meta charset="utf-8"></head><body><script>(function(){var message='+payload+';try{window.top.postMessage(message, "https://trustedcircle.shop");}catch(e){window.parent.postMessage(message, "https://trustedcircle.shop");}})();</script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function route_(d){
  const a=String(d.action||'health');
  if(a==='health')return{ok:true,service:'Trusted Circle Wallet Services',version:'2.1.0',status:'ok'};
  if(a==='requestOtp')return requestOtp_(d);
  if(a==='verifyOtp')return verifyOtp_(d);
  if(a==='requestLoginChallenge')return requestLoginChallenge_(d);
  if(a==='verifyLoginChallenge')return verifyLoginChallenge_(d);
  if(a==='bootstrapShoppingSession')return bootstrapShoppingSession_(d);
  if(a==='bootstrapShoppingIdentity')return bootstrapShoppingIdentity_(d);
  if(a==='me')return{ok:true,data:{user:pubUser_(auth_(d.token))}};
  if(a==='wallet')return wallet_(d);
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
  if(!WALLET_SS_CACHE)WALLET_SS_CACHE=SpreadsheetApp.openById(requiredProp_('SPREADSHEET_ID'));
  return WALLET_SS_CACHE;
}
function cacheKey_(prefix,value){return prefix+hash_(String(value||'')).slice(0,40);}
function cacheJson_(key,value,seconds){try{CacheService.getScriptCache().put(key,JSON.stringify(value),seconds);}catch(_){}} 
function readCacheJson_(key){try{const v=CacheService.getScriptCache().get(key);return v?JSON.parse(v):null;}catch(_){return null;}}
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
  const u=auth_(d.token),w=walletRow_(u.UserID),balance=Number(w.Balance||0),reserved=Number(w.ReservedBalance||0);
  return{ok:true,data:{user:pubUser_(u),balance:balance,reservedBalance:reserved,availableBalance:balance-reserved,currency:'INR',addAmounts:W.ADD,transactions:txs_(u.UserID,50)}};
}
function walletOrders_(d){const u=auth_(d.token);return{ok:true,data:{transactions:txs_(u.UserID,500)}};}
function transactionStatus_(d){const u=auth_(d.token),t=find_(W.S.T,'TransactionID',clean_(d.transactionId,100));req_(t&&String(t.UserID)===String(u.UserID),'Transaction not found.');return{ok:true,data:{transaction:pubTx_(t)}};}

/* PAYMENT LINK STOCK */
function releaseExpiredReservations_(){
  rows_(W.S.P).forEach(x=>{
    if(x.Status==='RESERVED'&&x.ExpiresAt&&new Date(x.ExpiresAt).getTime()<=Date.now())
      updateRow_(W.S.P,'PaymentLinkStockID',x.PaymentLinkStockID,{Status:'AVAILABLE',WalletTransactionID:'',ReservedAt:'',ExpiresAt:'',UpdatedAt:now_(),Notes:'Reservation expired'});
  });
}
function reservePaymentLink_(amount,tid){
  releaseExpiredReservations_();
  const a=rows_(W.S.P).filter(x=>Number(x.Denomination)===Number(amount)&&x.Status==='AVAILABLE');
  req_(a.length,'No Wallet payment link is available for ₹'+amount+' right now.');
  const x=a[0],ts=now_(),exp=new Date(Date.now()+W.RESERVATION_MS).toISOString();
  updateRow_(W.S.P,'PaymentLinkStockID',x.PaymentLinkStockID,{Status:'RESERVED',WalletTransactionID:tid,ReservedAt:ts,ExpiresAt:exp,UpdatedAt:ts,Notes:''});
  return{reservationId:x.PaymentLinkStockID,paymentLink:x.Link,label:x.Label||'',expiresAt:exp};
}
function releasePaymentLink_(rid,tid){
  const x=find_(W.S.P,'PaymentLinkStockID',rid);if(!x)return false;
  req_(x.Status==='RESERVED'&&String(x.WalletTransactionID)===String(tid),'Payment link reservation mismatch.');
  return updateRow_(W.S.P,'PaymentLinkStockID',rid,{Status:'AVAILABLE',WalletTransactionID:'',ReservedAt:'',ExpiresAt:'',UpdatedAt:now_(),Notes:'Reservation released'});
}
function consumePaymentLink_(rid,tid){
  const x=find_(W.S.P,'PaymentLinkStockID',rid);if(!x)return false;
  req_(x.Status==='RESERVED'&&String(x.WalletTransactionID)===String(tid),'Payment link reservation mismatch.');
  return updateRow_(W.S.P,'PaymentLinkStockID',rid,{Status:'USED',UsedAt:now_(),UpdatedAt:now_(),Notes:'Payment confirmed by admin'});
}

/* ADD MONEY */
function addMoney_(d){
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const u=auth_(d.token),amount=Number(d.amount);req_(W.ADD.indexOf(amount)>=0,'Choose ₹500, ₹1,000, ₹1,500 or ₹2,000.');
    const tid=id_('WTXN'),link=reservePaymentLink_(amount,tid),w=walletRow_(u.UserID),bal=Number(w.Balance||0),ts=now_();
    const t={TransactionID:tid,UserID:u.UserID,Type:'ADD_MONEY',Amount:amount,Status:'PENDING_PAYMENT',BalanceBefore:bal,BalanceAfter:bal,UPIId:'',PaymentLink:link.paymentLink,PaymentLinkLabel:link.label,PaymentReservationId:link.reservationId,Attempt:1,ParentTransactionID:'',CreatedAt:ts,UpdatedAt:ts,CompletedAt:'',Notes:'Awaiting payment',AdminNote:''};
    addRow_(W.S.T,t);createAdminActions_(t);audit_(u.UserID,tid,'ADD_MONEY_CREATED','USER',JSON.stringify({amount:amount}));transactionSummaryEmail_(t);
    return{ok:true,data:{transaction:pubTx_(t),paymentLink:link.paymentLink,expiresAt:link.expiresAt}};
  }finally{lock.releaseLock();}
}
function retryAddMoney_(d){
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const u=auth_(d.token),old=find_(W.S.T,'TransactionID',clean_(d.transactionId,100));req_(old&&String(old.UserID)===String(u.UserID),'Transaction not found.');req_(old.Status==='NOT_RECEIVED','Only a Not Received payment can be retried.');
    const tid=id_('WTXN'),link=reservePaymentLink_(Number(old.Amount),tid),w=walletRow_(u.UserID),bal=Number(w.Balance||0),ts=now_();
    updateRow_(W.S.T,'TransactionID',old.TransactionID,{Status:'RETRY_CREATED',UpdatedAt:ts,Notes:'Retry created'});
    const t={TransactionID:tid,UserID:u.UserID,Type:'ADD_MONEY',Amount:Number(old.Amount),Status:'PENDING_PAYMENT',BalanceBefore:bal,BalanceAfter:bal,UPIId:'',PaymentLink:link.paymentLink,PaymentLinkLabel:link.label,PaymentReservationId:link.reservationId,Attempt:Number(old.Attempt||1)+1,ParentTransactionID:old.TransactionID,CreatedAt:ts,UpdatedAt:ts,CompletedAt:'',Notes:'Retry payment',AdminNote:''};
    addRow_(W.S.T,t);createAdminActions_(t);audit_(u.UserID,tid,'ADD_MONEY_RETRY','USER',old.TransactionID);transactionSummaryEmail_(t);
    return{ok:true,data:{transaction:pubTx_(t),paymentLink:link.paymentLink,expiresAt:link.expiresAt}};
  }finally{lock.releaseLock();}
}

/* WITHDRAW */
function withdrawMoney_(d){
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const u=auth_(d.token),amount=Number(d.amount),upi=clean_(d.upiId,200),w=walletRow_(u.UserID),bal=Number(w.Balance||0),reserved=Number(w.ReservedBalance||0);
    req_(amount>0&&isFinite(amount),'Enter a valid withdrawal amount.');
    req_(/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/.test(upi),'Enter a valid UPI ID.');
    req_(amount<=bal-reserved,'Insufficient available wallet balance.');
    const ts=now_(),tid=id_('WTXN');
    updateRow_(W.S.W,'UserID',u.UserID,{ReservedBalance:reserved+amount,UpdatedAt:ts});
    const t={TransactionID:tid,UserID:u.UserID,Type:'WITHDRAW',Amount:amount,Status:'WITHDRAWAL_REQUESTED',BalanceBefore:bal,BalanceAfter:bal,UPIId:upi,PaymentLink:'',PaymentLinkLabel:'',PaymentReservationId:'',Attempt:1,ParentTransactionID:'',CreatedAt:ts,UpdatedAt:ts,CompletedAt:'',Notes:'Withdrawal requested',AdminNote:''};
    addRow_(W.S.T,t);createWithdrawalActions_(t);audit_(u.UserID,tid,'WITHDRAW_REQUESTED','USER',JSON.stringify({amount:amount,upiId:upi}));transactionSummaryEmail_(t);
    return{ok:true,data:{transaction:pubTx_(t)}};
  }finally{lock.releaseLock();}
}

/* ADMIN STOCK */
function walletAdminKey_(){return requiredProp_('WALLET_ADMIN_KEY');}
function adminReq_(d){req_(same_(clean_(d.adminKey,500),walletAdminKey_()),'Invalid Wallet Admin Key.');}
function adminAddPaymentLink_(d){
  adminReq_(d);const amount=Number(d.denomination),link=clean_(d.link,2000),label=clean_(d.label,200);
  req_(W.ADD.indexOf(amount)>=0,'Invalid denomination.');req_(/^https?:\/\//i.test(link),'Enter a valid payment gateway URL.');
  const ts=now_(),id=id_('WPL');addRow_(W.S.P,{PaymentLinkStockID:id,Denomination:amount,Link:link,Label:label||('₹'+amount+' Wallet Payment'),Status:'AVAILABLE',WalletTransactionID:'',ReservedAt:'',ExpiresAt:'',UsedAt:'',CreatedAt:ts,UpdatedAt:ts,Notes:''});
  audit_('SYSTEM','', 'ADMIN_PAYMENT_LINK_ADDED','ADMIN',JSON.stringify({id:id,amount:amount}));return{ok:true,data:{paymentLinkStockId:id}};
}
function adminAddPaymentLinkBulk_(d){
  adminReq_(d);const amount=Number(d.denomination),label=clean_(d.label,200),links=String(d.links||'').split(/\r?\n/).map(x=>clean_(x,2000)).filter(Boolean);
  req_(W.ADD.indexOf(amount)>=0,'Invalid denomination.');req_(links.length,'Paste at least one payment link.');
  let added=0;const ts=now_();links.forEach(link=>{if(!/^https?:\/\//i.test(link))return;addRow_(W.S.P,{PaymentLinkStockID:id_('WPL'),Denomination:amount,Link:link,Label:label||('₹'+amount+' Wallet Payment'),Status:'AVAILABLE',WalletTransactionID:'',ReservedAt:'',ExpiresAt:'',UsedAt:'',CreatedAt:ts,UpdatedAt:ts,Notes:'Bulk added'});added++;});
  req_(added,'No valid payment gateway links were found.');audit_('SYSTEM','','ADMIN_PAYMENT_LINK_BULK_ADDED','ADMIN',JSON.stringify({amount:amount,added:added}));return{ok:true,data:{added:added}};
}
function adminPaymentStock_(d){
  adminReq_(d);releaseExpiredReservations_();const links=rows_(W.S.P),summary={};
  W.ADD.forEach(a=>summary[String(a)]={denomination:a,available:0,reserved:0,used:0,removed:0});
  links.forEach(x=>{const s=summary[String(Number(x.Denomination))];if(!s)return;if(x.Status==='AVAILABLE')s.available++;else if(x.Status==='RESERVED')s.reserved++;else if(x.Status==='USED')s.used++;else if(x.Status==='REMOVED')s.removed++;});
  return{ok:true,data:{summary:Object.keys(summary).map(k=>summary[k]),links:links.map(x=>({paymentLinkStockId:x.PaymentLinkStockID,denomination:Number(x.Denomination),link:x.Link,label:x.Label||'',status:x.Status,walletTransactionId:x.WalletTransactionID||'',reservedAt:x.ReservedAt||'',expiresAt:x.ExpiresAt||'',usedAt:x.UsedAt||''}))}};
}
function adminRemovePaymentLink_(d){
  adminReq_(d);const id=clean_(d.paymentLinkStockId,100),x=find_(W.S.P,'PaymentLinkStockID',id);req_(x,'Payment link not found.');req_(x.Status==='AVAILABLE','Only an AVAILABLE payment link can be removed.');
  updateRow_(W.S.P,'PaymentLinkStockID',id,{Status:'REMOVED',UpdatedAt:now_(),Notes:'Removed by Wallet Admin'});audit_('SYSTEM','', 'ADMIN_PAYMENT_LINK_REMOVED','ADMIN',id);return{ok:true,data:{removed:true}};
}

function userEmail_(uid){const u=find_(W.S.U,'UserID',uid);return u&&u.Email?String(u.Email):'';}
function transactionSummaryEmail_(t){
  try{
    const to=userEmail_(t.UserID);if(!to)return;
    const title=t.Type==='ADD_MONEY'?'Add Money':'Wallet Withdrawal';
    const status=String(t.Status||'').replace(/_/g,' ');
    const statusColor=/COMPLETED/.test(t.Status)?'#0f7a4f':/REJECTED|NOT_RECEIVED/.test(t.Status)?'#b42318':'#a66a00';
    const body='<p><b>Transaction ID:</b> '+esc_(t.TransactionID)+'</p>'+
      '<p><b>Type:</b> '+esc_(title)+'</p>'+
      '<p><b>Amount:</b> ₹'+Number(t.Amount||0).toLocaleString('en-IN')+'</p>'+
      '<p><b>Status:</b> <span style="color:'+statusColor+'"><b>'+esc_(status)+'</b></span></p>'+
      '<p><b>Date:</b> '+esc_(new Date(t.CreatedAt).toLocaleString('en-IN'))+'</p>'+
      (t.UPIId?'<p><b>UPI ID:</b> '+esc_(t.UPIId)+'</p>':'')+
      '<p><b>Balance Before:</b> ₹'+Number(t.BalanceBefore||0).toLocaleString('en-IN')+'</p>'+
      '<p><b>Balance After:</b> ₹'+Number(t.BalanceAfter||0).toLocaleString('en-IN')+'</p>'+
      '<p>'+esc_(t.Notes||'')+'</p>'+
      '<p><a href="https://trustedcircle.shop/#/wallet-services" style="display:inline-block;padding:11px 17px;background:#0f5132;color:#fff;text-decoration:none;border-radius:8px">Open Wallet Services</a></p>';
    MailApp.sendEmail({to:to,subject:'Trusted Circle Wallet — '+title+' ₹'+Number(t.Amount||0)+' — '+status,name:'Trusted Circle',replyTo:'info@trustedcircle.in',body:'Trusted Circle Wallet transaction '+t.TransactionID+' — '+status,htmlBody:shell_('Wallet Transaction Summary',body)});
  }catch(_){/* Email must never block wallet transaction processing. */}
}

/* ADMIN ACTION EMAILS */
function adminEmail_(){return props_().getProperty('ADMIN_EMAIL')||'trustedcircle2026@gmail.com';}
function actionToken_(tid,action){const raw=token_();addRow_(W.S.A,{ActionID:id_('WACT'),TransactionID:tid,Action:action,TokenHash:hash_(raw),ExpiresAt:new Date(Date.now()+W.ACTION_MS).toISOString(),UsedAt:'',CreatedAt:now_()});return raw;}
function actionUrl_(raw,action){return ScriptApp.getService().getUrl()+'?adminAction='+encodeURIComponent(action)+'&token='+encodeURIComponent(raw);}
function createAdminActions_(t){
  const r=actionToken_(t.TransactionID,'RECEIVED'),n=actionToken_(t.TransactionID,'NOT_RECEIVED'),x=actionToken_(t.TransactionID,'REJECTED');
  const h='<p><b>Transaction:</b> '+esc_(t.TransactionID)+'</p><p><b>Amount:</b> ₹'+t.Amount+'</p><p><b>Payment link:</b> '+esc_(t.PaymentLinkLabel||'Wallet Payment')+'</p>'+btn_('✓ Received',actionUrl_(r,'RECEIVED'),'#0f5132')+btn_('! Not Received',actionUrl_(n,'NOT_RECEIVED'),'#b26a00')+btn_('✕ Rejected',actionUrl_(x,'REJECTED'),'#b42318');
  MailApp.sendEmail({to:adminEmail_(),subject:'Trusted Circle Wallet — Add Money ₹'+t.Amount,body:'Wallet Add Money request '+t.TransactionID,htmlBody:shell_('Wallet Add Money Request',h)});
}
function createWithdrawalActions_(t){
  const a=actionToken_(t.TransactionID,'WITHDRAW_APPROVE'),r=actionToken_(t.TransactionID,'WITHDRAW_REJECT');
  const h='<p><b>Transaction:</b> '+esc_(t.TransactionID)+'</p><p><b>Amount:</b> ₹'+t.Amount+'</p><p><b>UPI ID:</b> '+esc_(t.UPIId)+'</p>'+btn_('✓ Approve Withdrawal',actionUrl_(a,'WITHDRAW_APPROVE'),'#0f5132')+btn_('✕ Reject Withdrawal',actionUrl_(r,'WITHDRAW_REJECT'),'#b42318');
  MailApp.sendEmail({to:adminEmail_(),subject:'Trusted Circle Wallet — Withdrawal ₹'+t.Amount,body:'Wallet Withdrawal request '+t.TransactionID,htmlBody:shell_('Wallet Withdrawal Request',h)});
}
function adminAction_(p){
  try{
    const action=clean_(p.adminAction,50),token=clean_(p.token,500),h=hash_(token),a=rows_(W.S.A);let row=null;
    for(let i=a.length-1;i>=0;i--)if(same_(a[i].TokenHash,h)){row=a[i];break;}
    req_(row,'Admin action not found.');req_(!row.UsedAt,'This admin action has already been used.');req_(new Date(row.ExpiresAt).getTime()>Date.now(),'This admin action has expired.');req_(row.Action===action,'Invalid admin action.');
    const t=find_(W.S.T,'TransactionID',row.TransactionID);req_(t,'Transaction not found.');
    const lock=LockService.getScriptLock();lock.waitLock(20000);
    try{
      if(action==='RECEIVED')received_(t);
      else if(action==='NOT_RECEIVED')notReceived_(t);
      else if(action==='REJECTED')rejected_(t);
      else if(action==='WITHDRAW_APPROVE')withdrawApprove_(t);
      else if(action==='WITHDRAW_REJECT')withdrawReject_(t);
      else throw new Error('Unsupported admin action.');
      updateRow_(W.S.A,'ActionID',row.ActionID,{UsedAt:now_()});audit_(t.UserID,t.TransactionID,'ADMIN_'+action,'ADMIN','');
      return html_('Trusted Circle Wallet','Action completed successfully.',true);
    }finally{lock.releaseLock();}
  }catch(err){return html_('Trusted Circle Wallet',err.message,false);}
}
function received_(t){
  req_(t.Status==='PENDING_PAYMENT','Transaction is already '+t.Status+'.');const w=walletRow_(t.UserID),before=Number(w.Balance||0),after=before+Number(t.Amount);
  if(t.PaymentReservationId)consumePaymentLink_(t.PaymentReservationId,t.TransactionID);
  updateRow_(W.S.W,'UserID',t.UserID,{Balance:after,UpdatedAt:now_()});
  updateRow_(W.S.T,'TransactionID',t.TransactionID,{Status:'COMPLETED',BalanceBefore:before,BalanceAfter:after,UpdatedAt:now_(),CompletedAt:now_(),Notes:'Payment received'});transactionSummaryEmail_(find_(W.S.T,'TransactionID',t.TransactionID));
}
function notReceived_(t){req_(t.Status==='PENDING_PAYMENT','Transaction is already '+t.Status+'.');if(t.PaymentReservationId)releasePaymentLink_(t.PaymentReservationId,t.TransactionID);updateRow_(W.S.T,'TransactionID',t.TransactionID,{Status:'NOT_RECEIVED',UpdatedAt:now_(),Notes:'Admin marked payment not received'});transactionSummaryEmail_(find_(W.S.T,'TransactionID',t.TransactionID));}
function rejected_(t){req_(t.Status==='PENDING_PAYMENT','Transaction is already '+t.Status+'.');if(t.PaymentReservationId)releasePaymentLink_(t.PaymentReservationId,t.TransactionID);updateRow_(W.S.T,'TransactionID',t.TransactionID,{Status:'REJECTED',UpdatedAt:now_(),Notes:'Payment rejected'});transactionSummaryEmail_(find_(W.S.T,'TransactionID',t.TransactionID));}
function withdrawApprove_(t){
  req_(t.Status==='WITHDRAWAL_REQUESTED','Withdrawal is already '+t.Status+'.');const w=walletRow_(t.UserID),reserved=Number(w.ReservedBalance||0),amount=Number(t.Amount),balance=Number(w.Balance||0);req_(reserved>=amount,'Reserved balance mismatch.');
  updateRow_(W.S.W,'UserID',t.UserID,{Balance:balance-amount,ReservedBalance:reserved-amount,UpdatedAt:now_()});
  updateRow_(W.S.T,'TransactionID',t.TransactionID,{Status:'WITHDRAWAL_COMPLETED',BalanceAfter:balance-amount,UpdatedAt:now_(),CompletedAt:now_(),Notes:'Withdrawal approved'});transactionSummaryEmail_(find_(W.S.T,'TransactionID',t.TransactionID));
}
function withdrawReject_(t){
  req_(t.Status==='WITHDRAWAL_REQUESTED','Withdrawal is already '+t.Status+'.');const w=walletRow_(t.UserID),reserved=Number(w.ReservedBalance||0),amount=Number(t.Amount);
  updateRow_(W.S.W,'UserID',t.UserID,{ReservedBalance:Math.max(0,reserved-amount),UpdatedAt:now_()});
  updateRow_(W.S.T,'TransactionID',t.TransactionID,{Status:'WITHDRAWAL_REJECTED',UpdatedAt:now_(),CompletedAt:now_(),Notes:'Withdrawal rejected; amount released'});transactionSummaryEmail_(find_(W.S.T,'TransactionID',t.TransactionID));
}

/* HTML */
function esc_(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function btn_(label,url,bg){return'<a href="'+esc_(url)+'" style="display:inline-block;margin:6px;padding:13px 20px;background:'+bg+';color:#fff;text-decoration:none;border-radius:9px;font-weight:bold">'+esc_(label)+'</a>';}
function shell_(title,body){return'<div style="font-family:Arial;max-width:650px;margin:auto;padding:25px;background:#f4f7f5"><div style="background:#fff;padding:28px;border-radius:16px"><h2 style="color:#0f5132">'+esc_(title)+'</h2>'+body+'<p style="font-size:12px;color:#777">Trusted Circle Wallet Services · Admin links expire after 24 hours.</p></div></div>';}
function html_(title,msg,success){return HtmlService.createHtmlOutput('<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Arial;background:#f4f7f5"><div style="max-width:520px;margin:15vh auto;padding:40px;background:#fff;border-radius:18px;text-align:center"><div style="font-size:50px;color:'+(success?'#0f5132':'#b42318')+'">'+(success?'✓':'!')+'</div><h2>'+esc_(title)+'</h2><p>'+esc_(msg)+'</p><a href="https://trustedcircle.shop/#/wallet-services" style="display:inline-block;padding:12px 20px;background:#0f5132;color:#fff;text-decoration:none;border-radius:9px">Open Wallet Services</a></div></body></html>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
