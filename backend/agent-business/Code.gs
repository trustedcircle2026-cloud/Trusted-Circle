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
  SETUP_VERSION: '1.6.0',
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
    Invoices:['InvoiceID','InvoiceNumber','AgentID','InvoiceDate','TotalAmount','DiscountRate','DiscountAmount','NetPayable','Status','AgentEmail','PdfUrl','PdfFileId','PaymentLink','PaymentStatus','PaymentLinkAssignedAt','AgentPaymentReportedAt','AgentPaymentReportedBy','PaymentDecisionAt','CreatedAt','UpdatedAt'],
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
  var p=e&&e.parameter?e.parameter:{};
  if(String(p.action||'')==='invoicePaymentDecision'){
    try{return invoicePaymentDecision_(p);}catch(err){return HtmlService.createHtmlOutput('<div style="font-family:Arial,sans-serif;max-width:620px;margin:60px auto;padding:28px;border:1px solid #f0d5d5;border-radius:18px;text-align:center"><h2 style="color:#a52b2b">Trusted Circle</h2><h3>'+escapeHtml_(String(err&&err.message||err))+'</h3></div>');}
  }
  return agentBusinessResponse_(agentBusinessRouteSafe_(p));
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
  if(action==='agentInvoices') return agentInvoices_(p);
  if(action==='agentInvoicePdf') return agentInvoicePdf_(p);
  if(action==='agentReportInvoicePaymentDone') return agentReportInvoicePaymentDone_(p);
  if(action==='invoicePaymentDecision') return invoicePaymentDecision_(p);
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
  if(action==='assignInvoicePaymentLink') return assignInvoicePaymentLink_(p);
  if(action==='receivables') return listReceivables_(ss,p);
  if(action==='markReceivableReceived') return markReceivableReceived_(ss,p);
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
  var requestMap={};requests.forEach(function(x){
    if(String(x.AgentID)!==s.AgentID)return;
    var key=String(x.ClientID);
    var current=requestMap[key];
    var currentTime=new Date(current&&current.RequestedAt||current&&current.CreatedAt||0).getTime();
    var nextTime=new Date(x.RequestedAt||x.CreatedAt||0).getTime();
    // Client card reflects the latest request only. Historical requests/payments remain stored separately.
    if(!current||nextTime>=currentTime)requestMap[key]=x;
  });
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
  // One active request per policy at a time. Cancelled and paid requests are historical
  // records and do not block the next premium cycle.
  var activeRequest=requests.some(function(x){
    return String(x.AgentID)===s.AgentID &&
      String(x.PolicyID||'')===policyId &&
      ['PENDING','SUBMITTED','IN PROCESS','PROCESSING'].includes(String(x.Status||'').toUpperCase());
  });
  if(activeRequest)throw new Error('A payment request is already in process for this policy. Wait until it is completed or cancelled.');
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
function agentInvoices_(p){
  var s=agentSession_(p.token),ss=agentBusinessSpreadsheet_();
  var invoices=cachedSheetRows_(ensureBusinessSheet_(ss,'Invoices'),'Invoices')
    .filter(function(x){return String(x.AgentID)===String(s.AgentID);})
    .sort(function(a,b){return new Date(b.InvoiceDate||b.CreatedAt||0).getTime()-new Date(a.InvoiceDate||a.CreatedAt||0).getTime();});
  var outstanding=invoices.filter(function(x){return !['PAID','SETTLED','CANCELLED'].includes(String(x.PaymentStatus||'UNPAID').toUpperCase());})
    .reduce(function(sum,x){return sum+Number(x.NetPayable||0);},0);
  return {
    items:invoices.map(function(x){
      return {
        InvoiceID:x.InvoiceID||'',
        InvoiceNumber:x.InvoiceNumber||'',
        InvoiceDate:x.InvoiceDate||'',
        TotalAmount:Number(x.TotalAmount||0),
        DiscountAmount:Number(x.DiscountAmount||0),
        NetPayable:Number(x.NetPayable||0),
        Status:x.Status||'GENERATED',
        PdfUrl:x.PdfUrl||'',
        PaymentLink:x.PaymentLink||'',
        PaymentStatus:x.PaymentStatus||'UNPAID',
        PaymentLinkAssignedAt:x.PaymentLinkAssignedAt||''
      };
    }),
    total:invoices.length,
    outstandingAmount:Math.round(outstanding*100)/100
  };
}
function agentReportInvoicePaymentDone_(p){
  var s=agentSession_(p.token),invoiceId=String(p.invoiceId||'').trim();
  if(!invoiceId)throw new Error('Invoice is required.');
  var ss=agentBusinessSpreadsheet_(),invoice=sheetRows_(ensureBusinessSheet_(ss,'Invoices')).find(function(x){return String(x.InvoiceID)===invoiceId&&String(x.AgentID)===String(s.AgentID);});
  if(!invoice)throw new Error('Invoice not found.');
  var current=String(invoice.PaymentStatus||'UNPAID').toUpperCase();
  if(['PAID','SETTLED'].includes(current))throw new Error('This invoice is already marked as received.');
  if(!String(invoice.PaymentLink||'').trim())throw new Error('Payment link is not assigned to this invoice yet.');
  invoice.PaymentStatus='AGENT_REPORTED';
  invoice.Status='PAYMENT_REPORTED';
  invoice.AgentPaymentReportedAt=new Date().toISOString();
  invoice.AgentPaymentReportedBy=String(s.AgentID);
  saveRow_(ss,'Invoices',invoice);
  var agents=sheetRows_(ss.getSheetByName('Agents')),agent=agents.find(function(x){return String(x.AgentID)===String(s.AgentID);})||{};
  saveRow_(ss,'Notifications',{
    NotificationID:newId_('NotificationID'),RecipientType:'ADMIN',RecipientID:'ADMIN',Type:'AGENT_PAYMENT_REPORTED',
    Title:'Agent marked invoice payment as done',
    Message:String(agent.AgentName||'Agent')+' · '+String(invoice.InvoiceNumber||invoiceId)+' · '+formatMoney_(invoice.NetPayable)+' reported as paid.',
    Status:'UNREAD',CreatedAt:new Date().toISOString()
  });
  var email=String(PropertiesService.getScriptProperties().getProperty('AGENT_BUSINESS_ADMIN_EMAIL')||'trustedcircle2026@gmail.com').trim();
  var base=ScriptApp.getService().getUrl()||'';
  var buttons=['RECEIVED','PENDING','FAILED'].map(function(dec){
    var token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
    CacheService.getScriptCache().put('INV_REVIEW_'+token,JSON.stringify({invoiceId:invoiceId,decision:dec,agentId:s.AgentID}),21600);
    return {decision:dec,url:base+'?action=invoicePaymentDecision&reviewToken='+encodeURIComponent(token)};
  });
  if(email&&base&&MailApp.getRemainingDailyQuota()>0){
    var html='<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto"><h2>Trusted Circle · Agent Payment Report</h2><p><b>'+escapeHtml_(agent.AgentName||'Agent')+'</b> marked invoice <b>'+escapeHtml_(invoice.InvoiceNumber||invoiceId)+'</b> as payment done.</p><p>Amount: <b>'+formatMoney_(invoice.NetPayable)+'</b></p><p>Please verify the payment and select an action:</p><p>'+
      '<a href="'+buttons[0].url+'" style="display:inline-block;padding:12px 18px;background:#16834f;color:#fff;text-decoration:none;border-radius:8px;margin-right:8px">✓ Received</a>'+
      '<a href="'+buttons[1].url+'" style="display:inline-block;padding:12px 18px;background:#d39a18;color:#fff;text-decoration:none;border-radius:8px;margin-right:8px">⏳ Pending</a>'+
      '<a href="'+buttons[2].url+'" style="display:inline-block;padding:12px 18px;background:#c83f3f;color:#fff;text-decoration:none;border-radius:8px">! Failed — Try Again</a></p><p style="color:#777;font-size:12px">These secure review links expire in 6 hours.</p></div>';
    MailApp.sendEmail({to:email,subject:'Payment Done Report · '+String(invoice.InvoiceNumber||invoiceId),body:'Agent marked '+String(invoice.InvoiceNumber||invoiceId)+' as payment done. Review the payment.',htmlBody:html,name:'Trusted Circle'});
  }
  invalidateSheetCache_('Invoices');invalidateSheetCache_('Notifications');
  cacheRemoveAgent_(s.AgentID);
  return {reported:true,invoice:{InvoiceID:invoice.InvoiceID,InvoiceNumber:invoice.InvoiceNumber,PaymentStatus:invoice.PaymentStatus,Status:invoice.Status}};
}
function invoicePaymentDecision_(p){
  var token=String(p.reviewToken||'').trim();
  if(!token)throw new Error('Review link is invalid.');
  var raw=CacheService.getScriptCache().get('INV_REVIEW_'+token);
  if(!raw)throw new Error('This review link has expired or has already been used.');
  var review=JSON.parse(raw),decision=String(p.decision||review.decision||'').toUpperCase();
  if(review.decision!==decision)throw new Error('Invalid review action.');
  CacheService.getScriptCache().remove('INV_REVIEW_'+token);
  var ss=agentBusinessSpreadsheet_(),invoice=sheetRows_(ensureBusinessSheet_(ss,'Invoices')).find(function(x){return String(x.InvoiceID)===String(review.invoiceId);});
  if(!invoice)throw new Error('Invoice not found.');
  var now=new Date().toISOString();
  if(decision==='RECEIVED'){
    invoice.PaymentStatus='PAID';invoice.Status='PAID';invoice.PaymentDecisionAt=now;
    var receivables=sheetRows_(ensureBusinessSheet_(ss,'AgentReceivables')).filter(function(x){return String(x.InvoiceID)===String(invoice.InvoiceID)&&String(x.Status||'').toUpperCase()!=='RECEIVED';});
    receivables.forEach(function(r){
      r.Status='RECEIVED';r.SettledDate=now;saveRow_(ss,'AgentReceivables',r);
      saveRow_(ss,'MoneyLedger',{LedgerID:newId_('LedgerID'),TransactionDate:now.slice(0,10),ReferenceType:'AGENT_RECEIVABLE_SETTLEMENT',ReferenceID:r.ReceivableID,AgentID:r.AgentID||'',ClientID:r.ClientID||'',PaymentID:r.PaymentID||'',Description:'Agent receivable received · '+(r.ClientName||'Client'),MoneyIn:Number(r.ReceivableAmount||0),MoneyOut:'',Balance:'',PaymentMode:'Agent Invoice',BankAccount:'Trusted Circle',Category:'AGENT RECEIVABLE SETTLEMENT',Status:'RECEIVED'});
    });
  }else if(decision==='PENDING'){
    invoice.PaymentStatus='AGENT_REPORTED';invoice.Status='PAYMENT_PENDING';invoice.PaymentDecisionAt=now;
  }else if(decision==='FAILED'){
    invoice.PaymentStatus='UNPAID';invoice.Status='PAYMENT_FAILED';invoice.PaymentDecisionAt=now;invoice.AgentPaymentReportedAt='';
  }else throw new Error('Unsupported payment decision.');
  saveRow_(ss,'Invoices',invoice);
  invalidateSheetCache_('Invoices');invalidateSheetCache_('AgentReceivables');invalidateSheetCache_('MoneyLedger');
  var label=decision==='RECEIVED'?'Payment received and receivable settled.':decision==='PENDING'?'Payment kept pending for verification.':'Payment failed. Agent can try again using the payment link.';
  return HtmlService.createHtmlOutput('<div style="font-family:Arial,sans-serif;max-width:620px;margin:60px auto;padding:28px;border:1px solid #dfe8e3;border-radius:18px;text-align:center"><h2 style="color:#064f3b">Trusted Circle</h2><h3>'+escapeHtml_(label)+'</h3><p>Invoice <b>'+escapeHtml_(invoice.InvoiceNumber||'')+'</b></p><p>You can close this window.</p></div>');
}
function agentInvoicePdf_(p){
  var s=agentSession_(p.token),invoiceId=String(p.invoiceId||'').trim();
  if(!invoiceId)throw new Error('Invoice is required.');
  var ss=agentBusinessSpreadsheet_();
  var invoice=sheetRows_(ensureBusinessSheet_(ss,'Invoices')).find(function(x){return String(x.InvoiceID)===invoiceId&&String(x.AgentID)===String(s.AgentID);});
  if(!invoice)throw new Error('Invoice not found.');
  var fileId=String(invoice.PdfFileId||'').trim();
  if(!fileId){
    var url=String(invoice.PdfUrl||'');
    var m=url.match(/\/d\/([a-zA-Z0-9_-]+)/)||url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    fileId=m?m[1]:'';
  }
  if(!fileId)throw new Error('Invoice PDF is not available yet.');
  var file=DriveApp.getFileById(fileId),blob=file.getBlob();
  return {fileName:invoice.InvoiceNumber+'.pdf',pdfBase64:Utilities.base64Encode(blob.getBytes())};
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
  ensureBusinessSheet_(ss,'Invoices');
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
    TotalAmount:grossTotal,DiscountRate:AGENT_BUSINESS.DISCOUNT_RATE,DiscountAmount:invoiceDiscount,NetPayable:net,Status:'GENERATING',
    AgentEmail:String(agent.Email||'').trim(),PdfUrl:'',PdfFileId:'',PaymentLink:'',PaymentStatus:'UNPAID',PaymentLinkAssignedAt:'',AgentPaymentReportedAt:'',AgentPaymentReportedBy:'',PaymentDecisionAt:''
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
  invoice.item.PdfFileId=pdfResult.pdfFileId||'';
  invoice.item.Status=pdfResult.sent?'SENT':'GENERATED';
  saveRow_(ss,'Invoices',invoice.item);
  invalidateSheetCache_('Invoices');invalidateSheetCache_('InvoiceItems');invalidateSheetCache_('AgentReceivables');
  return {invoice:invoice.item,items:items,agent:{AgentName:agent.AgentName||'',Email:agent.Email||''},pdfBase64:pdfResult.pdfBase64,fileName:pdfResult.fileName,sent:pdfResult.sent,pdfUrl:pdfResult.pdfUrl||''};
}
function buildInvoicePdfAndSend_(agent,invoice,items){
  var doc=DocumentApp.create(invoice.InvoiceNumber+' · Trusted Circle');
  var body=doc.getBody();
  body.setMarginTop(24).setMarginBottom(24).setMarginLeft(28).setMarginRight(28);

  try{
    var logo=UrlFetchApp.fetch('https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg').getBlob();
    var logoParagraph=body.appendParagraph('');
    logoParagraph.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
    var image=logoParagraph.appendInlineImage(logo);
    image.setWidth(66);image.setHeight(66);
  }catch(e){}

  var brand=body.appendParagraph('TRUSTED CIRCLE');
  brand.setBold(true).setFontSize(19).setForegroundColor('#064f3b').setSpacingAfter(2);
  var subtitle=body.appendParagraph('INSURANCE PAYMENT & AGENT RECEIVABLE INVOICE');
  subtitle.setBold(true).setFontSize(10).setForegroundColor('#111915').setSpacingAfter(6);

  var headerTable=body.appendTable([
    ['Invoice No.',''+invoice.InvoiceNumber,'Invoice Date',formatInvoiceDate_(invoice.InvoiceDate)]
  ]);
  headerTable.setBorderWidth(1);
  for(var hc=0;hc<4;hc++){headerTable.getCell(0,hc).setBackgroundColor(hc%2===0?'#eef5f1':'#ffffff');headerTable.getCell(0,hc).editAsText().setFontSize(8);if(hc%2===0)headerTable.getCell(0,hc).editAsText().setBold(true);}
  body.appendParagraph('').setSpacingAfter(1);

  var billTitle=body.appendParagraph('BILL TO');
  billTitle.setBold(true).setFontSize(8).setForegroundColor('#064f3b').setSpacingAfter(2);
  var billTable=body.appendTable([
    ['Agent Name',String(agent.AgentName||'Agent'),'Agency Name',String(agent.AgencyName||'')],
    ['Address',String(agent.Address||''),'Mobile',String(agent.Mobile||'')],
    ['Email',String(agent.Email||''),'','']
  ]);
  billTable.setBorderWidth(1);
  for(var br=0;br<billTable.getNumRows();br++){
    for(var bc=0;bc<4;bc++){
      var cell=billTable.getCell(br,bc);
      cell.editAsText().setFontSize(8);
      if(bc===0||bc===2){cell.setBackgroundColor('#f3f7f5');cell.editAsText().setBold(true);}
    }
  }
  body.appendParagraph('').setSpacingAfter(1);

  var itemTitle=body.appendParagraph('PREMIUM PAYMENT DETAILS');
  itemTitle.setBold(true).setFontSize(8).setForegroundColor('#064f3b').setSpacingAfter(2);
  var table=body.appendTable([['S.No','Client Name','Policy No.','DOB','Amount']]);
  table.setBorderWidth(1);
  for(var hc2=0;hc2<5;hc2++){table.getCell(0,hc2).setBackgroundColor('#dfeae5');table.getCell(0,hc2).editAsText().setBold(true).setFontSize(8);}
  items.forEach(function(x,i){
    var row=table.appendTableRow();
    var cells=[String(i+1),String(x.ClientName||''),String(x.PolicyNumber||''),formatInvoiceDate_(x.DateOfBirth||''),formatMoney_(x.Amount||0)];
    cells.forEach(function(value,col){var cell=row.appendTableCell(value);cell.editAsText().setFontSize(8);if(col===4)cell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);});
  });
  body.appendParagraph('').setSpacingAfter(1);

  var totals=body.appendTable([
    ['Gross Premium Paid',formatMoney_(invoice.TotalAmount)],
    ['Less: Trusted Circle Discount ('+(Number(invoice.DiscountRate||0)*100).toFixed(0)+'%)','- '+formatMoney_(invoice.DiscountAmount)],
    ['BALANCE PAYABLE',formatMoney_(invoice.NetPayable)]
  ]);
  totals.setBorderWidth(1);
  for(var tr=0;tr<3;tr++){
    totals.getCell(tr,0).editAsText().setBold(true).setFontSize(8);
    totals.getCell(tr,1).editAsText().setFontSize(8);
    totals.getCell(tr,1).getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    if(tr===2){totals.getCell(tr,0).setBackgroundColor('#e6f4ed');totals.getCell(tr,1).setBackgroundColor('#e6f4ed');totals.getCell(tr,0).editAsText().setFontSize(10);totals.getCell(tr,1).editAsText().setBold(true).setFontSize(10).setForegroundColor('#064f3b');}
  }

  body.appendParagraph('').setSpacingAfter(1);
  var terms=body.appendTable([
    ['PAYMENT NOTE','Payment is payable by the above agent to Trusted Circle. This invoice consolidates premium payments funded by Trusted Circle on behalf of the listed clients.'],
    ['DISCOUNT','The balance payable is after the applicable Trusted Circle 2% discount on the consolidated gross premium paid.']
  ]);
  terms.setBorderWidth(1);
  for(var rr=0;rr<terms.getNumRows();rr++){
    terms.getCell(rr,0).setBackgroundColor('#f3f7f5');
    terms.getCell(rr,0).editAsText().setBold(true).setFontSize(7);
    terms.getCell(rr,1).editAsText().setFontSize(7);
  }

  body.appendParagraph('').setSpacingAfter(3);
  var systemNote=body.appendParagraph('SYSTEM GENERATED INVOICE — NO SIGNATURE REQUIRED.');
  systemNote.setBold(true).setFontSize(8).setForegroundColor('#064f3b').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  var footer=body.appendParagraph('Trusted Circle · Insurance Payment & Agent Receivable');
  footer.setFontSize(7).setForegroundColor('#7a8580').setAlignment(DocumentApp.HorizontalAlignment.CENTER);

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
  return {pdfBase64:Utilities.base64Encode(pdf.getBytes()),fileName:invoice.InvoiceNumber+'.pdf',sent:sent,pdfUrl:file.getUrl(),pdfFileId:file.getId()};
}
function formatInvoiceDate_(value){
  var raw=String(value||'').trim();if(!raw)return '';
  var d=new Date(raw);
  if(Number.isNaN(d.getTime())){var m=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return m[3]+'-'+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(m[2])-1]+'-'+m[1];return raw;}
  return Utilities.formatDate(d,Session.getScriptTimeZone(),'dd-MMM-yyyy');
}
function formatMoney_(value){return '₹'+Number(value||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});}
function escapeHtml_(value){return String(value||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function assignInvoicePaymentLink_(p){
  var invoiceId=String(p.invoiceId||'').trim();
  var paymentLink=String(p.paymentLink||'').trim();
  if(!invoiceId)throw new Error('Invoice is required.');
  if(paymentLink && !/^https?:\/\//i.test(paymentLink))throw new Error('Enter a valid payment link starting with http:// or https://.');
  var ss=agentBusinessSpreadsheet_();
  var sheet=ensureBusinessSheet_(ss,'Invoices'),rows=sheetRows_(sheet);
  var invoice=rows.find(function(x){return String(x.InvoiceID)===invoiceId;});
  if(!invoice)throw new Error('Invoice not found.');
  invoice.PaymentLink=paymentLink;
  invoice.PaymentStatus=paymentLink?'PAYABLE':'UNPAID';
  invoice.PaymentLinkAssignedAt=paymentLink?new Date().toISOString():'';
  invoice.Status=paymentLink?'PAYABLE':'GENERATED';
  saveRow_(ss,'Invoices',invoice);
  invalidateSheetCache_('Invoices');
  return {invoice:{
    InvoiceID:invoice.InvoiceID,
    InvoiceNumber:invoice.InvoiceNumber,
    PaymentLink:invoice.PaymentLink,
    PaymentStatus:invoice.PaymentStatus,
    Status:invoice.Status,
    NetPayable:Number(invoice.NetPayable||0)
  }};
}
function markReceivableReceived_(ss,p){
  var id=String(p.receivableId||'').trim();
  if(!id)throw new Error('Receivable is required.');
  var rows=sheetRows_(ensureBusinessSheet_(ss,'AgentReceivables')),row=rows.find(function(x){return String(x.ReceivableID)===id;});
  if(!row)throw new Error('Receivable not found.');
  if(String(row.Status||'').toUpperCase()==='RECEIVED')return {receivable:row};
  var now=new Date().toISOString();
  row.Status='RECEIVED';row.SettledDate=now;saveRow_(ss,'AgentReceivables',row);
  saveRow_(ss,'MoneyLedger',{LedgerID:newId_('LedgerID'),TransactionDate:now.slice(0,10),ReferenceType:'AGENT_RECEIVABLE_SETTLEMENT',ReferenceID:id,AgentID:row.AgentID||'',ClientID:row.ClientID||'',PaymentID:row.PaymentID||'',Description:'Agent receivable received · '+(row.ClientName||'Client'),MoneyIn:Number(row.ReceivableAmount||0),MoneyOut:'',Balance:'',PaymentMode:'Agent Settlement',BankAccount:'Trusted Circle',Category:'AGENT RECEIVABLE SETTLEMENT',Status:'RECEIVED'});
  invalidateSheetCache_('AgentReceivables');invalidateSheetCache_('MoneyLedger');
  return {receivable:row};
}
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
