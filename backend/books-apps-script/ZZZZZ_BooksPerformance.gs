/* Trusted Circle Books — safe execution-level performance layer. */
var TC_BOOKS_PERF_ROWS_CACHE_={};
(function(){
  var originalRows=booksRows_;
  var originalAppend=booksAppend_;
  var originalUpdate=booksUpdate_;
  booksRows_=function(name){name=String(name||'');if(Object.prototype.hasOwnProperty.call(TC_BOOKS_PERF_ROWS_CACHE_,name))return TC_BOOKS_PERF_ROWS_CACHE_[name];var rows=originalRows(name);TC_BOOKS_PERF_ROWS_CACHE_[name]=rows;return rows;};
  booksAppend_=function(name,obj){var result=originalAppend(name,obj);delete TC_BOOKS_PERF_ROWS_CACHE_[String(name||'')];return result;};
  booksUpdate_=function(name,idField,idValue,patch){var result=originalUpdate(name,idField,idValue,patch);if(result)delete TC_BOOKS_PERF_ROWS_CACHE_[String(name||'')];return result;};
})();
function tcBooksPerfReset_(){TC_BOOKS_PERF_ROWS_CACHE_={};}
function tcBooksPerfStatus_(){return{enabled:true,executionReadCache:true,cachedSheets:Object.keys(TC_BOOKS_PERF_ROWS_CACHE_).length};}
