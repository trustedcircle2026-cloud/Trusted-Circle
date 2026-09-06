/**
 * Trusted Circle — Apps Script configuration.
 *
 * No secrets are stored in this repository. Configure Script Properties:
 * SPREADSHEET_ID = ID of the operational Google Spreadsheet
 * ADMIN_EMAIL = trustedcircle2026@gmail.com
 * SESSION_TTL_SECONDS = optional session lifetime, default 86400
 */
const TC_CONFIG = Object.freeze({
  APP_NAME: 'Trusted Circle',
  TIMEZONE: 'Asia/Kolkata',
  OTP_LENGTH: 6,
  OTP_TTL_SECONDS: 600,
  OTP_MAX_ATTEMPTS: 5,
  OTP_RESEND_COOLDOWN_SECONDS: 60,
  SESSION_TTL_SECONDS: 86400,
  ADMIN_EMAIL: 'trustedcircle2026@gmail.com',
  SHEETS: {
    USERS: 'Users',
    OTP: 'OTP',
    SESSIONS: 'UserSessions',
    AUDIT: 'AuditLogs',
    PRODUCTS: 'Products',
    BRANDS: 'Brands',
    CART: 'Cart',
    ORDERS: 'Orders',
    ORDER_ITEMS: 'OrderItems',
    PAYMENTS: 'Payments',
    VOUCHERS: 'Vouchers',
    NOTIFICATIONS: 'Notifications'
  }
});

function getScriptProperties_() {
  return PropertiesService.getScriptProperties();
}

function getSpreadsheet_() {
  const id = getScriptProperties_().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Backend is not configured: SPREADSHEET_ID is missing.');
  return SpreadsheetApp.openById(id);
}

function getAdminEmail_() {
  return (getScriptProperties_().getProperty('ADMIN_EMAIL') || TC_CONFIG.ADMIN_EMAIL).trim().toLowerCase();
}

function getSessionTtl_() {
  const raw = Number(getScriptProperties_().getProperty('SESSION_TTL_SECONDS'));
  return raw > 0 ? Math.min(raw, 604800) : TC_CONFIG.SESSION_TTL_SECONDS;
}
