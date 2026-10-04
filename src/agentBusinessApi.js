const API_URL=import.meta.env.VITE_AGENT_BUSINESS_API_URL||window.__AGENT_BUSINESS_API__||'https://script.google.com/macros/s/AKfycbz4j7qOdRUzGzyWvHXBSIkP0c-PXw1uKtYY_K7YGQvaPZrpHnUZ2X4EBWW5QEEWdVXi/exec';

async function request(action,payload={}){
  if(!API_URL) throw new Error('Agent Business backend URL is not configured. Set VITE_AGENT_BUSINESS_API_URL.');

  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),45000);
  let response;
  try{
    response=await fetch(API_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8','Accept':'application/json'},
      body:JSON.stringify({action,...payload}),
      redirect:'follow',
      cache:'no-store',
      signal:controller.signal
    });
  }catch(error){
    if(error?.name==='AbortError'){
      throw new Error('Agent Business backend timed out after 45 seconds. Check the Apps Script Web App deployment and Google Sheet access.');
    }
    throw new Error('Unable to reach Agent Business backend. Check that the Apps Script Web App is deployed as a Web App with access set to Anyone, then update the deployment URL if it changed.');
  }finally{
    clearTimeout(timeout);
  }

  const raw=await response.text();
  let json;
  try{
    json=JSON.parse(raw);
  }catch{
    if(response.status===404){
      throw new Error('Agent Business Web App returned 404. The frontend URL points to a missing or old Apps Script deployment. Redeploy the latest Agent Business Code.gs as a Web App and update VITE_AGENT_BUSINESS_API_URL with the current /exec URL.');
    }
    throw new Error('Agent Business backend returned an invalid response ('+response.status+'). Redeploy the latest Agent Business Code.gs and verify the Web App /exec URL.');
  }

  if(!response.ok || !json.ok) throw new Error(json.error||('Agent Business request failed ('+response.status+').'));
  return json.data;
}

export const agentBusinessApi={
  health:()=>request('health'),
  adminLogin:(password)=>request('adminLogin',{password}),
  adminMe:(token)=>request('adminMe',{token}),
  adminLogout:(token)=>request('adminLogout',{token}),
  dashboard:(adminToken)=>request('dashboard',{adminToken}),
  list:(sheet,params={},adminToken)=>request('list',{sheet,...params,adminToken}),
  save:(sheet,data,adminToken)=>request('save',{sheet,data,adminToken}),
  remove:(sheet,id,idField='',adminToken)=>request('delete',{sheet,id,idField,adminToken}),
  calculate:(data,adminToken)=>request('calculate',{...data,adminToken}),
  markPaymentPaid:(data,adminToken)=>request('markPaymentPaid',{...data,adminToken}),
  createInvoice:(data,adminToken)=>request('createInvoice',{...data,adminToken}),
  listReceivables:(agentId,adminToken)=>request('receivables',{agentId,adminToken}),
  markReceivableReceived:(receivableId,adminToken)=>request('markReceivableReceived',{receivableId,adminToken}),
  schema:(sheet,adminToken)=>request('schema',{sheet,adminToken}),
  createAgent:(data,adminToken)=>request('createAgent',{data,adminToken}),
  setAgentPassword:(agentId,password,adminToken)=>request('setAgentPassword',{agentId,password,adminToken}),
  agentLogin:(mobile,password)=>request('agentLogin',{mobile,password}),
  agentMe:(token)=>request('agentMe',{token}),
  agentBootstrap:(token)=>request('agentBootstrap',{token}),
  agentClients:(token)=>request('agentClients',{token}),
  agentPaymentRequests:(token)=>request('agentPaymentRequests',{token}),
  agentAddClient:(token,data)=>request('agentAddClient',{token,data}),
  agentAddPolicy:(token,data)=>request('agentAddPolicy',{token,data}),
  agentEditPolicy:(token,data)=>request('agentEditPolicy',{token,data}),
  agentRequestPayment:(token,policyOrClient)=>request('agentRequestPayment',{token,data:typeof policyOrClient==='object'?policyOrClient:{PolicyID:policyOrClient}}),
  agentCancelPaymentRequest:(token,requestId)=>request('agentCancelPaymentRequest',{token,requestId}),
  agentClientHistory:(token,clientId)=>request('agentClientHistory',{token,clientId}),
  agentInvoices:(token)=>request('agentInvoices',{token}),
  agentInvoicePdf:(token,invoiceId)=>request('agentInvoicePdf',{token,invoiceId}),
 agentReceiptFile:(token,paymentId)=>request('agentReceiptFile',{token,paymentId}),
  agentReportInvoicePaymentDone:(token,invoiceId)=>request('agentReportInvoicePaymentDone',{token,invoiceId}),
  assignInvoicePaymentLink:(invoiceId,paymentLink,adminToken)=>request('assignInvoicePaymentLink',{invoiceId,paymentLink,adminToken}),
  agentLogout:(token)=>request('agentLogout',{token}),
  isConfigured:()=>Boolean(API_URL)
};
