import {useEffect,useMemo,useState} from 'react'
import {ArrowRight,CheckCircle2,FileText,LogIn,Plus,RefreshCw,ShieldCheck,Users,X,LogOut,Send,CalendarDays,Clock3,ChevronRight,Edit3,WalletCards} from 'lucide-react'
import {agentBusinessApi} from '../agentBusinessApi'
import '../agent-portal.css'

const LOGO_URL='https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'
const emptyPolicy={ClientName:'',PolicyNumber:'',DateOfBirth:''}
const loadingMessages=['Securing your agent session…','Loading your policy workspace…','Syncing your latest requests…','Preparing your workspace…']

export default function AgentPortalPage(){
 const[session,setSession]=useState(()=>localStorage.getItem('tc_agent_session')||'')
 const[agent,setAgent]=useState(null),[clients,setClients]=useState([]),[requests,setRequests]=useState([])
 const[mobile,setMobile]=useState(''),[password,setPassword]=useState('')
 const[policyForm,setPolicyForm]=useState(emptyPolicy),[showForm,setShowForm]=useState(false),[editingPolicyId,setEditingPolicyId]=useState('')
 const[clientSearch,setClientSearch]=useState(''),[history,setHistory]=useState(null),[historyLoading,setHistoryLoading]=useState(false)
 const[loading,setLoading]=useState(false),[loadingText,setLoadingText]=useState(loadingMessages[0]),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const[activeTab,setActiveTab]=useState('policies'),[detail,setDetail]=useState(null)

 const load=async token=>{
  setLoading(true);setError('')
  let timer
  try{
   let i=0;setLoadingText(loadingMessages[0]);timer=setInterval(()=>setLoadingText(loadingMessages[++i%loadingMessages.length]),850)
   const data=await agentBusinessApi.agentBootstrap(token)
   setAgent(data.agent);setClients(data.clients?.items||[]);setRequests(data.requests?.items||[])
  }catch(e){
   localStorage.removeItem('tc_agent_session');setSession('');setAgent(null);setClients([]);setRequests([]);setError(e.message)
  }finally{clearInterval(timer);setLoading(false)}
 }
 useEffect(()=>{if(session)load(session)},[session])

 const login=async()=>{
  setLoading(true);setError('');setNotice('');setLoadingText('Verifying your secure access…')
  try{
   const data=await agentBusinessApi.agentLogin(mobile,password)
   localStorage.setItem('tc_agent_session',data.token);setSession(data.token);setAgent(data.agent);setPassword('')
  }catch(e){setError(e.message)}finally{setLoading(false)}
 }
 const openAddPolicy=()=>{setError('');setNotice('');setEditingPolicyId('');setPolicyForm(emptyPolicy);setShowForm(true)}
 const openEditPolicy=r=>{setError('');setNotice('');setEditingPolicyId(r.PolicyID);setPolicyForm({ClientName:r.ClientName||'',PolicyNumber:r.PolicyNumber||'',DateOfBirth:r.DateOfBirth||''});setShowForm(true)}
 const addPolicy=async()=>{
  setLoading(true);setError('');setNotice('');setLoadingText('Adding policy to your workspace…')
  try{
   const data=await agentBusinessApi.agentAddPolicy(session,policyForm)
   setClients(current=>[data.policy,...current]);setPolicyForm(emptyPolicy);setShowForm(false)
   setNotice('Policy added. Select it later whenever payment needs to be requested.')
  }catch(e){setError(e.message)}finally{setLoading(false)}
 }
 const editPolicy=async()=>{
  setLoading(true);setError('');setNotice('');setLoadingText('Updating client and policy details…')
  try{
   await agentBusinessApi.agentEditPolicy(session,{...policyForm,PolicyID:editingPolicyId})
   await load(session);setPolicyForm(emptyPolicy);setEditingPolicyId('');setShowForm(false);setNotice('Client and policy details updated successfully.')
  }catch(e){setError(e.message)}finally{setLoading(false)}
 }
 const requestPayment=async policy=>{
  if(!policy.PolicyID)return setError('Policy reference is missing. Refresh the workspace.')
  if(!window.confirm('Request premium payment for this selected policy on behalf of the client?'))return
  setLoading(true);setError('');setNotice('');setLoadingText('Sending payment request to Admin…')
  try{
   const data=await agentBusinessApi.agentRequestPayment(session,policy.PolicyID)
   setRequests(current=>[data.paymentRequest,...current]);await load(session);setActiveTab('requests');setNotice('Payment request sent to Trusted Circle Admin.')
  }catch(e){setError(e.message)}finally{setLoading(false)}
 }
 const cancelRequest=async requestId=>{
  if(!window.confirm('Cancel this payment request?'))return
  setLoading(true);setError('');setNotice('');setLoadingText('Cancelling payment request…')
  try{await agentBusinessApi.agentCancelPaymentRequest(session,requestId);await load(session);setNotice('Payment request cancelled.')}
  catch(e){setError(e.message)}finally{setLoading(false)}
 }
 const logout=async()=>{try{if(session)await agentBusinessApi.agentLogout(session)}catch{}localStorage.removeItem('tc_agent_session');setSession('');setAgent(null);setClients([]);setRequests([])}
 const pending=requests.filter(r=>!['PAID','COMPLETED','CANCELLED'].includes(String(r.Status||'').toUpperCase())).length
 const latestRequests=useMemo(()=>requests.slice(0,12),[requests])
 const filteredClients=useMemo(()=>{const q=clientSearch.trim().toLowerCase();if(!q)return clients;return clients.filter(r=>[r.ClientName,r.PolicyNumber,r.DateOfBirth].some(v=>String(v||'').toLowerCase().includes(q)))},[clients,clientSearch])
 const openHistory=async client=>{setHistoryLoading(true);setError('');try{const data=await agentBusinessApi.agentClientHistory(session,client.ClientID);setHistory(data)}catch(e){setError(e.message)}finally{setHistoryLoading(false)}}

 if(!session||!agent)return <div className="agent-portal-page">
  {loading&&<LoadingOverlay text={loadingText}/>}
  <div className="agent-login-shell"><div className="agent-login-orbit orbit-one"></div><div className="agent-login-orbit orbit-two"></div>
   <div className="agent-login-card">
    <div className="agent-login-brand"><img src={LOGO_URL} alt="Trusted Circle"/><div><strong>Trusted Circle</strong><small>Agent Portal</small></div></div>
    <div className="agent-login-icon"><ShieldCheck size={25}/></div><span className="ap-eyebrow">SECURE AGENT ACCESS</span><h1>Welcome back 👋</h1>
    <p>Manage your saved policies and request premium payments on behalf of your clients.</p>
    <label>Mobile Number<input value={mobile} onChange={e=>setMobile(e.target.value.replace(/\D/g,'').slice(0,10))} inputMode="numeric" maxLength="10" placeholder="10-digit mobile number" autoComplete="tel"/></label>
    <label>4-Digit Password<input type="password" value={password} onChange={e=>setPassword(e.target.value.replace(/\D/g,'').slice(0,4))} inputMode="numeric" maxLength="4" placeholder="••••" autoComplete="current-password"/></label>
    {error&&<div className="ap-error"><X size={15}/>{error}</div>}
    <button className="ap-primary wide" disabled={loading||mobile.length!==10||password.length!==4} onClick={login}>{loading?<RefreshCw className="spin"/>:<LogIn size={17}/>}Sign In</button>
    <a href="./">Back to Trusted Circle</a>
   </div>
  </div>
 </div>

 return <div className="agent-portal-page">
  {loading&&<LoadingOverlay text={loadingText}/>}
  <main className="ap-main">
   <div className="ap-command-menu ap-icon-header">
    <div className="ap-command-brand ap-icon-brand"><img src={LOGO_URL} alt="Trusted Circle"/></div>
    <div className="ap-command-actions ap-icon-actions">
     <button className="ap-icon-header-btn" onClick={()=>load(session)} disabled={loading} title="Refresh workspace" aria-label="Refresh workspace"><RefreshCw size={18} className={loading?'spin':''}/></button>
     <button className="ap-icon-header-btn ap-icon-header-primary" onClick={openAddPolicy} title="Add client and policy" aria-label="Add client and policy"><Plus size={20}/></button>
     <button className="ap-icon-header-btn ap-icon-header-danger" onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={18}/></button>
    </div>
   </div>
   <section className="ap-page-head"><div><span className="ap-eyebrow">TRUSTED CIRCLE · AGENT PORTAL</span><h1>Hello, {agent.AgentName?.split(' ')[0]||'Agent'} <span>👋</span></h1><p>Manage saved clients and raise a premium payment request only when needed.</p></div></section>
   {error&&<div className="ap-error ap-banner"><X size={15}/><span>{error}</span><button onClick={()=>setError('')}>Dismiss</button></div>}
   {notice&&<div className="ap-success ap-banner"><CheckCircle2 size={16}/><span>{notice}</span><button onClick={()=>setNotice('')}>Dismiss</button></div>}
   <div className="ap-stats"><Stat icon={FileText} label="Clients" value={clients.length} tone="green"/><Stat icon={Send} label="Payment Requests" value={requests.length} tone="blue"/><Stat icon={Clock3} label="Pending Requests" value={pending} tone="amber"/><Stat icon={ShieldCheck} label="Account Access" value="Active" tone="purple"/></div>
   <div className="ap-tabs">
    <button className={activeTab==='policies'?'active':''} onClick={()=>setActiveTab('policies')}><FileText size={15}/>My Clients</button>
    <button className={activeTab==='requests'?'active':''} onClick={()=>setActiveTab('requests')}><Send size={15}/>Payment Requests <span>{pending}</span></button>
   </div>

   {activeTab==='policies'?<section className="ap-panel ap-data">
    <div className="ap-panel-head"><div><span className="ap-eyebrow">CLIENT WORKSPACE</span><h2>My Clients</h2><p>Add a client and policy once. Raise premium payment requests whenever required.</p></div><button className="ap-primary" onClick={openAddPolicy}><Plus size={15}/>Add Client</button></div>
    <div className="ap-client-search"><div><Users size={15}/><input value={clientSearch} onChange={e=>setClientSearch(e.target.value)} placeholder="Search client or policy number"/></div>{clientSearch&&<button onClick={()=>setClientSearch('')}><X size={14}/></button>}</div>
    {filteredClients.length?<div className="ap-client-grid">{filteredClients.map(r=><div className="ap-client-card ap-policy-card" key={r.PolicyID||r.ClientID}>
      <div className="ap-client-top"><span className="ap-avatar">{String(r.ClientName||'?').trim().charAt(0).toUpperCase()}</span><div><strong>{r.ClientName}</strong><small>Policy {r.PolicyNumber}</small></div><span className="ap-status">{r.Status||'ACTIVE'}</span></div>
      <div className="ap-client-meta"><span><CalendarDays size={13}/>{r.DateOfBirth}</span><span><FileText size={13}/>Policy</span></div>
      <div className="ap-client-bottom"><span>Latest request <b>{r.RequestStatus&&r.RequestStatus!=='PENDING'?r.RequestStatus:'Ready'}</b></span><span className={'ap-request-pill '+String(r.RequestStatus||'READY').toLowerCase()}>{r.RequestStatus&&r.RequestStatus!=='PENDING'?r.RequestStatus:'READY'}</span></div>
      <div className="ap-card-actions ap-client-actions">
       <button className="ap-secondary" onClick={()=>openHistory(r)}><Clock3 size={14}/>History</button>
       <button className="ap-secondary" onClick={()=>openEditPolicy(r)}><Edit3 size={14}/>Edit</button>
       <button className="ap-primary ap-request-action" disabled={loading||['PENDING','SUBMITTED','PAID','COMPLETED'].includes(String(r.RequestStatus||'').toUpperCase())} onClick={()=>requestPayment(r)}><Send size={14}/>{['PENDING','SUBMITTED'].includes(String(r.RequestStatus||'').toUpperCase())?'Requested':'Raise Request'}</button>
      </div>
    </div>)}</div>:<div className="ap-empty ap-empty-color"><div className="ap-empty-icon"><Users size={23}/></div><b>{clientSearch?'No matching client':'No clients added yet'}</b><span>{clientSearch?'Try the client name or policy number.':'Add the client and policy details first. You can raise premium payment requests whenever required.'}</span>{!clientSearch&&<button className="ap-primary" onClick={openAddPolicy}><Plus size={15}/>Add First Client</button>}</div>}
   </section>:<section className="ap-panel ap-data">
    <div className="ap-panel-head"><div><span className="ap-eyebrow">PAYMENT WORKFLOW</span><h2>Payment Requests</h2><p>Track every request raised for your clients and its current status.</p></div><button className="ap-secondary" onClick={()=>load(session)} disabled={loading}><RefreshCw size={15}/>Refresh</button></div>
    {latestRequests.length?<div className="ap-request-list">{latestRequests.map(r=><div className="ap-request-card" key={r.RequestID}>
      <div className="ap-request-icon"><Send size={17}/></div><div className="ap-request-main"><strong>{r.ClientName||'Client'}</strong><span>Policy {r.PolicyNumber}</span><small>Raised {r.RequestedAt?new Date(r.RequestedAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'just now'}</small></div>
      <span className={'ap-request-pill '+String(r.Status||'PENDING').toLowerCase()}>{r.Status||'PENDING'}</span>
      {['PENDING','SUBMITTED'].includes(String(r.Status||'').toUpperCase())&&<button className="ap-secondary ap-cancel-request" disabled={loading} onClick={()=>cancelRequest(r.RequestID)}>Cancel</button>}
      <button className="ap-icon-action" title="View client history" onClick={()=>{const client=clients.find(c=>String(c.ClientID)===String(r.ClientID));client?openHistory(client):setDetail({type:'Payment Request',data:r})}}><ChevronRight size={17}/></button>
    </div>)}</div>:<div className="ap-empty"><Send size={22}/><b>No payment requests yet</b><span>Search My Clients and raise a request whenever a premium needs to be paid.</span></div>}
   </section>}
  </main>

  {history&&<div className="ap-modal-backdrop" onClick={()=>!historyLoading&&setHistory(null)}><div className="ap-modal ap-detail-modal ap-history-modal" onClick={e=>e.stopPropagation()}><button className="ap-close" onClick={()=>!historyLoading&&setHistory(null)}><X/></button><span className="ap-eyebrow">CLIENT PAYMENT HISTORY</span><h2>{history.client.ClientName}</h2><p className="ap-history-sub">Policy {history.client.PolicyNumber} · Request and payment status</p><div className="ap-history-summary"><div><small>Requests</small><strong>{history.totalRequests}</strong></div><div><small>Payments</small><strong>{history.totalPayments}</strong></div><div><small>Current</small><strong>{history.client.Status||'ACTIVE'}</strong></div></div>{historyLoading?<div className="ap-empty"><RefreshCw className="spin"/><span>Loading history…</span></div>:history.requests.length?<div className="ap-history-list">{history.requests.map(x=><div className="ap-history-item" key={x.RequestID}><div><strong>Premium Request</strong><small>{x.RequestedAt?new Date(x.RequestedAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—'}</small></div><span className={'ap-request-pill '+String(x.Status||'PENDING').toLowerCase()}>{x.Status||'PENDING'}</span>{x.PaymentID&&<div className="ap-history-payment"><WalletCards size={13}/><span>Paid {x.PaymentDate?new Date(x.PaymentDate).toLocaleDateString('en-IN'):'—'} · {x.ReferenceNumber||'Payment recorded'}</span></div>}</div>)}</div>:<div className="ap-empty"><Clock3 size={22}/><b>No payment history</b><span>This client has not had a premium payment request yet.</span></div>}<button className="ap-primary wide" onClick={()=>setHistory(null)}>Close</button></div></div>}

  {detail&&<div className="ap-modal-backdrop" onClick={()=>setDetail(null)}><div className="ap-modal ap-detail-modal" onClick={e=>e.stopPropagation()}><button className="ap-close" onClick={()=>setDetail(null)}><X/></button><span className="ap-eyebrow">{detail.type.toUpperCase()}</span><h2>{detail.data.ClientName||'Client'}</h2><div className="ap-detail-grid">{Object.entries(detail.data).filter(([k])=>!['ClientID','RequestID'].includes(k)).map(([k,v])=><div key={k}><small>{k.replace(/([a-z])([A-Z])/g,'$1 $2')}</small><strong>{String(v??'—')}</strong></div>)}</div><button className="ap-primary wide" onClick={()=>setDetail(null)}>Close</button></div></div>}

  {showForm&&<div className="ap-modal-backdrop"><div className="ap-modal ap-wizard ap-simple-submit">
   <button className="ap-close" onClick={()=>!loading&&setShowForm(false)}><X/></button>
   <div className="ap-wizard-head"><span className="ap-eyebrow">{editingPolicyId?'EDIT SAVED POLICY':'ADD NEW POLICY'}</span><h2>{editingPolicyId?'Edit Client & Policy':'Add Policy'}</h2><p>{editingPolicyId?'Update only the required client and policy details.':'Save the policy first. You can request payment later from My Policies.'}</p></div>
   <div className="ap-simple-flow"><span>1</span><i></i><span>2</span><i></i><span>3</span><small>Client</small><small>Policy</small><small>Payment</small></div>
   <div className="ap-form-grid ap-three-fields">
    <label>Client Name<input value={policyForm.ClientName} onChange={e=>setPolicyForm({...policyForm,ClientName:e.target.value})} placeholder="Full name"/></label>
    <label>Policy Number<input value={policyForm.PolicyNumber} onChange={e=>setPolicyForm({...policyForm,PolicyNumber:e.target.value.toUpperCase()})} placeholder="Policy number"/></label>
    <label>Date of Birth<input type="date" value={policyForm.DateOfBirth} onChange={e=>setPolicyForm({...policyForm,DateOfBirth:e.target.value})}/></label>
   </div>
   <div className="ap-info-note"><ShieldCheck size={15}/><span>No premium amount, payment amount, due date or other policy details are required here. Admin verifies those details when you request payment.</span></div>
   <div className="ap-wizard-actions"><button className="ap-secondary" onClick={()=>setShowForm(false)} disabled={loading}>Cancel</button><button className="ap-primary ap-send" disabled={loading||!policyForm.ClientName||!policyForm.PolicyNumber||!policyForm.DateOfBirth} onClick={editingPolicyId?editPolicy:addPolicy}>{loading?<RefreshCw className="spin"/>:editingPolicyId?<CheckCircle2 size={15}/>:<Plus size={15}/>} {editingPolicyId?'Save Changes':'Add Policy'}<ArrowRight size={15}/></button></div>
  </div></div>}
 </div>
}

function LoadingOverlay({text}){return <div className="ap-loading-overlay"><div className="ap-loader-card"><div className="ap-loader-logo"><img src={LOGO_URL} alt="Trusted Circle"/><span></span></div><strong>{text}</strong><small>Trusted Circle is securely preparing your workspace.</small><div className="ap-loader-line"><i></i></div></div></div>}
