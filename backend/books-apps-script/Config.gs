const BOOKS_CONFIG=Object.freeze({APP_NAME:'Trusted Circle Books',VERSION:'1.0.0',TIMEZONE:'Asia/Kolkata',SPREADSHEET_ID:'1Rw-KNxLaV4Juvhn2O1pDoXv13YgRAkScyuSLGVIJfW8',OTP_TTL_SECONDS:600,OTP_MAX_ATTEMPTS:5,OTP_RESEND_COOLDOWN_SECONDS:60,SESSION_TTL_SECONDS:86400,OTP_FROM_NAME:'Trusted Circle Books',SHEETS:{ORGANISATIONS:'Organisations',USERS:'Users',ROLES:'Roles',SESSIONS:'Sessions',OTP:'OTP',AUDIT:'AuditLogs',ACCOUNTS:'Accounts',ACCOUNT_GROUPS:'AccountGroups',JOURNALS:'JournalEntries',JOURNAL_LINES:'JournalLines',CUSTOMERS:'Customers',VENDORS:'Vendors',ITEMS:'Items',INVOICES:'Invoices',INVOICE_LINES:'InvoiceLines',RECEIPTS:'Receipts',BILLS:'Bills',BILL_LINES:'BillLines',PAYMENTS:'Payments',EXPENSES:'Expenses',BANK_ACCOUNTS:'BankAccounts',BANK_TRANSACTIONS:'BankTransactions',RECONCILIATIONS:'Reconciliations',TAX_RATES:'TaxRates',TAX_TRANSACTIONS:'TaxTransactions',REPORTS:'Reports',DOCUMENTS:'Documents',SETTINGS:'Settings'}});
function booksNow_(){return new Date();}
function booksIsoNow_(){return Utilities.formatDate(booksNow_(),BOOKS_CONFIG.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX");}
function booksProps_(){return PropertiesService.getScriptProperties();}
function booksSpreadsheet_(){return SpreadsheetApp.openById(booksProps_().getProperty('BOOKS_SPREADSHEET_ID')||BOOKS_CONFIG.SPREADSHEET_ID);}
function booksNormalizeEmail_(v){return String(v||'').trim().toLowerCase();}
function booksRequire_(ok,msg){if(!ok)throw new Error(msg);}
function booksId_(prefix){return prefix+Utilities.getUuid().replace(/-/g,'').substring(0,20).toUpperCase();}
function booksHash_(v){const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(v),Utilities.Charset.UTF_8);return bytes.map(function(b){const n=b<0?b+256:b;return('0'+n.toString(16)).slice(-2);}).join('');}
function booksJson_(payload){return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);}
function booksOk_(data){return Object.assign({ok:true,timestamp:booksIsoNow_()},data||{});}
function booksFail_(message,code){return{ok:false,error:{code:code||'REQUEST_FAILED',message:String(message||'Request failed.')},timestamp:booksIsoNow_()};}
