/*
 * Trusted Circle — Agent Business Backend
 * Dedicated Google Apps Script backend.
 *
 * ONE-TIME SETUP:
 *   freshSetupAgentBusinessSheets('1goWIbN1aQtxCs9PoNPLPl0xfFdCwI5vJxh4TOtahbl0')
 *
 * After setup, deploy this Apps Script as a Web App.
 */

var AGENT_BUSINESS = {
  NAME: 'Trusted Circle Agent Business',
  SHEET_ID_PROPERTY: 'AGENT_BUSINESS_SHEET_ID',
  DISCOUNT_RATE: 0.02,
  SETUP_VERSION: '1.2.0',
  SESSION_TTL_SECONDS: 21600,
  SHEETS: {
    Agents:['AgentID','AgentCode','AgentName','AgencyName','Mobile','Email','InsuranceCompany','LicenseNumber','Address','BankName','AccountName','AccountNumber','IFSC','UPI','Status','JoinedDate','Notes','CreatedAt','UpdatedAt'],
    AgentUsers:['AgentUserID','AgentID','Email','Mobile','PasswordHash','Status','LastLoginAt','CreatedAt','UpdatedAt'],
    Clients:['ClientID','AgentID','ClientName','PolicyNumber','DateOfBirth','Status','Notes','CreatedAt','UpdatedAt'],
    Policies:['PolicyID','AgentID','ClientID','InsuranceCompany','PolicyNumber','PolicyType','PolicyHolder','InsuredPerson','PremiumAmount','PremiumFrequency','NextDueDate','PolicyStatus','StartDate','MaturityDate','Notes','CreatedAt','UpdatedAt'],
    PremiumBills:['BillID','AgentID','ClientID','PolicyID','PolicyNumber','PremiumAmount','DueDate','BillDate','DiscountRate','DiscountAmount','CustomerPayable','PaymentStatus','ReceiptRequired','Notes','CreatedAt','UpdatedAt'],
    PaymentRequests:['RequestID','BillID','AgentID','ClientID','PremiumAmount','CustomerPayable','DiscountAmount','Status','RequestedAt','ApprovedAt','PaymentID','Notes'],
    Payments:['PaymentID','RequestID','BillID','AgentID','ClientID','PremiumAmount','CustomerCollected','PaymentMode','CardID','PaymentDate','ReferenceNumber','ReceiptID','Status','Notes','CreatedAt','UpdatedAt'],
    Receipts:['ReceiptID','PaymentID','ReceiptNumber','ReceiptUrl','ReceiptDate','Notes','CreatedAt'],
    Cards:['CardID','Bank','CardName','CardType','Last4','Network','CreditLimit','AvailableLimit','BillingDate','DueDate','AnnualFee','Status','Notes','CreatedAt','UpdatedAt'],
    CardRules:['RuleID','CardID','Category','Eligible','CashbackRate','CashbackType','MonthlyCap','MonthlyUsed','MonthlyRemaining','RewardConversion','EffectiveFrom','EffectiveTo','Notes','CreatedAt','UpdatedAt'],
    CardTransactions:['TransactionID','PaymentID','CardID','Amount','Category','TransactionDate','ReferenceNumber','Status','Notes','CreatedAt'],
    Cashback:['CashbackID','PaymentID','CardID','TransactionAmount','ExpectedRate','ExpectedCashback','ActualCashback','CashbackStatus','ExpectedDate','ReceivedDate','Variance','Notes','CreatedAt','UpdatedAt'],
    AgentSettlements:['SettlementID','AgentID','PeriodFrom','PeriodTo','GrossAmount','DiscountAmount','NetAmount','PaidAmount','BalanceAmount','Status','SettlementDate','ReferenceNumber','Notes','CreatedAt','UpdatedAt'],
    MoneyLedger:['LedgerID','TransactionDate','ReferenceType','ReferenceID','AgentID','ClientID','PaymentID','Description','MoneyIn','MoneyOut','Balance','PaymentMode','BankAccount','Category','Status','CreatedAt'],
    Expenses:['ExpenseID','ExpenseDate','Category','Description','Amount','PaymentMode','ReferenceNumber','Notes','CreatedAt'],
    Notifications:['NotificationID','RecipientType','RecipientID','Type','Title','Message','Status','CreatedAt','ReadAt'],
    AuditLogs:['AuditID','Action','Entity','EntityID','Actor','Metadata','CreatedAt'],
    Settings:['Key','Value','Description','UpdatedAt']
  }
};

function resetAgentBusinessDatabase(spreadsheetId){
  var id=String(spreadsheetId||'').trim();
  if(!id) throw new Error('Enter the Agent Business Google Sheet ID.');

  var ss=SpreadsheetApp.openById(id);
  var managed=Object.keys(AGENT_BUSINESS.SHEETS);
  managed.forEach(function(name){
    var sheet=ss.getSheetByName(name);
    if(sheet){
      sheet.clearContents();
      sheet.clearFormats();
      sheet.clearDataValidations();
      sheet.clearNotes();
    }
  });

  PropertiesService.getScriptProperties().deleteProperty(AGENT_BUSINESS.SHEET_ID_PROPERTY);
  SpreadsheetApp.flush();

  return freshSetupAgentBusinessSheets(id);
}

function freshSetupAgentBusinessSheets(spreadsheetId){
  var id=String(spreadsheetId||PropertiesService.getScriptProperties().getProperty(AGENT_BUSINESS.SHEET_ID_PROPERTY)||'').trim();
  if(!id) throw new Error('Enter the Agent Business Google Sheet ID.');

  var ss=SpreadsheetApp.openById(id);
  PropertiesService.getScriptProperties().setProperty(AGENT_BUSINESS.SHEET_ID_PROPERTY,id);

  var created=[],updated=[];
  Object.keys(AGENT_BUSINESS.SHEETS).forEach(function(name){
    var sheet=ss.getSheetByName(name);
    if(!sheet){
      sheet=ss.insertSheet(name);
      created.push(name);
    }

    var headers=AGENT_BUSINESS.SHEETS[name];
    var lastColumn=Math.max(sheet.getLastColumn(),1);
    var existing=sheet.getLastRow()>0
      ? sheet.getRange(1,1,1,lastColumn).getValues()[0].map(function(v){return String(v||'').trim();})
      : [];

    if(sheet.getLastRow()===0 || !existing.some(function(v){return v;})){
      sheet.getRange(1,1,1,headers.length).setValues([headers]);
      updated.push(name);
    }else{
      headers.forEach(function(h){
        if(existing.indexOf(h)<0){
          var nextColumn=sheet.getLastColumn()+1;
          sheet.getRange(1,nextColumn).setValue(h);
          existing.push(h);
          updated.push(name);
        }
      });
    }

    sheet.setFrozenRows(1);
    sheet.getRange(1,1,1,sheet.getLastColumn())
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setWrap(true);

    if(sheet.getLastColumn()>0){
      sheet.autoResizeColumns(1,sheet.getLastColumn());
    }
  });

  var settings=ss.getSheetByName('Settings');
  var settingsHeaders=AGENT_BUSINESS.SHEETS.Settings;
  if(settings.getLastRow()===0){
    settings.getRange(1,1,1,settingsHeaders.length).setValues([settingsHeaders]);
    settings.setFrozenRows(1);
  }

  var settingsRows=sheetRows_(settings);
  var now=new Date().toISOString();
  var defaults={
    DISCOUNT_RATE:String(AGENT_BUSINESS.DISCOUNT_RATE),
    BUSINESS_NAME:AGENT_BUSINESS.NAME,
    SETUP_VERSION:AGENT_BUSINESS.SETUP_VERSION
  };

  Object.keys(defaults).forEach(function(key){
    var found=settingsRows.find(function(row){return String(row.Key)===key;});
    if(!found){
      settings.getRange(settings.getLastRow()+1,1,1,4)
        .setValues([[key,defaults[key],key==='DISCOUNT_RATE'?'Default customer discount rate':key==='BUSINESS_NAME'?'Module name':'Backend database setup version',now]]);
    }
  });

  SpreadsheetApp.flush();

  return {
    ok:true,
    spreadsheetId:id,
    setupVersion:AGENT_BUSINESS.SETUP_VERSION,
    createdSheets:created,
    updatedSheets:Array.from(new Set(updated)),
    sheets:Object.keys(AGENT_BUSINESS.SHEETS),
    message:'Agent Business backend and Google Sheet structure are ready. Existing data was preserved.'
  };
}

function doGet(e){return agentBusinessResponse_(agentBusinessRoute_(e&&e.parameter?e.parameter:{}));}
function doPost(e){
  var input={};
  try{input=JSON.parse(String(e&&e.postData&&e.postData.contents||'{}'));}catch(err){input=e&&e.parameter?e.parameter:{};}
  return agentBusinessResponse_(agentBusinessRoute_(input));
}
function agentBusinessResponse_(data){
  return ContentService.createTextOutput(JSON.stringify({ok:true,data:data})).setMimeType(ContentService.MimeType.JSON);
}
function agentBusinessRoute_(p){
  var action=String(p.action||'dashboard');
  if(action==='freshSetup') return freshSetupAgentBusinessSheets(p.spreadsheetId);
  var ss=agentBusinessSpreadsheet_();
  if(action==='adminLogin') return adminLogin_(p);
  if(action==='adminMe') return adminMe_(p);
  if(action==='adminLogout') return adminLogout_(p);
  requireAdmin_(p);
  if(action==='dashboard') return dashboard_(ss);
  if(action==='list') return listRows_(ss,String(p.sheet||''),p);
  if(action==='save') return saveRow_(ss,String(p.sheet||''),p.data||{});
  if(action==='delete') return deleteRow_(ss,String(p.sheet||''),String(p.id||''),String(p.idField||''));
  if(action==='calculate') return calculate_(p);
  if(action==='agentLogin') return agentLogin_(p);
  if(action==='agentMe') return agentMe_(p);
  if(action==='agentClients') return agentClients_(p);
  if(action==='agentAddClient') return agentAddClient_(p);
  if(action==='agentLogout') return agentLogout_(p);
  if(action==='createAgent') return adminCreateAgent_(p);
  if(action==='setAgentPassword') return adminSetAgentPassword_(p);
  throw new Error('Unknown Agent Business action: '+action);
}
function agentSessionKey_(token){ return 'AGENT_SESSION_'+String(token||'').trim(); }
function adminSessionKey_(token){ return 'ADMIN_SESSION_'+String(token||'').trim(); }
function hashAdminPassword_(password){
  var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(password||''),Utilities.Charset.UTF_8);
  return bytes.map(function(b){var v=b<0?b+256:b;return ('0'+v.toString(16)).slice(-2);}).join('');
}
function setAdminPassword(password){
  password=String(password||'');
  if(password.length<8) throw new Error('Admin password must be at least 8 characters.');
  PropertiesService.getScriptProperties().setProperty('AGENT_BUSINESS_ADMIN_PASSWORD_HASH',hashAdminPassword_(password));
  return {ok:true,message:'Admin password configured.'};
}
function adminSession_(token){
  var t=String(token||'').trim();
  if(!t) throw new Error('Admin session is required.');
  var raw=CacheService.getScriptCache().get(adminSessionKey_(t));
  if(!raw) throw new Error('Admin session expired. Please login again.');
  return JSON.parse(raw);
}
function adminLogin_(p){
  var password=String(p.password||'');
  var stored=PropertiesService.getScriptProperties().getProperty('AGENT_BUSINESS_ADMIN_PASSWORD_HASH');
  if(!stored) throw new Error('Admin password is not configured. Run setAdminPassword() in Apps Script first.');
  if(hashAdminPassword_(password)!==stored) throw new Error('Invalid admin password.');
  var token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
  CacheService.getScriptCache().put(adminSessionKey_(token),JSON.stringify({role:'ADMIN',createdAt:new Date().toISOString()}),AGENT_BUSINESS.SESSION_TTL_SECONDS);
  return {token:token,expiresIn:AGENT_BUSINESS.SESSION_TTL_SECONDS};
}
function adminMe_(p){adminSession_(p.token);return {authenticated:true};}
function adminLogout_(p){var t=String(p.token||'').trim();if(t)CacheService.getScriptCache().remove(adminSessionKey_(t));return {loggedOut:true};}
function requireAdmin_(p){adminSession_(p.adminToken);}

function hashAgentPassword_(password){
  var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(password||''),Utilities.Charset.UTF_8);
  return bytes.map(function(b){var v=b<0?b+256:b;return ('0'+v.toString(16)).slice(-2);}).join('');
}
function normalizeMobile_(value){return String(value||'').replace(/\D/g,'');}
function agentSession_(token){
  var t=String(token||'').trim();
  if(!t) throw new Error('Agent session is required.');
  var raw=CacheService.getScriptCache().get(agentSessionKey_(t));
  if(!raw) throw new Error('Agent session expired. Please login again.');
  var session=JSON.parse(raw);
  if(!session.AgentID) throw new Error('Invalid agent session.');
  return session;
}
function agentLogin_(p){
  var mobile=normalizeMobile_(p.mobile), password=String(p.password||'');
  if(!/^\\d{10}$/.test(mobile)) throw new Error('Enter a valid 10-digit mobile number.');
  if(!/^\\d{4}$/.test(password)) throw new Error('Password must be exactly 4 digits.');
  var ss=agentBusinessSpreadsheet_();
  var users=sheetRows_(ss.getSheetByName('AgentUsers'));
  var user=users.find(function(u){return normalizeMobile_(u.Mobile)===mobile && String(u.Status||'ACTIVE').toUpperCase()==='ACTIVE';});
  if(!user || String(user.PasswordHash||'')!==hashAgentPassword_(password)) throw new Error('Invalid mobile number or password.');
  var agents=sheetRows_(ss.getSheetByName('Agents'));
  var agent=agents.find(function(a){return String(a.AgentID)===String(user.AgentID) && String(a.Status||'ACTIVE').toUpperCase()==='ACTIVE';});
  if(!agent) throw new Error('Agent account is inactive or unavailable.');
  var token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
  var session={AgentID:String(agent.AgentID),AgentUserID:String(user.AgentUserID),createdAt:new Date().toISOString()};
  CacheService.getScriptCache().put(agentSessionKey_(token),JSON.stringify(session),AGENT_BUSINESS.SESSION_TTL_SECONDS);
  updateAgentUserLastLogin_(ss,String(user.AgentUserID));
  return {token:token,agent:safeAgent_(agent),expiresIn:AGENT_BUSINESS.SESSION_TTL_SECONDS};
}
function agentMe_(p){var s=agentSession_(p.token),ss=agentBusinessSpreadsheet_(),agents=sheetRows_(ss.getSheetByName('Agents'));var a=agents.find(function(x){return String(x.AgentID)===s.AgentID;});if(!a)throw new Error('Agent account not found.');return {agent:safeAgent_(a)};}
function agentClients_(p){var s=agentSession_(p.token),ss=agentBusinessSpreadsheet_();var rows=sheetRows_(ss.getSheetByName('Clients')).filter(function(x){return String(x.AgentID)===s.AgentID;});return {items:rows.map(safeAgentClient_),total:rows.length};}
function agentAddClient_(p){
  var s=agentSession_(p.token),data=p.data||{},name=String(data.ClientName||'').trim(),policy=String(data.PolicyNumber||'').trim(),dob=String(data.DateOfBirth||'').trim();
  if(!name) throw new Error('Client name is required.');
  if(!policy) throw new Error('Policy number is required.');
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(dob)) throw new Error('Enter date of birth in YYYY-MM-DD format.');
  var ss=agentBusinessSpreadsheet_();
  var row={ClientID:newId_('ClientID'),AgentID:s.AgentID,ClientName:name,PolicyNumber:policy,DateOfBirth:dob,Status:'ACTIVE',Notes:'Submitted by agent portal'};
  var saved=saveRow_(ss,'Clients',row);
  return {item:safeAgentClient_(saved.item)};
}
function agentLogout_(p){var t=String(p.token||'').trim();if(t)CacheService.getScriptCache().remove(agentSessionKey_(t));return {loggedOut:true};}
function safeAgent_(a){return {AgentID:a.AgentID,AgentName:a.AgentName,AgencyName:a.AgencyName,Mobile:a.Mobile,Email:a.Email,Status:a.Status,JoinedDate:a.JoinedDate};}
function safeAgentClient_(c){return {ClientID:c.ClientID,ClientName:c.ClientName,PolicyNumber:c.PolicyNumber,DateOfBirth:c.DateOfBirth,Status:c.Status,CreatedAt:c.CreatedAt};}
function updateAgentUserLastLogin_(ss,id){var sheet=ss.getSheetByName('AgentUsers'),rows=sheetRows_(sheet),idx=rows.findIndex(function(r){return String(r.AgentUserID)===id;});if(idx>=0){var headers=AGENT_BUSINESS.SHEETS.AgentUsers,values=rows[idx];var col=headers.indexOf('LastLoginAt');if(col>=0)sheet.getRange(idx+2,col+1).setValue(new Date().toISOString());}}
function adminCreateAgent_(p){
  var data=p.data||{};
  var name=String(data.AgentName||'').trim();
  var mobile=normalizeMobile_(data.Mobile);
  var password=String(data.Password||'');
  if(!name) throw new Error('Agent name is required.');
  if(!/^\\d{10}$/.test(mobile)) throw new Error('Enter a valid 10-digit mobile number.');
  if(!/^\\d{4}$/.test(password)) throw new Error('Password must be exactly 4 digits.');

  var ss=agentBusinessSpreadsheet_();
  var agents=sheetRows_(ss.getSheetByName('Agents'));
  if(agents.some(function(a){return normalizeMobile_(a.Mobile)===mobile;})) throw new Error('An agent already exists with this mobile number.');

  var agent=saveRow_(ss,'Agents',{
    AgentID:newId_('AgentID'),
    AgentCode:String(data.AgentCode||'').trim(),
    AgentName:name,
    AgencyName:String(data.AgencyName||'').trim(),
    Mobile:mobile,
    Email:String(data.Email||'').trim(),
    InsuranceCompany:String(data.InsuranceCompany||'').trim(),
    LicenseNumber:String(data.LicenseNumber||'').trim(),
    Address:String(data.Address||'').trim(),
    BankName:String(data.BankName||'').trim(),
    AccountName:String(data.AccountName||'').trim(),
    AccountNumber:String(data.AccountNumber||'').trim(),
    IFSC:String(data.IFSC||'').trim(),
    UPI:String(data.UPI||'').trim(),
    Status:'ACTIVE',
    JoinedDate:data.JoinedDate||new Date().toISOString().slice(0,10),
    Notes:String(data.Notes||'').trim()
  });

  var user=createAgentUser(agent.id,mobile,password);
  return {agent:safeAgent_(agent.item),agentUserId:user.id,message:'Agent created and login credentials initialized.'};
}

function adminSetAgentPassword_(p){
  var agentId=String(p.agentId||'').trim();
  var password=String(p.password||'');
  if(!agentId) throw new Error('Agent ID is required.');
  if(!/^\\d{4}$/.test(password)) throw new Error('Password must be exactly 4 digits.');

  var ss=agentBusinessSpreadsheet_();
  var agents=sheetRows_(ss.getSheetByName('Agents'));
  var agent=agents.find(function(a){return String(a.AgentID)===agentId;});
  if(!agent) throw new Error('Agent not found.');

  var users=sheetRows_(ss.getSheetByName('AgentUsers'));
  var idx=users.findIndex(function(u){return String(u.AgentID)===agentId;});
  if(idx<0){
    var created=createAgentUser(agentId,agent.Mobile,password);
    return {agentUserId:created.id,message:'Agent password created.'};
  }

  var sheet=ss.getSheetByName('AgentUsers');
  var row=users[idx];
  row.PasswordHash=hashAgentPassword_(password);
  row.Status='ACTIVE';
  row.UpdatedAt=new Date().toISOString();
  var headers=AGENT_BUSINESS.SHEETS.AgentUsers;
  sheet.getRange(idx+2,1,1,headers.length).setValues([headers.map(function(h){return row[h]===undefined?'':row[h];})]);
  return {agentUserId:row.AgentUserID,message:'Agent password updated.'};
}

function createAgentUser(agentId,mobile,password){
  if(!/^\\d{4}$/.test(String(password||''))) throw new Error('Agent password must be exactly 4 digits.');
  var ss=agentBusinessSpreadsheet_(),agents=sheetRows_(ss.getSheetByName('Agents')),agent=agents.find(function(a){return String(a.AgentID)===String(agentId);});
  if(!agent) throw new Error('Agent not found.');
  var row={AgentUserID:newId_('AgentUserID'),AgentID:agent.AgentID,Email:agent.Email||'',Mobile:mobile,PasswordHash:hashAgentPassword_(password),Status:'ACTIVE'};
  return saveRow_(ss,'AgentUsers',row);
}
function agentBusinessSpreadsheet_(){
  var id=PropertiesService.getScriptProperties().getProperty(AGENT_BUSINESS.SHEET_ID_PROPERTY);
  if(!id) throw new Error('Agent Business database is not configured. Run freshSetupAgentBusinessSheets() first.');
  return SpreadsheetApp.openById(id);
}
function listRows_(ss,sheetName,p){
  if(!AGENT_BUSINESS.SHEETS[sheetName]) throw new Error('Invalid sheet.');
  var sheet=ss.getSheetByName(sheetName), rows=sheetRows_(sheet);
  var limit=Math.min(500,Math.max(1,Number(p.limit||200))),offset=Math.max(0,Number(p.offset||0));
  var search=String(p.search||'').trim().toLowerCase();
  if(search) rows=rows.filter(function(r){return JSON.stringify(r).toLowerCase().indexOf(search)>=0;});
  return {sheet:sheetName,items:rows.slice(offset,offset+limit),total:rows.length};
}
function saveRow_(ss,sheetName,data){
  if(!AGENT_BUSINESS.SHEETS[sheetName]) throw new Error('Invalid sheet.');
  var sheet=ss.getSheetByName(sheetName),headers=AGENT_BUSINESS.SHEETS[sheetName],idField=headers[0],row=Object.assign({},data);
  var id=String(row[idField]||newId_(idField));
  row[idField]=id;
  if(!row.CreatedAt) row.CreatedAt=new Date().toISOString();
  row.UpdatedAt=new Date().toISOString();
  var values=headers.map(function(h){return row[h]===undefined?'':row[h];});
  var rows=sheetRows_(sheet),idx=rows.findIndex(function(r){return String(r[idField])===id;});
  if(idx>=0) sheet.getRange(idx+2,1,1,headers.length).setValues([values]);
  else sheet.getRange(sheet.getLastRow()+1,1,1,headers.length).setValues([values]);
  return {id:id,item:row};
}
function deleteRow_(ss,sheetName,id,idField){
  if(!AGENT_BUSINESS.SHEETS[sheetName]) throw new Error('Invalid sheet.');
  var sheet=ss.getSheetByName(sheetName),field=idField||AGENT_BUSINESS.SHEETS[sheetName][0],rows=sheetRows_(sheet);
  var idx=rows.findIndex(function(r){return String(r[field])===id;});
  if(idx<0) throw new Error('Record not found.');
  sheet.deleteRow(idx+2);
  return {deleted:true,id:id};
}
function calculate_(p){
  var premium=Number(p.premiumAmount||0),rate=Number(p.discountRate===undefined?AGENT_BUSINESS.DISCOUNT_RATE:p.discountRate),cashbackRate=Number(p.cashbackRate||0);
  var discount=Math.round(premium*rate*100)/100,customer=Math.max(0,premium-discount),cashback=Math.round(premium*cashbackRate*100)/100;
  return {premiumAmount:premium,discountRate:rate,discountAmount:discount,customerPayable:customer,cashbackRate:cashbackRate,expectedCashback:cashback,expectedNetBenefit:Math.round((cashback-discount)*100)/100};
}
function dashboard_(ss){
  var counts={};
  Object.keys(AGENT_BUSINESS.SHEETS).forEach(function(n){counts[n]=Math.max(0,(ss.getSheetByName(n)||{getLastRow:function(){return 1;}}).getLastRow()-1);});
  var bills=sheetRows_(ss.getSheetByName('PremiumBills')),payments=sheetRows_(ss.getSheetByName('Payments')),cash=sheetRows_(ss.getSheetByName('Cashback'));
  var volume=payments.reduce(function(s,r){return s+Number(r.PremiumAmount||0);},0);
  var collected=payments.reduce(function(s,r){return s+Number(r.CustomerCollected||0);},0);
  var expected=cash.reduce(function(s,r){return s+Number(r.ExpectedCashback||0);},0);
  var actual=cash.reduce(function(s,r){return s+Number(r.ActualCashback||0);},0);
  return {counts,metrics:{paymentVolume:volume,customerCollected:collected,expectedCashback:expected,actualCashback:actual,customerDiscount:Math.max(0,volume-collected),pendingBills:bills.filter(function(r){return !['PAID','CANCELLED'].includes(String(r.PaymentStatus||'').toUpperCase());}).length}};
}
function sheetRows_(sheet){
  if(!sheet||sheet.getLastRow()<2)return [];
  var headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String);
  return sheet.getRange(2,1,sheet.getLastRow()-1,headers.length).getValues().map(function(row){
    var o={};headers.forEach(function(h,i){o[h]=row[i] instanceof Date?row[i].toISOString():row[i];});return o;
  });
}
function newId_(field){
  var prefix=String(field||'REC').replace(/ID$/,'').replace(/([a-z])([A-Z])/g,'$1-$2').toUpperCase().replace(/[^A-Z]/g,'').slice(0,8)||'REC';
  return prefix+'-'+Utilities.getUuid().replace(/-/g,'').slice(0,10).toUpperCase();
}
