/** Trusted Circle Books - final non-recursive API dispatcher. Keep this file last in Apps Script project order. */
function tcBooksDispatch_(action,input){
  action=String(action||'health');
  if(action==='health')return{service:BOOKS_CONFIG.APP_NAME,status:'ok',version:BOOKS_CONFIG.VERSION};
  if(action==='setupBackend')return booksSetup_();
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
