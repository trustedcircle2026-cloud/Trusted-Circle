import {useEffect,useState} from 'react'
import {ArrowRight,CheckCircle2,LogIn,Plus,RefreshCw,ShieldCheck,Users,X,LogOut} from 'lucide-react'
import {agentBusinessApi} from '../agentBusinessApi'
import '../agent-portal.css'

const LOGO_URL='https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'
const empty={ClientName:'',PolicyNumber:'',DateOfBirth:''}

export default function AgentPortalPage(){
 const[session,setSession]=useState(()=>localStorage.getItem('tc_agent_session')||'')
 const[agent,setAgent]=useState(null),[clients,setClients]=useState([]),[mobile,setMobile]=useState(''),[password,setPassword]=useState(''),[form,setForm]=useState(empty),[showForm,setShowForm]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')

 const load=async token=>{
  setLoading(true);setError('')
  try{
   const me=await agentBusinessApi.agentMe(token)
   const data=await agentBusinessApi.agentClients(token)
   setAgent(me.agent);setClients(data.items||[])
  }catch(e){
   localStorage.removeItem('tc_agent_session');setSession('');setAgent(null);setClients([])
   setError(e.message)
  }finally{setLoading(false)}
 }

 useEffect(()=>{if(session)load(session)},[session])

 const login=async()=>{
  setLoading(true);setError('');setNotice('')
  try{
   const data=await agentBusinessApi.agentLogin(mobile,password)
   localStorage.setItem('tc_agent_session',data.token);setSession(data.token);setAgent(data.agent);setPassword('')
  }catch(e){setError(e.message)}finally{setLoading(false)}
 }

 const addClient=async()=>{
  setLoading(true);setError('');setNotice('')
  try{
   const data=await agentBusinessApi.agentAddClient(session,form)
   setClients(current=>[data.item,...current]);setForm(empty);setShowForm(false);setNotice('Client details submitted successfully.')
  }catch(e){setError(e.message)}finally{setLoading(false)}
 }

 const logout=async()=>{
  try{if(session)await agentBusinessApi.agentLogout(session)}catch{}
  localStorage.removeItem('tc_agent_session');setSession('');setAgent(null);setClients([])
 }

 if(!session||!agent)return <div className="agent-portal-page">
  <div className="agent-login-shell">
   <div className="agent-login-card">
    <div className="agent-login-brand"><img src={LOGO_URL} alt="Trusted Circle"/><div><strong>Trusted Circle</strong><small>Agent Portal</small></div></div>
    <div className="agent-login-icon"><ShieldCheck size={25}/></div>
    <span className="ap-eyebrow">AGENT ACCESS</span>
    <h1>Welcome back</h1>
    <p>Sign in securely to submit your client details for premium payment processing.</p>
    <label>Mobile Number<input value={mobile} onChange={e=>setMobile(e.target.value.replace(/\D/g,'').slice(0,10))} inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" autoComplete="tel"/></label>
    <label>4-Digit Password<input type="password" value={password} onChange={e=>setPassword(e.target.value.replace(/\D/g,'').slice(0,4))} inputMode="numeric" maxLength={4} placeholder="••••" autoComplete="current-password"/></label>
    {error&&<div className="ap-error"><X size={15}/>{error}</div>}
    <button className="ap-primary wide" disabled={loading||mobile.length!==10||password.length!==4} onClick={login}>{loading?<RefreshCw className="spin"/>:<LogIn size={17}/>}Sign In</button>
    <a href="./">Back to Trusted Circle</a>
   </div>
  </div>
 </div>

 return <div className="agent-portal-page">
  <header className="ap-header">
   <div className="ap-brand"><img src={LOGO_URL} alt="Trusted Circle"/><div><strong>Trusted Circle</strong><small>Agent Portal</small></div></div>
   <div className="ap-agent"><div><b>{agent.AgentName}</b><small>Agent Account</small></div><button onClick={logout}><LogOut size={15}/>Logout</button></div>
  </header>
  <main className="ap-main">
   <div className="ap-welcome"><div><span className="ap-eyebrow">TRUSTED CIRCLE · AGENT PORTAL</span><h1>Hello, {agent.AgentName?.split(' ')[0]||'Agent'} 👋</h1><p>Share only the client details required for us to process premium payments.</p></div><button className="ap-secondary" onClick={()=>load(session)} disabled={loading}><RefreshCw size={15}/>Refresh</button></div>
   {error&&<div className="ap-error"><X size={15}/>{error}</div>}
   {notice&&<div className="ap-success"><CheckCircle2 size={16}/>{notice}</div>}
   <div className="ap-stats"><Stat icon={Users} label="Submitted Clients" value={clients.length}/><Stat icon={ShieldCheck} label="Access" value="Active"/></div>
   <section className="ap-panel ap-data">
    <div className="ap-panel-head"><div><span className="ap-eyebrow">CLIENT SUBMISSIONS</span><h2>My Clients</h2><p>Only Name, Policy Number and Date of Birth are shared with Trusted Circle.</p></div><button className="ap-primary" onClick={()=>{setNotice('');setForm(empty);setShowForm(true)}}><Plus size={15}/>Add Client</button></div>
    {clients.length?<div className="ap-table"><table><thead><tr><th>Client Name</th><th>Policy Number</th><th>Date of Birth</th><th>Status</th></tr></thead><tbody>{clients.map(r=><tr key={r.ClientID}><td>{r.ClientName}</td><td>{r.PolicyNumber}</td><td>{r.DateOfBirth}</td><td><span className="ap-status">{r.Status||'ACTIVE'}</span></td></tr>)}</tbody></table></div>:<div className="ap-empty"><Users size={22}/><b>No client submissions yet</b><span>Add a client using only the three required details.</span><button className="ap-primary" onClick={()=>setShowForm(true)}><Plus size={15}/>Add Client</button></div>}
   </section>
  </main>
  {showForm&&<div className="ap-modal-backdrop"><div className="ap-modal">
   <button className="ap-close" onClick={()=>setShowForm(false)}><X/></button><span className="ap-eyebrow">NEW CLIENT</span><h2>Submit Client Details</h2><p>Only these three details are collected for payment processing.</p>
   <label>Client Name<input value={form.ClientName} onChange={e=>setForm({...form,ClientName:e.target.value})} placeholder="Full name"/></label>
   <label>Policy Number<input value={form.PolicyNumber} onChange={e=>setForm({...form,PolicyNumber:e.target.value.toUpperCase()})} placeholder="Policy number"/></label>
   <label>Date of Birth<input type="date" value={form.DateOfBirth} onChange={e=>setForm({...form,DateOfBirth:e.target.value})}/></label>
   <button className="ap-primary wide" disabled={loading||!form.ClientName||!form.PolicyNumber||!form.DateOfBirth} onClick={addClient}><CheckCircle2 size={16}/>Submit Client</button>
  </div></div>}
 </div>
}

function Stat({icon:Icon,label,value}){return <div className="ap-stat"><span><Icon size={18}/></span><small>{label}</small><strong>{value}</strong></div>}
