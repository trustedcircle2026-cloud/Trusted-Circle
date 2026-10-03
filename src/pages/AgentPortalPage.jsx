import {useEffect,useMemo,useState} from 'react'
import {ArrowRight,CheckCircle2,FileText,LogIn,Plus,RefreshCw,ShieldCheck,Users,X,LogOut,Send,CalendarDays,WalletCards,Sparkles,Clock3,ChevronRight} from 'lucide-react'
import {agentBusinessApi} from '../agentBusinessApi'
import '../agent-portal.css'

const LOGO_URL='https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'
const emptyClient={ClientName:'',PolicyNumber:'',DateOfBirth:''}
const emptyPolicy={PolicyType:'',PolicyHolder:'',PremiumAmount:'',PremiumFrequency:'Monthly',NextDueDate:'',PolicyStatus:'ACTIVE',Notes:''}
const loadingMessages=['Securing your agent session…','Loading your client workspace…','Syncing your latest submissions…','Preparing the payment workflow…']

export default function AgentPortalPage(){
 const[session,setSession]=useState(()=>localStorage.getItem('tc_agent_session')||'')
 const[agent,setAgent]=useState(null),[clients,setClients]=useState([]),[requests,setRequests]=useState([]),[mobile,setMobile]=useState(''),[password,setPassword]=useState(''),[clientForm,setClientForm]=useState(emptyClient),[policyForm,setPolicyForm]=useState(emptyPolicy),[showForm,setShowForm]=useState(false),[step,setStep]=useState(1),[loading,setLoading]=useState(false),[loadingText,setLoadingText]=useState(loadingMessages[0]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[activeTab,setActiveTab]=useState('clients')

 const load=async token=>{
  setLoading(true);setError('')
  let timer
  try{
   let i=0;setLoadingText(loadingMessages[0]);timer=setInterval(()=>setLoadingText(loadingMessages[++i%loadingMessages.length]),850)
   const me=await agentBusinessApi.agentMe(token)
   const data=await agentBusinessApi.agentClients(token)
   const req=await agentBusinessApi.agentPaymentRequests(token)
   setAgent(me.agent);setClients(data.items||[]);setRequests(req.items||[])
  }catch(e){
   localStorage.removeItem('tc_agent_session');setSession('');setAgent(null);setClients([]);setRequests([])
   setError(e.message)
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

 const addClientAndRequest=async()=>{
  setLoading(true);setError('');setNotice('');setLoadingText('Creating client, policy and payment request…')
  try{
   const data=await agentBusinessApi.agentAddClient(session,{...clientForm,PolicyDetails:policyForm})
   setClients(current=>[data.client,...current])
   setRequests(current=>[data.paymentRequest,...current])
   setClientForm(emptyClient);setPolicyForm(emptyPolicy);setStep(1);setShowForm(false)
   setNotice('Payment request sent to Trusted Circle Admin for processing.')
  }catch(e){setError(e.message)}finally{setLoading(false)}
 }

 const logout=async()=>{
  try{if(session)await agentBusinessApi.agentLogout(session)}catch{}
  localStorage.removeItem('tc_agent_session');setSession('');setAgent(null);setClients([]);setRequests([])
 }

 const pending=requests.filter(r=>!['PAID','COMPLETED','CANCELLED'].includes(String(r.Status||'').toUpperCase())).length
 const latestRequests=useMemo(()=>requests.slice(0,8),[requests])

 if(!session||!agent)return <div className="agent-portal-page">
  {loading&&<LoadingOverlay text={loadingText}/>}
  <div className="agent-login-shell">
   <div className="agent-login-orbit orbit-one"></div><div className="agent-login-orbit orbit-two"></div>
   <div className="agent-login-card">
    <div className="agent-login-brand"><img src={LOGO_URL} alt="Trusted Circle"/><div><strong>Trusted Circle</strong><small>LIC Agent Portal</small></div></div>
    <div className="agent-login-icon"><ShieldCheck size={25}/></div>
    <span className="ap-eyebrow">SECURE AGENT ACCESS</span>
    <h1>Welcome back 👋</h1>
    <p>Submit your client and policy details, then send the premium payment request directly to our Admin team.</p>
    <label>Mobile Number<input value={mobile} onChange={e=>setMobile(e.target.value.replace(/\D/g,'').slice(0,10))} inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" autoComplete="tel"/></label>
    <label>4-Digit Password<input type="password" value={password} onChange={e=>setPassword(e.target.value.replace(/\D/g,'').slice(0,4))} inputMode="numeric" maxLength={4} placeholder="••••" autoComplete="current-password"/></label>
    {error&&<div className="ap-error"><X size={15}/>{error}</div>}
    <button className="ap-primary wide" disabled={loading||mobile.length!==10||password.length!==4} onClick={login}>{loading?<RefreshCw className="spin"/>:<LogIn size={17}/>}Sign In</button>
    <a href="./">Back to Trusted Circle</a>
   </div>
  </div>
 </div>

 return <div className="agent-portal-page">
  {loading&&<LoadingOverlay text={loadingText}/>}
  <header className="ap-header">
   <div className="ap-brand"><img src={LOGO_URL} alt="Trusted Circle"/><div><strong>Trusted Circle</strong><small>LIC Agent Portal</small></div></div>
   <div className="ap-agent"><div><b>{agent.AgentName}</b><small>Agent Account · LIC</small></div><button onClick={logout}><LogOut size={15}/>Logout</button></div>
  </header>
  <main className="ap-main">
   <section className="ap-hero">
    <div><span className="ap-eyebrow">TRUSTED CIRCLE · LIC AGENT PORTAL</span><h1>Hello, {agent.AgentName?.split(' ')[0]||'Agent'} <span>👋</span></h1><p>Submit a client once. Add their policy. We'll take the payment request forward.</p></div>
    <div className="ap-hero-art"><Sparkles size={30}/><span></span><span></span><span></span></div>
   </section>

   {error&&<div className="ap-error ap-banner"><X size={15}/><span>{error}</span><button onClick={()=>setError('')}>Dismiss</button></div>}
   {notice&&<div className="ap-success ap-banner"><CheckCircle2 size={16}/><span>{notice}</span><button onClick={()=>setNotice('')}>Dismiss</button></div>}

   <div className="ap-stats">
    <Stat icon={Users} label="Clients Submitted" value={clients.length} tone="green"/>
    <Stat icon={FileText} label="Payment Requests" value={requests.length} tone="blue"/>
    <Stat icon={Clock3} label="Pending Requests" value={pending} tone="amber"/>
    <Stat icon={ShieldCheck} label="Account Access" value="Active" tone="purple"/>
   </div>

   <div className="ap-tabs">
    <button className={activeTab==='clients'?'active':''} onClick={()=>setActiveTab('clients')}><Users size={15}/>My Clients</button>
    <button className={activeTab==='requests'?'active':''} onClick={()=>setActiveTab('requests')}><Send size={15}/>Payment Requests <span>{pending}</span></button>
   </div>

   {activeTab==='clients'?<section className="ap-panel ap-data">
    <div className="ap-panel-head"><div><span className="ap-eyebrow">CLIENT WORKSPACE</span><h2>My Clients</h2><p>Client, policy and premium details are submitted together for faster processing.</p></div><button className="ap-primary" onClick={()=>{setError('');setNotice('');setClientForm(emptyClient);setPolicyForm(emptyPolicy);setStep(1);setShowForm(true)}}><Plus size={15}/>Add Client & Policy</button></div>
    {clients.length?<div className="ap-client-grid">{clients.map(r=><div className="ap-client-card" key={r.ClientID}><div className="ap-client-top"><span className="ap-avatar">{String(r.ClientName||'?').trim().charAt(0).toUpperCase()}</span><div><strong>{r.ClientName}</strong><small>Policy {r.PolicyNumber}</small></div><span className="ap-status">{r.Status||'ACTIVE'}</span></div><div className="ap-client-meta"><span><CalendarDays size={13}/>{r.DateOfBirth}</span><span><WalletCards size={13}/>{r.PolicyType||'LIC Policy'}</span></div><div className="ap-client-bottom"><span>Premium <b>₹{Number(r.PremiumAmount||0).toLocaleString('en-IN')}</b></span><span className={'ap-request-pill '+String(r.RequestStatus||'PENDING').toLowerCase()}>{r.RequestStatus||'PENDING'}</span></div></div>)}</div>:<div className="ap-empty ap-empty-color"><div className="ap-empty-icon"><Users size={23}/></div><b>No client submissions yet</b><span>Add the client and policy together to create a payment request.</span><button className="ap-primary" onClick={()=>setShowForm(true)}><Plus size={15}/>Start First Submission</button></div>}
   </section>:<section className="ap-panel ap-data">
    <div className="ap-panel-head"><div><span className="ap-eyebrow">ADMIN WORKFLOW</span><h2>Payment Requests</h2><p>Requests are sent to Trusted Circle Admin for review and payment processing.</p></div><button className="ap-secondary" onClick={()=>load(session)} disabled={loading}><RefreshCw size={15}/>Refresh</button></div>
    {latestRequests.length?<div className="ap-request-list">{latestRequests.map(r=><div className="ap-request-card" key={r.RequestID}><div className="ap-request-icon"><Send size={17}/></div><div className="ap-request-main"><strong>{r.ClientName||'Client'}</strong><span>Policy {r.PolicyNumber} · Premium ₹{Number(r.PremiumAmount||0).toLocaleString('en-IN')}</span><small>Submitted {r.RequestedAt?new Date(r.RequestedAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'just now'}</small></div><span className={'ap-request-pill '+String(r.Status||'PENDING').toLowerCase()}>{r.Status||'PENDING'}</span><ChevronRight size={17}/></div>)}</div>:<div className="ap-empty"><Send size={22}/><b>No payment requests yet</b><span>Add a client and policy to send the first request.</span></div>}
   </section>}
  </main>

  {showForm&&<div className="ap-modal-backdrop"><div className="ap-modal ap-wizard">
   <button className="ap-close" onClick={()=>!loading&&setShowForm(false)}><X/></button>
   <div className="ap-wizard-head"><span className="ap-eyebrow">NEW PAYMENT REQUEST</span><h2>{step===1?'Client Details':step===2?'Policy Details':'Review & Send'}</h2><p>{step===1?'Start with the three details required for client verification.':step===2?'Add the policy and premium details needed for payment processing.':'Review everything before sending the request to Admin.'}</p></div>
   <div className="ap-stepper"><span className={step>=1?'done':''}>1</span><i></i><span className={step>=2?'done':''}>2</span><i></i><span className={step>=3?'done':''}>3</span></div>
   {step===1&&<div className="ap-form-grid"><label>Client Name<input value={clientForm.ClientName} onChange={e=>setClientForm({...clientForm,ClientName:e.target.value})} placeholder="Full name"/></label><label>Policy Number<input value={clientForm.PolicyNumber} onChange={e=>setClientForm({...clientForm,PolicyNumber:e.target.value.toUpperCase()})} placeholder="LIC policy number"/></label><label>Date of Birth<input type="date" value={clientForm.DateOfBirth} onChange={e=>setClientForm({...clientForm,DateOfBirth:e.target.value})}/></label></div>}
   {step===2&&<div className="ap-form-grid"><label>Policy Type<input value={policyForm.PolicyType} onChange={e=>setPolicyForm({...policyForm,PolicyType:e.target.value})} placeholder="e.g. Jeevan Anand"/></label><label>Policy Holder<input value={policyForm.PolicyHolder} onChange={e=>setPolicyForm({...policyForm,PolicyHolder:e.target.value})} placeholder="Policy holder name"/></label><label>Premium Amount<input type="number" min="1" value={policyForm.PremiumAmount} onChange={e=>setPolicyForm({...policyForm,PremiumAmount:e.target.value})} placeholder="₹ Premium due"/></label><label>Premium Frequency<select value={policyForm.PremiumFrequency} onChange={e=>setPolicyForm({...policyForm,PremiumFrequency:e.target.value})}><option>Monthly</option><option>Quarterly</option><option>Half-Yearly</option><option>Yearly</option><option>Single</option></select></label><label>Next Premium Due Date<input type="date" value={policyForm.NextDueDate} onChange={e=>setPolicyForm({...policyForm,NextDueDate:e.target.value})}/></label><label>Notes<textarea value={policyForm.Notes} onChange={e=>setPolicyForm({...policyForm,Notes:e.target.value})} placeholder="Optional"></textarea></label></div>}
   {step===3&&<div className="ap-review"><div className="ap-review-card"><span>CLIENT</span><strong>{clientForm.ClientName}</strong><small>{clientForm.PolicyNumber} · DOB {clientForm.DateOfBirth}</small></div><div className="ap-review-card"><span>POLICY & PAYMENT</span><strong>{policyForm.PolicyType||'LIC Policy'} · ₹{Number(policyForm.PremiumAmount||0).toLocaleString('en-IN')}</strong><small>{policyForm.PremiumFrequency} · Due {policyForm.NextDueDate}</small></div><div className="ap-review-flow"><div><span>1</span><b>Submitted</b></div><i></i><div><span>2</span><b>Admin Review</b></div><i></i><div><span>3</span><b>Payment</b></div></div></div>}
   <div className="ap-wizard-actions">{step>1?<button className="ap-secondary" onClick={()=>setStep(step-1)} disabled={loading}>Back</button>:<span></span>}{step<3?<button className="ap-primary" disabled={step===1?(!clientForm.ClientName||!clientForm.PolicyNumber||!clientForm.DateOfBirth):(!policyForm.PremiumAmount||!policyForm.NextDueDate)} onClick={()=>setStep(step+1)}>Continue<ArrowRight size={15}/></button>:<button className="ap-primary ap-send" disabled={loading} onClick={addClientAndRequest}>{loading?<RefreshCw className="spin"/>:<Send size={15}/>}Send to Admin</button>}</div>
  </div></div>}
 </div>
}

function LoadingOverlay({text}){return <div className="ap-loading-overlay"><div className="ap-loader-card"><div className="ap-loader-ring"><span></span><span></span><span></span></div><strong>{text}</strong><small>Trusted Circle is securely preparing your workspace.</small><div className="ap-loader-line"><i></i></div></div></div>}
function Stat({icon:Icon,label,value,tone='green'}){return <div className={'ap-stat '+tone}><span><Icon size={18}/></span><small>{label}</small><strong>{value}</strong></div>}
