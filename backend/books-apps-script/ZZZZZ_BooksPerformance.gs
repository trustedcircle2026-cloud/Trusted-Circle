/* Trusted Circle Books — safe execution-level performance layer. */
var TC_BOOKS_PERF_ROWS_CACHE_={};
var TC_BOOKS_PERF_SPREADSHEET_=null;
(function(){
  var originalSpreadsheet=booksSpreadsheet_;
  var originalRows=booksRows_;
  var originalAppend=booksAppend_;
  var originalUpdate=booksUpdate_;
  booksSpreadsheet_=function(){if(TC_BOOKS_PERF_SPREADSHEET_)return TC_BOOKS_PERF_SPREADSHEET_;TC_BOOKS_PERF_SPREADSHEET_=originalSpreadsheet();return TC_BOOKS_PERF_SPREADSHEET_;};
  booksRows_=function(name){name=String(name||'');if(Object.prototype.hasOwnProperty.call(TC_BOOKS_PERF_ROWS_CACHE_,name))return TC_BOOKS_PERF_ROWS_CACHE_[name];var rows=originalRows(name);TC_BOOKS_PERF_ROWS_CACHE_[name]=rows;return rows;};
  booksAppend_=function(name,obj){var result=originalAppend(name,obj);delete TC_BOOKS_PERF_ROWS_CACHE_[String(name||'')];return result;};
  booksUpdate_=function(name,idField,idValue,patch){var result=originalUpdate(name,idField,idValue,patch);if(result)delete TC_BOOKS_PERF_ROWS_CACHE_[String(name||'')];return result;};
})();
function tcBooksPerfReset_(){TC_BOOKS_PERF_ROWS_CACHE_={};TC_BOOKS_PERF_SPREADSHEET_=null;}
function tcBooksPerfStatus_(){return{enabled:true,executionReadCache:true,spreadsheetReuse:true,cachedSheets:Object.keys(TC_BOOKS_PERF_ROWS_CACHE_).length};}
