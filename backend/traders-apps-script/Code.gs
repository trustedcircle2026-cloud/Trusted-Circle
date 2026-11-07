function tradersSetupProduction(){return tradersSetupProduction_();}
function doGet(e){if(e&&e.parameter&&e.parameter.bridge==='1')return HtmlService.createHtmlOutputFromFile('Bridge').setTitle('Trusted Circle API Bridge').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);return tradersHandle_(e,false);}
function doPost(e){
  var input={},nonce='';
  try{
    var params=e&&e.parameter?e.parameter:{};
    nonce=String(params.tc_nonce||'');
    if(params.tc_payload){input=JSON.parse(String(params.tc_payload));}
    else{
      var body=e&&e.postData?String(e.postData.contents||''):'';
      if(body){try{input=JSON.parse(body);}catch(ignore){input=params;}}
      else input=params;
    }
    var action=String(input.action||'health');
    var result=tradersOk_(tradersRoute_(action,input));
  }catch(error){
    console.error(error&&error.stack?error.stack:error);
    var result=tradersFail_(error.message||'Request failed.');
  }
  var message=JSON.stringify({type:'tc-traders-response',nonce:nonce,result:result}).replace(/</g,'\\u003c');
  // Apps Script HTML Service can add a sandbox frame around this response.
  // Notify both parent and top so the nonce response reaches the requesting app
  // regardless of whether the browser exposes one or two iframe levels.
  var html='<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"></head><body><script>(function(){var m='+message+';try{window.parent.postMessage(m,"*");}catch(e){}try{if(window.top!==window.parent)window.top.postMessage(m,"*");}catch(e){}})();</scr'+'ipt></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function tradersHandle_(e,isPost){
  try{
    var input={};
    if(isPost){
      var body=e&&e.postData?String(e.postData.contents||''):'';
      if(body){try{input=JSON.parse(body);}catch(ignore){input=e.parameter||{};}}
      else input=e&&e.parameter?e.parameter:{};
    }else input=e&&e.parameter?e.parameter:{};
    var action=String(input.action||'health');
    return tradersJson_(tradersOk_(tradersRoute_(action,input)));
  }catch(error){
    console.error(error&&error.stack?error.stack:error);
    return tradersJson_(tradersFail_(error.message||'Request failed.'));
  }
}
function tradersBridgeRequest(input){try{input=input||{};var action=String(input.action||'health');return JSON.parse(JSON.stringify(tradersOk_(tradersRoute_(action,input))));}catch(error){console.error(error&&error.stack?error.stack:error);return tradersFail_(error.message||'Request failed.');}}
function tradersRoute_(action,input){
  switch(action){
    case 'health': return {service:TRADERS_CONFIG.APP_NAME,status:'ok',version:TRADERS_CONFIG.VERSION};
    case 'register': return tradersRegister_(input);
    case 'login': return tradersLogin_(input);
    case 'logout': return tradersLogout_(input);
    case 'setup': return tradersSetupProduction_();
    case 'dashboard': return tradersDashboard_(input);
    case 'listTrades': return tradersListTrades_(input);
    case 'saveTrade': return tradersSaveTrade_(input);
    case 'listLedger': return tradersListLedger_(input);
    case 'saveLedgerEntry': return tradersSaveLedgerEntry_(input);
    case 'listAccounts': return tradersListAccounts_(input);
    case 'saveAccount': return tradersSaveAccount_(input);
    default: throw new Error('Unknown Traders API action: '+action);
  }
}
function tradersHeaders_(){
  var s=TRADERS_CONFIG.SHEETS;
  var h={};
  h[s.USERS]=['UserID','Email','DisplayName','Status','CreatedAt','UpdatedAt','PasswordSalt','PasswordHash'];
  h[s.OTP]=['OtpID','Email','OtpHash','ExpiresAt','Attempts','CreatedAt','UsedAt','Status'];
  h[s.SESSIONS]=['SessionID','UserID','TokenHash','ExpiresAt','CreatedAt','RevokedAt','Status'];
  h[s.ACCOUNTS]=['AccountID','UserID','Name','Market','Broker','BaseCurrency','InitialCapital','Status','CreatedAt','UpdatedAt'];
  h[s.INSTRUMENTS]=['InstrumentID','UserID','Market','Symbol','Exchange','Segment','QuoteCurrency','LotSize','TickSize','Active','CreatedAt'];
  h[s.TRADES]=['TradeID','UserID','AccountID','ExternalRef','TradeDateTime','Market','Symbol','Segment','Side','Quantity','Price','GrossAmount','Fees','Taxes','NetCashFlow','Currency','FxRateToBase','Strategy','Notes','Status','IdempotencyKey','CreatedAt','ReversalOf','Action','PositionSide','MarginAmount','ContractSize','RelatedTradeID','RealisedPnl'];
  h[s.LOTS]=['LotID','UserID','AccountID','TradeID','Market','Symbol','Side','OpenQuantity','EntryPrice','EntryDateTime','Currency','FxRateToBase','Status'];
  h[s.CASH]=['LedgerID','UserID','AccountID','EntryDate','EntryType','Description','Reference','Amount','Currency','FxRateToBase','AmountBase','Status','IdempotencyKey','CreatedAt'];
  h[s.PRICES]=['PriceID','UserID','Market','Symbol','Price','Currency','AsOf','Source','CreatedAt'];
  h[s.FX]=['FxRateID','UserID','FromCurrency','ToCurrency','Rate','AsOf','Source','CreatedAt'];
  h[s.IMPORTS]=['ImportID','UserID','AccountID','FileName','RowsRead','RowsImported','RowsRejected','Summary','CreatedAt'];
  h[s.AUDIT]=['AuditID','UserID','Action','Entity','EntityID','Metadata','CreatedAt'];
  h[s.SETTINGS]=['UserID','Key','Value','UpdatedAt'];
  return h;
}
function tradersSetupProduction_(){
  var ss=tradersSpreadsheet_(),headers=tradersHeaders_();
  Object.keys(headers).forEach(function(name){
    var sh=ss.getSheetByName(name)||ss.insertSheet(name),head=headers[name];
    if(sh.getLastRow()===0)sh.getRange(1,1,1,head.length).setValues([head]);
    else if(name===TRADERS_CONFIG.SHEETS.USERS){
      var existing=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
      head.forEach(function(col){if(existing.indexOf(col)<0){sh.getRange(1,sh.getLastColumn()+1).setValue(col);existing.push(col);}});
    }
    sh.setFrozenRows(1);
  });
  return {message:'Traders App data tables initialized.',spreadsheetId:ss.getId(),sheets:Object.keys(headers)};
}
function tradersRows_(name){
  var sh=tradersSpreadsheet_().getSheetByName(name);
  tradersRequire_(sh,'Run Traders App setup first.');
  if(sh.getLastRow()<2)return [];
  var values=sh.getDataRange().getValues(),headers=values.shift();
  return values.filter(function(row){return row.some(function(v){return v!=='';});}).map(function(row){
    var out={};headers.forEach(function(key,index){out[key]=row[index];});return out;
  });
}
function tradersAppend_(name,row){
  var sh=tradersSpreadsheet_().getSheetByName(name);
  tradersRequire_(sh,'Run Traders App setup first.');
  var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  Object.keys(row).forEach(function(key){if(headers.indexOf(key)<0){headers.push(key);sh.getRange(1,headers.length).setValue(key);}});
  sh.appendRow(headers.map(function(key){return row[key]===undefined?'':row[key];}));
}
function tradersAuth_(token){
  tradersRequire_(token,'Authentication token is required.');
  var hash=tradersHash_(token),rows=tradersRows_(TRADERS_CONFIG.SHEETS.SESSIONS);
  var now=Date.now();
  for(var i=0;i<rows.length;i++){
    if(rows[i].TokenHash===hash&&rows[i].Status==='ACTIVE'&&new Date(rows[i].ExpiresAt).getTime()>now){
      var user=tradersRows_(TRADERS_CONFIG.SHEETS.USERS).filter(function(u){return u.UserID===rows[i].UserID&&u.Status==='ACTIVE';})[0];
      tradersRequire_(user,'User account is unavailable.');
      return user;
    }
  }
  throw new Error('Session is invalid or expired. Sign in again.');
}

function tradersPasswordHash_(password,salt){
  var value=String(salt)+':'+String(password);
  for(var i=0;i<12000;i++)value=tradersHash_(value);
  return value;
}
function tradersFindUserByEmail_(email){
  var normalized=String(email||'').trim().toLowerCase();
  return tradersRows_(TRADERS_CONFIG.SHEETS.USERS).filter(function(u){return String(u.Email||'').toLowerCase()===normalized;})[0]||null;
}
function tradersCreateSession_(user){
  var token=Utilities.getUuid()+'.'+Utilities.getUuid()+'.'+Utilities.getUuid();
  var now=tradersNow_(),expires=new Date(now.getTime()+30*24*60*60*1000);
  tradersAppend_(TRADERS_CONFIG.SHEETS.SESSIONS,{SessionID:tradersId_('SES'),UserID:user.UserID,TokenHash:tradersHash_(token),ExpiresAt:expires,CreatedAt:tradersIsoNow_(),RevokedAt:'',Status:'ACTIVE'});
  return {token:token,user:{UserID:user.UserID,Email:user.Email,DisplayName:user.DisplayName},expiresAt:expires.toISOString()};
}
function tradersRegister_(input){
  var email=String(input.email||'').trim().toLowerCase(),name=String(input.name||'').trim(),password=String(input.password||'');
  tradersRequire_(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'Enter a valid email address.');
  tradersRequire_(name.length>=2&&name.length<=80,'Enter your name (2–80 characters).');
  tradersRequire_(password.length>=1&&password.length<=128,'Enter a password of up to 128 characters.');
  var lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    tradersRequire_(!tradersFindUserByEmail_(email),'An account with this email already exists. Please sign in.');
    var salt=Utilities.getUuid()+Utilities.getUuid();
    var user={UserID:tradersId_('USR'),Email:email,DisplayName:name,Status:'ACTIVE',CreatedAt:tradersIsoNow_(),UpdatedAt:tradersIsoNow_(),PasswordSalt:salt,PasswordHash:tradersPasswordHash_(password,salt)};
    tradersAppend_(TRADERS_CONFIG.SHEETS.USERS,user);
    return tradersCreateSession_(user);
  }finally{lock.releaseLock();}
}
function tradersLogin_(input){
  var email=String(input.email||'').trim().toLowerCase(),password=String(input.password||'');
  tradersRequire_(email&&password,'Enter your email and password.');
  var user=tradersFindUserByEmail_(email);
  tradersRequire_(user&&user.Status==='ACTIVE'&&user.PasswordSalt&&user.PasswordHash,'Email or password is incorrect.');
  tradersRequire_(tradersPasswordHash_(password,user.PasswordSalt)===user.PasswordHash,'Email or password is incorrect.');
  return tradersCreateSession_(user);
}
function tradersLogout_(input){
  var user=tradersAuth_(input.token),hash=tradersHash_(input.token),sh=tradersSpreadsheet_().getSheetByName(TRADERS_CONFIG.SHEETS.SESSIONS);
  var values=sh.getDataRange().getValues(),headers=values[0],tokenCol=headers.indexOf('TokenHash'),statusCol=headers.indexOf('Status'),revokedCol=headers.indexOf('RevokedAt'),userCol=headers.indexOf('UserID');
  for(var i=1;i<values.length;i++)if(values[i][tokenCol]===hash&&values[i][userCol]===user.UserID){sh.getRange(i+1,statusCol+1).setValue('REVOKED');sh.getRange(i+1,revokedCol+1).setValue(tradersIsoNow_());}
  return {message:'Signed out.'};
}

function tradersDashboard_(input){
  var user=tradersAuth_(input.token),id=user.UserID;
  var trades=tradersRows_(TRADERS_CONFIG.SHEETS.TRADES).filter(function(t){return t.UserID===id&&t.Status==='POSTED';});
  var ledger=tradersRows_(TRADERS_CONFIG.SHEETS.CASH).filter(function(x){return x.UserID===id&&x.Status==='POSTED';});
  var deposits=0,withdrawals=0,fees=0,tradeCount=trades.length;
  ledger.forEach(function(x){var amount=Number(x.AmountBase||0);if(amount>0)deposits+=amount;else withdrawals+=Math.abs(amount);});
  trades.forEach(function(t){fees+=Number(t.Fees||0)+Number(t.Taxes||0);});
  return {summary:{tradeCount:tradeCount,deposits:deposits,withdrawals:withdrawals,recordedFees:fees,realisedPnl:0,unrealisedPnl:null,netReturnPct:null,returnStatus:'PENDING_LEDGER_AND_LOT_ENGINE'},recentTrades:trades.slice(-10).reverse()};
}
function tradersListTrades_(input){
  var user=tradersAuth_(input.token);
  return {items:tradersRows_(TRADERS_CONFIG.SHEETS.TRADES).filter(function(t){return t.UserID===user.UserID;}).reverse()};
}
function tradersTradeBook_(userId,accountId){
  var rows=tradersRows_(TRADERS_CONFIG.SHEETS.TRADES).filter(function(t){return t.UserID===userId&&t.AccountID===accountId&&t.Status==='POSTED';}).sort(function(a,b){return new Date(a.TradeDateTime)-new Date(b.TradeDateTime);});
  var lots=[],realised=0,reserved=0,openFees=0;
  rows.forEach(function(t){
    var qty=Number(t.Quantity||0),price=Number(t.Price||0),fees=Number(t.Fees||0)+Number(t.Taxes||0),action=String(t.Action||''),side=String(t.PositionSide||'');
    if(!action){var longKey=[t.Market,t.Symbol,t.Currency||'INR','LONG'].join('|'),shortKey=[t.Market,t.Symbol,t.Currency||'INR','SHORT'].join('|');var hasLong=lots.some(function(l){return l.key===longKey&&l.qty>1e-9}),hasShort=lots.some(function(l){return l.key===shortKey&&l.qty>1e-9});if(t.Side==='SELL'&&hasLong){action='CLOSE';side='LONG';}else if(t.Side==='BUY'&&hasShort){action='CLOSE';side='SHORT';}else{action='OPEN';side=t.Side==='BUY'?'LONG':'SHORT';}}
    var key=[t.Market,t.Symbol,t.Currency||'INR',side].join('|');
    if(action==='OPEN'){
      lots.push({key:key,side:side,qty:qty,entry:price,mult:Number(t.ContractSize||1),fx:Number(t.FxRateToBase||1),margin:Number(t.MarginAmount||0),fees:fees*Number(t.FxRateToBase||1)});
      reserved+=Number(t.MarginAmount||0);openFees+=fees;return;
    }
    var remaining=qty;
    for(var i=0;i<lots.length&&remaining>1e-9;i++){
      var lot=lots[i];if(lot.key!==key||lot.qty<=1e-9)continue;
      var take=Math.min(remaining,lot.qty),ratio=take/lot.qty,entryFee=lot.fees*ratio,marginPart=lot.margin*ratio;
      var pnl=(side==='LONG'?(price-lot.entry):(lot.entry-price))*take*lot.mult*Number(t.FxRateToBase||1)-entryFee-fees*(take/qty)*Number(t.FxRateToBase||1);
      realised+=pnl;reserved-=marginPart;openFees-=entryFee;lot.qty-=take;lot.margin-=marginPart;lot.fees-=entryFee;remaining-=take;
    }
  });
  var account=tradersRows_(TRADERS_CONFIG.SHEETS.ACCOUNTS).filter(function(a){return a.AccountID===accountId&&a.UserID===userId;})[0];
  var cash=Number(account&&account.InitialCapital||0);
  tradersRows_(TRADERS_CONFIG.SHEETS.CASH).filter(function(x){return x.UserID===userId&&x.AccountID===accountId&&x.Status==='POSTED';}).forEach(function(x){cash+=Number(x.AmountBase||x.Amount||0);});
  var openQty=lots.reduce(function(total,l){return total+(l.qty>1e-9?l.qty:0);},0);
  return {cash:cash,realised:realised,reserved:Math.max(0,reserved),openFees:Math.max(0,openFees),available:cash+realised-Math.max(0,reserved)-Math.max(0,openFees),lots:lots,openQuantity:openQty};
}
function tradersSaveTrade_(input){
  var user=tradersAuth_(input.token),d=input.trade||{},accountId=String(d.AccountID||'');
  tradersRequire_(tradersRows_(TRADERS_CONFIG.SHEETS.ACCOUNTS).some(function(a){return a.AccountID===accountId&&a.UserID===user.UserID&&a.Status==='ACTIVE';}),'Select a valid trading account.');
  var qty=Number(d.Quantity),price=Number(d.Price),fees=Number(d.Fees||0),taxes=Number(d.Taxes||0),margin=Number(d.MarginAmount||0),mult=Number(d.ContractSize||1);
  var action=String(d.Action||'OPEN').toUpperCase(),side=String(d.PositionSide||(String(d.Side).toUpperCase()==='BUY'?'LONG':'SHORT')).toUpperCase(),orderSide=String(d.Side||'').toUpperCase();
  tradersRequire_(d.IdempotencyKey,'IdempotencyKey is required.');
  tradersRequire_(qty>0&&price>0&&isFinite(qty)&&isFinite(price),'Quantity and price must be positive numbers.');
  tradersRequire_(mult>0&&isFinite(mult)&&margin>=0&&isFinite(margin),'Contract size and manual margin must be valid.');
  tradersRequire_(['BUY','SELL'].indexOf(orderSide)>=0,'Side must be BUY or SELL.');
  tradersRequire_(['OPEN','CLOSE'].indexOf(action)>=0&&['LONG','SHORT'].indexOf(side)>=0,'Invalid position action or direction.');
  tradersRequire_((action==='OPEN'&&((side==='LONG'&&orderSide==='BUY')||(side==='SHORT'&&orderSide==='SELL')))||(action==='CLOSE'&&((side==='LONG'&&orderSide==='SELL')||(side==='SHORT'&&orderSide==='BUY'))),'Order side does not match the selected position direction.');
  var sheet=TRADERS_CONFIG.SHEETS.TRADES;
  if(tradersRows_(sheet).some(function(t){return t.UserID===user.UserID&&t.IdempotencyKey===d.IdempotencyKey;}))return {duplicate:true,message:'This trade submission was already recorded.'};
  var book=tradersTradeBook_(user.UserID,accountId);
  if(action==='OPEN')tradersRequire_(margin<=book.available+1e-8,'Insufficient available funds. Available: '+book.available.toFixed(2));
  if(action==='CLOSE'){
    var open=book.lots.filter(function(l){return l.side===side&&l.qty>1e-9&&l.key===[d.Market||'FOREX',String(d.Symbol||'').trim().toUpperCase(),String(d.Currency||'INR').toUpperCase(),side].join('|');}).reduce(function(total,l){return total+l.qty;},0);
    tradersRequire_(qty<=open+1e-9,'Closing quantity exceeds the open '+side.toLowerCase()+' position. Available to close: '+open);
  }
  var gross=qty*price*mult;
  var row={TradeID:tradersId_('TRD'),UserID:user.UserID,AccountID:accountId,ExternalRef:String(d.ExternalRef||''),TradeDateTime:String(d.TradeDateTime||tradersIsoNow_()),Market:String(d.Market||'INDIAN_EQUITY'),Symbol:String(d.Symbol||'').trim().toUpperCase(),Segment:String(d.Segment||'CASH'),Side:orderSide,Quantity:qty,Price:price,GrossAmount:gross,Fees:fees,Taxes:taxes,NetCashFlow:-(fees+taxes),Currency:String(d.Currency||'INR').toUpperCase(),FxRateToBase:Number(d.FxRateToBase||1),Strategy:String(d.Strategy||''),Notes:String(d.Notes||''),Status:'POSTED',IdempotencyKey:String(d.IdempotencyKey),CreatedAt:tradersIsoNow_(),ReversalOf:String(d.ReversalOf||''),Action:action,PositionSide:side,MarginAmount:action==='OPEN'?margin:0,ContractSize:mult,RelatedTradeID:String(d.RelatedTradeID||''),RealisedPnl:0};
  tradersAppend_(sheet,row);
  var after=tradersTradeBook_(user.UserID,accountId);
  return {trade:row,positionSummary:{availableFunds:after.available,reservedMargin:after.reserved,realisedPnl:after.realised}};
}
function tradersListLedger_(input){
  var user=tradersAuth_(input.token);
  return {items:tradersRows_(TRADERS_CONFIG.SHEETS.CASH).filter(function(x){return x.UserID===user.UserID;}).reverse()};
}
function tradersSaveLedgerEntry_(input){
  var user=tradersAuth_(input.token),d=input.entry||{},accountId=String(d.AccountID||'');
  tradersRequire_(tradersRows_(TRADERS_CONFIG.SHEETS.ACCOUNTS).some(function(a){return a.AccountID===accountId&&a.UserID===user.UserID&&a.Status==='ACTIVE';}),'Select a valid trading account.');
  var amount=Number(d.Amount);
  tradersRequire_(isFinite(amount)&&amount!==0,'Ledger amount must be a non-zero number.');
  tradersRequire_(d.IdempotencyKey,'IdempotencyKey is required.');
  var sheet=TRADERS_CONFIG.SHEETS.CASH;
  if(tradersRows_(sheet).some(function(x){return x.UserID===user.UserID&&x.IdempotencyKey===d.IdempotencyKey;}))return {duplicate:true};
  var rate=Number(d.FxRateToBase||1),currency=String(d.Currency||'INR').toUpperCase();
  tradersRequire_(rate>0&&isFinite(rate),'FX conversion rate must be positive.');
  var row={LedgerID:tradersId_('LED'),UserID:user.UserID,AccountID:accountId,EntryDate:String(d.EntryDate||tradersIsoNow_().slice(0,10)),EntryType:String(d.EntryType||'ADJUSTMENT'),Description:String(d.Description||''),Reference:String(d.Reference||''),Amount:amount,Currency:currency,FxRateToBase:rate,AmountBase:amount*rate,Status:'POSTED',IdempotencyKey:String(d.IdempotencyKey),CreatedAt:tradersIsoNow_()};
  tradersAppend_(sheet,row);return {entry:row};
}
function tradersListAccounts_(input){
  var user=tradersAuth_(input.token);
  return {items:tradersRows_(TRADERS_CONFIG.SHEETS.ACCOUNTS).filter(function(a){return a.UserID===user.UserID;})};
}
function tradersSaveAccount_(input){
  var user=tradersAuth_(input.token),d=input.account||{};
  tradersRequire_(String(d.Name||'').trim(),'Account name is required.');
  var currency=String(d.BaseCurrency||'INR').toUpperCase();
  tradersRequire_(/^[A-Z]{3}$/.test(currency),'Base currency must be a three-letter currency code.');
  var row={AccountID:tradersId_('ACC'),UserID:user.UserID,Name:String(d.Name).trim(),Market:String(d.Market||'MULTI_MARKET'),Broker:String(d.Broker||''),BaseCurrency:currency,InitialCapital:Number(d.InitialCapital||0),Status:'ACTIVE',CreatedAt:tradersIsoNow_(),UpdatedAt:tradersIsoNow_()};
  tradersAppend_(TRADERS_CONFIG.SHEETS.ACCOUNTS,row);return {account:row};
}
