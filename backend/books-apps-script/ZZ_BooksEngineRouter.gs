/** Trusted Circle Books - transaction engine route bridge. Keep this file last in Apps Script. */
var TC_BOOKS_PRE_ENGINE_ROUTE=booksRoute_;
var TC_ENGINE_ORIGINAL_REQUIRE_PERM=tcEngRequirePerm_;
var TC_ENGINE_ORIGINAL_ENSURE=tcEngEnsure_;
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
tcEngEnsure_=function(){
  var ss=booksSpreadsheet_();
  Object.keys(TC_ENGINE_HEADERS).forEach(function(name){
    var sh=ss.getSheetByName(name);
    if(!sh){sh=ss.insertSheet(name);sh.getRange(1,1,1,TC_ENGINE_HEADERS[name].length).setValues([TC_ENGINE_HEADERS[name]]);return;}
    var last=sh.getLastColumn();
    if(last===0){sh.getRange(1,1,1,TC_ENGINE_HEADERS[name].length).setValues([TC_ENGINE_HEADERS[name]]);return;}
    var current=sh.getRange(1,1,1,last).getValues()[0],missing=[];
    TC_ENGINE_HEADERS[name].forEach(function(h){if(current.indexOf(h)<0)missing.push(h);});
    if(missing.length){sh.getRange(1,last+1,1,missing.length).setValues([missing]);}
  });
  return ss;
};
function tcEngFixedTDS_(input){
  var ctx=tcEngOrg_(input.token),u=ctx.u,org=ctx.org,d=input.tds||{};
  tcEngRequirePerm_(u,'TDS_CREATE');
  var base=tcEngMoney_(d.BaseAmount),rate=tcEngNum_(d.TDSRate),amount=tcEngMoney_(base*rate/100),net=tcEngMoney_(base-amount),id=booksId_('TDS'),date=tcEngDate_(d.TxnDate);
  tcEngLockCheck_(org,date);
  var expense=tcEngAccount_(org,d.ExpenseAccountID,'Professional / Contract Expense','EXPENSE','DEBIT');
  var payable=tcEngAccount_(org,d.TDSAccountID,'TDS Payable','LIABILITY','CREDIT');
  var party=tcEngAccount_(org,d.PartyAccountID,'Party Payable','LIABILITY','CREDIT');
  var jid=tcEngJournal_(org,u,date,String(d.Section||'TDS'),'TDS deduction '+String(d.Section||''),'TDS',id,[
    {AccountID:expense.AccountID,Debit:base,Credit:0,Description:'TDS base'},
    {AccountID:payable.AccountID,Debit:0,Credit:amount,Description:'TDS payable'},
    {AccountID:party.AccountID,Debit:0,Credit:net,PartyType:d.PartyType||'',PartyID:d.PartyID||'',Description:'Net party payable'}
  ]);
  tcEngAppend_('TDSRecords',{TDSID:id,OrganisationID:org,TxnDate:date,PartyType:d.PartyType||'',PartyID:d.PartyID||'',Section:d.Section||'',BaseAmount:base,TDSRate:rate,TDSAmount:amount,Status:'CALCULATED',SourceType:d.SourceType||'',SourceID:d.SourceID||'',JournalID:jid,CreatedAt:tcEngNow_()});
  return{tdsId:id,baseAmount:base,tdsRate:rate,tdsAmount:amount,netPartyAmount:net,journalId:jid};
}
function tcEngFixedStockIssue_(org,u,date,itemId,qty,rate,source,sourceId,lineId,warehouse){
  var item=tcEngFind_('Items','ItemID',itemId,org);booksRequire_(item,'Item not found.');
  var need=tcEngNum_(qty),layers=tcEngRows_('FIFO_Layers',org).filter(function(l){return String(l.ItemID)===String(itemId)&&String(l.WarehouseID)===String(warehouse)&&Number(l.RemainingQty)>0;}).sort(function(a,b){return new Date(a.CreatedAt)-new Date(b.CreatedAt);}),cost=0;
  layers.forEach(function(l){if(need<=0)return;var take=Math.min(need,Number(l.RemainingQty));cost+=take*Number(l.UnitCost||0);need-=take;tcEngUpdate_('FIFO_Layers','LayerID',l.LayerID,{RemainingQty:Number(l.RemainingQty)-take});});
  booksRequire_(need<=0,'Insufficient stock for item '+itemId+'.');
  var prev=tcEngStockBalance_(org,itemId,warehouse),stock=tcEngAppend_('StockLedger',{StockLedgerID:booksId_('STK'),OrganisationID:org,TxnDate:date,ItemID:itemId,WarehouseID:warehouse,SourceType:source,SourceID:sourceId,SourceLineID:lineId,InQty:0,OutQty:qty,UnitCost:qty?tcEngMoney_(cost/qty):0,Value:tcEngMoney_(cost),BalanceQty:prev.qty-qty,BalanceValue:prev.value-cost,Batch:'',ExpiryDate:'',CreatedAt:tcEngNow_()});
  var cogs=tcEngAccount_(org,'','Cost of Goods Sold','EXPENSE','DEBIT'),inventory=tcEngAccount_(org,'','Inventory','ASSET','DEBIT');
  tcEngJournal_(org,u,date,'STK-'+stock.StockLedgerID,'FIFO cost for '+source+' '+sourceId,'INVENTORY',stock.StockLedgerID,[{AccountID:cogs.AccountID,Debit:cost,Credit:0,Description:'FIFO COGS '+itemId},{AccountID:inventory.AccountID,Debit:0,Credit:cost,Description:'Inventory issue '+itemId}]);
  return stock;
}
tcEngStockIssue_=tcEngFixedStockIssue_;
var TC_ENGINE_MUTATING={booksCreateInvoice:true,booksCreateBill:true,booksCreateCreditNote:true,booksCreateDebitNote:true,booksCreatePaymentAllocation:true,booksReconcileBank:true,booksCalculateTDS:true,booksCreateRecurringInvoice:true,booksProcessRecurringInvoices:true,booksRequestApproval:true,booksReviewApproval:true,booksInvitePortalUser:true,booksSaveDocument:true,booksLockFinancialYear:true,booksUnlockFinancialYear:true,booksSwitchOrganisation:true,booksAssignPermission:true};
booksRoute_=function(action,input){
  var lock=null,locked=false;
  try{
    if(TC_ENGINE_MUTATING[action]){lock=LockService.getScriptLock();lock.tryLock(30000);locked=true;}
    if(action==='booksCalculateTDS')return tcEngFixedTDS_(input);
    var engine=tcEngRoute_(action,input);
    return engine!==null?engine:TC_BOOKS_PRE_ENGINE_ROUTE(action,input);
  }finally{if(locked&&lock)lock.releaseLock();}
};
function runBooksAccountingEngineSetup(){
  tcEngEnsure_();
  tcFullEnsure_();
  booksSetupProduction_();
  return 'Trusted Circle Books accounting engine initialized';
}
