/** Trusted Circle ERP — controlled admin actions and persistent work-queue controls. */
function ensureAdminWorklistSheet_(){return ensureSheet_('AdminWorklist',['WorklistID','SheetName','RecordID','Action','Reason','AdminUserID','CreatedAt','UpdatedAt']);}
function adminClearRowsCache_(sheetName){try{CacheService.getScriptCache().remove('tc_admin_rows_'+String(sheetName));}catch(ignore){}}
function adminFindRecord_(sheetName,idField,id){var row=findOne_(sheetName,idField,id);require_(row,'Record not found.');return row;}
function adminSetStatus_(sheetName,idField,id,newStatus,admin,reason){var row=adminFindRecord_(sheetName,idField,id),old=String(row.Status||'');require_('Status' in row,'This record has no Status field.');updateRowById_(sheetName,idField,id,{Status:newStatus,UpdatedAt:isoNow_()});adminClearRowsCache_(sheetName);appendAudit_(admin.UserID,'STATUS_'+String(newStatus).toUpperCase(),sheetName,id,{from:old,to:newStatus,reason:reason||''});return findOne_(sheetName,idField,id);}
function adminWorklistAction_(data){
  var admin=adminAuthenticate_(data.token),action=String(data.actionName||data.workAction||'').toUpperCase(),sheet=cleanText_(data.sheet,60),recordId=cleanText_(data.recordId,200),reason=cleanText_(data.reason||'',500),idField=TC_ADMIN_SHEETS[sheet];
  require_(action,'Work action is required.');
  if(action==='REMOVE'){
    ensureAdminWorklistSheet_();
    var existing=getRows_('AdminWorklist').find(function(r){return String(r.SheetName)===sheet&&String(r.RecordID)===recordId&&String(r.Action).toUpperCase()==='HIDE';});
    if(!existing){var now=isoNow_();appendRowObject_('AdminWorklist',{WorklistID:newId_('TCWL'),SheetName:sheet,RecordID:recordId,Action:'HIDE',Reason:reason||'Removed by admin',AdminUserID:admin.UserID,CreatedAt:now,UpdatedAt:now});}
    appendAudit_(admin.UserID,'WORKLIST_REMOVE',sheet,recordId,{reason:reason||'Removed by admin'});
    return{removed:true};
  }
  require_(idField,'Unknown ERP sheet.');
  var row=adminFindRecord_(sheet,idField,recordId);
  if(action==='VERIFY_PAYMENT'){
    require_(sheet==='Payments'||sheet==='Orders','Payment verification requires a payment or order record.');
    var orderId=sheet==='Payments'?row.OrderID:row.OrderID,payment=sheet==='Payments'?row:((getRows_(TC_CONFIG.SHEETS.PAYMENTS).filter(function(p){return String(p.OrderID)===String(orderId);}).slice(-1)[0]||null));
    require_(payment,'Payment record not found.');
    var expected=Number(sheet==='Payments'?row.Amount:row.Total),paid=Number(payment.Amount);require_(expected===paid,'Payment amount does not match the order amount.');
    updateRowById_(TC_CONFIG.SHEETS.PAYMENTS,'PaymentID',payment.PaymentID,{Status:'VERIFIED',VerifiedAt:isoNow_(),UpdatedAt:isoNow_()});
    updateRowById_(TC_CONFIG.SHEETS.ORDERS,'OrderID',orderId,{Status:'PAID',UpdatedAt:isoNow_()});
    var order=findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderID',orderId);if(typeof creditCashbackForOrder_==='function')creditCashbackForOrder_(order);if(typeof markPaymentLinkStockUsedForOrder_==='function')markPaymentLinkStockUsedForOrder_(orderId);
    adminClearRowsCache_('Payments');adminClearRowsCache_('Orders');adminClearRowsCache_('CashbackWallet');adminClearRowsCache_('CashbackTransactions');adminClearRowsCache_('PaymentLinkStock');
    appendAudit_(admin.UserID,'PAYMENT_VERIFIED','Order',orderId,{paymentId:payment.PaymentID,amount:paid,reason:reason||''});return{payment:findOne_(TC_CONFIG.SHEETS.PAYMENTS,'PaymentID',payment.PaymentID),order:findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderID',orderId)};
  }
  if(action==='SEND_VOUCHER')return adminSendVoucher_(Object.assign({},data,{orderId:recordId}));
  if(action==='APPROVE')return{row:adminSetStatus_(sheet,idField,recordId,sheet==='WalletRedemptions'?'PROCESSING':'APPROVED',admin,reason)};
  if(action==='REJECT'){
    var updated=adminSetStatus_(sheet,idField,recordId,'REJECTED',admin,reason);
    if(sheet==='WalletRedemptions'&&typeof restoreRejectedRedemption_==='function')restoreRejectedRedemption_(updated);
    return{row:updated};
  }
  if(action==='CANCEL')return{row:adminSetStatus_(sheet,idField,recordId,'CANCELLED',admin,reason)};
  if(action==='PROCESS_CASHBACK')require_(sheet==='WalletRedemptions','Cashback processing requires a redemption record.');return{row:adminSetStatus_(sheet,idField,recordId,'PROCESSING',admin,reason)};
  if(action==='COMPLETE_CASHBACK')require_(sheet==='WalletRedemptions','Cashback completion requires a redemption record.');return{row:adminSetStatus_(sheet,idField,recordId,'COMPLETED',admin,reason)};
  throw new Error('Unsupported admin work action.');
}
function restoreRejectedRedemption_(redemption){if(!redemption)return false;var amount=Number(redemption.Amount||0);if(!(amount>0))return false;var wallet=findOne_(TC_WALLET.WALLET,'WalletID',redemption.WalletID);if(!wallet)return false;var txs=getRows_(TC_WALLET.TX).filter(function(t){return String(t.OrderID)===''&&String(t.UserID)===String(redemption.UserID)&&String(t.Type).toUpperCase()==='REDEMPTION_REFUND'&&String(t.Description||'').indexOf(String(redemption.RedemptionID))>=0;});if(txs.length)return false;var balance=Math.round((Number(wallet.Balance||0)+amount)*100)/100,now=isoNow_();updateRowById_(TC_WALLET.WALLET,'WalletID',wallet.WalletID,{Balance:balance,TotalRedeemed:Math.max(0,Math.round((Number(wallet.TotalRedeemed||0)-amount)*100)/100),UpdatedAt:now});appendRowObject_(TC_WALLET.TX,{TransactionID:newId_('TCWTX'),WalletID:wallet.WalletID,UserID:redemption.UserID,Type:'REDEMPTION_REFUND',OrderID:'',Amount:amount,BalanceAfter:balance,Status:'COMPLETED',Description:'Refund for rejected redemption '+redemption.RedemptionID,CreatedAt:now});return true;}
function adminEditAnyRow_(data){var admin=adminAuthenticate_(data.token),sheet=cleanText_(data.sheet,60),idField=TC_ADMIN_SHEETS[sheet],id=cleanText_(data.id,200),patch=data.patch||{};require_(idField,'Unknown ERP sheet.');require_(id,'Row ID is required.');var current=adminFindRecord_(sheet,idField,id),headers=getSheetHeaders_(sheet),protectedFields=['UserID','SessionID','TokenHash','OtpHash','Password','AuditID','OtpID'];var clean={};Object.keys(patch).forEach(function(key){if(headers.indexOf(key)>=0&&key!==idField&&protectedFields.indexOf(key)<0)clean[key]=cleanText_(patch[key],10000);});require_(Object.keys(clean).length>0,'No editable operational fields were supplied.');updateRowById_(sheet,idField,id,clean);adminClearRowsCache_(sheet);appendAudit_(admin.UserID,'ADMIN_EDIT',sheet,id,{before:current,after:clean});return{row:findOne_(sheet,idField,id)};}
