import {useEffect,useState} from 'react'
import {ArrowRight,CalendarDays,CheckCircle2,FileText,LogIn,Plus,ReceiptText,RefreshCw,ShieldCheck,UserRound,Users,X} from 'lucide-react'
import {agentBusinessApi} from '../agentBusinessApi'
import '../agent-portal.css'

const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(n||0))
const empty={ClientName:'',Mobile:'',Email:'',PolicyNumber:'',PremiumAmount:'',DueDate:''}

export default function AgentPortalPage(){
 const[logged,setLogged]=useState(false),[agent,setAgent]=useState(null),[agents,setAgents]=useState([]),[agentCode,setAgentCode]=useState(''),[mobile,setMobile]=useState(''),[clients,setClients]=useState([]),[policies,setPolicies]=useState([]),[bills,setBills]=useState([]),[requests,setRequests]=useState([]),[tab,setTab]=useState('dashboard'),[form,setForm]=useState(empty),[showForm,setShowForm]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('')

 const login=async()=>{
  setError('');setLoading(true)
  try{
   const r=await agentBusinessApi.list('Agents',{search:agentCode.trim()})
   const match=(r.items||[]).find(a=>String(a.AgentCode||'').toLowerCase()===agentCode.trim().toLowerCase()&&String(a.Mobile||'').replace(/\D/g,'')===mobile.replace(/\D/g,'')&&String(a.InsuranceCompany||'').toUpperCase()==='LIC'&&String(a.Status||'ACTIVE').toUpperCase()==='ACTIVE')
   if(!match)throw new Error('LIC Agent details could not be verified.')
   setAgent(match);setLogged(true)
  }catch(e){setError(e.message)}finally{setLoading(false)}
 }
 const load=async()=>{
  if(!agent)return
  setLoading(true);setError('')
  try{
   const [c,p,b,r]=await Promise.all([
    agentBusinessApi.list('Clients',{search:agent.AgentID}),
    agentBusinessApi.list('Policies',{search:agent.AgentID}),
    agentBusinessApi.list('PremiumBills',{search:agent.AgentID}),
    agentBusinessApi.list('PaymentRequests',{search:agent.AgentID})
   ])
   setClients((c.items||[]).filter(x=>String(x.AgentID)===String(agent.AgentID)))
   setPolicies((p.items||[]).filter(x=>String(x.AgentID)===String(agent.AgentID)))
   setBills((b.items||[]).filter(x=>String(x.AgentID)===String(agent.AgentID)))
   setRequests((r.items||[]).filter(x=>String(x.AgentID)===String(agent.AgentID)))
  }catch(e){setError(e.message)}finally{setLoading(false)}
 }
 useEffect(()=>{if(agent)load()},[agent])

 const saveClient=async()=>{
  try{
   await agentBusinessApi.save('Clients',{ClientID:undefined,AgentID:agent.AgentID,ClientName:form.ClientName,Mobile:form.Mobile,Email:form.Email,Status:'ACTIVE'})
   setShowForm(false);setForm(empty);await load()
  }catch(e){setError(e.message)}
 }

 if(!logged)return <div className="agent-portal-page"><div className="agent-login-shell"><div className="agent-login-card"><div className="agent-login-brand"><span>TC</span><div><strong>Trusted Circle</strong><small>LIC Agent Portal</small></div></div><div className="agent-login-icon"><ShieldCheck size={25}/></div><span className="ap-eyebrow">LIC AGENT ACCESS</span><h1>Welcome, Agent</h1><p>Access your clients, policies and premium payment requests.</p><label>Agent Code<input value={agentCode} onChange={e=>setAgentCode(e.target.value)} placeholder="Enter Agent Code"/></label><label>Registered Mobile<input value={mobile} onChange={e=>setMobile(e.target.value)} inputMode="numeric" placeholder="Registered mobile number"/></label>{error&&<div className="ap-error">{error}</div>}<button className="ap-primary wide" disabled={loading||!agentCode||!mobile} onClick={login}>{loading?<RefreshCw className="spin"/>:<LogIn size={17}/>}Verify & Enter</button><a href="#/home">Back to Trusted Circle</a></div></div></div>

 return <div className="agent-portal-page"><header className="ap-header"><div className="ap-brand"><span>TC</span><div><strong>Trusted Circle</strong><small>LIC Agent Portal</small></div></div><div className="ap-agent"><UserRound size={16}/><div><b>{agent.AgentName}</b><small>{agent.AgentCode} · LIC</small></div><button onClick={()=>{setLogged(false);setAgent(null)}}>Logout</button></div></header><main className="ap-main">
 <div className="ap-welcome"><div><span className="ap-eyebrow">LIC PARTNER WORKSPACE</span><h1>Hello, {agent.AgentName?.split(' ')[0]||'Agent'} 👋</h1><p>Manage your clients and submit premium payment requests.</p></div><button className="ap-secondary" onClick={load}><RefreshCw size={15}/>Refresh</button></div>
 <nav className="ap-tabs">{[['dashboard','Dashboard'],['clients','My Clients'],['policies','Policies'],['bills','Premium Bills'],['requests','Payment Requests']].map(([k,l])=><button className={tab===k?'active':''} onClick={()=>setTab(k)} key={k}>{l}</button>)}</nav>
 {error&&<div className="ap-error"><X size={15}/>{error}</div>}
 {tab==='dashboard'&&<><div className="ap-stats"><Stat icon={Users} label="My Clients" value={clients.length}/><Stat icon={FileText} label="Policies" value={policies.length}/><Stat icon={CalendarDays} label="Premium Bills" value={bills.length}/><Stat icon={ReceiptText} label="Requests" value={requests.length}/></div><div className="ap-panels"><section className="ap-panel"><div className="ap-panel-head"><div><span className="ap-eyebrow">QUICK ACTION</span><h2>Manage your business</h2></div></div><div className="ap-actions"><button onClick={()=>{setForm(empty);setShowForm(true)}}><Plus size={19}/><b>Add Client</b><small>Create a new client profile</small></button><button onClick={()=>setTab('bills')}><FileText size={19}/><b>Premium Bills</b><small>View upcoming premiums</small></button><button onClick={()=>setTab('requests')}><ReceiptText size={19}/><b>Payment Requests</b><small>Track submitted requests</small></button></div></section><section className="ap-panel"><span className="ap-eyebrow">ACCOUNT</span><h2>Agent Information</h2><div className="ap-info"><span>Agent Code <b>{agent.AgentCode}</b></span><span>Company <b>LIC</b></span><span>Mobile <b>{agent.Mobile}</b></span><span>Status <b className="green">{agent.Status||'ACTIVE'}</b></span></div></section></div></>}
 {tab==='clients'&&<DataSection title="My Clients" rows={clients} onAdd={()=>{setForm(empty);setShowForm(true)}} columns={['ClientName','Mobile','Email','Status']}/>}
 {tab==='policies'&&<DataSection title="My Policies" rows={policies} columns={['PolicyNumber','ClientID','PremiumAmount','PremiumFrequency','NextDueDate','PolicyStatus']}/>}
 {tab==='bills'&&<DataSection title="Premium Bills" rows={bills} columns={['BillID','PolicyNumber','PremiumAmount','DueDate','CustomerPayable','PaymentStatus']}/>}
 {tab==='requests'&&<DataSection title="Payment Requests" rows={requests} columns={['RequestID','BillID','PremiumAmount','CustomerPayable','Status','RequestedAt']}/>}
 </main>
 {showForm&&<div className="ap-modal-backdrop"><div className="ap-modal"><button className="ap-close" onClick={()=>setShowForm(false)}><X/></button><span className="ap-eyebrow">NEW CLIENT</span><h2>Add Client</h2><p>Client information will be linked to your LIC agent account.</p><label>Client Name<input value={form.ClientName} onChange={e=>setForm({...form,ClientName:e.target.value})}/></label><label>Mobile<input value={form.Mobile} onChange={e=>setForm({...form,Mobile:e.target.value})}/></label><label>Email<input value={form.Email} onChange={e=>setForm({...form,Email:e.target.value})}/></label><button className="ap-primary wide" onClick={saveClient}><CheckCircle2 size={16}/>Save Client</button></div></div>}
 </div>
}
function Stat({icon:Icon,label,value}){return <div className="ap-stat"><span><Icon size={18}/></span><small>{label}</small><strong>{value}</strong></div>}
function DataSection({title,rows,onAdd,columns=[]}){return <section className="ap-panel ap-data"><div className="ap-panel-head"><div><span className="ap-eyebrow">MY RECORDS</span><h2>{title}</h2></div>{onAdd&&<button className="ap-primary" onClick={onAdd}><Plus size={15}/>Add Client</button>}</div>{rows.length?<div className="ap-table"><table><thead><tr>{columns.map(c=><th key={c}>{c.replace(/([a-z])([A-Z])/g,'$1 $2')}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{columns.map(c=><td key={c}>{String(r[c]??'')}</td>)}</tr>)}</tbody></table></div>:<div className="ap-empty"><FileText size={22}/><b>No records found</b><span>Records linked to your agent account will appear here.</span></div>}</section>}
