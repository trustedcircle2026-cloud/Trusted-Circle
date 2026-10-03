const API_URL=import.meta.env.VITE_AGENT_BUSINESS_API_URL||window.__AGENT_BUSINESS_API__||'https://script.google.com/macros/s/AKfycbz4j7qOdRUzGzyWvHXBSIkP0c-PXw1uKtYY_K7YGQvaPZrpHnUZ2X4EBWW5QEEWdVXi/exec';

async function request(action,payload={}){
  if(!API_URL) throw new Error('Agent Business backend URL is not configured. Set VITE_AGENT_BUSINESS_API_URL.');

  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
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
      throw new Error('Agent Business backend timed out after 20 seconds. Check the Apps Script Web App deployment and Google Sheet access.');
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
    const preview=String(raw||'').replace(/\\s+/g,' ').trim().slice(0,180);
    throw new Error('Agent Business backend returned a non-JSON response ('+response.status+'). '+(preview?'Response: '+preview:'Redeploy the latest Apps Script Code.gs and verify the Web App URL.'));
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
  createAgent:(data,adminToken)=>request('createAgent',{data,adminToken}),
  setAgentPassword:(agentId,password,adminToken)=>request('setAgentPassword',{agentId,password,adminToken}),
  agentLogin:(mobile,password)=>request('agentLogin',{mobile,password}),
  agentMe:(token)=>request('agentMe',{token}),
  agentClients:(token)=>request('agentClients',{token}),
  agentAddClient:(token,data)=>request('agentAddClient',{token,data}),
  agentLogout:(token)=>request('agentLogout',{token}),
  isConfigured:()=>Boolean(API_URL)
};
