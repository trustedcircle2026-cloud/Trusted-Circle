const API_URL=import.meta.env.VITE_AGENT_BUSINESS_API_URL||window.__AGENT_BUSINESS_API__||'https://script.google.com/macros/s/AKfycbz4j7qOdRUzGzyWvHXBSIkP0c-PXw1uKtYY_K7YGQvaPZrpHnUZ2X4EBWW5QEEWdVXi/exec';

async function request(action,payload={}){
  if(!API_URL) throw new Error('Agent Business backend URL is not configured. Set VITE_AGENT_BUSINESS_API_URL.');
  const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...payload})});
  const json=await response.json();
  if(!json.ok) throw new Error(json.error||'Agent Business request failed.');
  return json.data;
}
export const agentBusinessApi={
  dashboard:()=>request('dashboard'),
  list:(sheet,params={})=>request('list',{sheet,...params}),
  save:(sheet,data)=>request('save',{sheet,data}),
  remove:(sheet,id,idField='')=>request('delete',{sheet,id,idField}),
  calculate:(data)=>request('calculate',data),
  agentLogin:(mobile,password)=>request('agentLogin',{mobile,password}),
  agentMe:(token)=>request('agentMe',{token}),
  agentClients:(token)=>request('agentClients',{token}),
  agentAddClient:(token,data)=>request('agentAddClient',{token,data}),
  agentLogout:(token)=>request('agentLogout',{token}),
  createAgent:(data)=>request('createAgent',{data}),
  setAgentPassword:(agentId,password)=>request('setAgentPassword',{agentId,password}),
  isConfigured:()=>Boolean(API_URL)
};
