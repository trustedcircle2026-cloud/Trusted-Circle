/** Trusted Circle Books - transaction engine route bridge. Keep this file last in Apps Script. */
var TC_BOOKS_PRE_ENGINE_ROUTE=booksRoute_;
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
