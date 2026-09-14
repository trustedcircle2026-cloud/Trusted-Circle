/** Trusted Circle Books - transaction engine route bridge. Keep this file last in Apps Script. */
var TC_BOOKS_PRE_ENGINE_ROUTE=booksRoute_;
booksRoute_=function(action,input){
  var engine=tcEngRoute_(action,input);
  return engine!==null?engine:TC_BOOKS_PRE_ENGINE_ROUTE(action,input);
};
function tcSeedEnginePermissions_(){
  var defaults={
    ADMIN:['INVOICE_CREATE','BILL_CREATE','PAYMENT_ALLOCATE','BANK_RECONCILE','TDS_CREATE','RECURRING_INVOICE','APPROVAL_REVIEW','PORTAL_MANAGE','DOCUMENT_MANAGE','FY_LOCK','FY_UNLOCK','EINVOICE_MANAGE','EWAY_MANAGE','CREDIT_NOTE_CREATE','DEBIT_NOTE_CREATE','INVOICE_CREATE','BILL_CREATE'],
    ACCOUNTANT:['INVOICE_CREATE','BILL_CREATE','PAYMENT_ALLOCATE','BANK_RECONCILE','TDS_CREATE','RECURRING_INVOICE','CREDIT_NOTE_CREATE','DEBIT_NOTE_CREATE'],
    SALES:['INVOICE_CREATE','CREDIT_NOTE_CREATE'],
    PURCHASE:['BILL_CREATE','DEBIT_NOTE_CREATE'],
    INVENTORY:[]
  };
  var existing=tcEngRows_('PermissionAssignments','');
  Object.keys(defaults).forEach(function(role){defaults[role].forEach(function(code){var hit=existing.filter(function(r){return String(r.OrganisationID)===''&&String(r.Role)===role&&String(r.PermissionCode)===code;})[0];if(!hit)tcEngAppend_('PermissionAssignments',{AssignmentID:booksId_('PA'),OrganisationID:'',Role:role,PermissionCode:code,Effect:'ALLOW',Status:'ACTIVE',CreatedAt:tcEngNow_(),UpdatedAt:tcEngNow_()});});});
}
function runBooksAccountingEngineSetup(){
  tcEngEnsure_();
  tcFullEnsure_();
  booksSetupProduction_();
  return 'Trusted Circle Books accounting engine initialized';
}
