/** Trusted Circle Traders App backend configuration. */
var TRADERS_CONFIG = Object.freeze({
  APP_NAME: 'Trusted Circle Traders App',
  VERSION: '0.1.0',
  TIMEZONE: 'Asia/Kolkata',
  SPREADSHEET_PROPERTY: 'TRADERS_SPREADSHEET_ID',
  OTP_TTL_SECONDS: 600,
  SESSION_TTL_SECONDS: 86400,
  OTP_MAX_ATTEMPTS: 5,
  SHEETS: {
    USERS: 'Users',
    OTP: 'OTP',
    SESSIONS: 'Sessions',
    ACCOUNTS: 'TradingAccounts',
    INSTRUMENTS: 'Instruments',
    TRADES: 'TradeExecutions',
    LOTS: 'OpenLots',
    CASH: 'CashLedger',
    PRICES: 'PriceSnapshots',
    FX: 'FxRates',
    IMPORTS: 'ImportBatches',
    AUDIT: 'AuditLogs',
    SETTINGS: 'Settings'
  }
});

function tradersNow_(){return new Date();}
function tradersIsoNow_(){return Utilities.formatDate(tradersNow_(),TRADERS_CONFIG.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX");}
function tradersProps_(){return PropertiesService.getScriptProperties();}
function tradersRequire_(condition,message){if(!condition)throw new Error(message);}
function tradersSpreadsheet_(){
  var id=tradersProps_().getProperty(TRADERS_CONFIG.SPREADSHEET_PROPERTY);
  tradersRequire_(id,'Set Script Property TRADERS_SPREADSHEET_ID to the dedicated Traders App spreadsheet ID.');
  return SpreadsheetApp.openById(id);
}
function tradersJson_(payload){return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);}
function tradersOk_(data){var result=data||{};result.ok=true;result.timestamp=tradersIsoNow_();return result;}
function tradersFail_(message,code){return{ok:false,error:{code:code||'REQUEST_FAILED',message:String(message||'Request failed.')},timestamp:tradersIsoNow_()};}
function tradersId_(prefix){return prefix+Utilities.getUuid().replace(/-/g,'').substring(0,20).toUpperCase();}
function tradersHash_(value){var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value),Utilities.Charset.UTF_8);return bytes.map(function(b){var n=b<0?b+256:b;return('0'+n.toString(16)).slice(-2);}).join('');}
