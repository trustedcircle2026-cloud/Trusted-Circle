/*
 * Trusted Circle — Agent Business Backend
 * Dedicated Google Apps Script backend.
 *
 * ONE-TIME SETUP:
 *   freshSetupAgentBusinessSheets('1goWIbN1aQtxCs9PoNPLPl0xfFdCwI5vJxh4TOtahbl0')
 *
 * After setup, deploy this Apps Script as a Web App.
 */

// Insurance agent receivables, invoice payment reporting and settlement workflow.
var INSURANCE_PREMIUM_RECEIPT_FOLDER_ID='1G-JE7bQhmPBjFvvqGXBfHFdestw_DAhX';
var TRUSTED_CIRCLE_INVOICE_FOLDER_ID='1XroGo-yhqvt-Vnp0ZPUAz1iw4cEuV2os';
// Common fallback link: no fixed amount. It remains active until Admin assigns an invoice-specific UPI link.
var COMMON_AGENT_PAYMENT_LINK='upi://pay?pa=llingesh836-7@okhdfcbank&pn=Lingeshwaran%20R&aid=uGICAgIC1rKa0NQ';

var AGENT_BUSINESS = {
  NAME: 'Trusted Circle Agent Business',
  SHEET_ID_PROPERTY: 'AGENT_BUSINESS_SHEET_ID',
  ADMIN_PASSWORD_PROPERTY: 'AGENT_BUSINESS_ADMIN_PASSWORD',
  DISCOUNT_RATE: 0.02,
  SETUP_VERSION: '1.8.0',
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
    Receipts:['ReceiptID','PaymentID','ReceiptNumber','ReceiptUrl','ReceiptFileId','FileName','MimeType','ReceiptDate','Notes','CreatedAt','UpdatedAt'],
    Cards:['CardID','Bank','CardName','CardType','Last4','Network','CreditLimit','AvailableLimit','BillingDate','DueDate','AnnualFee','Status','Notes','CreatedAt','UpdatedAt'],
    CardRules:['RuleID','CardID','Category','Eligible','CashbackRate','CashbackType','MonthlyCap','MonthlyUsed','MonthlyRemaining','RewardConversion','EffectiveFrom','EffectiveTo','Notes','CreatedAt','UpdatedAt'],
    CardTransactions:['TransactionID','PaymentID','CardID','Amount','Category','TransactionDate','ReferenceNumber','Status','Notes','CreatedAt'],
    Cashback:['CashbackID','PaymentID','CardID','TransactionAmount','ExpectedRate','ExpectedCashback','ActualCashback','CashbackStatus','ExpectedDate','ReceivedDate','Variance','Notes','CreatedAt','UpdatedAt'],
    AgentSettlements:['SettlementID','AgentID','PeriodFrom','PeriodTo','GrossAmount','DiscountAmount','NetAmount','PaidAmount','BalanceAmount','Status','SettlementDate','ReferenceNumber','Notes','CreatedAt','UpdatedAt'],
    MoneyLedger:['LedgerID','TransactionDate','ReferenceType','ReferenceID','AgentID','ClientID','PaymentID','Description','MoneyIn','MoneyOut','Balance','PaymentMode','BankAccount','Category','Status','CreatedAt'],
    Expenses:['ExpenseID','ExpenseDate','Category','Description','Amount','PaymentMode','ReferenceNumber','Notes','CreatedAt'],
    Notifications:['NotificationID','RecipientType','RecipientID','Type','Title','Message','Status','CreatedAt','ReadAt'],
    AuditLogs:['AuditID','Action','Entity','EntityID','Actor','Metadata','CreatedAt'],
    Invoices:['InvoiceID','InvoiceNumber','AgentID','InvoiceDate','TotalAmount','DiscountRate','DiscountAmount','NetPayable','Status','AgentEmail','PdfUrl','PdfFileId','PaymentLink','PaymentStatus','PaymentLinkAssignedAt','AgentPaymentReportedAt','AgentPaymentReportedBy','PaymentDecisionAt','CreatedAt','UpdatedAt','PaidAmount','OutstandingAmount'],
    AgentInvoicePayments:['PaymentReportID','AgentID','Amount','Status','ReceiptFileId','ReceiptUrl','ReceiptFileName','ReceiptMimeType','ReportedAt','AdminDecisionAt','AdminDecisionBy','AllocationsJson','Notes','CreatedAt','UpdatedAt'],
    InvoiceItems:['InvoiceItemID','InvoiceID','PaymentID','ClientID','ClientName','PolicyNumber','DateOfBirth','Amount','DiscountAmount','NetAmount','CreatedAt','PaidAmount','OutstandingAmount','PaymentStatus','UpdatedAt'],
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
  if(String(p.action||'')==='agentInvoicePaymentDecision'){
    try{return agentInvoicePaymentDecision_(p);}catch(err){return HtmlService.createHtmlOutput('<div style="font-family:Arial,sans-serif;max-width:620px;margin:60px auto;padding:28px;border:1px solid #f0d5d5;border-radius:18px;text-align:center"><h2 style="color:#064f3b">Trusted Circle</h2><h3>'+escapeHtml_(String(err&&err.message||err))+'</h3></div>');}
  }
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
  if(action==='agentPremiumReceipts') return agentPremiumReceipts_(p);
  if(action==='agentReceiptFile') return agentReceiptFile_(p);
  if(action==='agentOutstandingSummary') return agentOutstandingSummary_(p);
  if(action==='agentReportInvoicePaymentDone') return agentReportInvoicePaymentDone_(p);
  if(action==='agentReportPartialPayment') return agentReportPartialPayment_(p);
  if(action==='agentInvoicePaymentReports') return agentInvoicePaymentReports_(p);
  if(action==='adminDecideAgentInvoicePayment') return adminDecideAgentInvoicePayment_(p);
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
  if(action==='resendAgentInvoice') return resendAgentInvoice_(p);
  if(action==='regenerateAgentInvoice') return regenerateAgentInvoice_(p);
  if(action==='receivables') return listReceivables_(ss,p);
  if(action==='markReceivableReceived') return markReceivableReceived_(ss,p);
  if(action==='assignInvoicePaymentLink') return assignInvoicePaymentLink_(p);
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
  var payments=cachedSheetRows_(ss.getSheetByName('Payments'),'Payments');
  var receipts=cachedSheetRows_(ensureBusinessSheet_(ss,'Receipts'),'Receipts');
  var paymentMap={};payments.forEach(function(x){if(String(x.AgentID)===s.AgentID)paymentMap[String(x.PaymentID)]=x;});
  var receiptMap={};receipts.forEach(function(x){receiptMap[String(x.PaymentID)]=x;});
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
  var reqItems=requests.filter(function(x){return String(x.AgentID)===s.AgentID;}).slice().reverse().map(function(req){var client=ownClients.find(function(x){return String(x.ClientID)===String(req.ClientID);})||{};var policy=policyMap[String(req.ClientID)]||{};var pay=paymentMap[String(req.PaymentID||'')]||{};var receipt=receiptMap[String(pay.PaymentID||req.PaymentID||'')]||{};return safeAgentRequest_(Object.assign({},req,{ClientName:client.ClientName||'',PolicyNumber:client.PolicyNumber||policy.PolicyNumber||'',PaymentDate:pay.PaymentDate||'',PaymentStatus:pay.Status||'',ReceiptUrl:receipt.ReceiptUrl||'',ReceiptFileId:receipt.ReceiptFileId||'',ReceiptFileName:receipt.FileName||''}));});
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
function normalizeDob_(value){
  var raw=String(value||'').trim();
  var m=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m)return m[3]+'/'+m[2]+'/'+m[1];
  m=raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(m)return m[1]+'/'+m[2]+'/'+m[3];
  return '';
}
function agentAddPolicy_(p){
  var s=agentSession_(p.token),data=p.data||{};
  var name=String(data.ClientName||'').trim(),policyNumber=String(data.PolicyNumber||'').trim(),dob=normalizeDob_(data.DateOfBirth);
  if(!name)throw new Error('Client name is required.');
  if(!policyNumber)throw new Error('Policy number is required.');
  if(!dob)throw new Error('Enter a valid date of birth.');
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
  var name=String(data.ClientName||'').trim(),policyNumber=String(data.PolicyNumber||'').trim(),dob=normalizeDob_(data.DateOfBirth);
  if(!name||!policyNumber||!dob)throw new Error('Client name, policy number and date of birth are required.');
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
function confirmedAgentPaymentAllocations_(ss,agentId){
  var rows=sheetRows_(ensureBusinessSheet_(ss,'AgentInvoicePayments')).filter(function(r){return String(r.AgentID)===String(agentId)&&String(r.Status||'').toUpperCase()==='RECEIVED';});
  var byItem={};rows.forEach(function(r){var allocations=[];try{allocations=JSON.parse(String(r.AllocationsJson||'[]'));}catch(e){}allocations.forEach(function(a){var key=String(a.InvoiceItemID||'');if(key)byItem[key]=(byItem[key]||0)+Number(a.Amount||0);});});
  return byItem;
}
function invoicePaymentSummary_(ss,agentId){
  var invoices=sheetRows_(ensureBusinessSheet_(ss,'Invoices')).filter(function(x){return String(x.AgentID)===String(agentId);});
  var items=sheetRows_(ensureBusinessSheet_(ss,'InvoiceItems')),byItem=confirmedAgentPaymentAllocations_(ss,agentId);
  var result=invoices.map(function(inv){var invItems=items.filter(function(it){return String(it.InvoiceID)===String(inv.InvoiceID);});var total=Number(inv.NetPayable||0),status=String(inv.PaymentStatus||'UNPAID').toUpperCase(),paid=0;
    if(['PAID','SETTLED','CANCELLED'].includes(status))paid=total;else if(invItems.length)paid=invItems.reduce(function(sum,it){return sum+Math.min(Number(it.NetAmount||0),Number(byItem[String(it.InvoiceItemID)]||0));},0);else paid=Math.min(total,Number(inv.PaidAmount||0));
    paid=Math.max(0,Math.min(total,Math.round(paid*100)/100));return {invoice:inv,paid:paid,outstanding:['CANCELLED'].includes(status)?0:Math.max(0,Math.round((total-paid)*100)/100)};});
  return {items:result,paidByItem:byItem};
}
function agentInvoices_(p){
  var s=agentSession_(p.token),ss=agentBusinessSpreadsheet_(),summary=invoicePaymentSummary_(ss,s.AgentID);
  var invoices=summary.items.map(function(x){return x.invoice;}).sort(function(a,b){return new Date(b.InvoiceDate||b.CreatedAt||0).getTime()-new Date(a.InvoiceDate||a.CreatedAt||0).getTime();});
  var byId={};summary.items.forEach(function(x){byId[String(x.invoice.InvoiceID)]={paid:x.paid,outstanding:x.outstanding};});
  var allInvoiceItems=sheetRows_(ensureBusinessSheet_(ss,'InvoiceItems'));
  var outstanding=invoices.reduce(function(sum,x){return sum+Number((byId[String(x.InvoiceID)]||{}).outstanding||0);},0);
  var receivedDiscount=cachedSheetRows_(ensureBusinessSheet_(ss,'AgentReceivables'),'AgentReceivables').filter(function(x){return String(x.AgentID)===String(s.AgentID)&&String(x.Status||'').toUpperCase()==='RECEIVED';}).reduce(function(sum,x){return sum+Number(x.DiscountAmount||0);},0);
  return {items:invoices.map(function(x){
    var sums=byId[String(x.InvoiceID)]||{paid:0,outstanding:Number(x.NetPayable||0)},status=String(x.PaymentStatus||'PAYABLE').toUpperCase();
    if(sums.outstanding<=0.009)status='PAID';else if(sums.paid>0)status='PARTIALLY_PAID';else if(['PAID','SETTLED'].includes(status))status='PAID';else status='PAYABLE';
    var premiumItems=allInvoiceItems.filter(function(it){return String(it.InvoiceID)===String(x.InvoiceID);}).map(function(it){var invoiceStatus=String(x.PaymentStatus||'').toUpperCase(),net=Number(it.NetAmount||0),paid=['PAID','SETTLED','CANCELLED'].includes(invoiceStatus)?net:Math.min(net,Number(summary.paidByItem[String(it.InvoiceItemID)]||0)),due=invoiceStatus==='CANCELLED'?0:Math.max(0,Math.round((net-paid)*100)/100);return {InvoiceItemID:it.InvoiceItemID||'',ClientID:it.ClientID||'',ClientName:it.ClientName||'',PolicyNumber:it.PolicyNumber||'',Amount:Number(it.Amount||0),DiscountAmount:Number(it.DiscountAmount||0),NetAmount:net,PaidAmount:Math.round(paid*100)/100,OutstandingAmount:due,PaymentStatus:invoiceStatus==='CANCELLED'?'CANCELLED':due<=0.009?'PAID':paid>0?'PARTIALLY_PAID':'PAYABLE'};});
    return {InvoiceID:x.InvoiceID||'',InvoiceNumber:x.InvoiceNumber||'',InvoiceDate:x.InvoiceDate||'',TotalAmount:Number(x.TotalAmount||0),DiscountAmount:Number(x.DiscountAmount||0),NetPayable:Number(x.NetPayable||0),PaidAmount:sums.paid,OutstandingAmount:sums.outstanding,PremiumItems:premiumItems,Status:x.Status||'GENERATED',PdfUrl:x.PdfUrl||'',PaymentLink:x.PaymentLink||COMMON_AGENT_PAYMENT_LINK,PaymentLinkAssigned:Boolean(String(x.PaymentLink||'').trim()),PaymentStatus:status,PaymentLinkAssignedAt:x.PaymentLinkAssignedAt||''};
  }),total:invoices.length,outstandingAmount:Math.round(outstanding*100)/100,earningsToDate:Math.round(receivedDiscount*100)/100};
}
function agentOutstandingSummary_(p){
  var s=agentSession_(p.token),ss=agentBusinessSpreadsheet_();
  var invoices=sheetRows_(ensureBusinessSheet_(ss,'Invoices')).filter(function(x){
    return String(x.AgentID)===String(s.AgentID)&&!['PAID','SETTLED','CANCELLED'].includes(String(x.PaymentStatus||'UNPAID').toUpperCase());
  }).sort(function(a,b){return new Date(a.InvoiceDate||0).getTime()-new Date(b.InvoiceDate||0).getTime();});
  if(!invoices.length)throw new Error('There is no outstanding payable balance.');
  var items=sheetRows_(ensureBusinessSheet_(ss,'InvoiceItems'));
  var payments=sheetRows_(ss.getSheetByName('Payments'));
  var allocationSummary=invoicePaymentSummary_(ss,s.AgentID),allocations=allocationSummary.paidByItem;
  var rows=[],gross=0,discount=0,net=0;
  invoices.forEach(function(inv){
    items.filter(function(it){return String(it.InvoiceID)===String(inv.InvoiceID);}).forEach(function(it){
      var pay=payments.find(function(x){return String(x.PaymentID)===String(it.PaymentID);})||{};
      var amt=Number(it.Amount||0),disc=Number(it.DiscountAmount||0),n=Number(it.NetAmount||amt-disc),applied=Math.min(n,Number(allocations[String(it.InvoiceItemID)]||0)),due=Math.max(0,Math.round((n-applied)*100)/100);
      if(due<=0.009)return;
      var ratio=n>0?due/n:0,remainingGross=Math.round(amt*ratio*100)/100,remainingDiscount=Math.round(disc*ratio*100)/100;
      gross+=remainingGross;discount+=remainingDiscount;net+=due;
      rows.push([String(inv.InvoiceNumber||''),formatInvoiceDate_(pay.PaymentDate||inv.InvoiceDate),String(it.ClientName||''),String(it.PolicyNumber||''),formatInvoiceDate_(it.DateOfBirth||''),formatMoney_(remainingGross),applied>0?'PARTIALLY PAID':'PAYABLE',formatMoney_(due)]);
    });
  });
  var reportDate=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'dd-MMM-yyyy');
  var doc=DocumentApp.create('Outstanding Summary · '+String(s.AgentID));
  var body=doc.getBody();body.setMarginTop(24).setMarginBottom(24).setMarginLeft(28).setMarginRight(28);
  try{var logo=UrlFetchApp.fetch('https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg').getBlob();var lp=body.appendParagraph('');lp.setAlignment(DocumentApp.HorizontalAlignment.LEFT);var im=lp.appendInlineImage(logo);im.setWidth(58);im.setHeight(58);}catch(e){}
  var title=body.appendParagraph('TRUSTED CIRCLE');title.setBold(true).setFontSize(18).setForegroundColor('#064f3b');
  var sub=body.appendParagraph('CURRENT OUTSTANDING PAYABLE SUMMARY');sub.setBold(true).setFontSize(11);
  var agentName=String((sheetRows_(ss.getSheetByName('Agents')).find(function(a){return String(a.AgentID)===String(s.AgentID);})||{}).AgentName||'Agent');
  body.appendParagraph('Agent: '+agentName).setFontSize(9);
  body.appendParagraph('Outstanding Payable as on '+reportDate).setBold(true).setFontSize(10).setSpacingAfter(8);
  var table=body.appendTable([['Invoice No.','Premium Paid Date','Name','Policy','DOB','Amt','Status','Remaining Payable']].concat(rows));
  table.setBorderWidth(1);
  for(var r=0;r<table.getNumRows();r++){for(var col=0;col<table.getRow(r).getNumCells();col++){var cell=table.getCell(r,col);cell.editAsText().setFontSize(7);if(r===0){cell.setBackgroundColor('#eef5f1');cell.editAsText().setBold(true);}}}
  body.appendParagraph('');
  var bankTitle=body.appendParagraph('TRUSTED CIRCLE BANK / PAYMENT DETAILS');
  bankTitle.setBold(true).setFontSize(8).setForegroundColor('#064f3b').setSpacingAfter(2);
  var bankTable=body.appendTable([
    ['A/c No.','8949622673','IFSC Code','KKBK0008698'],
    ['Home Branch','TRICHY - THILLAI NAGAR','UPI ID','6369175709@kotak811']
  ]);
  bankTable.setBorderWidth(1);
  for(var bk=0;bk<bankTable.getNumRows();bk++){
    for(var bc=0;bc<4;bc++){
      var bankCell=bankTable.getCell(bk,bc);
      bankCell.editAsText().setFontSize(8);
      if(bc===0||bc===2){bankCell.setBackgroundColor('#f3f7f5');bankCell.editAsText().setBold(true);}
    }
  }
  body.appendParagraph('').setSpacingAfter(1);
  var totals=body.appendTable([['TOTAL AMOUNT',formatMoney_(gross)],['LESS: DISCOUNT (2%)',formatMoney_(discount)],['OUTSTANDING PAYABLE',formatMoney_(net)]]);
  totals.setBorderWidth(1);for(var tr=0;tr<3;tr++){totals.getCell(tr,0).editAsText().setBold(true).setFontSize(9);totals.getCell(tr,1).editAsText().setBold(true).setFontSize(9);}
  body.appendParagraph('SYSTEM GENERATED SUMMARY — NO SIGNATURE REQUIRED.').setFontSize(7).setItalic(true).setSpacingBefore(10);
  doc.saveAndClose();
  var file=DriveApp.getFileById(doc.getId());
  var folder=DriveApp.getFolderById(TRUSTED_CIRCLE_INVOICE_FOLDER_ID);folder.addFile(file);try{DriveApp.getRootFolder().removeFile(file);}catch(e){}
  var blob=file.getBlob();return {fileName:'Outstanding-Summary-'+reportDate+'.pdf',pdfUrl:file.getUrl(),base64:Utilities.base64Encode(blob.getBytes())};
}
function agentPremiumReceipts_(p){
  var s=agentSession_(p.token),ss=agentBusinessSpreadsheet_();
  var payments=sheetRows_(ss.getSheetByName('Payments')).filter(function(x){
    return String(x.AgentID)===String(s.AgentID)&&String(x.Status||'').toUpperCase()==='PAID';
  });
  var requests=sheetRows_(ss.getSheetByName('PaymentRequests')),clients=sheetRows_(ss.getSheetByName('Clients'));
  var receipts=sheetRows_(ensureBusinessSheet_(ss,'Receipts')),receiptMap={};
  receipts.forEach(function(x){if(x.PaymentID)receiptMap[String(x.PaymentID)]=x;});
  var items=payments.sort(function(a,b){return new Date(b.PaymentDate||b.CreatedAt||0).getTime()-new Date(a.PaymentDate||a.CreatedAt||0).getTime();}).map(function(payment){
    var req=requests.find(function(x){return String(x.PaymentID)===String(payment.PaymentID);})||{};
    var client=clients.find(function(x){return String(x.ClientID)===String(payment.ClientID);})||{};
    var receipt=receiptMap[String(payment.PaymentID)]||{},file=null;
    if(receipt.ReceiptFileId){
      try{file=DriveApp.getFileById(String(receipt.ReceiptFileId));}catch(e){file=null;}
    }
    if(!file){
      try{
        var folder=DriveApp.getFolderById(INSURANCE_PREMIUM_RECEIPT_FOLDER_ID),files=folder.getFiles();
        while(files.hasNext()){
          var candidate=files.next();
          if(String(candidate.getName()).indexOf(String(payment.PaymentID))!==-1){file=candidate;break;}
        }
      }catch(e){}
    }
    return {
      PaymentID:String(payment.PaymentID||''),
      RequestID:String(payment.RequestID||req.RequestID||''),
      ClientName:String(client.ClientName||''),
      PolicyNumber:String(client.PolicyNumber||''),
      DateOfBirth:String(client.DateOfBirth||''),
      PremiumAmount:Number(payment.PremiumAmount||0),
      PaymentDate:String(payment.PaymentDate||''),
      PaymentMode:String(payment.PaymentMode||''),
      CardNickname:String(payment.Notes||''),
      ReceiptAvailable:Boolean(file),
      ReceiptUrl:file?file.getUrl():'',
      ReceiptFileId:file?file.getId():'',
      ReceiptFileName:file?file.getName():(receipt.FileName||'')
    };
  });
  return {items:items,total:items.length};
}
function agentReceiptFile_(p){
  var s=agentSession_(p.token),paymentId=String(p.paymentId||'').trim();
  if(!paymentId)throw new Error('Payment is required.');
  var ss=agentBusinessSpreadsheet_();
  var payments=sheetRows_(ss.getSheetByName('Payments')),payment=payments.find(function(x){return String(x.PaymentID)===paymentId&&String(x.AgentID)===String(s.AgentID);});
  if(!payment)throw new Error('Payment not found.');
  var receipts=sheetRows_(ensureBusinessSheet_(ss,'Receipts')),receipt=receipts.find(function(x){return String(x.PaymentID)===paymentId;});
  var file=null;
  if(receipt&&receipt.ReceiptFileId){
    try{file=DriveApp.getFileById(String(receipt.ReceiptFileId));}catch(e){file=null;}
  }
  // Recover receipts uploaded before the Receipts row was persisted.
  if(!file){
    var folder=DriveApp.getFolderById(INSURANCE_PREMIUM_RECEIPT_FOLDER_ID);
    var files=folder.getFiles();
    while(files.hasNext()){
      var candidate=files.next();
      if(String(candidate.getName()).indexOf(paymentId)!==-1){file=candidate;break;}
    }
    if(file&&!receipt){
      saveRow_(ss,'Receipts',{
        ReceiptID:newId_('ReceiptID'),PaymentID:paymentId,
        ReceiptNumber:'TC-REC-'+paymentId.slice(-8),ReceiptUrl:file.getUrl(),
        ReceiptFileId:file.getId(),FileName:file.getName(),MimeType:file.getMimeType(),
        ReceiptDate:payment.PaymentDate||'',Notes:'Recovered premium payment receipt'
      });
    }
  }
  if(!file)throw new Error('Payment receipt is not available.');
  var blob=file.getBlob();
  return {paymentId:paymentId,fileName:file.getName(),mimeType:blob.getContentType(),driveUrl:file.getUrl(),fileId:file.getId(),base64:Utilities.base64Encode(blob.getBytes())};
}
function agentReportInvoicePaymentDone_(p){
  var s=agentSession_(p.token),invoiceId=String(p.invoiceId||'').trim();
  if(!invoiceId)throw new Error('Invoice is required.');
  var ss=agentBusinessSpreadsheet_(),invoice=sheetRows_(ensureBusinessSheet_(ss,'Invoices')).find(function(x){return String(x.InvoiceID)===invoiceId&&String(x.AgentID)===String(s.AgentID);});
  if(!invoice)throw new Error('Invoice not found.');
  var current=String(invoice.PaymentStatus||'UNPAID').toUpperCase();
  if(['PAID','SETTLED'].includes(current))throw new Error('This invoice is already marked as received.');
  var effectivePaymentLink=String(invoice.PaymentLink||COMMON_AGENT_PAYMENT_LINK).trim();
  if(!effectivePaymentLink)throw new Error('Payment link is not available for this invoice.');
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
function assignInvoicePaymentLink_(p){
  var invoiceId=String(p.invoiceId||'').trim();
  var paymentLink=String(p.paymentLink||'').trim();
  requireAdmin_(p);
  if(!invoiceId)throw new Error('Invoice is required.');
  if(!/^upi:\/\/pay(?:\?|$)/i.test(paymentLink))throw new Error('Only a valid UPI payment URL (upi://pay...) can be assigned.');
  var ss=agentBusinessSpreadsheet_();
  var sheet=ensureBusinessSheet_(ss,'Invoices');
  var invoice=sheetRows_(sheet).find(function(x){return String(x.InvoiceID)===invoiceId;});
  if(!invoice)throw new Error('Invoice not found.');
  var status=String(invoice.PaymentStatus||'').toUpperCase();
  if(['PAID','SETTLED','CANCELLED'].includes(status))throw new Error('A payment link cannot be assigned to a closed invoice.');
  var invoiceStatus=String(invoice.Status||'').toUpperCase();
  if(!['SENT','PAYMENT_LINK_ASSIGNED'].includes(invoiceStatus))throw new Error('The invoice must be sent to the Agent before an invoice-specific payment link can be assigned.');
  invoice.PaymentLink=paymentLink;
  invoice.PaymentLinkAssignedAt=new Date().toISOString();
  invoice.PaymentStatus='PAYABLE';
  invoice.Status='PAYMENT_LINK_ASSIGNED';
  invoice.UpdatedAt=new Date().toISOString();
  saveRow_(ss,'Invoices',invoice);
  invalidateSheetCache_('Invoices');
  return {assigned:true,invoice:{
    InvoiceID:invoice.InvoiceID,InvoiceNumber:invoice.InvoiceNumber,PaymentLink:invoice.PaymentLink,
    PaymentLinkAssigned:true,
    PaymentLinkAssignedAt:invoice.PaymentLinkAssignedAt,PaymentStatus:invoice.PaymentStatus,Status:invoice.Status
  }};
}
function agentReportPartialPayment_(p){
  var s=agentSession_(p.token),amount=Math.round(Number(p.amount||0)*100)/100;
  if(!(amount>0))throw new Error('Enter a payment amount greater than zero.');
  var receipt=p.receipt||{},fileName=String(receipt.fileName||'').trim(),mime=String(receipt.mimeType||'').trim(),base64=String(receipt.base64||'').trim();
  if(!fileName||!mime||!base64)throw new Error('Upload your payment receipt before marking payment done.');
  if(!/^application\/pdf$|^image\/(jpeg|png|webp)$/.test(mime))throw new Error('Receipt must be a PDF, JPG, PNG or WEBP file.');
  if(base64.length>8*1024*1024)throw new Error('Receipt is too large. Upload a file below 6 MB.');
  var ss=agentBusinessSpreadsheet_(),summary=invoicePaymentSummary_(ss,s.AgentID);
  var outstanding=Math.round(summary.items.reduce(function(sum,x){return sum+x.outstanding;},0)*100)/100;
  if(outstanding<=0)throw new Error('There is no outstanding payable amount.');
  if(amount>outstanding+0.009)throw new Error('Payment cannot exceed the current outstanding payable of '+formatMoney_(outstanding)+'. Refresh and try again.');
  var reportId=newId_('AgentPaymentReportID'),now=new Date().toISOString();
  var blob=Utilities.newBlob(Utilities.base64Decode(base64),mime,'AGENT-PAYMENT-'+reportId+'-'+fileName);
  var file=DriveApp.getFolderById(INSURANCE_PREMIUM_RECEIPT_FOLDER_ID).createFile(blob);
  var agent=(sheetRows_(ss.getSheetByName('Agents')).find(function(a){return String(a.AgentID)===String(s.AgentID);})||{});
  var row=saveRow_(ss,'AgentInvoicePayments',{PaymentReportID:reportId,AgentID:s.AgentID,Amount:amount,Status:'PENDING',ReceiptFileId:file.getId(),ReceiptUrl:file.getUrl(),ReceiptFileName:file.getName(),ReceiptMimeType:mime,ReportedAt:now,AdminDecisionAt:'',AdminDecisionBy:'',AllocationsJson:'[]',Notes:'Agent reported partial payment; waiting for Admin receipt verification.',CreatedAt:now,UpdatedAt:now}).item;
  saveRow_(ss,'Notifications',{NotificationID:newId_('NotificationID'),RecipientType:'ADMIN',RecipientID:'ADMIN',Type:'AGENT_PARTIAL_PAYMENT_REPORTED',Title:'Agent partial payment reported',Message:String(agent.AgentName||'Agent')+' · '+formatMoney_(amount)+' · Report '+reportId,Status:'UNREAD',CreatedAt:now});
  var email=String(PropertiesService.getScriptProperties().getProperty('AGENT_BUSINESS_ADMIN_EMAIL')||'trustedcircle2026@gmail.com').trim(),base=ScriptApp.getService().getUrl()||'';
  var buttons=['RECEIVED','PENDING','FAILED'].map(function(dec){var token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');CacheService.getScriptCache().put('AGENT_PARTIAL_REVIEW_'+token,JSON.stringify({reportId:reportId,decision:dec,agentId:s.AgentID}),21600);return {decision:dec,url:base+'?action=agentInvoicePaymentDecision&reviewToken='+encodeURIComponent(token)};});
  if(email&&base&&MailApp.getRemainingDailyQuota()>0){
    var html='<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto"><h2 style="color:#064f3b">Trusted Circle · Partial Agent Payment</h2><p><b>'+escapeHtml_(agent.AgentName||'Agent')+'</b> reported a payment of <b>'+formatMoney_(amount)+'</b>.</p><p>Outstanding before this report: <b>'+formatMoney_(outstanding)+'</b></p><p><a href="'+escapeHtml_(file.getUrl())+'">View uploaded payment receipt</a></p><p>Verify the receipt and choose an action:</p><p><a href="'+buttons[0].url+'" style="display:inline-block;padding:12px 18px;background:#16834f;color:#fff;text-decoration:none;border-radius:8px;margin-right:8px">✓ Received — Apply FIFO</a><a href="'+buttons[1].url+'" style="display:inline-block;padding:12px 18px;background:#d39a18;color:#fff;text-decoration:none;border-radius:8px;margin-right:8px">⏳ Keep Pending</a><a href="'+buttons[2].url+'" style="display:inline-block;padding:12px 18px;background:#c83f3f;color:#fff;text-decoration:none;border-radius:8px">✕ Reject</a></p><p style="color:#777;font-size:12px">Review links expire in 6 hours. Confirmation applies this payment to the oldest unpaid premium first.</p></div>';
    MailApp.sendEmail({to:email,subject:'Agent Payment Receipt Review · '+formatMoney_(amount),body:'Agent '+String(agent.AgentName||'Agent')+' reported '+formatMoney_(amount)+'. Please review the receipt and confirm.',htmlBody:html,name:'Trusted Circle'});
  }
  invalidateSheetCache_('AgentInvoicePayments');invalidateSheetCache_('Notifications');cacheRemoveAgent_(s.AgentID);
  return {reported:true,payment:{PaymentReportID:row.PaymentReportID,Amount:amount,Status:'PENDING',ReportedAt:now},outstandingAmount:outstanding};
}
function applyAgentPaymentFifo_(ss,report,actor){
  var agentId=String(report.AgentID||''),amount=Math.round(Number(report.Amount||0)*100)/100,lock=LockService.getScriptLock();
  lock.waitLock(20000);
  try{
    var currentReport=sheetRows_(ensureBusinessSheet_(ss,'AgentInvoicePayments')).find(function(x){return String(x.PaymentReportID)===String(report.PaymentReportID);});
    if(!currentReport||String(currentReport.Status||'').toUpperCase()!=='PENDING')throw new Error('This payment report has already been reviewed.');
    report=currentReport;report.AdminDecisionBy=actor||report.AdminDecisionBy||'ADMIN';
    var summary=invoicePaymentSummary_(ss,agentId),remainingAvailable=Math.round(summary.items.reduce(function(sum,x){return sum+x.outstanding;},0)*100)/100;
    if(amount>remainingAvailable+0.009)throw new Error('Outstanding balance changed before confirmation. Refresh and review the payment report.');
    var invoices=sheetRows_(ensureBusinessSheet_(ss,'Invoices')).filter(function(x){return String(x.AgentID)===agentId;}),invoiceMap={};
    invoices.forEach(function(inv){invoiceMap[String(inv.InvoiceID)]=inv;});
    var payments=sheetRows_(ss.getSheetByName('Payments')),paymentMap={};payments.forEach(function(pay){paymentMap[String(pay.PaymentID)]=pay;});
    var items=sheetRows_(ensureBusinessSheet_(ss,'InvoiceItems')).filter(function(it){return invoiceMap[String(it.InvoiceID)];});
    items.sort(function(a,b){var ia=invoiceMap[String(a.InvoiceID)]||{},ib=invoiceMap[String(b.InvoiceID)]||{},pa=paymentMap[String(a.PaymentID)]||{},pb=paymentMap[String(b.PaymentID)]||{};var da=new Date(pa.PaymentDate||ia.InvoiceDate||ia.CreatedAt||a.CreatedAt||0).getTime(),db=new Date(pb.PaymentDate||ib.InvoiceDate||ib.CreatedAt||b.CreatedAt||0).getTime();return da-db||new Date(a.CreatedAt||0).getTime()-new Date(b.CreatedAt||0).getTime();});
    var paidByItem=summary.paidByItem,allocations=[],left=amount;
    items.forEach(function(item){if(left<=0.009)return;var invoice=invoiceMap[String(item.InvoiceID)]||{},status=String(invoice.PaymentStatus||'').toUpperCase();if(['PAID','SETTLED','CANCELLED'].includes(status))return;var net=Math.max(0,Number(item.NetAmount||0)),paid=Math.min(net,Number(paidByItem[String(item.InvoiceItemID)]||0)),due=Math.max(0,Math.round((net-paid)*100)/100);if(due<=0.009)return;var applied=Math.round(Math.min(due,left)*100)/100;if(applied>0){allocations.push({InvoiceItemID:String(item.InvoiceItemID),InvoiceID:String(item.InvoiceID),ClientID:String(item.ClientID||''),ClientName:String(item.ClientName||''),PolicyNumber:String(item.PolicyNumber||''),Amount:applied});left=Math.round((left-applied)*100)/100;}});
    if(left>0.009)throw new Error('Unable to allocate the full payment amount. Please refresh the invoice records.');
    report.Status='RECEIVED';report.AdminDecisionAt=new Date().toISOString();report.AdminDecisionBy=report.AdminDecisionBy||'ADMIN';report.AllocationsJson=JSON.stringify(allocations);report.Notes='Receipt confirmed; amount applied to oldest outstanding premiums using FIFO.';saveRow_(ss,'AgentInvoicePayments',report);
    var allAlloc=confirmedAgentPaymentAllocations_(ss,agentId);
    items.forEach(function(item){var inv=invoiceMap[String(item.InvoiceID)]||{};if(['PAID','SETTLED','CANCELLED'].includes(String(inv.PaymentStatus||'').toUpperCase()))return;var net=Number(item.NetAmount||0),paid=Math.min(net,Number(allAlloc[String(item.InvoiceItemID)]||0)),due=Math.max(0,Math.round((net-paid)*100)/100);item.PaidAmount=Math.round(paid*100)/100;item.OutstandingAmount=due;item.PaymentStatus=due<=0.009?'PAID':paid>0?'PARTIALLY_PAID':'PAYABLE';item.UpdatedAt=new Date().toISOString();saveRow_(ss,'InvoiceItems',item);});
    invoices.forEach(function(inv){var invItems=items.filter(function(it){return String(it.InvoiceID)===String(inv.InvoiceID);}),total=Number(inv.NetPayable||0),paid=invItems.length?invItems.reduce(function(sum,it){return sum+Math.min(Number(it.NetAmount||0),Number(allAlloc[String(it.InvoiceItemID)]||0));},0):0;if(['PAID','SETTLED'].includes(String(inv.PaymentStatus||'').toUpperCase()))paid=total;paid=Math.min(total,Math.round(paid*100)/100);var due=Math.max(0,Math.round((total-paid)*100)/100);inv.PaidAmount=paid;inv.OutstandingAmount=due;if(due<=0.009){inv.PaymentStatus='PAID';inv.Status='PAID';}else if(paid>0){inv.PaymentStatus='PARTIALLY_PAID';inv.Status='PARTIALLY_PAID';}else if(String(inv.PaymentStatus||'').toUpperCase()!=='CANCELLED'){inv.PaymentStatus='PAYABLE';if(String(inv.Status||'').toUpperCase()==='PARTIALLY_PAID')inv.Status='PAYMENT_LINK_ASSIGNED';}inv.UpdatedAt=new Date().toISOString();saveRow_(ss,'Invoices',inv);});
    saveRow_(ss,'MoneyLedger',{LedgerID:newId_('LedgerID'),TransactionDate:new Date().toISOString().slice(0,10),ReferenceType:'AGENT_PARTIAL_PAYMENT',ReferenceID:report.PaymentReportID,AgentID:agentId,ClientID:'',PaymentID:'',Description:'Agent partial payment confirmed · '+formatMoney_(amount)+' · FIFO',MoneyIn:amount,MoneyOut:'',Balance:'',PaymentMode:'Agent Bank/UPI Payment',BankAccount:'Trusted Circle',Category:'AGENT INVOICE SETTLEMENT',Status:'RECEIVED'});
    ['AgentInvoicePayments','Invoices','MoneyLedger','Notifications'].forEach(invalidateSheetCache_);cacheRemoveAgent_(agentId);return {payment:report,allocations:allocations};
  }finally{lock.releaseLock();}
}
function processAgentInvoicePaymentDecision_(reportId,decision,actor){
  var ss=agentBusinessSpreadsheet_(),rows=sheetRows_(ensureBusinessSheet_(ss,'AgentInvoicePayments')),report=rows.find(function(x){return String(x.PaymentReportID)===String(reportId);});
  if(!report)throw new Error('Agent payment report not found.');
  var status=String(report.Status||'').toUpperCase();if(status==='RECEIVED')throw new Error('This payment has already been confirmed.');if(status!=='PENDING')throw new Error('This payment report is already '+status.toLowerCase()+'.');
  if(decision==='RECEIVED'){applyAgentPaymentFifo_(ss,report,actor);}
  else if(decision==='PENDING'||decision==='FAILED'){
    var lock=LockService.getScriptLock();lock.waitLock(20000);
    try{
      var latest=sheetRows_(ensureBusinessSheet_(ss,'AgentInvoicePayments')).find(function(x){return String(x.PaymentReportID)===String(reportId);});
      if(!latest||String(latest.Status||'').toUpperCase()!=='PENDING')throw new Error('This payment report has already been reviewed.');
      report=latest;report.AdminDecisionAt=new Date().toISOString();report.AdminDecisionBy=actor||'ADMIN';
      if(decision==='PENDING'){report.Notes='Admin reviewed the report and left it pending.';}
      else{report.Status='REJECTED';report.Notes='Admin rejected the reported payment receipt.';}
      saveRow_(ss,'AgentInvoicePayments',report);
    }finally{lock.releaseLock();}
  }else throw new Error('Unsupported payment decision.');
  invalidateSheetCache_('AgentInvoicePayments');invalidateSheetCache_('Invoices');cacheRemoveAgent_(report.AgentID);return {report:report};
}
function agentInvoicePaymentDecision_(p){
  var token=String(p.reviewToken||'').trim();if(!token)throw new Error('Review link is invalid.');
  var raw=CacheService.getScriptCache().get('AGENT_PARTIAL_REVIEW_'+token);if(!raw)throw new Error('This review link has expired or has already been used.');
  var review=JSON.parse(raw),decision=String(p.decision||review.decision||'').toUpperCase();if(review.decision!==decision)throw new Error('Invalid review action.');
  CacheService.getScriptCache().remove('AGENT_PARTIAL_REVIEW_'+token);processAgentInvoicePaymentDecision_(review.reportId,decision,'ADMIN EMAIL');
  return HtmlService.createHtmlOutput('<div style="font-family:Arial,sans-serif;max-width:620px;margin:60px auto;padding:28px;border:1px solid #dfe8e3;border-radius:18px;text-align:center"><h2 style="color:#064f3b">Trusted Circle</h2><h3>Payment '+(decision==='RECEIVED'?'confirmed and applied using FIFO':decision==='PENDING'?'kept pending':'rejected')+'.</h3><p>You can close this window.</p></div>');
}
function agentInvoicePaymentReports_(p){
  requireAdmin_(p);var ss=agentBusinessSpreadsheet_(),agents=sheetRows_(ss.getSheetByName('Agents')),agentMap={};agents.forEach(function(a){agentMap[String(a.AgentID)]=a;});
  var rows=sheetRows_(ensureBusinessSheet_(ss,'AgentInvoicePayments')).map(function(r){var a=agentMap[String(r.AgentID)]||{};return Object.assign({},r,{AgentName:a.AgentName||'',Email:a.Email||'',ReceiptUrl:r.ReceiptUrl||''});}).sort(function(a,b){return new Date(b.ReportedAt||0)-new Date(a.ReportedAt||0);});
  return {items:rows,total:rows.length};
}
function adminDecideAgentInvoicePayment_(p){requireAdmin_(p);return processAgentInvoicePaymentDecision_(String(p.paymentReportId||'').trim(),String(p.decision||'').toUpperCase(),'ADMIN PORTAL');}
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
  var receipts=cachedSheetRows_(ensureBusinessSheet_(ss,'Receipts'),'Receipts');
  var receiptByPayment={};receipts.forEach(function(x){receiptByPayment[String(x.PaymentID)]=x;});
  var policy=policies[0]||{};
  var paymentMap={};payments.forEach(function(x){paymentMap[String(x.RequestID)]=x;});
  var billMap={};bills.forEach(function(x){billMap[String(x.BillID)]=x;});
  var requestItems=requests.map(function(r){
    var pay=paymentMap[String(r.RequestID)]||{},bill=billMap[String(r.BillID)]||{};
    return {RequestID:r.RequestID,PolicyID:r.PolicyID||'',PolicyNumber:r.PolicyNumber||client.PolicyNumber||policy.PolicyNumber||'',Status:r.Status||'PENDING',RequestedAt:r.RequestedAt||'',ApprovedAt:r.ApprovedAt||'',PremiumAmount:r.PremiumAmount||bill.PremiumAmount||pay.PremiumAmount||0,CustomerPayable:r.CustomerPayable||bill.CustomerPayable||pay.CustomerCollected||0,PaymentID:r.PaymentID||pay.PaymentID||'',PaymentStatus:pay.Status||'',PaymentDate:pay.PaymentDate||'',ReferenceNumber:pay.ReferenceNumber||'',ReceiptUrl:(receiptByPayment[String(pay.PaymentID)]||{}).ReceiptUrl||'',ReceiptFileId:(receiptByPayment[String(pay.PaymentID)]||{}).ReceiptFileId||'',ReceiptFileName:(receiptByPayment[String(pay.PaymentID)]||{}).FileName||'',Notes:r.Notes||''};
  });
  return {client:{ClientID:client.ClientID,ClientName:client.ClientName,PolicyNumber:client.PolicyNumber,DateOfBirth:client.DateOfBirth,Status:client.Status},policy:policy&&{PolicyID:policy.PolicyID||'',PolicyNumber:policy.PolicyNumber||client.PolicyNumber||'',PolicyStatus:policy.PolicyStatus||'ACTIVE'},requests:requestItems,payments:payments.map(function(x){return {PaymentID:x.PaymentID,RequestID:x.RequestID,PremiumAmount:x.PremiumAmount||0,CustomerCollected:x.CustomerCollected||0,PaymentMode:x.PaymentMode||'',PaymentDate:x.PaymentDate||'',ReferenceNumber:x.ReferenceNumber||'',ReceiptUrl:(receiptByPayment[String(x.PaymentID)]||{}).ReceiptUrl||'',ReceiptFileId:(receiptByPayment[String(x.PaymentID)]||{}).ReceiptFileId||'',ReceiptFileName:(receiptByPayment[String(x.PaymentID)]||{}).FileName||'',Status:x.Status||''};}),totalRequests:requestItems.length,totalPayments:payments.length};
}
function agentLogout_(p){var t=String(p.token||'').trim();if(t)CacheService.getScriptCache().remove(agentSessionKey_(t));return {loggedOut:true};}
function safeAgent_(a){return {AgentID:a.AgentID,AgentName:a.AgentName,AgencyName:a.AgencyName,Mobile:a.Mobile,Email:a.Email,Status:a.Status,JoinedDate:a.JoinedDate};}
function safeAgentClient_(c){
  return {ClientID:c.ClientID,PolicyID:c.PolicyID||'',ClientName:c.ClientName,PolicyNumber:c.PolicyNumber,DateOfBirth:c.DateOfBirth,Status:c.Status,CreatedAt:c.CreatedAt,PolicyType:c.PolicyType||'Policy',PremiumAmount:c.PremiumAmount||0,RequestStatus:c.RequestStatus||''};
}
function safeAgentRequest_(r){
  return {RequestID:r.RequestID,PolicyID:r.PolicyID||'',ClientID:r.ClientID,ClientName:r.ClientName||'',PolicyNumber:r.PolicyNumber||'',PremiumAmount:r.PremiumAmount||0,CustomerPayable:r.CustomerPayable||0,DiscountAmount:r.DiscountAmount||0,Status:r.Status||'PENDING',RequestedAt:r.RequestedAt||'',PaymentDate:r.PaymentDate||'',PaymentStatus:r.PaymentStatus||'',ReceiptUrl:r.ReceiptUrl||'',ReceiptFileId:r.ReceiptFileId||'',ReceiptFileName:r.ReceiptFileName||'',Notes:r.Notes||''};
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
  var receiptData=p.receipt||{};
  var receiptName=String(receiptData.fileName||'').trim();
  var receiptMime=String(receiptData.mimeType||'').trim();
  var receiptBase64=String(receiptData.base64||'').trim();
  if(!receiptName||!receiptMime||!receiptBase64)throw new Error('Premium payment receipt is required.');
  if(!/^application\/pdf$|^image\/(jpeg|png|webp)$/.test(receiptMime))throw new Error('Receipt must be a PDF, JPG, PNG or WEBP file.');
  if(receiptBase64.length>8*1024*1024)throw new Error('Receipt file is too large. Please upload a file below 6 MB.');

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

  var receiptFolder=DriveApp.getFolderById(INSURANCE_PREMIUM_RECEIPT_FOLDER_ID);
  var receiptBlob=Utilities.newBlob(Utilities.base64Decode(receiptBase64),receiptMime,receiptName);
  var receiptFile=receiptFolder.createFile(receiptBlob);
  receiptFile.setName('Premium Receipt - '+paymentId+' - '+receiptName);
  var receiptRecord=saveRow_(ss,'Receipts',{
    ReceiptID:newId_('ReceiptID'),
    PaymentID:paymentId,
    ReceiptNumber:'TC-REC-'+String(paymentId).slice(-8),
    ReceiptUrl:receiptFile.getUrl(),
    ReceiptFileId:receiptFile.getId(),
    FileName:receiptFile.getName(),
    MimeType:receiptMime,
    ReceiptDate:paymentDate,
    Notes:'Premium payment receipt uploaded by Admin'
  });
  payment.item.ReceiptID=receiptRecord.id;
  saveRow_(ss,'Payments',payment.item);

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

  ['PaymentRequests','Payments','Receipts','AgentReceivables','MoneyLedger'].forEach(invalidateSheetCache_);
  cacheRemoveAgent_(request.AgentID);
  return {
    payment:safeAdminPayment_(payment.item,card),
    requestId:requestId,
    receivableId:receivableRow.id,
    discountAmount:discount,
    receivableAmount:receivable,
    agent:{AgentID:agent.AgentID||'',AgentName:agent.AgentName||'',AgencyName:agent.AgencyName||'',Mobile:agent.Mobile||'',Email:agent.Email||'',Address:agent.Address||''},
    client:{ClientID:client.ClientID||'',ClientName:client.ClientName||'',PolicyNumber:client.PolicyNumber||'',DateOfBirth:client.DateOfBirth||''},receipt:{ReceiptID:receiptRecord.id,ReceiptUrl:receiptFile.getUrl(),ReceiptFileId:receiptFile.getId(),FileName:receiptFile.getName(),MimeType:receiptMime}
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
    AgentEmail:String(agent.Email||'').trim(),PdfUrl:'',PdfFileId:'',PaymentLink:'',PaymentStatus:'PAYABLE',PaymentLinkAssignedAt:'',AgentPaymentReportedAt:'',AgentPaymentReportedBy:'',PaymentDecisionAt:''
  });
  var items=[];
  selected.forEach(function(x){
    var item=saveRow_(ss,'InvoiceItems',{
      InvoiceItemID:newId_('InvoiceItemID'),InvoiceID:invoiceId,PaymentID:x.PaymentID||'',ClientID:x.ClientID||'',
      ClientName:x.ClientName||'',PolicyNumber:x.PolicyNumber||'',DateOfBirth:x.DateOfBirth||'',
      Amount:Number(x.GrossAmount||x.ReceivableAmount||0),DiscountAmount:Number(x.DiscountAmount||0),NetAmount:Number(x.ReceivableAmount||0),PaidAmount:0,OutstandingAmount:Number(x.ReceivableAmount||0),PaymentStatus:'PAYABLE'
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
  // Compact one-page invoice layout.
  body.setMarginTop(12).setMarginBottom(12).setMarginLeft(20).setMarginRight(20);
  var green='#064f3b',pale='#eef5f1',line='#cbd8d1',muted='#64756c';
  var header=body.appendTable([['','']]);header.setBorderWidth(0);
  var logoCell=header.getCell(0,0),brandCell=header.getCell(0,1);
  try{logoCell.setWidth(54);brandCell.setWidth(430);logoCell.setPaddingRight(0);brandCell.setPaddingLeft(0);logoCell.setPaddingTop(0);logoCell.setPaddingBottom(0);brandCell.setPaddingTop(0);brandCell.setPaddingBottom(0);}catch(layoutError){}
  try{var logo=UrlFetchApp.fetch('https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg').getBlob();var logoImage=logoCell.appendImage(logo);logoImage.setWidth(42);logoImage.setHeight(42);}catch(e){logoCell.appendParagraph('TC').setBold(true).setFontSize(16).setForegroundColor(green);}
  var brand=brandCell.appendParagraph('TRUSTED CIRCLE');brand.setBold(true).setFontSize(17).setForegroundColor(green).setSpacingAfter(1);
  var subtitle=brandCell.appendParagraph('INSURANCE PAYMENT & AGENT RECEIVABLE INVOICE');subtitle.setBold(true).setFontSize(7).setForegroundColor('#26372e').setSpacingAfter(0);
  body.appendParagraph('').setSpacingAfter(1);
  var headerTable=body.appendTable([['INVOICE NO.',String(invoice.InvoiceNumber||''),'INVOICE DATE',formatInvoiceDate_(invoice.InvoiceDate)]]);headerTable.setBorderWidth(1).setBorderColor(line);
  for(var hc=0;hc<4;hc++){headerTable.getCell(0,hc).setBackgroundColor(hc%2===0?pale:'#ffffff');headerTable.getCell(0,hc).editAsText().setFontSize(7);if(hc%2===0)headerTable.getCell(0,hc).editAsText().setBold(true);}
  var billTitle=body.appendParagraph('BILL TO');billTitle.setBold(true).setFontSize(7).setForegroundColor(green).setSpacingBefore(3).setSpacingAfter(1);
  var billTable=body.appendTable([
    ['Agent Name',String(agent.AgentName||'Agent'),'Agency Name',String(agent.AgencyName||'')],
    ['Address',String(agent.Address||''),'Mobile',String(agent.Mobile||'')],
    ['Email',String(agent.Email||''),'Insurance Company',String(agent.InsuranceCompany||'')]
  ]);billTable.setBorderWidth(1).setBorderColor(line);
  for(var br=0;br<billTable.getNumRows();br++)for(var bc=0;bc<4;bc++){var cell=billTable.getCell(br,bc);cell.setPaddingTop(2);cell.setPaddingBottom(2);cell.editAsText().setFontSize(7);if(bc===0||bc===2){cell.setBackgroundColor(pale);cell.editAsText().setBold(true).setForegroundColor(green);}}
  var itemTitle=body.appendParagraph('PREMIUM PAYMENT DETAILS');itemTitle.setBold(true).setFontSize(7).setForegroundColor(green).setSpacingBefore(3).setSpacingAfter(1);
  var table=body.appendTable([['S.NO.','CLIENT NAME','POLICY NO.','DATE OF BIRTH','PREMIUM AMOUNT']]);table.setBorderWidth(1).setBorderColor(line);
  for(var hc2=0;hc2<5;hc2++){table.getCell(0,hc2).setBackgroundColor(green);table.getCell(0,hc2).setPaddingTop(2);table.getCell(0,hc2).setPaddingBottom(2);table.getCell(0,hc2).editAsText().setBold(true).setFontSize(6).setForegroundColor('#ffffff');}
  items.forEach(function(x,i){var row=table.appendTableRow();var cells=[String(i+1),String(x.ClientName||''),String(x.PolicyNumber||''),formatInvoiceDate_(x.DateOfBirth||''),formatMoney_(x.Amount||0)];cells.forEach(function(value,col){var cell=row.appendTableCell(value);cell.setPaddingTop(1);cell.setPaddingBottom(1);cell.editAsText().setFontSize(7);if(i%2===1)cell.setBackgroundColor('#f7faf8');if(col===4)cell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);});});
  var totals=body.appendTable([
    ['GROSS PREMIUM PAID',formatMoney_(invoice.TotalAmount)],
    ['TRUSTED CIRCLE DISCOUNT ('+(Number(invoice.DiscountRate||0)*100).toFixed(0)+'%)','- '+formatMoney_(invoice.DiscountAmount)],
    ['BALANCE PAYABLE',formatMoney_(invoice.NetPayable)]
  ]);totals.setBorderWidth(1).setBorderColor(line);
  for(var tr=0;tr<3;tr++){totals.getCell(tr,0).setPaddingTop(2);totals.getCell(tr,0).setPaddingBottom(2);totals.getCell(tr,1).setPaddingTop(2);totals.getCell(tr,1).setPaddingBottom(2);totals.getCell(tr,0).editAsText().setBold(true).setFontSize(tr===2?8:7);totals.getCell(tr,1).editAsText().setFontSize(tr===2?8:7);totals.getCell(tr,1).getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);if(tr===2){totals.getCell(tr,0).setBackgroundColor('#e4f3ea');totals.getCell(tr,1).setBackgroundColor('#e4f3ea');totals.getCell(tr,0).editAsText().setForegroundColor(green);totals.getCell(tr,1).editAsText().setBold(true).setForegroundColor(green);}}
  var payTitle=body.appendParagraph('PAYMENT DETAILS & AUTHORISATION');payTitle.setBold(true).setFontSize(7).setForegroundColor(green).setSpacingBefore(3).setSpacingAfter(1);
  var bankName='Kotak Mahindra Bank',accountNumber='8949622673',ifsc='KKBK0008698',branch='TRICHY - THILLAI NAGAR',upi='6369175709@kotak811';
  // Two-cell table: payment instructions (bank + QR) on the left, signature + official stamp on the right.
  var paymentTable=body.appendTable([['BANK DETAILS & QR','SIGNATURE & SEAL']]);paymentTable.setBorderWidth(1).setBorderColor(line);
  for(var pc=0;pc<2;pc++){paymentTable.getCell(0,pc).setBackgroundColor(pale);paymentTable.getCell(0,pc).setPaddingTop(2);paymentTable.getCell(0,pc).setPaddingBottom(2);paymentTable.getCell(0,pc).editAsText().setBold(true).setFontSize(7).setForegroundColor(green);}
  var payRow=paymentTable.appendTableRow();var bankQrCell=payRow.appendTableCell('');bankQrCell.setPaddingTop(3);bankQrCell.setPaddingBottom(3);
  var bankText=bankQrCell.appendParagraph('Bank: '+bankName+'  |  A/c: '+accountNumber+'  |  IFSC: '+ifsc);bankText.setFontSize(6).setSpacingAfter(1);
  bankQrCell.appendParagraph('Branch: '+branch+'  |  UPI: '+upi).setFontSize(6).setSpacingAfter(2);
  try{var qr=UrlFetchApp.fetch('https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/backend/agent-business/TC%20Payment%20QR.png').getBlob();var qrImage=bankQrCell.appendImage(qr);qrImage.setWidth(76);qrImage.setHeight(76);bankQrCell.appendParagraph('Scan to pay Trusted Circle').setFontSize(6).setForegroundColor(muted).setSpacingAfter(0);}catch(qrError){bankQrCell.appendParagraph('UPI ID: '+upi).setFontSize(7);}
  var signCell=payRow.appendTableCell('');signCell.setPaddingTop(3);signCell.setPaddingBottom(3);
  signCell.appendParagraph('').setSpacingBefore(18);
  try{var stampBlob=UrlFetchApp.fetch('https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/backend/agent-business/Trusted%20Circle%20Stamp.png').getBlob();var stampImage=signCell.appendImage(stampBlob);stampImage.setWidth(82);stampImage.setHeight(82);}catch(stampError){var stamp=signCell.appendParagraph('◯');stamp.setFontSize(46).setForegroundColor('#9bbbe8').setAlignment(DocumentApp.HorizontalAlignment.CENTER);}
  var footer=body.appendTable([['✉  info@trustedcircle.in','◎  www.trustedcircle.shop']]);footer.setBorderWidth(0);
  for(var fc=0;fc<2;fc++){footer.getCell(0,fc).editAsText().setFontSize(7).setForegroundColor(green);footer.getCell(0,fc).getChild(0).asParagraph().setAlignment(fc===0?DocumentApp.HorizontalAlignment.LEFT:DocumentApp.HorizontalAlignment.RIGHT);}
  doc.saveAndClose();Utilities.sleep(200);
  var pdf=doc.getAs(MimeType.PDF).setName(invoice.InvoiceNumber+'.pdf');
  var invoiceFolder=DriveApp.getFolderById(TRUSTED_CIRCLE_INVOICE_FOLDER_ID);var file=invoiceFolder.createFile(pdf);file.setName(invoice.InvoiceNumber+'.pdf');
  var sent=sendInvoicePdfToAgent_(agent,invoice,pdf);
  try{DriveApp.getFileById(doc.getId()).setTrashed(true);}catch(e){}
  return {pdfBase64:Utilities.base64Encode(pdf.getBytes()),fileName:invoice.InvoiceNumber+'.pdf',sent:sent,pdfUrl:file.getUrl(),pdfFileId:file.getId()};
}

function sendInvoicePdfToAgent_(agent,invoice,pdf){
  var email=String(agent.Email||invoice.AgentEmail||'').trim();
  if(!email||MailApp.getRemainingDailyQuota()<=0)return false;
  MailApp.sendEmail({to:email,subject:'Trusted Circle Invoice '+String(invoice.InvoiceNumber||''),body:'Dear '+String(agent.AgentName||'Agent')+',\n\nPlease find attached the Trusted Circle premium payment receivable invoice '+String(invoice.InvoiceNumber||'')+'.\n\nTotal payable: '+formatMoney_(invoice.NetPayable)+'\n\nRegards,\nTrusted Circle',htmlBody:'<p>Dear '+escapeHtml_(agent.AgentName||'Agent')+',</p><p>Please find attached the Trusted Circle premium payment receivable invoice <b>'+escapeHtml_(invoice.InvoiceNumber||'')+'</b>.</p><p><b>Total payable: '+formatMoney_(invoice.NetPayable)+'</b></p><p>Regards,<br>Trusted Circle</p>',attachments:[pdf],name:'Trusted Circle'});
  return true;
}

function regenerateAgentInvoice_(p){
  var ss=agentBusinessSpreadsheet_();requireAdmin_(p);
  var invoiceId=String(p.invoiceId||'').trim();if(!invoiceId)throw new Error('Invoice ID is required.');
  var invoices=sheetRows_(ensureBusinessSheet_(ss,'Invoices'));
  var invoice=invoices.find(function(x){return String(x.InvoiceID)===invoiceId;});
  if(!invoice)throw new Error('Invoice not found.');
  var agent=sheetRows_(ensureBusinessSheet_(ss,'Agents')).find(function(x){return String(x.AgentID)===String(invoice.AgentID);});
  if(!agent)throw new Error('Agent record not found.');
  var items=sheetRows_(ensureBusinessSheet_(ss,'InvoiceItems')).filter(function(x){return String(x.InvoiceID)===invoiceId;});
  var linkedReceivables=sheetRows_(ensureBusinessSheet_(ss,'AgentReceivables')).filter(function(x){return String(x.InvoiceID||'')===invoiceId&&String(x.AgentID||'')===String(invoice.AgentID||'');});
  // Repair old invoice snapshots with blank client fields using their linked receivable records.
  if(items.length&&linkedReceivables.length){items=items.map(function(item,index){var match=linkedReceivables.find(function(r){return item.PaymentID&&String(r.PaymentID||'')===String(item.PaymentID);})||linkedReceivables.find(function(r){return item.ClientID&&String(r.ClientID||'')===String(item.ClientID);})||linkedReceivables[index];if(match){['ClientName','PolicyNumber','DateOfBirth','ClientID','PaymentID'].forEach(function(k){if(!String(item[k]||'').trim()&&String(match[k]||'').trim())item[k]=match[k];});var all=sheetRows_(ensureBusinessSheet_(ss,'InvoiceItems'));var row=all.find(function(v){return String(v.InvoiceItemID||'')===String(item.InvoiceItemID||'');});if(row){Object.keys(item).forEach(function(k){row[k]=item[k];});saveRow_(ss,'InvoiceItems',row);}}return item;});}
  if(!items.length&&linkedReceivables.length){items=linkedReceivables.map(function(r){return {InvoiceID:invoiceId,InvoiceItemID:'',PaymentID:r.PaymentID||'',ClientID:r.ClientID||'',ClientName:r.ClientName||'',PolicyNumber:r.PolicyNumber||'',DateOfBirth:r.DateOfBirth||'',Amount:Number(r.GrossAmount||r.ReceivableAmount||0),DiscountAmount:Number(r.DiscountAmount||0),NetAmount:Number(r.ReceivableAmount||0),PaidAmount:Number(r.PaidAmount||0),OutstandingAmount:Number(r.ReceivableAmount||0),PaymentStatus:r.PaymentStatus||'PAYABLE'};});}
  if(!items.length)throw new Error('No saved premium line items or linked receivables exist for this invoice.');
  invoice.AgentEmail=String(agent.Email||'').trim();
  var pdfResult=buildInvoicePdfAndSend_(agent,invoice,items);
  invoice.PdfUrl=pdfResult.pdfUrl||'';
  invoice.PdfFileId=pdfResult.pdfFileId||'';
  invoice.Status=pdfResult.sent?'SENT':'GENERATED';
  invoice.UpdatedAt=new Date().toISOString();
  saveRow_(ss,'Invoices',invoice);
  invalidateSheetCache_('Invoices');
  return {success:true,invoiceNumber:invoice.InvoiceNumber,pdfUrl:invoice.PdfUrl,sent:pdfResult.sent,email:invoice.AgentEmail,fileName:pdfResult.fileName};
}

function resendAgentInvoice_(p){
  var ss=agentBusinessSpreadsheet_();requireAdmin_(p);
  var invoiceId=String(p.invoiceId||'').trim();if(!invoiceId)throw new Error('Invoice ID is required.');
  var invoice=sheetRows_(ensureBusinessSheet_(ss,'Invoices')).find(function(x){return String(x.InvoiceID)===invoiceId;});
  if(!invoice)throw new Error('Invoice not found.');
  var fileId=String(invoice.PdfFileId||'').trim();if(!fileId)throw new Error('This invoice has no saved PDF. Please generate a new invoice from current receivables.');
  var file=DriveApp.getFileById(fileId);var agent=sheetRows_(ensureBusinessSheet_(ss,'Agents')).find(function(x){return String(x.AgentID)===String(invoice.AgentID);})||{};
  var pdf=file.getBlob().setName(invoice.InvoiceNumber+'.pdf');
  var sent=sendInvoicePdfToAgent_(agent,invoice,pdf);
  if(!sent)throw new Error('Invoice email was not sent. Check the agent email address and remaining daily email quota.');
  return {sent:true,invoiceNumber:invoice.InvoiceNumber,email:String(agent.Email||invoice.AgentEmail||'')};
}

function formatInvoiceDate_(value){
  var raw=String(value||'').trim();if(!raw)return '';
  var d=new Date(raw);
  if(Number.isNaN(d.getTime())){var m=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return m[3]+'-'+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(m[2])-1]+'-'+m[1];return raw;}
  return Utilities.formatDate(d,Session.getScriptTimeZone(),'dd-MMM-yyyy');
}
function formatMoney_(value){return '₹'+Number(value||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});}
function escapeHtml_(value){return String(value||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
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
