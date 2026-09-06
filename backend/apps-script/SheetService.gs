function ensureSheet_(name, headers) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sheet;
}

function setupBackend() {
  const tables = {
    Users: ['UserID','Email','Name','Role','Status','CreatedAt','UpdatedAt','LastLoginAt'],
    OTP: ['OtpID','Email','Purpose','OtpHash','ExpiresAt','Attempts','MaxAttempts','CreatedAt','UsedAt','Status'],
    UserSessions: ['SessionID','UserID','TokenHash','ExpiresAt','CreatedAt','RevokedAt','Status'],
    AuditLogs: ['AuditID','UserID','Action','Entity','EntityID','Metadata','CreatedAt'],
    Products: ['ProductID','BrandID','SKU','Title','Description','FaceValue','SellingPrice','DiscountPercent','Currency','InventoryStatus','Active','CreatedAt','UpdatedAt'],
    Brands: ['BrandID','Name','Slug','LogoURL','Active','CreatedAt','UpdatedAt'],
    Cart: ['CartID','UserID','ProductID','Quantity','CreatedAt','UpdatedAt'],
    Orders: ['OrderID','UserID','OrderNumber','Status','Subtotal','Discount','Total','Currency','CreatedAt','UpdatedAt'],
    OrderItems: ['OrderItemID','OrderID','ProductID','Quantity','FaceValue','UnitPrice','Total'],
    Payments: ['PaymentID','OrderID','Provider','ProviderOrderID','ProviderPaymentID','Amount','Currency','Status','VerifiedAt','CreatedAt','UpdatedAt'],
    Vouchers: ['VoucherID','ProductID','OrderID','Code','Pin','Status','IssuedAt','DeliveredAt'],
    Notifications: ['NotificationID','UserID','Type','Title','Message','ReadAt','CreatedAt']
  };
  Object.keys(tables).forEach(function(name) { ensureSheet_(name, tables[name]); });
  var catalog = typeof seedDefaultCatalog_ === 'function' ? seedDefaultCatalog_() : null;
  return { message: 'Trusted Circle backend sheets initialized.', catalog: catalog };
}

function getRows_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  require_(sheet, 'Sheet not initialized: ' + sheetName);
  if (sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values.filter(function(row) { return row.some(function(v) { return v !== ''; }); }).map(function(row) {
    const obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function appendRowObject_(sheetName, object) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  require_(sheet, 'Sheet not initialized: ' + sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(function(h) { return object[h] === undefined ? '' : object[h]; }));
}

function findOne_(sheetName, field, value) {
  const rows = getRows_(sheetName);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][field]) === String(value)) return rows[i];
  }
  return null;
}

function updateRowById_(sheetName, idHeader, idValue, patch) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  require_(sheet, 'Sheet not initialized: ' + sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf(idHeader);
  require_(idIndex >= 0, 'ID column not found.');
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idIndex]) === String(idValue)) {
      Object.keys(patch).forEach(function(key) {
        const c = headers.indexOf(key);
        if (c >= 0) sheet.getRange(r + 1, c + 1).setValue(patch[key]);
      });
      return true;
    }
  }
  return false;
}
