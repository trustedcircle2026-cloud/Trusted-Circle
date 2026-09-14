/**
 * Trusted Circle Books - production Google Sheet setup.
 * Run runBooksProductionSetup() once after all Books Apps Script files are installed.
 */
function booksSetupProduction_() {
  var result = booksSetup_();
  var ss = booksSpreadsheet_();

  tcEnsureBooksOrgSheets_();
  if(typeof tcEngEnsure_==='function') tcEngEnsure_();

  booksSetupDropdown_(ss,'Users','Role',['OWNER','ADMIN','ACCOUNTANT','SALES','PURCHASE','INVENTORY','EMPLOYEE','VIEWER']);
  booksSetupDropdown_(ss,'Users','Status',['ACTIVE','INACTIVE']);
  booksSetupDropdown_(ss,'OrganisationMembers','Role',['OWNER','ADMIN','ACCOUNTANT','SALES','PURCHASE','INVENTORY','EMPLOYEE','VIEWER']);
  booksSetupDropdown_(ss,'OrganisationMembers','Status',['PENDING','ACTIVE','INACTIVE','REJECTED']);
  booksSetupDropdown_(ss,'JoinRequests','Status',['PENDING','APPROVED','REJECTED','CANCELLED']);
  booksSetupDropdown_(ss,'Employees','Status',['ACTIVE','INACTIVE']);
  booksSetupDropdown_(ss,'Employees','EmploymentType',['FULL_TIME','PART_TIME','CONTRACT','INTERN','CONSULTANT']);
  booksSetupDropdown_(ss,'Employees','PFApplicable',['YES','NO']);
  booksSetupDropdown_(ss,'Employees','ESIApplicable',['YES','NO']);
  booksSetupDropdown_(ss,'Employees','ProfessionalTaxApplicable',['YES','NO']);

  booksSetupDropdown_(ss,'Organisations','BaseCurrency',['INR','USD','EUR','GBP']);
  booksSetupDropdown_(ss,'Organisations','FinancialYearStartMonth',['4','1']);
  booksSetupDropdown_(ss,'Organisations','GSTRegistered',['YES','NO']);
  booksSetupDropdown_(ss,'Organisations','GSTRegistrationType',['REGULAR','COMPOSITION','SEZ','CASUAL']);
  booksSetupDropdown_(ss,'Organisations','AccountingMethod',['ACCRUAL','CASH']);

  booksSetupDropdown_(ss,'Accounts','Type',['ASSET','LIABILITY','EQUITY','INCOME','EXPENSE']);
  booksSetupDropdown_(ss,'Accounts','NormalBalance',['DEBIT','CREDIT']);
  booksSetupDropdown_(ss,'Accounts','Active',['TRUE','FALSE']);
  booksSetupDropdown_(ss,'PermissionAssignments','Effect',['ALLOW','DENY']);
  booksSetupDropdown_(ss,'PermissionAssignments','Status',['ACTIVE','INACTIVE']);

  booksSetupDropdown_(ss,'Customers','OpeningBalanceType',['DEBIT','CREDIT']);
  booksSetupDropdown_(ss,'Vendors','OpeningBalanceType',['DEBIT','CREDIT']);
  booksSetupDropdown_(ss,'Items','Type',['GOODS','SERVICE']);
  booksSetupDropdown_(ss,'Items','Active',['TRUE','FALSE']);

  booksSetupDropdown_(ss,'Invoices','Status',['DRAFT','SENT','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED']);
  booksSetupDropdown_(ss,'Bills','Status',['DRAFT','OPEN','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED']);
  booksSetupDropdown_(ss,'BankAccounts','Status',['ACTIVE','INACTIVE']);
  booksSetupDropdown_(ss,'TaxRates','Active',['TRUE','FALSE']);
  booksSetupDropdown_(ss,'TaxRates','Type',['GST','IGST','CESS','OTHER']);
  booksSetupDropdown_(ss,'FYLocks','Status',['LOCKED','UNLOCKED']);
  booksSetupDropdown_(ss,'Approvals','Status',['PENDING','APPROVED','REJECTED']);
  booksSetupDropdown_(ss,'EInvoiceWorkflows','Status',['PENDING','SUBMITTED','SUCCESS','FAILED','CANCELLED']);
  booksSetupDropdown_(ss,'EWayWorkflows','Status',['PENDING','SUBMITTED','SUCCESS','FAILED','CANCELLED']);

  booksSetupDateColumns_(ss,'JournalEntries',['JournalDate','CreatedAt','PostedAt']);
  booksSetupDateColumns_(ss,'JournalLines',['LineDate','CreatedAt']);
  booksSetupDateColumns_(ss,'Invoices',['InvoiceDate','DueDate','CreatedAt','UpdatedAt']);
  booksSetupDateColumns_(ss,'Bills',['BillDate','DueDate','CreatedAt','UpdatedAt']);
  booksSetupDateColumns_(ss,'BankTransactions',['TxnDate','CreatedAt']);
  booksSetupDateColumns_(ss,'Receipts',['ReceiptDate','CreatedAt']);
  booksSetupDateColumns_(ss,'Payments',['PaymentDate','CreatedAt']);
  booksSetupDateColumns_(ss,'Expenses',['ExpenseDate','CreatedAt']);
  booksSetupDateColumns_(ss,'OrganisationMembers',['JoinedAt','ApprovedAt','RejectedAt','CreatedAt','UpdatedAt']);
  booksSetupDateColumns_(ss,'JoinRequests',['RequestedAt','ReviewedAt']);
  booksSetupDateColumns_(ss,'Employees',['DateOfBirth','JoiningDate','CreatedAt','UpdatedAt']);
  booksSetupDateColumns_(ss,'StockLedger',['TxnDate','CreatedAt']);
  booksSetupDateColumns_(ss,'PaymentAllocations',['AllocationDate','CreatedAt']);
  booksSetupDateColumns_(ss,'FYLocks',['LockedFrom','LockedTo','LockedAt']);

  booksSetupNumberColumns_(ss,'Accounts',['OpeningBalance']);
  booksSetupNumberColumns_(ss,'Invoices',['Subtotal','TaxAmount','Discount','Total','PaidAmount','BalanceDue']);
  booksSetupNumberColumns_(ss,'Bills',['Subtotal','TaxAmount','Discount','Total','PaidAmount','BalanceDue']);
  booksSetupNumberColumns_(ss,'JournalEntries',['TotalDebit','TotalCredit']);
  booksSetupNumberColumns_(ss,'JournalLines',['Debit','Credit','TaxAmount']);
  booksSetupNumberColumns_(ss,'StockLedger',['InQty','OutQty','UnitCost','Value','BalanceQty','BalanceValue']);
  booksSetupNumberColumns_(ss,'FIFO_Layers',['RemainingQty','UnitCost']);
  booksSetupNumberColumns_(ss,'TDSRecords',['BaseAmount','TDSRate','TDSAmount']);

  var organisationSheet=ss.getSheetByName('Organisations');
  if(organisationSheet) ss.setActiveSheet(organisationSheet);
  SpreadsheetApp.flush();

  return {ok:true,message:'Trusted Circle Books production spreadsheet setup completed.',spreadsheetId:ss.getId(),sheets:result.sheets};
}

function runBooksProductionSetup(){return booksSetupProduction_();}
function booksSetupDropdown_(ss,sheetName,columnName,values){var sh=ss.getSheetByName(sheetName);if(!sh||!sh.getLastColumn())return;var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0],col=headers.indexOf(columnName)+1;if(col<1)return;var rule=SpreadsheetApp.newDataValidation().requireValueInList(values,true).setAllowInvalid(false).build();sh.getRange(2,col,Math.max(sh.getMaxRows()-1,1),1).setDataValidation(rule);}
function booksSetupDateColumns_(ss,sheetName,columns){var sh=ss.getSheetByName(sheetName);if(!sh||!sh.getLastColumn())return;var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];columns.forEach(function(name){var col=headers.indexOf(name)+1;if(col>0)sh.getRange(2,col,Math.max(sh.getMaxRows()-1,1),1).setNumberFormat('yyyy-mm-dd hh:mm:ss');});}
function booksSetupNumberColumns_(ss,sheetName,columns){var sh=ss.getSheetByName(sheetName);if(!sh||!sh.getLastColumn())return;var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];columns.forEach(function(name){var col=headers.indexOf(name)+1;if(col>0)sh.getRange(2,col,Math.max(sh.getMaxRows()-1,1),1).setNumberFormat('#,##0.00');});}
function testBooksSetup(){return 'Trusted Circle Books Apps Script OK';}
