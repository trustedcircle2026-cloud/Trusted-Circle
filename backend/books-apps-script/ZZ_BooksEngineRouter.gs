/** Trusted Circle Books - transaction engine route bridge. Keep this file last in Apps Script. */
var TC_BOOKS_PRE_ENGINE_ROUTE=booksRoute_;
var TC_ENGINE_ORIGINAL_REQUIRE_PERM=tcEngRequirePerm_;
var TC_ENGINE_ROLE_DEFAULTS={
  ADMIN:['INVOICE_CREATE','BILL_CREATE','PAYMENT_ALLOCATE','BANK_RECONCILE','TDS_CREATE','RECURRING_INVOICE','APPROVAL_REVIEW','PORTAL_MANAGE','DOCUMENT_MANAGE','FY_LOCK','FY_UNLOCK','EINVOICE_MANAGE','EWAY_MANAGE','CREDIT_NOTE_CREATE','DEBIT_NOTE_CREATE'],
  ACCOUNTANT:['INVOICE_CREATE','BILL_CREATE','PAYMENT_ALLOCATE','BANK_RECONCILE','TDS_CREATE','RECURRING_INVOICE','CREDIT_NOTE_CREATE','DEBIT_NOTE_CREATE'],
  SALES:['INVOICE_CREATE','CREDIT_NOTE_CREATE'],
  PURCHASE:['BILL_CREATE','DEBIT_NOTE_CREATE'],
  INVENTORY:[]
};
tcEngRequirePerm_=function(u,code){
  if(String(u.Role)==='OWNER')return true;
  var allowed=TC_ENGINE_ROLE_DEFAULTS[String(u.Role)]||[];
  if(allowed.indexOf(String(code))>=0)return true;
  return TC_ENGINE_ORIGINAL_REQUIRE_PERM(u,code);
};
booksRoute_=function(action,input){
  var engine=tcEngRoute_(action,input);
  return engine!==null?engine:TC_BOOKS_PRE_ENGINE_ROUTE(action,input);
};
function runBooksAccountingEngineSetup(){
  tcEngEnsure_();
  tcFullEnsure_();
  booksSetupProduction_();
  return 'Trusted Circle Books accounting engine initialized';
}
