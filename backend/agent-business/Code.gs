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
  ADMIN_PASSWORD_PROPERTY: 'AGENT_BUSINESS_ADMIN_PASSWORD',
  DISCOUNT_RATE: 0.02,
  SETUP_VERSION: '1.4.0',
  SESSION_TTL_SECONDS: 21600,
  READ_CACHE_TTL_SECONDS: 30,
  SHEETS: {
    Agents:['AgentID','AgentCode','AgentName','AgencyName','Mobile','Email','InsuranceCompany','LicenseNumber','Address','BankName','AccountName','AccountNumber','IFSC','UPI','Status','JoinedDate','Notes','CreatedAt','UpdatedAt'],
    AgentUsers:['AgentUserID','AgentID','Email','Mobile','PasswordHash','Status','LastLoginAt','CreatedAt','UpdatedAt'],
    Clients:['ClientID','AgentID','ClientName','PolicyNumber','DateOfBirth','Status','Notes','CreatedAt','UpdatedAt'],
    Policies:['PolicyID','AgentID','ClientID','InsuranceCompany','PolicyNumber','PolicyType','PolicyHolder','InsuredPerson','PremiumAmount','PremiumFrequency','NextDueDate','PolicyStatus','StartDate','MaturityDate','Notes','CreatedAt','UpdatedAt'],
    PremiumBills:['BillID','AgentID','ClientID','PolicyID','PolicyNumber','PremiumAmount','DueDate','BillDate','DiscountRate','DiscountAmount','CustomerPayable','PaymentStatus','ReceiptRequired','Notes','CreatedAt','UpdatedAt'],
    PaymentRequests:['RequestID','BillID','AgentID','ClientID','PolicyID','PremiumAmount','CustomerPayable','DiscountAmount','Status','RequestedAt','ApprovedAt','PaymentID','Notes'],
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
    Invoices:['InvoiceID','InvoiceNumber','AgentID','InvoiceDate','TotalAmount','DiscountRate','DiscountAmount','NetPayable','Status','AgentEmail','PdfUrl','CreatedAt','UpdatedAt'],
    InvoiceItems:['InvoiceItemID','InvoiceID','PaymentID','ClientID','ClientName','PolicyNumber','DateOfBirth','Amount','DiscountAmount','NetAmount','CreatedAt'],
    AgentReceivables:['ReceivableID','AgentID','PaymentID','InvoiceID','ClientID','ClientName','PolicyNumber','DateOfBirth','GrossAmount','DiscountAmount','ReceivableAmount','Status','ReceivableDate','SettledDate','Notes','CreatedAt','UpdatedAt'],
    Settings:['Key','Value','Description','UpdatedAt']
  }
};

function resetAgentBusinessDatabase(spreadsheetId){
  var id=String(spreadsheetId||PropertiesService.getScriptProperties().getProperty(AGENT_BUSINESS.SHEET_ID_PROPERTY)||'').trim();
  if(!id) throw new Error('Agent Business Sheet ID is not configured in Apps Script Properties.');

  var ss=SpreadsheetApp.openById(id);
  var managed=Object.keys(AGENT_BUSINESS.SHEETS);
  managed.forEach(function(name){
    var sheet=ss.getSheetByName(name);
    if(sheet){
      var range=sheet.getDataRange();
      range.clearContent();
      range.clearFormat();
      range.clearDataValidations();
      range.clearNote();
    }
  });

  PropertiesService.getScriptProperties().deleteProperty(AGENT_BUSINESS.SHEET_ID_PROPERTY);
  SpreadsheetApp.flush();

  return freshSetupAgentBusinessSheets(id);
}

function freshSetupAgentBusinessSheets(spreadsheetId){
  var id=String(spreadsheetId||PropertiesService.getScriptProperties().getProperty(AGENT_BUSINESS.SHEET_ID_PROPERTY)||'').trim();
  if(!id) throw new Error('Agent Business Sheet ID is not configured in Apps Script Properties.');

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

function doGet(e){
  return agentBusinessResponse_(agentBusinessRouteSafe_(e&&e.parameter?e.parameter:{}));
}
function doPost(e){
  var input={};
  try{input=JSON.parse(String(e&&e.postData&&e.postData.contents||'{}'));}catch(err){input=e&&e.parameter?e.parameter:{};}
  return agentBusinessResponse_(agentBusinessRouteSafe_(input));
}
function agentBusinessResponse_(data){
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
function agentBusinessRouteSafe_(p){
  try{
    return {ok:true,data:agentBusinessRoute_(p)};
  }catch(err){
    return {ok:false,error:String(err&&err.message||err)};
  }
}
function agentBusinessRoute_(p){
  var action=String(p.action||'dashboard');

  if(action==='health') return {service:'Trusted Circle Agent Business',status:'ok',setupVersion:AGENT_BUSINESS.SETUP_VERSION};
  if(action==='adminLogin') return adminLogin_(p);
  if(action==='adminMe') return adminMe_(p);
  if(action==='adminLogout') return adminLogout_(p);

  if(action==='agentLogin') return agentLogin_(p);
  if(action==='agentMe') return agentMe_(p);
  if(action==='agentBootstrap') return agentBootstrap_(p);
  if(action==='agentClients') return agentClients_(p);
  if(action==='agentPaymentRequests') return agentPaymentRequests_(p);
  if(action==='agentAddClient') return agentAddClient_(p);
  if(action==='agentAddPolicy') return agentAddPolicy_(p);
  if(action==='agentEditPolicy') return agentEditPolicy_(p);
  if(action==='agentRequestPayment') return agentRequestPayment_(p);
  if(action==='agentCancelPaymentRequest') return agentCancelPaymentRequest_(p);
  if(action==='agentClientHistory') return agentClientHistory_(p);
  if(action==='agentLogout') return agentLogout_(p);

  var ss=agentBusinessSpreadsheet_();
  requireAdmin_(p);
  if(action==='dashboard') return dashboard_(ss);
  if(action==='list') return listRows_(ss,String(p.sheet||''),p);
  if(action==='save') return saveRow_(ss,String(p.sheet||''),p.data||{});
  if(action==='delete') return deleteRow_(ss,String(p.sheet||''),String(p.id||''),String(p.idField||''));
  if(action==='calculate') return calculate_(p);
  if(action==='markPaymentPaid') return markPaymentPaid_(p);
  if(action==='createInvoice') return createInvoice_(p);
  if(action==='receivables') return listReceivables_(ss,p);
  if(action==='schema') return {sheet:String(p.sheet||''),fields:AGENT_BUSINESS.SHEETS[String(p.sheet||'')]||[]};
  if(action==='createAgent') return adminCreateAgent_(p);
  if(action==='setAgentPassword') return adminSetAgentPassword_(p);
  throw new Error('Unknown Agent Business action: '+action);
}
function agentSessionKey_(token){ return 'AGENT_SESSION_'+String(token||'').trim(); }
function adminSessionKey_(token){ return 'ADMIN_SESSION_'+String(token||'').trim(); }
function setAdminPassword(password){
  password=String(password||'');
  if(password.length<8) throw new Error('Admin password must be at least 8 characters.');
  PropertiesService.getScriptProperties().setProperty(AGENT_BUSINESS.ADMIN_PASSWORD_PROPERTY,password);
  return {ok:true,message:'Admin password configured in Apps Script Properties.'};
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
  var stored=PropertiesService.getScriptProperties().getProperty(AGENT_BUSINESS.ADMIN_PASSWORD_PROPERTY);
  if(!stored) throw new Error('Admin password is not configured in Apps Script Properties. Add AGENT_BUSINESS_ADMIN_PASSWORD in Apps Script Properties.');
  if(password!==stored) throw new Error('Invalid admin password.');
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
  if(!/^\d{10}$/.test(mobile)) throw new Error('Enter a valid 10-digit mobile number.');
  if(!/^\d{4}$/.test(password)) throw new Error('Password must be exactly 4 digits.');
  var ss=agentBusinessSpreadsheet_();
  var users=cachedSheetRows_(ss.getSheetByName('AgentUsers'),'AgentUsers');
  var user=users.find(function(u){return normalizeMobile_(u.Mobile)===mobile && String(u.Status||'ACTIVE').toUpperCase()==='ACTIVE';});
  if(!user || String(user.PasswordHash||'')!==hashAgentPassword_(password)) throw new Error('Invalid mobile number or password.');
  var agents=cachedSheetRows_(ss.getSheetByName('Agents'),'Agents');
  var agent=agents.find(function(a){return String(a.AgentID)===String(user.AgentID) && String(a.Status||'ACTIVE').toUpperCase()==='ACTIVE';});
  if(!agent) throw new Error('Agent account is inactive or unavailable.');
  var token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
  var session={AgentID:String(agent.AgentID),AgentUserID:String(user.AgentUserID),createdAt:new Date().toISOString()};
  CacheService.getScriptCache().put(agentSessionKey_(token),JSON.stringify(session),AGENT_BUSINESS.SESSION_TTL_SECONDS);
  // Keep authentication fast: do not perform a second Sheet write during login.
  // LastLoginAt can be updated asynchronously from an admin/reporting workflow.
  return {token:token,agent:safeAgent_(agent),expiresIn:AGENT_BUSINESS.SESSION_TTL_SECONDS};
}
function agentMe_(p){var s=agentSession_(p.token),ss=agentBusinessSpreadsheet_(),agents=cachedSheetRows_(ss.getSheetByName('Agents'),'Agents');var a=agents.find(function(x){return String(x.AgentID)===s.AgentID;});if(!a)throw new Error('Agent account not found.');return {agent:safeAgent_(a)};}
function agentBootstrap_(p){
  var s=agentSession_(p.token),ss=agentBusinessSpreadsheet_(),agentKey='agent:'+s.AgentID;
  var cached=cacheGetJson_('AGENT_BOOT_'+s.AgentID);
  if(cached)return cached;
  var agents=cachedSheetRows_(ss.getSheetByName('Agents'),'Agents');
  var agent=agents.find(function(x){return String(x.AgentID)===s.AgentID;});
  if(!agent)throw new Error('Agent account not found.');
  var clients=cachedSheetRows_(ss.getSheetByName('Clients'),'Clients');
  var policies=cachedSheetRows_(ss.getSheetByName('Policies'),'Policies');
  var bills=cachedSheetRows_(ss.getSheetByName('PremiumBills'),'PremiumBills');
  var requests=cachedSheetRows_(ss.getSheetByName('PaymentRequests'),'PaymentRequests');
  var ownClients=clients.filter(function(x){return String(x.AgentID)===s.AgentID;});
  var policyMap={};policies.forEach(function(x){if(String(x.AgentID)===s.AgentID)policyMap[String(x.ClientID)]=x;});
  var billMap={};bills.forEach(function(x){if(String(x.AgentID)===s.AgentID)billMap[String(x.ClientID)]=x;});
  var requestMap={};requests.forEach(function(x){if(String(x.AgentID)===s.AgentID)requestMap[String(x.ClientID)]=x;});
  var items=ownClients.slice().reverse().map(function(client){var policy=policyMap[String(client.ClientID)]||{},bill=billMap[String(client.ClientID)]||{},request=requestMap[String(client.ClientID)]||{};return safeAgentClient_(Object.assign({},client,policy,{PolicyID:policy.PolicyID||'',PremiumAmount:bill.PremiumAmount||policy.PremiumAmount||0,RequestStatus:request.Status||''}));});
  var reqItems=requests.filter(function(x){return String(x.AgentID)===s.AgentID;}).slice().reverse().map(function(req){var client=ownClients.find(function(x){return String(x.ClientID)===String(req.ClientID);})||{};var policy=policyMap[String(req.ClientID)]||{};return safeAgentRequest_(Object.assign({},req,{ClientName:client.ClientName||'',PolicyNumber:client.PolicyNumber||policy.PolicyNumber||''}));});
  var result={agent:safeAgent_(agent),clients:{items:items,total:items.length},requests:{items:reqItems,total:reqItems.length}};
  cachePutJson_('AGENT_BOOT_'+s.AgentID,result,15);
  return result;
}
function agentClients_(p){
  var boot=agentBootstrap_(p);return boot.clients;
  /*
  var s=agentSession_(p.token),ss=agentBusinessSpreadsheet_();
  var rows=sheetRows_(ss.getSheetByName('Clients')).filter(function(x){return String(x.AgentID)===s.AgentID;});
  var policies=sheetRows_(ss.getSheetByName('Policies')).filter(function(x){return String(x.AgentID)===s.AgentID;});
  var policyMap={}; policies.forEach(function(x){policyMap[String(x.ClientID)]=x;});
  var bills=sheetRows_(ss.getSheetByName('PremiumBills')).filter(function(x){return String(x.AgentID)===s.AgentID;});
  var billMap={}; bills.forEach(function(x){billMap[String(x.ClientID)]=x;});
  var requests=sheetRows_(ss.getSheetByName('PaymentRequests')).filter(function(x){return String(x.AgentID)===s.AgentID;});
  var requestMap={}; requests.forEach(function(x){requestMap[String(x.ClientID)]=x;});
  return {items:rows.reverse().map(function(c){
    var policy=policyMap[String(c.ClientID)]||{},bill=billMap[String(c.ClientID)]||{},request=requestMap[String(c.ClientID)]||{};
    return safeAgentClient_(Object.assign({},c,policy,{PremiumAmount:bill.PremiumAmount||policy.PremiumAmount||0,RequestStatus:request.Status||'PENDING'}));
  }),total:rows.length};
  */
}
function agentAddClient_(p){
  // Legacy endpoint kept for compatibility. New workflow is policy-first and never creates a payment request here.
  return agentAddPolicy_(p);
}
function agentAddPolicy_(p){
  var s=agentSession_(p.token),data=p.data||{};
  var name=String(data.ClientName||'').trim(),policyNumber=String(data.PolicyNumber||'').trim(),dob=String(data.DateOfBirth||'').trim();
  if(!name)throw new Error('Client name is required.');
  if(!policyNumber)throw new Error('Policy number is required.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dob))throw new Error('Enter date of birth in YYYY-MM-DD format.');
  var ss=agentBusinessSpreadsheet_();
  var clients=cachedSheetRows_(ss.getSheetByName('Clients'),'Clients'),policies=cachedSheetRows_(ss.getSheetByName('Policies'),'Policies');
  if(clients.some(function(x){return String(x.AgentID)===s.AgentID&&String(x.PolicyNumber).trim()===policyNumber;}))throw new Error('This policy is already added to your workspace.');
  var clientId=newId_('ClientID'),policyId=newId_('PolicyID');
  var client=saveRow_(ss,'Clients',{ClientID:clientId,AgentID:s.AgentID,ClientName:name,PolicyNumber:policyNumber,DateOfBirth:dob,Status:'ACTIVE',Notes:'Added from Agent Portal'});
  var policy=saveRow_(ss,'Policies',{PolicyID:policyId,AgentID:s.AgentID,ClientID:clientId,InsuranceCompany:'LIC',PolicyNumber:policyNumber,PolicyType:'',PolicyHolder:name,InsuredPerson:name,PremiumAmount:'',PremiumFrequency:'',NextDueDate:'',PolicyStatus:'ACTIVE',Notes:'Policy details to be verified by Admin'});
  invalidateSheetCache_('Clients');invalidateSheetCache_('Policies');cacheRemoveAgent_(s.AgentID);
  return {client:safeAgentClient_(Object.assign({},client.item,policy.item,{RequestStatus:''})),policy:safeAgentClient_(Object.assign({},client.item,policy.item,{RequestStatus:''}))};
}
function agentEditPolicy_(p){
  var s=agentSession_(p.token),data=p.data||{},policyId=String(data.PolicyID||'').trim();
  if(!policyId)throw new Error('Policy ID is required.');
  var ss=agentBusinessSpreadsheet_(),policies=sheetRows_(ss.getSheetByName('Policies')),policy=policies.find(function(x){return String(x.PolicyID)===policyId&&String(x.AgentID)===s.AgentID;});
  if(!policy)throw new Error('Policy not found.');
  var name=String(data.ClientName||'').trim(),policyNumber=String(data.PolicyNumber||'').trim(),dob=String(data.DateOfBirth||'').trim();
  if(!name||!policyNumber||!/^\d{4}-\d{2}-\d{2}$/.test(dob))throw new Error('Client name, policy number and date of birth are required.');
  var clients=sheetRows_(ss.getSheetByName('Clients')),client=clients.find(function(x){return String(x.ClientID)===String(policy.ClientID)&&String(x.AgentID)===s.AgentID;});
  if(!client)throw new Error('Client record not found.');
  var duplicate=clients.some(function(x){return String(x.AgentID)===s.AgentID&&String(x.ClientID)!==String(client.ClientID)&&String(x.PolicyNumber).trim()===policyNumber;});
  if(duplicate)throw new Error('Another client already uses this policy number.');
  saveRow_(ss,'Clients',{ClientID:client.ClientID,AgentID:s.AgentID,ClientName:name,PolicyNumber:policyNumber,DateOfBirth:dob,Status:client.Status||'ACTIVE',Notes:client.Notes||''});
  saveRow_(ss,'Policies',{PolicyID:policy.PolicyID,AgentID:s.AgentID,ClientID:client.ClientID,InsuranceCompany:policy.InsuranceCompany||'LIC',PolicyNumber:policyNumber,PolicyType:policy.PolicyType||'',PolicyHolder:name,InsuredPerson:name,PremiumAmount:policy.PremiumAmount||'',PremiumFrequency:policy.PremiumFrequency||'',NextDueDate:policy.NextDueDate||'',PolicyStatus:policy.PolicyStatus||'ACTIVE',Notes:policy.Notes||''});
  ['Clients','Policies'].forEach(invalidateSheetCache_);cacheRemoveAgent_(s.AgentID);
  return {updated:true};
}
function agentRequestPayment_(p){
  var s=agentSession_(p.token),data=p.data||{},policyId=String(data.PolicyID||p.policyId||'').trim(),clientId=String(data.ClientID||p.clientId||'').trim();
  var ss=agentBusinessSpreadsheet_(),policies=sheetRows_(ss.getSheetByName('Policies'));
  var policy=policyId?policies.find(function(x){return String(x.PolicyID)===policyId&&String(x.AgentID)===s.AgentID;}):null;
  if(!policy&&clientId) policy=policies.find(function(x){return String(x.ClientID)===clientId&&String(x.AgentID)===s.AgentID;});
  if(!policy)throw new Error('Policy not found for this client. Refresh the workspace.');
  policyId=String(policy.PolicyID);
  var requests=sheetRows_(ss.getSheetByName('PaymentRequests'));
  if(requests.some(function(x){return String(x.AgentID)===s.AgentID&&String(x.PolicyID||'')===policyId&&String(x.Status||'').toUpperCase()==='PENDING';}))throw new Error('A payment request is already pending for this policy.');
  var client=sheetRows_(ss.getSheetByName('Clients')).find(function(x){return String(x.ClientID)===String(policy.ClientID)&&String(x.AgentID)===s.AgentID;});
  if(!client)throw new Error('Client record not found.');
  var request=saveRow_(ss,'PaymentRequests',{RequestID:newId_('RequestID'),BillID:'',AgentID:s.AgentID,ClientID:client.ClientID,PolicyID:policyId,PremiumAmount:'',CustomerPayable:'',DiscountAmount:'',Status:'PENDING',RequestedAt:new Date().toISOString(),Notes:'Agent requested payment on behalf of client. Admin to verify premium details.'});
  saveRow_(ss,'Notifications',{NotificationID:newId_('NotificationID'),RecipientType:'ADMIN',RecipientID:'ADMIN',Type:'PAYMENT_REQUEST',Title:'New payment request',Message:client.ClientName+' · Policy '+policy.PolicyNumber+' · Agent '+s.AgentID,Status:'UNREAD',CreatedAt:new Date().toISOString()});
  ['PaymentRequests','Notifications'].forEach(invalidateSheetCache_);cacheRemoveAgent_(s.AgentID);
  return {paymentRequest:safeAgentRequest_(Object.assign({},request.item,{ClientName:client.ClientName,PolicyNumber:policy.PolicyNumber}))};
}
function agentCancelPaymentRequest_(p){
  var s=agentSession_(p.token),requestId=String(p.requestId||'').trim();
  if(!requestId)throw new Error('Request ID is required.');
  var ss=agentBusinessSpreadsheet_(),rows=sheetRows_(ss.getSheetByName('PaymentRequests')),row=rows.find(function(x){return String(x.RequestID)===requestId&&String(x.AgentID)===s.AgentID;});
  if(!row)throw new Error('Payment request not found.');
  if(!['PENDING','SUBMITTED'].includes(String(row.Status||'').toUpperCase()))throw new Error('Only a pending payment request can be cancelled.');
  row.Status='CANCELLED';row.UpdatedAt=new Date().toISOString();saveRow_(ss,'PaymentRequests',row);
  invalidateSheetCache_('PaymentRequests');cacheRemoveAgent_(s.AgentID);
  return {cancelled:true,requestId:requestId};
}
function agentPaymentRequests_(p){
  var boot=agentBootstrap_(p);return boot.requests;
  /*
  var s=agentSession_(p.token),ss=agentBusinessSpreadsheet_();
  var rows=sheetRows_(ss.getSheetByName('PaymentRequests')).filter(function(x){return String(x.AgentID)===s.AgentID;});
  var clients=sheetRows_(ss.getSheetByName('Clients')),clientMap={};
  clients.forEach(function(c){clientMap[String(c.ClientID)]=c;});
  var policies=sheetRows_(ss.getSheetByName('Policies')),policyMap={};
  policies.forEach(function(x){policyMap[String(x.PolicyID)]=x;});
  return {items:rows.reverse().map(function(r){var c=clientMap[String(r.ClientID)]||{},p=policyMap[String(r.PolicyID)]||{};return safeAgentRequest_(Object.assign({},r,{ClientName:c.ClientName||'',PolicyNumber:c.PolicyNumber||p.PolicyNumber||''}));}),total:rows.length};
  */
}
function agentClientHistory_(p){
  var s=agentSession_(p.token),clientId=String(p.clientId||'').trim();
  if(!clientId)throw new Error('Client is required.');
  var ss=agentBusinessSpreadsheet_();
  var clients=cachedSheetRows_(ss.getSheetByName('Clients'),'Clients');
  var client=clients.find(function(x){return String(x.ClientID)===clientId&&String(x.AgentID)===s.AgentID;});
  if(!client)throw new Error('Client not found.');
  var policies=cachedSheetRows_(ss.getSheetByName('Policies'),'Policies').filter(function(x){return String(x.ClientID)===clientId&&String(x.AgentID)===s.AgentID;});
  var policyIds={};policies.forEach(function(x){policyIds[String(x.PolicyID)]=true;});
  var requests=cachedSheetRows_(ss.getSheetByName('PaymentRequests'),'PaymentRequests').filter(function(x){return String(x.AgentID)===s.AgentID&&String(x.ClientID)===clientId;}).slice().reverse();
  var payments=cachedSheetRows_(ss.getSheetByName('Payments'),'Payments').filter(function(x){return String(x.AgentID)===s.AgentID&&String(x.ClientID)===clientId;}).slice().reverse();
  var bills=cachedSheetRows_(ss.getSheetByName('PremiumBills'),'PremiumBills').filter(function(x){return String(x.AgentID)===s.AgentID&&String(x.ClientID)===clientId;}).slice().reverse();
  var policy=policies[0]||{};
  var paymentMap={};payments.forEach(function(x){paymentMap[String(x.RequestID)]=x;});
  var billMap={};bills.forEach(function(x){billMap[String(x.BillID)]=x;});
  var requestItems=requests.map(function(r){
    var pay=paymentMap[String(r.RequestID)]||{},bill=billMap[String(r.BillID)]||{};
    return {RequestID:r.RequestID,PolicyID:r.PolicyID||'',PolicyNumber:r.PolicyNumber||client.PolicyNumber||policy.PolicyNumber||'',Status:r.Status||'PENDING',RequestedAt:r.RequestedAt||'',ApprovedAt:r.ApprovedAt||'',PremiumAmount:r.PremiumAmount||bill.PremiumAmount||pay.PremiumAmount||0,CustomerPayable:r.CustomerPayable||bill.CustomerPayable||pay.CustomerCollected||0,PaymentID:r.PaymentID||pay.PaymentID||'',PaymentStatus:pay.Status||'',PaymentDate:pay.PaymentDate||'',ReferenceNumber:pay.ReferenceNumber||'',Notes:r.Notes||''};
  });
  return {client:{ClientID:client.ClientID,ClientName:client.ClientName,PolicyNumber:client.PolicyNumber,DateOfBirth:client.DateOfBirth,Status:client.Status},policy:policy&&{PolicyID:policy.PolicyID||'',PolicyNumber:policy.PolicyNumber||client.PolicyNumber||'',PolicyStatus:policy.PolicyStatus||'ACTIVE'},requests:requestItems,payments:payments.map(function(x){return {PaymentID:x.PaymentID,RequestID:x.RequestID,PremiumAmount:x.PremiumAmount||0,CustomerCollected:x.CustomerCollected||0,PaymentMode:x.PaymentMode||'',PaymentDate:x.PaymentDate||'',ReferenceNumber:x.ReferenceNumber||'',Status:x.Status||''};}),totalRequests:requestItems.length,totalPayments:payments.length};
}
function agentLogout_(p){var t=String(p.token||'').trim();if(t)CacheService.getScriptCache().remove(agentSessionKey_(t));return {loggedOut:true};}
function safeAgent_(a){return {AgentID:a.AgentID,AgentName:a.AgentName,AgencyName:a.AgencyName,Mobile:a.Mobile,Email:a.Email,Status:a.Status,JoinedDate:a.JoinedDate};}
function safeAgentClient_(c){
  return {ClientID:c.ClientID,PolicyID:c.PolicyID||'',ClientName:c.ClientName,PolicyNumber:c.PolicyNumber,DateOfBirth:c.DateOfBirth,Status:c.Status,CreatedAt:c.CreatedAt,PolicyType:c.PolicyType||'Policy',PremiumAmount:c.PremiumAmount||0,RequestStatus:c.RequestStatus||''};
}
function safeAgentRequest_(r){
  return {RequestID:r.RequestID,PolicyID:r.PolicyID||'',ClientID:r.ClientID,ClientName:r.ClientName||'',PolicyNumber:r.PolicyNumber||'',PremiumAmount:r.PremiumAmount||0,CustomerPayable:r.CustomerPayable||0,DiscountAmount:r.DiscountAmount||0,Status:r.Status||'PENDING',RequestedAt:r.RequestedAt||'',Notes:r.Notes||''};
}
function updateAgentUserLastLogin_(ss,id){var sheet=ss.getSheetByName('AgentUsers'),rows=sheetRows_(sheet),idx=rows.findIndex(function(r){return String(r.AgentUserID)===id;});if(idx>=0){var headers=AGENT_BUSINESS.SHEETS.AgentUsers,values=rows[idx];var col=headers.indexOf('LastLoginAt');if(col>=0)sheet.getRange(idx+2,col+1).setValue(new Date().toISOString());}}
function adminCreateAgent_(p){
  var data=p.data||{};
  var name=String(data.AgentName||'').trim();
  var mobile=normalizeMobile_(data.Mobile);
  var password=String(data.Password||'');
  if(!name) throw new Error('Agent name is required.');
  if(!/^\d{10}$/.test(mobile)) throw new Error('Enter a valid 10-digit mobile number.');
  if(!/^\d{4}$/.test(password)) throw new Error('Password must be exactly 4 digits.');

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
    InsuranceCompany:'LIC',
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
  invalidateSheetCache_('Agents');invalidateSheetCache_('AgentUsers');
  return {agent:safeAgent_(agent.item),agentUserId:user.id,message:'Agent created and login credentials initialized.'};
}

function adminSetAgentPassword_(p){
  var agentId=String(p.agentId||'').trim();
  var password=String(p.password||'');
  if(!agentId) throw new Error('Agent ID is required.');
  if(!/^\d{4}$/.test(password)) throw new Error('Password must be exactly 4 digits.');

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
  invalidateSheetCache_('AgentUsers');
  return {agentUserId:row.AgentUserID,message:'Agent password updated.'};
}

function createAgentUser(agentId,mobile,password){
  if(!/^\d{4}$/.test(String(password||''))) throw new Error('Agent password must be exactly 4 digits.');
  var ss=agentBusinessSpreadsheet_(),agents=sheetRows_(ss.getSheetByName('Agents')),agent=agents.find(function(a){return String(a.AgentID)===String(agentId);});
  if(!agent) throw new Error('Agent not found.');
  var row={AgentUserID:newId_('AgentUserID'),AgentID:agent.AgentID,Email:agent.Email||'',Mobile:mobile,PasswordHash:hashAgentPassword_(password),Status:'ACTIVE'};
  var result=saveRow_(ss,'AgentUsers',row);invalidateSheetCache_('AgentUsers');return result;
}
function agentBusinessSpreadsheet_(){
  var id=PropertiesService.getScriptProperties().getProperty(AGENT_BUSINESS.SHEET_ID_PROPERTY);
  if(!id) throw new Error('Agent Business Sheet ID is not configured in Apps Script Properties.');
  return SpreadsheetApp.openById(id);
}
function ensureBusinessSheet_(ss,sheetName){
  if(!AGENT_BUSINESS.SHEETS[sheetName]) throw new Error('Invalid sheet.');
  var sheet=ss.getSheetByName(sheetName);
  if(!sheet){
    sheet=ss.insertSheet(sheetName);
    sheet.getRange(1,1,1,AGENT_BUSINESS.SHEETS[sheetName].length).setValues([AGENT_BUSINESS.SHEETS[sheetName]]);
    sheet.setFrozenRows(1);
    sheet.getRange(1,1,1,sheet.getLastColumn()).setFontWeight('bold').setHorizontalAlignment('center').setWrap(true);
  }else{
    var headers=sheet.getLastRow()>0?sheet.getRange(1,1,1,Math.max(sheet.getLastColumn(),1)).getValues()[0].map(String):[];
    AGENT_BUSINESS.SHEETS[sheetName].forEach(function(h){
      if(headers.indexOf(h)<0){
        sheet.getRange(1,sheet.getLastColumn()+1).setValue(h);
        headers.push(h);
      }
    });
  }
  return sheet;
}
function markPaymentPaid_(p){
  var requestId=String(p.requestId||'').trim();
  var amount=Number(p.amount||0);
  var paymentDate=String(p.paymentDate||'').trim();
  var paymentMode=String(p.paymentMode||'').trim();
  var cardId=String(p.cardId||'').trim();
  if(!requestId)throw new Error('Payment request is required.');
  if(!(amount>0))throw new Error('Enter the premium amount paid.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate))throw new Error('Enter a valid payment date.');
  if(!['Credit Card','Debit Card'].includes(paymentMode))throw new Error('Select Credit Card or Debit Card.');
  if(!cardId)throw new Error('Select the card used for payment.');

  var ss=agentBusinessSpreadsheet_();
  var requests=sheetRows_(ss.getSheetByName('PaymentRequests'));
  var request=requests.find(function(x){return String(x.RequestID)===requestId;});
  if(!request)throw new Error('Payment request not found.');
  var currentStatus=String(request.Status||'').toUpperCase();
  if(!['PENDING','SUBMITTED'].includes(currentStatus))throw new Error('This request is already '+(currentStatus||'processed')+'.');

  var clients=sheetRows_(ss.getSheetByName('Clients'));
  var client=clients.find(function(x){return String(x.ClientID)===String(request.ClientID);})||{};
  var agents=sheetRows_(ss.getSheetByName('Agents'));
  var agent=agents.find(function(x){return String(x.AgentID)===String(request.AgentID);})||{};
  var cards=sheetRows_(ss.getSheetByName('Cards'));
  var card=cards.find(function(x){return String(x.CardID)===cardId;});
  if(!card)throw new Error('Selected card was not found.');
  if(String(card.Status||'ACTIVE').toUpperCase()==='INACTIVE')throw new Error('Selected card is inactive.');

  var discount=Math.round(amount*AGENT_BUSINESS.DISCOUNT_RATE*100)/100;
  var receivable=Math.max(0,Math.round((amount-discount)*100)/100);
  var paymentId=newId_('PaymentID');
  var now=new Date().toISOString();

  var payment=saveRow_(ss,'Payments',{
    PaymentID:paymentId,
    RequestID:requestId,
    BillID:request.BillID||'',
    AgentID:request.AgentID||'',
    ClientID:request.ClientID||'',
    PremiumAmount:amount,
    CustomerCollected:amount,
    PaymentMode:paymentMode,
    CardID:cardId,
    PaymentDate:paymentDate,
    ReferenceNumber:'',
    ReceiptID:'',
    Status:'PAID',
    Notes:'Paid by Trusted Circle admin using '+paymentMode+' · '+String(card.CardName||card.Bank||'Card')
  });

  request.PremiumAmount=amount;
  request.CustomerPayable=receivable;
  request.DiscountAmount=discount;
  request.Status='PAID';
  request.ApprovedAt=now;
  request.PaymentID=paymentId;
  request.Notes='Payment verified by Admin. Paid using '+paymentMode+' · '+String(card.CardName||card.Bank||'Card');
  saveRow_(ss,'PaymentRequests',request);

  var receivableRow=saveRow_(ss,'AgentReceivables',{
    ReceivableID:newId_('ReceivableID'),
    AgentID:request.AgentID||'',
    PaymentID:paymentId,
    InvoiceID:'',
    ClientID:request.ClientID||'',
    ClientName:client.ClientName||'',
    PolicyNumber:client.PolicyNumber||'',
    DateOfBirth:client.DateOfBirth||'',
    GrossAmount:amount,
    DiscountAmount:discount,
    ReceivableAmount:receivable,
    Status:'RECEIVABLE',
    ReceivableDate:paymentDate,
    SettledDate:'',
    Notes:'Agent payable after 2% Trusted Circle discount'
  });

  var ledger=saveRow_(ss,'MoneyLedger',{
    LedgerID:newId_('LedgerID'),
    TransactionDate:paymentDate,
    ReferenceType:'AGENT_RECEIVABLE',
    ReferenceID:receivableRow.id,
    AgentID:request.AgentID||'',
    ClientID:request.ClientID||'',
    PaymentID:paymentId,
    Description:'Premium paid for '+(client.ClientName||'Client')+' · '+(client.PolicyNumber||'Policy')+' · Agent receivable',
    MoneyIn:'',
    MoneyOut:receivable,
    Balance:'',
    PaymentMode:paymentMode,
    BankAccount:String(card.CardName||card.Bank||'Card'),
    Category:'AGENT RECEIVABLE',
    Status:'RECEIVABLE'
  });

  ['PaymentRequests','Payments','AgentReceivables','MoneyLedger'].forEach(invalidateSheetCache_);
  cacheRemoveAgent_(request.AgentID);
  return {
    payment:safeAdminPayment_(payment.item,card),
    requestId:requestId,
    receivableId:receivableRow.id,
    discountAmount:discount,
    receivableAmount:receivable,
    agent:{AgentID:agent.AgentID||'',AgentName:agent.AgentName||'',AgencyName:agent.AgencyName||'',Mobile:agent.Mobile||'',Email:agent.Email||'',Address:agent.Address||''},
    client:{ClientID:client.ClientID||'',ClientName:client.ClientName||'',PolicyNumber:client.PolicyNumber||'',DateOfBirth:client.DateOfBirth||''}
  };
}
function safeAdminPayment_(payment,card){
  return {PaymentID:payment.PaymentID,RequestID:payment.RequestID,AgentID:payment.AgentID,ClientID:payment.ClientID,PremiumAmount:Number(payment.PremiumAmount||0),CustomerCollected:Number(payment.CustomerCollected||0),PaymentMode:payment.PaymentMode,CardID:payment.CardID,CardNickname:card&& (card.CardName||card.Bank||'Card'),PaymentDate:payment.PaymentDate,Status:payment.Status};
}
function createInvoice_(p){
  var agentId=String(p.agentId||'').trim();
  var itemIds=Array.isArray(p.receivableIds)?p.receivableIds.map(String):[];
  var invoiceDate=String(p.invoiceDate||'').trim();
  if(!agentId)throw new Error('Agent is required.');
  if(!itemIds.length)throw new Error('Select at least one receivable item.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate))throw new Error('Enter a valid invoice date.');

  var ss=agentBusinessSpreadsheet_();
  var agents=sheetRows_(ss.getSheetByName('Agents')),agent=agents.find(function(x){return String(x.AgentID)===agentId;});
  if(!agent)throw new Error('Agent not found.');
  var receivables=sheetRows_(ensureBusinessSheet_(ss,'AgentReceivables'));
  var selected=receivables.filter(function(x){return itemIds.indexOf(String(x.ReceivableID))>=0&&String(x.AgentID)===agentId&&String(x.Status||'').toUpperCase()==='RECEIVABLE'&& !String(x.InvoiceID||'').trim();});
  if(!selected.length)throw new Error('No un-invoiced receivables were selected.');
  var grossTotal=selected.reduce(function(sum,x){return sum+Number(x.GrossAmount||x.ReceivableAmount||0);},0);
  var invoiceDiscount=Math.round(grossTotal*AGENT_BUSINESS.DISCOUNT_RATE*100)/100;
  var net=Math.max(0,Math.round((grossTotal-invoiceDiscount)*100)/100);
  var invoiceId=newId_('InvoiceID');
  var invoiceNumber='TC-INV-'+Utilities.formatDate(new Date(invoiceDate+'T00:00:00'),Session.getScriptTimeZone(),'yyyyMMdd')+'-'+String(invoiceId).slice(-6);
  var invoice=saveRow_(ss,'Invoices',{
    InvoiceID:invoiceId,InvoiceNumber:invoiceNumber,AgentID:agentId,InvoiceDate:invoiceDate,
    TotalAmount:grossTotal,DiscountRate:AGENT_BUSINESS.DISCOUNT_RATE,DiscountAmount:invoiceDiscount,NetPayable:net,Status:'SENT',
    AgentEmail:String(agent.Email||'').trim(),PdfUrl:''
  });
  var items=[];
  selected.forEach(function(x){
    var item=saveRow_(ss,'InvoiceItems',{
      InvoiceItemID:newId_('InvoiceItemID'),InvoiceID:invoiceId,PaymentID:x.PaymentID||'',ClientID:x.ClientID||'',
      ClientName:x.ClientName||'',PolicyNumber:x.PolicyNumber||'',DateOfBirth:x.DateOfBirth||'',
      Amount:Number(x.GrossAmount||x.ReceivableAmount||0),DiscountAmount:Number(x.DiscountAmount||0),NetAmount:Number(x.ReceivableAmount||0)
    });
    items.push(item.item);
    x.InvoiceID=invoiceId;
    x.Status='INVOICED';
    saveRow_(ss,'AgentReceivables',x);
  });

  var pdfResult=buildInvoicePdfAndSend_(agent,invoice.item,items);
  invoice.item.PdfUrl=pdfResult.pdfUrl||'';
  invoice.item.Status=pdfResult.sent?'SENT':'GENERATED';
  saveRow_(ss,'Invoices',invoice.item);
  invalidateSheetCache_('Invoices');invalidateSheetCache_('InvoiceItems');invalidateSheetCache_('AgentReceivables');
  return {invoice:invoice.item,items:items,agent:{AgentName:agent.AgentName||'',Email:agent.Email||''},pdfBase64:pdfResult.pdfBase64,fileName:pdfResult.fileName,sent:pdfResult.sent,pdfUrl:pdfResult.pdfUrl||''};
}
function buildInvoicePdfAndSend_(agent,invoice,items){
  var doc=DocumentApp.create(invoice.InvoiceNumber+' · Trusted Circle');
  var body=doc.getBody();
  body.setMarginTop(28).setMarginBottom(28).setMarginLeft(30).setMarginRight(30);
  try{
    var logo=UrlFetchApp.fetch('https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg').getBlob();
    var logoParagraph=body.appendParagraph('');
    logoParagraph.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
    var image=logoParagraph.appendInlineImage(logo);
    image.setWidth(72);image.setHeight(72);
  }catch(e){}
  var brand=body.appendParagraph('TRUSTED CIRCLE');
  brand.setBold(true).setFontSize(20).setForegroundColor('#064f3b');
  body.appendParagraph('Insurance Payment & Agent Receivable Invoice').setBold(true).setFontSize(12);
  body.appendParagraph('Invoice No: '+invoice.InvoiceNumber+'    Invoice Date: '+formatInvoiceDate_(invoice.InvoiceDate)).setFontSize(9);
  body.appendParagraph('');
  body.appendParagraph('BILL TO').setBold(true).setFontSize(9);
  body.appendParagraph(String(agent.AgentName||'Agent')+'\n'+String(agent.AgencyName||'')+'\n'+String(agent.Address||'')+'\n'+String(agent.Mobile||'')+'\n'+String(agent.Email||'')).setFontSize(9);
  body.appendParagraph('');
  var table=body.appendTable([['S.No','Client Name','Policy No.','DOB','Amount']]);
  table.getRow(0).editAsText().setBold(true);
  items.forEach(function(x,i){
    var row=table.appendTableRow();
    row.appendTableCell(String(i+1));
    row.appendTableCell(String(x.ClientName||''));
    row.appendTableCell(String(x.PolicyNumber||''));
    row.appendTableCell(formatInvoiceDate_(x.DateOfBirth||''));
    row.appendTableCell(formatMoney_(x.Amount||0));
  });
  body.appendParagraph('');
  body.appendParagraph('Gross Premium Paid: '+formatMoney_(invoice.TotalAmount)).setBold(true);
  body.appendParagraph('Less: Trusted Circle Discount ('+(Number(invoice.DiscountRate||0)*100).toFixed(0)+'%): '+formatMoney_(invoice.DiscountAmount));
  body.appendParagraph('TOTAL PAYABLE: '+formatMoney_(invoice.NetPayable)).setBold(true).setFontSize(12).setForegroundColor('#064f3b');
  body.appendParagraph('');
  body.appendParagraph('Payment is payable by the above agent to Trusted Circle. This invoice consolidates premium payments funded by Trusted Circle on behalf of the listed clients.');
  doc.saveAndClose();
  Utilities.sleep(500);
  var pdf=doc.getAs(MimeType.PDF).setName(invoice.InvoiceNumber+'.pdf');
  var file=DriveApp.createFile(pdf);
  file.setName(invoice.InvoiceNumber+'.pdf');
  var sent=false;
  if(String(agent.Email||'').trim() && MailApp.getRemainingDailyQuota()>0){
    MailApp.sendEmail({
      to:String(agent.Email).trim(),
      subject:'Trusted Circle Invoice '+invoice.InvoiceNumber,
      body:'Dear '+String(agent.AgentName||'Agent')+',\n\nPlease find attached the Trusted Circle premium payment receivable invoice '+invoice.InvoiceNumber+'.\n\nTotal payable: '+formatMoney_(invoice.NetPayable)+'\n\nRegards,\nTrusted Circle',
      htmlBody:'<p>Dear '+escapeHtml_(agent.AgentName||'Agent')+',</p><p>Please find attached the Trusted Circle premium payment receivable invoice <b>'+escapeHtml_(invoice.InvoiceNumber)+'</b>.</p><p><b>Total payable: '+formatMoney_(invoice.NetPayable)+'</b></p><p>Regards,<br>Trusted Circle</p>',
      attachments:[pdf],
      name:'Trusted Circle'
    });
    sent=true;
  }
  try{DriveApp.getFileById(doc.getId()).setTrashed(true);}catch(e){}
  return {pdfBase64:Utilities.base64Encode(pdf.getBytes()),fileName:invoice.InvoiceNumber+'.pdf',sent:sent,pdfUrl:file.getUrl()};
}
function formatInvoiceDate_(value){
  var raw=String(value||'').trim();if(!raw)return '';
  var d=new Date(raw);
  if(Number.isNaN(d.getTime())){var m=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return m[3]+'-'+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(m[2])-1]+'-'+m[1];return raw;}
  return Utilities.formatDate(d,Session.getScriptTimeZone(),'dd-MMM-yyyy');
}
function formatMoney_(value){return '₹'+Number(value||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});}
function escapeHtml_(value){return String(value||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function listReceivables_(ss,p){
  var agentId=String(p.agentId||'').trim();
  var rows=sheetRows_(ensureBusinessSheet_(ss,'AgentReceivables')).filter(function(x){return !agentId||String(x.AgentID)===agentId;});
  return {items:rows,total:rows.length};
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
  invalidateSheetCache_(sheetName);
  return {id:id,item:row};
}
function deleteRow_(ss,sheetName,id,idField){
  if(!AGENT_BUSINESS.SHEETS[sheetName]) throw new Error('Invalid sheet.');
  var sheet=ss.getSheetByName(sheetName),field=idField||AGENT_BUSINESS.SHEETS[sheetName][0],rows=sheetRows_(sheet);
  var idx=rows.findIndex(function(r){return String(r[field])===id;});
  if(idx<0) throw new Error('Record not found.');
  sheet.deleteRow(idx+2);
  invalidateSheetCache_(sheetName);
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
function cacheGetJson_(key){try{var raw=CacheService.getScriptCache().get(String(key));return raw?JSON.parse(raw):null;}catch(e){return null;}}
function cachePutJson_(key,value,ttl){try{var raw=JSON.stringify(value);if(raw.length<=90000)CacheService.getScriptCache().put(String(key),raw,ttl||AGENT_BUSINESS.READ_CACHE_TTL_SECONDS);}catch(e){}}
function cachedSheetRows_(sheet,name){var key='AGENT_SHEET_'+name,hit=cacheGetJson_(key);if(hit)return hit;var rows=sheetRows_(sheet);cachePutJson_(key,rows,AGENT_BUSINESS.READ_CACHE_TTL_SECONDS);return rows;}
function invalidateSheetCache_(name){try{CacheService.getScriptCache().remove('AGENT_SHEET_'+name);}catch(e){}}
function cacheRemoveAgent_(agentId){try{CacheService.getScriptCache().remove('AGENT_BOOT_'+String(agentId));}catch(e){}}
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
