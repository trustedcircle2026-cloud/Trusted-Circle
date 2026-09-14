/**
 * Trusted Circle Books - production Google Sheet setup.
 * Run booksSetupProduction_() once after Config.gs + Code.gs are installed.
 */
function booksSetupProduction_() {
  var result = booksSetup_();
  var ss = booksSpreadsheet_();

  booksSetupDropdown_(ss,'Users','Role',['OWNER','ADMIN','ACCOUNTANT','VIEWER']);
  booksSetupDropdown_(ss,'Users','Status',['ACTIVE','INACTIVE']);
  booksSetupDropdown_(ss,'Organisations','BaseCurrency',['INR','USD','EUR','GBP']);
  booksSetupDropdown_(ss,'Organisations','FinancialYearStartMonth',['4','1']);

  booksSetupDropdown_(ss,'Accounts','Type',['ASSET','LIABILITY','EQUITY','INCOME','EXPENSE']);
  booksSetupDropdown_(ss,'Accounts','NormalBalance',['DEBIT','CREDIT']);
  booksSetupDropdown_(ss,'Accounts','Active',['TRUE','FALSE']);

  booksSetupDropdown_(ss,'Customers','OpeningBalanceType',['DEBIT','CREDIT']);
  booksSetupDropdown_(ss,'Vendors','OpeningBalanceType',['DEBIT','CREDIT']);
  booksSetupDropdown_(ss,'Items','Type',['GOODS','SERVICE']);
  booksSetupDropdown_(ss,'Items','Active',['TRUE','FALSE']);

  booksSetupDropdown_(ss,'Invoices','Status',['DRAFT','SENT','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED']);
  booksSetupDropdown_(ss,'Bills','Status',['DRAFT','OPEN','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED']);
  booksSetupDropdown_(ss,'BankAccounts','Status',['ACTIVE','INACTIVE']);
  booksSetupDropdown_(ss,'TaxRates','Active',['TRUE','FALSE']);
  booksSetupDropdown_(ss,'TaxRates','Type',['GST','IGST','CESS','OTHER']);

  booksSetupDateColumns_(ss,'JournalEntries',['JournalDate','CreatedAt','PostedAt']);
  booksSetupDateColumns_(ss,'JournalLines',['LineDate','CreatedAt']);
  booksSetupDateColumns_(ss,'Invoices',['InvoiceDate','DueDate','CreatedAt','UpdatedAt']);
  booksSetupDateColumns_(ss,'Bills',['BillDate','DueDate','CreatedAt','UpdatedAt']);
  booksSetupDateColumns_(ss,'BankTransactions',['TxnDate','CreatedAt']);
  booksSetupDateColumns_(ss,'Receipts',['ReceiptDate','CreatedAt']);
  booksSetupDateColumns_(ss,'Payments',['PaymentDate','CreatedAt']);
  booksSetupDateColumns_(ss,'Expenses',['ExpenseDate','CreatedAt']);

  booksSetupNumberColumns_(ss,'Accounts',['OpeningBalance']);
  booksSetupNumberColumns_(ss,'Invoices',['Subtotal','TaxAmount','Discount','Total','PaidAmount','BalanceDue']);
  booksSetupNumberColumns_(ss,'Bills',['Subtotal','TaxAmount','Discount','Total','PaidAmount','BalanceDue']);
  booksSetupNumberColumns_(ss,'JournalEntries',['TotalDebit','TotalCredit']);
  booksSetupNumberColumns_(ss,'JournalLines',['Debit','Credit','TaxAmount']);

  var organisationSheet=ss.getSheetByName('Organisations');
  if(organisationSheet) ss.setActiveSheet(organisationSheet);
  SpreadsheetApp.flush();

  return {ok:true,message:'Trusted Circle Books production spreadsheet setup completed.',spreadsheetId:ss.getId(),sheets:result.sheets};
}

function booksSetupDropdown_(ss,sheetName,columnName,values){
  var sh=ss.getSheetByName(sheetName);
  if(!sh||!sh.getLastColumn()) return;
  var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  var col=headers.indexOf(columnName)+1;
  if(col<1) return;
  var rule=SpreadsheetApp.newDataValidation().requireValueInList(values,true).setAllowInvalid(false).build();
  sh.getRange(2,col,Math.max(sh.getMaxRows()-1,1),1).setDataValidation(rule);
}

function booksSetupDateColumns_(ss,sheetName,columns){
  var sh=ss.getSheetByName(sheetName);
  if(!sh||!sh.getLastColumn()) return;
  var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  columns.forEach(function(name){
    var col=headers.indexOf(name)+1;
    if(col>0) sh.getRange(2,col,Math.max(sh.getMaxRows()-1,1),1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  });
}

function booksSetupNumberColumns_(ss,sheetName,columns){
  var sh=ss.getSheetByName(sheetName);
  if(!sh||!sh.getLastColumn()) return;
  var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  columns.forEach(function(name){
    var col=headers.indexOf(name)+1;
    if(col>0) sh.getRange(2,col,Math.max(sh.getMaxRows()-1,1),1).setNumberFormat('#,##0.00');
  });
}

function testBooksSetup(){return 'Trusted Circle Books Apps Script OK';}
