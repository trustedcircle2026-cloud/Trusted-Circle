var CARDS_CONFIG=Object.freeze({APP_NAME:'Trusted Circle Cards',VERSION:'1.0.0',TIMEZONE:Session.getScriptTimeZone()||'Asia/Kolkata',DEFAULT_ADMIN_EMAIL:'trustedcircle2026@gmail.com',SESSION_TTL_MINUTES:720,OTP_TTL_MINUTES:10,OTP_MAX_ATTEMPTS:5,OTP_RESEND_SECONDS:60});
function cardsProps_(){return PropertiesService.getScriptProperties();}
function cardsSpreadsheet_(){var id=String(cardsProps_().getProperty('CARDS_SPREADSHEET_ID')||'').trim();if(!id)throw new Error('CARDS_SPREADSHEET_ID is not configured in Script Properties.');return SpreadsheetApp.openById(id);}
function cardsAdminEmail_(){return String(cardsProps_().getProperty('CARDS_ADMIN_EMAIL')||CARDS_CONFIG.DEFAULT_ADMIN_EMAIL).trim().toLowerCase();}
function cardsIso_(){return new Date().toISOString();}
function cardsId_(p){return p+'-'+Utilities.getUuid().replace(/-/g,'').slice(0,18).toUpperCase();}
function cardsHash_(v){return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(v),Utilities.Charset.UTF_8));}
function cardsEmail_(v){return String(v||'').trim().toLowerCase();}
function cardsRequire_(ok,msg){if(!ok)throw new Error(msg);}
