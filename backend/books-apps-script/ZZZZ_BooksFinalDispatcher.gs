/** Trusted Circle Books - final non-recursive API dispatcher. Keep this file last in Apps Script project order. */
function tcBooksFastRows_(sheetName,orgId){var sh=booksSpreadsheet_().getSheetByName(sheetName);if(!sh||sh.getLastRow()<2)return[];var values=sh.getDataRange().getValues(),headers=values.shift(),out=[];for(var i=0;i<values.length;i++){var row=values[i],obj={};for(var c=0;c<headers.length;c++)obj[headers[c]]=row[c];if(String(obj.OrganisationID||'')===String(orgId))out.push(obj);}return out;}
function tcBooksFastDashboard_(input){var u=booksAuth_(input.token),org=String(u.OrganisationID||'');booksRequire_(org,'Organisation setup is required.');var invoices=tcBooksFastRows_('Invoices',org),bills=tcBooksFastRows_('Bills',org),receipts=tcBooksFastRows_('Receipts',org),payments=tcBooksFastRows_('Payments',org),expenses=tcBooksFastRows_('Expenses',org);var sum=function(rows,key){var n=0;for(var i=0;i<rows.length;i++)n+=Number(rows[i][key]||0);return n;};return{receivables:sum(invoices,'BalanceDue'),payables:sum(bills,'BalanceDue'),cashReceived:sum(receipts,'Amount'),cashPaid:sum(payments,'Amount'),expenses:sum(expenses,'Amount'),income:sum(invoices,'Total'),netProfit:null,invoiceCount:invoices.length,billCount:bills.length,fast:true};}
function tcBooksDispatch_(action,input){
  action=String(action||'health');
  if(action==='health')return{service:BOOKS_CONFIG.APP_NAME,status:'ok',version:BOOKS_CONFIG.VERSION};
  if(action==='setupBackend')return booksSetup_();
  if(action==='booksDashboard')return tcBooksFastDashboard_(input);
  switch(action){
    case'booksRequestOtp':return booksRequestOtp_(input);case'booksVerifyOtp':return tcBooksVerifyOtp_(input);case'booksMe':return tcBooksMe_(input);case'booksLogout':return booksLogout_(input);
    case'booksGetOrganisation':return booksGetOrganisation_(input);case'booksSaveOrganisation':return booksSaveOrganisation_(input);case'booksCreateOrganisation':return tcCreateOrganisation_(input);case'booksFindOrganisation':return tcFindOrganisation_(input);
    case'booksRequestJoinOrganisation':return tcRequestJoin_(input);case'booksApproveJoinOrganisation':return tcApproveJoin_(input);case'booksRejectJoinOrganisation':return tcRejectJoin_(input);case'booksListJoinRequests':return tcListJoinRequests_(input);case'booksListOrganisationMembers':return tcListMembers_(input);
  }
  var ui=tcUiRoute_(action,input);if(ui!==null)return ui;
  var engine=tcEngRoute_(action,input);if(engine!==null)return engine;
  var full=tcFullRoute_(action,input);if(full!==null)return full;
  switch(action){case'booksListAccounts':return booksListAccounts_(input);case'booksSaveAccount':return booksSaveAccount_(input);case'booksCreateJournal':return booksCreateJournal_(input);case'booksTrialBalance':return booksTrialBalance_(input);case'booksProfitLoss':return booksProfitLoss_(input);case'booksBalanceSheet':return booksBalanceSheet_(input);}
  throw new Error('Unknown Books API action: '+action);
}
function tcBooksSafeHandle_(e,isPost){try{var input={};if(isPost){var body=e&&e.postData?String(e.postData.contents||''):'';if(body){try{input=JSON.parse(body)}catch(ignore){input=e.parameter||{}}}else input=e.parameter||{}}else input=e&&e.parameter?e.parameter:{};return booksJson_(booksOk_(tcBooksDispatch_(input.action||'health',input)))}catch(err){console.error(err&&err.stack?err.stack:err);return booksJson_(booksFail_(err&&err.message?err.message:'Request failed.'))}}
doGet=function(e){return tcBooksSafeHandle_(e,false)};doPost=function(e){return tcBooksSafeHandle_(e,true)};
function runBooksFinalDispatcherSetup(){if(typeof tcEngEnsure_==='function')tcEngEnsure_();if(typeof tcFullEnsure_==='function')tcFullEnsure_();if(typeof runBooksUiSetup==='function')runBooksUiSetup();booksSetupProduction_();return'Trusted Circle Books final dispatcher initialized'}
