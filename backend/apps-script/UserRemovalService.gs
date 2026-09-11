/** Trusted Circle ERP — dedicated shopper removal service. Keeps financial history; deactivates the account and revokes sessions. */
function adminFindUserForRemoval_(data){
  var admin=adminAuthenticate_(data.token);
  var query=cleanText_(data.query||'',200).trim();
  require_(query,'Email or User ID is required.');
  var user=null;
  if(query.indexOf('@')>=0) user=getUserByEmail_(normalizeEmail_(query));
  if(!user) user=findOne_(TC_CONFIG.SHEETS.USERS,'UserID',query);
  require_(user,'Shopper not found.');
  require_(String(user.Role||'').toUpperCase()!=='ADMIN','The ERP administrator account cannot be removed.');
  return {user:{userId:String(user.UserID),email:String(user.Email),name:String(user.Name||''),role:String(user.Role||''),status:String(user.Status||''),createdAt:String(user.CreatedAt||''),lastLoginAt:String(user.LastLoginAt||'')}};
}

function adminRemoveUser_(data){
  var admin=adminAuthenticate_(data.token);
  var query=cleanText_(data.query||'',200).trim();
  var reason=cleanText_(data.reason||'',500).trim();
  require_(query,'Email or User ID is required.');
  require_(reason,'Removal reason is required.');
  var user=null;
  if(query.indexOf('@')>=0) user=getUserByEmail_(normalizeEmail_(query));
  if(!user) user=findOne_(TC_CONFIG.SHEETS.USERS,'UserID',query);
  require_(user,'Shopper not found.');
  require_(String(user.Role||'').toUpperCase()!=='ADMIN','The ERP administrator account cannot be removed.');
  var now=isoNow_(),revoked=0;
  var sessions=getRows_(TC_CONFIG.SHEETS.SESSIONS);
  sessions.forEach(function(row){
    if(String(row.UserID)===String(user.UserID)&&String(row.Status||'').toUpperCase()==='ACTIVE'){
      if(updateRowById_(TC_CONFIG.SHEETS.SESSIONS,'SessionID',row.SessionID,{Status:'REVOKED',RevokedAt:now})) revoked++;
    }
  });
  updateRowById_(TC_CONFIG.SHEETS.USERS,'UserID',user.UserID,{Status:'REMOVED',UpdatedAt:now});
  appendAudit_(admin.UserID,'REMOVE_USER','User',user.UserID,{email:user.Email,reason:reason,revokedSessions:revoked});
  return {ok:true,userId:String(user.UserID),email:String(user.Email),status:'REMOVED',revokedSessions:revoked,removedAt:now,historyPreserved:true};
}
