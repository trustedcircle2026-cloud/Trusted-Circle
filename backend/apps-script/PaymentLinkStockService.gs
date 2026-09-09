/** Payment-link stock management for the private ERP. */
var TC_ALLOWED_STOCK_DENOMS=[500,1000,1500,2000];
function adminAddPaymentLinkStockBulk_(data){
  var admin=adminAuthenticate_(data.token),rows=Array.isArray(data.rows)?data.rows:[];
  require_(rows.length>0,'Add at least one payment link.');
  require_(rows.length<=200,'You can add up to 200 links at once.');
  ensurePaymentLinkStockSheet_();
  var lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    var existing=getRows_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK),seen={};
    existing.forEach(function(r){var link=String(r.Link||'').trim();if(link)seen[link]=true;});
    var now=isoNow_(),added=[],skipped=[];
    rows.forEach(function(raw,index){
      var denomination=Number(raw.denomination||raw.Denomination),link=cleanText_(raw.link||raw.Link||'',2000),label=cleanText_(raw.label||raw.Label||'Pay securely',100);
      if(!link&& !denomination)return;
      require_(TC_ALLOWED_STOCK_DENOMS.indexOf(denomination)>=0,'Row '+(index+1)+': denomination must be ₹500, ₹1,000, ₹1,500 or ₹2,000.');
      require_(/^https:\/\//i.test(link),'Row '+(index+1)+': payment link must use HTTPS.');
      if(seen[link]){skipped.push({row:index+1,reason:'Duplicate link'});return;}
      var id=newId_('TCPLS');
      appendRowObject_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,{PaymentLinkStockID:id,Denomination:denomination,Link:link,Label:label,Status:'AVAILABLE',OrderID:'',PaymentLinkID:'',CreatedAt:now,UpdatedAt:now});
      seen[link]=true;added.push({PaymentLinkStockID:id,Denomination:denomination,Status:'AVAILABLE'});
    });
    appendAudit_(admin.UserID,'PAYMENT_LINK_STOCK_BULK_ADDED','PaymentLinkStock','',{count:added.length,skipped:skipped.length});
    return{added:added.length,skipped:skipped.length,details:{added:added,skipped:skipped}};
  }finally{lock.releaseLock();}
}
function markPaymentLinkStockUsedForOrder_(orderId,now){
  if(!orderId)return;
  try{
    getRows_(TC_CONFIG.SHEETS.PAYMENT_LINKS).filter(function(l){return String(l.OrderID)===String(orderId)&&l.PaymentLinkStockID;}).forEach(function(l){
      updateRowById_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK,'PaymentLinkStockID',l.PaymentLinkStockID,{Status:'USED',OrderID:orderId,PaymentLinkID:l.PaymentLinkID,UpdatedAt:now||isoNow_()});
    });
  }catch(ignore){}
}
