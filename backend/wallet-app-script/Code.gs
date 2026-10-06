/**
 * TRUSTED CIRCLE — WALLET SERVICES
 * Independent backend. This file NEVER calls the Shopping backend.
 *
 * Script Properties:
 * SPREADSHEET_ID   = NEW Wallet Services Google Sheet ID
 * ADMIN_EMAIL      = trustedcircle2026@gmail.com
 * WALLET_ADMIN_KEY = private key for WalletAdminaddlink.html
 */

const W = {
  ADD: [500, 1000, 1500, 2000],
  OTP_MS: 10 * 60 * 1000,
  SESSION_MS: 60 * 60 * 1000,
  RESERVATION_MS: 15 * 60 * 1000,
  ACTION_MS: 24 * 60 * 60 * 1000,
  S: {
    U: 'WalletUsers',
    O: 'WalletOTP',
    S: 'WalletSessions',
    W: 'Wallets',
    T: 'WalletTransactions',
    P: 'WalletPaymentLinks',
    A: 'WalletAdminActions',
    L: 'WalletAuditLogs'
  }
};

function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.adminAction) return adminAction_(e.parameter);
    return json_(route_(e && e.parameter || {}));
  } catch (err) {
    return json_({ ok:false, error:err.message });
  }
}

function doPost(e) {
  try {
    return json_(route_(parse_(e)));
  } catch (err) {
    return json_({ ok:false, error:err.message });
  }
}

function route_(d) {
  const action = String(d.action || 'health');
  if (action === 'health') return {
    ok:true,
    service:'Trusted Circle Wallet Services',
    version:'1.1.0',
    status:'ok'
  };
  if (action === 'requestOtp') return requestOtp_(d);
  if (action === 'verifyOtp') return verifyOtp_(d);
  if (action === 'me') return {ok:true,data:{user:pubUser_(auth_(d.token))}};
  throw new Error('Unknown Wallet API action: ' + action);
}

/* ---------- SETUP ---------- */

function props_() {
  return PropertiesService.getScriptProperties();
}

function requiredProp_(name) {
  const value = String(props_().getProperty(name) || '').trim();
  if (!value) throw new Error('Missing Script Property: ' + name);
  return value;
}

function spreadsheet_() {
  return SpreadsheetApp.openById(requiredProp_('SPREADSHEET_ID'));
}

/**
 * Run this manually once in Apps Script.
 * It creates the complete Wallet Services business database.
 */
function setupBackend() {
  const headers = {
    WalletUsers: ['UserID','Email','Name','Status','CreatedAt','UpdatedAt','LastLoginAt'],
    WalletOTP: ['OTPId','Email','OtpHash','ExpiresAt','UsedAt','CreatedAt','LastSentAt'],
    WalletSessions: ['SessionID','UserID','TokenHash','ExpiresAt','CreatedAt','RevokedAt','Status'],
    Wallets: ['WalletID','UserID','Balance','ReservedBalance','Currency','Status','CreatedAt','UpdatedAt'],
    WalletTransactions: [
      'TransactionID','UserID','Type','Amount','Status','BalanceBefore','BalanceAfter',
      'UPIId','PaymentLink','PaymentLinkLabel','PaymentReservationId','Attempt',
      'ParentTransactionID','CreatedAt','UpdatedAt','CompletedAt','Notes','AdminNote'
    ],
    WalletPaymentLinks: [
      'PaymentLinkStockID','Denomination','Link','Label','Status','WalletTransactionID',
      'ReservedAt','ExpiresAt','UsedAt','CreatedAt','UpdatedAt','Notes'
    ],
    WalletAdminActions: ['ActionID','TransactionID','Action','TokenHash','ExpiresAt','UsedAt','CreatedAt'],
    WalletAuditLogs: ['AuditID','UserID','TransactionID','Action','Actor','Metadata','CreatedAt']
  };

  const ss = spreadsheet_();

  Object.keys(headers).forEach(name => {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    const h = headers[name];

    if (sh.getLastRow() === 0) {
      sh.getRange(1,1,1,h.length).setValues([h]);
    }

    sh.setFrozenRows(1);
    sh.getRange(1,1,1,h.length).setFontWeight('bold');
    sh.autoResizeColumns(1,h.length);
  });

  return {
    ok:true,
    spreadsheetId:ss.getId(),
    sheets:Object.keys(headers)
  };
}

/* ---------- BASIC HELPERS ---------- */

function parse_(e) {
  const body = e && e.postData && e.postData.contents;
  if (body) {
    try { return JSON.parse(body); } catch (_) {}
  }
  return e && e.parameter || {};
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function now_() {
  return new Date().toISOString();
}

function clean_(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max || 500);
}

function email_(value) {
  return clean_(value, 200).toLowerCase();
}

function id_(prefix) {
  return prefix + '_' + Utilities.getUuid().replace(/-/g,'').slice(0,20);
}

function token_() {
  return Utilities.getUuid() + '.' + Utilities.getUuid();
}

function hash_(value) {
  return Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(value),
      Utilities.Charset.UTF_8
    )
  );
}

function same_(a,b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i=0;i<a.length;i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function req_(condition, message) {
  if (!condition) throw new Error(message);
}

function rows_(sheetName) {
  const sh = spreadsheet_().getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return [];

  const values = sh.getDataRange().getValues();
  const headers = values[0].map(String);

  return values.slice(1)
    .filter(row => row.some(v => v !== ''))
    .map(row => {
      const item = {};
      headers.forEach((key,i) => item[key] = row[i]);
      return item;
    });
}

function addRow_(sheetName, item) {
  const sh = spreadsheet_().getSheetByName(sheetName);
  if (!sh) throw new Error('Run setupBackend first. Missing sheet: ' + sheetName);

  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  sh.appendRow(headers.map(key => item[key] === undefined ? '' : item[key]));
}

function find_(sheetName, key, value) {
  const data = rows_(sheetName);
  for (let i=0;i<data.length;i++) {
    if (String(data[i][key]) === String(value)) return data[i];
  }
  return null;
}

function updateRow_(sheetName, key, value, patch) {
  const sh = spreadsheet_().getSheetByName(sheetName);
  const values = sh.getDataRange().getValues();
  const headers = values[0].map(String);
  const keyCol = headers.indexOf(key);

  for (let r=1;r<values.length;r++) {
    if (String(values[r][keyCol]) === String(value)) {
      Object.keys(patch).forEach(name => {
        const col = headers.indexOf(name);
        if (col >= 0) sh.getRange(r+1,col+1).setValue(patch[name]);
      });
      return true;
    }
  }
  return false;
}

/* ---------- EMAIL OTP ---------- */

function requestOtp_(d) {
  const email = email_(d.email);
  req_(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Enter a valid email address.');

  const previous = rows_(W.S.O)
    .filter(x => email_(x.Email) === email)
    .pop();

  if (previous && previous.LastSentAt &&
      Date.now() - new Date(previous.LastSentAt).getTime() < 60000) {
    throw new Error('Please wait before requesting another OTP.');
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const timestamp = now_();

  addRow_(W.S.O, {
    OTPId:id_('WOTP'),
    Email:email,
    OtpHash:hash_(otp),
    ExpiresAt:new Date(Date.now()+W.OTP_MS).toISOString(),
    UsedAt:'',
    CreatedAt:timestamp,
    LastSentAt:timestamp
  });

  MailApp.sendEmail({
    to:email,
    subject:'Trusted Circle Wallet Services - Login OTP',
    name:'Trusted Circle',
    replyTo:'info@trustedcircle.in',
    body:'Your Trusted Circle Wallet Services OTP is ' + otp +
      '. It expires in 10 minutes. Do not share this code.',
    htmlBody:
      '<div style="font-family:Arial;padding:24px">' +
      '<h2 style="color:#0f5132">Trusted Circle Wallet Services</h2>' +
      '<p>Your OTP is:</p>' +
      '<div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f3f6f4;text-align:center">' +
      otp + '</div><p>Expires in 10 minutes. Do not share this OTP.</p></div>'
  });

  return {ok:true,data:{sent:true,email:email,expiresInSeconds:600}};
}

function verifyOtp_(d) {
  const email = email_(d.email);
  const otp = clean_(d.otp,20);

  req_(
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && /^\d{6}$/.test(otp),
    'Enter email and 6-digit OTP.'
  );

  const candidates = rows_(W.S.O).filter(x =>
    email_(x.Email) === email && !x.UsedAt
  );

  req_(candidates.length, 'OTP not found. Request a new OTP.');

  const latest = candidates[candidates.length-1];

  req_(
    new Date(latest.ExpiresAt).getTime() > Date.now(),
    'OTP expired. Request a new OTP.'
  );
  req_(same_(latest.OtpHash,hash_(otp)), 'Invalid OTP.');

  updateRow_(W.S.O,'OTPId',latest.OTPId,{UsedAt:now_()});

  let user = find_(W.S.U,'Email',email);
  const timestamp = now_();

  if (!user) {
    user = {
      UserID:id_('WUSR'),
      Email:email,
      Name:clean_(d.name,100) || email.split('@')[0],
      Status:'ACTIVE',
      CreatedAt:timestamp,
      UpdatedAt:timestamp,
      LastLoginAt:timestamp
    };

    addRow_(W.S.U,user);

    addRow_(W.S.W,{
      WalletID:id_('WAL'),
      UserID:user.UserID,
      Balance:0,
      ReservedBalance:0,
      Currency:'INR',
      Status:'ACTIVE',
      CreatedAt:timestamp,
      UpdatedAt:timestamp
    });
  }

  req_(String(user.Status) === 'ACTIVE','Wallet account is inactive.');

  updateRow_(W.S.U,'UserID',user.UserID,{
    LastLoginAt:timestamp,
    UpdatedAt:timestamp
  });

  const rawToken = token_();
  const expiresAt = new Date(Date.now()+W.SESSION_MS).toISOString();

  addRow_(W.S.S,{
    SessionID:id_('WSES'),
    UserID:user.UserID,
    TokenHash:hash_(rawToken),
    ExpiresAt:expiresAt,
    CreatedAt:timestamp,
    RevokedAt:'',
    Status:'ACTIVE'
  });

  return {
    ok:true,
    data:{
      user:pubUser_(user),
      session:{token:rawToken,expiresAt:expiresAt}
    }
  };
}

function auth_(rawToken) {
  req_(rawToken,'Authentication required.');

  const target = hash_(rawToken);
  const sessions = rows_(W.S.S);

  for (let i=sessions.length-1;i>=0;i--) {
    const session = sessions[i];

    if (session.Status === 'ACTIVE' && same_(session.TokenHash,target)) {
      req_(
        new Date(session.ExpiresAt).getTime() > Date.now(),
        'Session expired.'
      );

      const user = find_(W.S.U,'UserID',session.UserID);
      req_(user && user.Status === 'ACTIVE','Wallet account is inactive.');
      return user;
    }
  }

  throw new Error('Invalid session.');
}

function pubUser_(user) {
  return {
    userId:user.UserID,
    email:user.Email,
    name:user.Name,
    status:user.Status
  };
}

/* ---------- PLACEHOLD FOR NEXT WALLET MODULES ---------- */
/*
  Next module will add:
  - Wallet Home reads
  - Add Money + independent WalletPaymentLinks
  - Received / Not Received / Rejected admin actions
  - Retry
  - Withdraw
  - Wallet Orders
  - Wallet Admin link stock management
*/
