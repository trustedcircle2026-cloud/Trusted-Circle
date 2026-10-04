import {useEffect,useMemo,useState} from 'react'
import {Activity,AlertTriangle,Bell,CheckCircle2,ChevronRight,CircleUserRound,Clock3,Eye,EyeOff,Home,KeyRound,LogIn,LogOut,Menu,MoreHorizontal,RefreshCw,Send,ShieldCheck,Users,X} from 'lucide-react'
import {api} from './api'
import './admin-workspace.css'
import './admin-upgrade.css'
import './admin-admin-mobile.css'

const LOGO='https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'
const SHEET_AGENTS='Agents'
const SHEET_REQUESTS='AgentPaymentRequests'

export default function AdminWorkspaceV2(){
 const[token,setToken]=useState(()=>localStorage.getItem('tc_erp_session')||'')
 const[user,setUser]=useState(null)
 const[login,setLogin]=useState({email:'trustedcircle2026@gmail.com',password:''})
 const[error,setError]=useState(''),[notice,setNotice]=useState('')
 const[loading,setLoading]=useState(false),[menuOpen,setMenuOpen]=useState(false)
 const[activeTab,setActiveTab]=useState('home'),[profileOpen,setProfileOpen]=useState(false)
 const[agents,setAgents]=useState([]),[requests,setRequests]=useState([]),[detail,setDetail]=useState(null)
 const[search,setSearch]=useState('')

 useEffect(()=>{
   if(!window.location.hash.replace(/^#\/?/,'').startsWith('erp'))return
   const t=localStorage.getItem('tc_erp_session')
   const stored=JSON.parse(localStorage.getItem('tc_erp_admin_user')||'null')
   if(t){setToken(t);setUser(stored||{email:'trustedcircle2026@gmail.com'});loadData(t)}
 },[])

 async function loadData(t=token){
   if(!t)return
   setLoading(true);setError('')
   try{
     const [a,r]=await Promise.all([
       api.adminTable(t,SHEET_AGENTS).catch(()=>({table:{rows:[]}})),
       api.adminTable(t,SHEET_REQUESTS).catch(()=>({table:{rows:[]}}))
     ])
     setAgents(a?.table?.rows||[])
     setRequests(r?.table?.rows||[])
   }catch(e){setError(apiError(e))}
   finally{setLoading(false)}
 }

 async function loginSubmit(e){
   e.preventDefault();setLoading(true);setError('')
   try{
     const r=await api.adminLogin(login.email,login.password)
     localStorage.setItem('tc_erp_session',r.session.token)
     localStorage.setItem('tc_erp_admin_user',JSON.stringify(r.user||{}))
     setToken(r.session.token);setUser(r.user||{});setMenuOpen(false);setNotice('Signed in successfully.');await loadData(r.session.token)
   }catch(e){setError(apiError(e))}
   finally{setLoading(false)}
 }

 function logout(){
   localStorage.removeItem('tc_erp_session');localStorage.removeItem('tc_erp_admin_user');localStorage.removeItem('tc_erp_sidebar')
   setToken('');setUser(null);setMenuOpen(false);setProfileOpen(false);window.location.href='/admin.html'
 }

 const pending=requests.filter(r=>['PENDING','REQUESTED','SUBMITTED','INITIATED','PROCESSING'].includes(String(r.Status||r.RequestStatus||'').toUpperCase())).length
 const completed=requests.filter(r=>['PAID','COMPLETED','VERIFIED','CONFIRMED','FULFILLED'].includes(String(r.Status||r.RequestStatus||'').toUpperCase())).length
 const activeAgents=agents.filter(r=>!['INACTIVE','DISABLED','SUSPENDED','DELETED'].includes(String(r.Status||r.AgentStatus||'').toUpperCase())).length
 const filteredAgents=useMemo(()=>{
   const q=search.trim().toLowerCase();if(!q)return agents
   return agents.filter(r=>Object.values(r||{}).some(v=>String(v??'').toLowerCase().includes(q)))
 },[agents,search])
 const filteredRequests=useMemo(()=>{
   const q=search.trim().toLowerCase();if(!q)return requests
   return requests.filter(r=>Object.values(r||{}).some(v=>String(v??'').toLowerCase().includes(q)))
 },[requests,search])

 if(!token||!user)return <Login login={login} setLogin={setLogin} loading={loading} error={error} onSubmit={loginSubmit}/>

 return <div className="tc-admin-mobile-page">
   <main className="tam-main">
    <header className="tam-header">
      <div className="tam-brand"><img src={LOGO} alt="Trusted Circle"/><div><strong>Trusted Circle</strong><small>Admin Portal</small></div></div>
      <div className="tam-header-actions">
        <button className="tam-icon-btn" onClick={()=>setActiveTab('requests')} aria-label="Requests"><Bell size={20}/>{pending>0&&<b>{pending}</b>}</button>
        <button className="tam-profile-btn" onClick={()=>setProfileOpen(true)} aria-label="Admin profile"><span>{String(user.name||user.Name||'Admin').charAt(0).toUpperCase()}</span><strong>Admin</strong><CircleUserRound size={18}/></button>
      </div>
    </header>

    {notice&&<div className="tam-toast tam-success"><CheckCircle2 size={16}/><span>{notice}</span><button onClick={()=>setNotice('')}>Dismiss</button></div>}
    {error&&<div className="tam-toast tam-error"><AlertTriangle size={16}/><span>{error}</span><button onClick={()=>setError('')}>Dismiss</button></div>}

    <section className="tam-content">
      {activeTab==='home'&&<HomePage agents={agents} requests={requests} pending={pending} activeAgents={activeAgents} completed={completed} onTab={setActiveTab}/>}
      {activeTab==='agents'&&<AgentsPage agents={filteredAgents} search={search} setSearch={setSearch} loading={loading} onRefresh={()=>loadData()} onDetail={setDetail}/>}
      {activeTab==='requests'&&<RequestsPage requests={filteredRequests} search={search} setSearch={setSearch} loading={loading} onRefresh={()=>loadData()} onDetail={setDetail}/>}
      {activeTab==='history'&&<HistoryPage requests={requests} onDetail={setDetail}/>}
      {activeTab==='more'&&<MorePage onLogout={logout}/>}
    </section>

    <nav className="tam-bottom-nav" aria-label="Admin navigation">
      <button className={activeTab==='home'?'active':''} onClick={()=>setActiveTab('home')}><Home size={21}/><span>Home</span></button>
      <button className={activeTab==='agents'?'active':''} onClick={()=>setActiveTab('agents')}><Users size={21}/><span>Agents</span>{activeAgents>0&&<b>{activeAgents}</b>}</button>
      <button className={activeTab==='requests'?'active':''} onClick={()=>setActiveTab('requests')}><Send size={21}/><span>Requests</span>{pending>0&&<b>{pending}</b>}</button>
      <button className={activeTab==='history'?'active':''} onClick={()=>setActiveTab('history')}><Clock3 size={21}/><span>History</span></button>
      <button className={activeTab==='more'?'active':''} onClick={()=>setActiveTab('more')}><MoreHorizontal size={21}/><span>More</span></button>
    </nav>

    {profileOpen&&<div className="tam-backdrop" onClick={()=>setProfileOpen(false)}><div className="tam-modal" onClick={e=>e.stopPropagation()}>
      <button className="tam-close" onClick={()=>setProfileOpen(false)}><X/></button>
      <div className="tam-profile-head"><span>{String(user.name||user.Name||'Admin').charAt(0).toUpperCase()}</span><div><small>ADMIN PROFILE</small><h2>Admin</h2><p>{user.email||'trustedcircle2026@gmail.com'}</p></div></div>
      <div className="tam-profile-grid"><div><small>Role</small><strong>Administrator</strong></div><div><small>Access</small><strong>Operations Control</strong></div><div><small>Portal</small><strong>Trusted Circle</strong></div></div>
      <button className="tam-signout" onClick={logout}><LogOut size={16}/>Sign Out</button>
    </div></div>}

    {detail&&<div className="tam-backdrop" onClick={()=>setDetail(null)}><div className="tam-modal" onClick={e=>e.stopPropagation()}>
      <button className="tam-close" onClick={()=>setDetail(null)}><X/></button><small className="tam-modal-kicker">RECORD DETAILS</small><h2>{detail.title||'Details'}</h2>
      <div className="tam-detail-grid">{Object.entries(detail.data||{}).filter(([k,v])=>v!==null&&v!==undefined&&v!=='').map(([k,v])=><div key={k}><small>{k.replace(/([a-z])([A-Z])/g,'$1 $2')}</small><strong>{String(v)}</strong></div>)}</div>
      <button className="tam-secondary wide" onClick={()=>setDetail(null)}>Close</button>
    </div></div>}
   </main>
 </div>
}

function HomePage({agents,requests,pending,activeAgents,completed,onTab}){
 return <div className="tam-home">
  <div className="tam-hero"><span>TRUSTED CIRCLE · ADMIN</span><h1>Admin Dashboard</h1><p>Manage agents, payment requests and operational history from one place.</p></div>
  <div className="tam-stats">
   <button onClick={()=>onTab('agents')}><Users size={20}/><strong>{activeAgents}</strong><span>Active Agents</span></button>
   <button onClick={()=>onTab('requests')}><Send size={20}/><strong>{pending}</strong><span>Pending Requests</span></button>
   <button onClick={()=>onTab('history')}><Clock3 size={20}/><strong>{completed}</strong><span>Completed</span></button>
  </div>
  <div className="tam-section-head"><small>AGENT WORKSPACE</small><h2>Agents</h2><button onClick={()=>onTab('agents')}>View all <ChevronRight size={15}/></button></div>
  <div className="tam-agent-grid">{agents.slice(0,6).map((a,i)=><button className="tam-agent-card" key={a.AgentID||a.ID||i} onClick={()=>onTab('agents')}><span>{String(a.AgentName||a.Name||'?').trim().charAt(0).toUpperCase()}</span><div><strong>{a.AgentName||a.Name||'Agent'}</strong><small>{a.Mobile||a.Phone||a.Email||'Agent account'}</small></div><ChevronRight size={16}/></button>)}</div>
  {!agents.length&&<div className="tam-empty"><Users size={21}/><strong>No agent records found</strong><span>Agent records will appear here when the Agent Business backend is connected to the Admin workspace.</span></div>}
  <div className="tam-quick-grid"><button onClick={()=>onTab('requests')}><Send size={18}/><span>Payment Requests</span><ChevronRight size={15}/></button><button onClick={()=>onTab('history')}><Clock3 size={18}/><span>Request History</span><ChevronRight size={15}/></button></div>
 </div>
}

function AgentsPage({agents,search,setSearch,loading,onRefresh,onDetail}){
 return <div className="tam-page"><PageHead kicker="AGENT MANAGEMENT" title="Agents" text="View and manage the agents connected to Trusted Circle." action={onRefresh} loading={loading}/>
 <SearchBox value={search} setValue={setSearch} placeholder="Search agent name, mobile or email"/>
 <div className="tam-agent-list">{agents.map((a,i)=><button className="tam-agent-row" key={a.AgentID||a.ID||i} onClick={()=>onDetail({title:a.AgentName||a.Name||'Agent',data:a})}><span className="tam-agent-avatar">{String(a.AgentName||a.Name||'?').trim().charAt(0).toUpperCase()}</span><div><strong>{a.AgentName||a.Name||'Agent'}</strong><small>{a.Mobile||a.Phone||a.Email||'—'}</small></div><span className="tam-status">{a.Status||a.AgentStatus||'ACTIVE'}</span><ChevronRight size={17}/></button>)}</div>
 {!agents.length&&<Empty icon={Users} title="No agents found" text="Try another search or refresh the Agent workspace."/>}
 </div>
}

function RequestsPage({requests,search,setSearch,loading,onRefresh,onDetail}){
 return <div className="tam-page"><PageHead kicker="PAYMENT WORKFLOW" title="Requests" text="Review payment requests raised by agents." action={onRefresh} loading={loading}/>
 <SearchBox value={search} setValue={setSearch} placeholder="Search client, policy or request"/>
 <div className="tam-request-list">{requests.map((r,i)=><button className="tam-request-row" key={r.RequestID||r.ID||i} onClick={()=>onDetail({title:r.ClientName||'Payment Request',data:r})}><span className="tam-request-icon"><Send size={17}/></span><div><strong>{r.ClientName||r.AgentName||'Payment Request'}</strong><small>Policy {r.PolicyNumber||r.PolicyID||'—'} · {r.AgentName||'Agent'}</small></div><span className={'tam-request-status '+String(r.Status||r.RequestStatus||'PENDING').toLowerCase()}>{r.Status||r.RequestStatus||'PENDING'}</span><ChevronRight size={17}/></button>)}</div>
 {!requests.length&&<Empty icon={Send} title="No payment requests" text="Agent payment requests will appear here."/>}
 </div>
}

function HistoryPage({requests,onDetail}){
 const history=requests.filter(r=>!['PENDING','REQUESTED','SUBMITTED','INITIATED','PROCESSING'].includes(String(r.Status||r.RequestStatus||'').toUpperCase()))
 return <div className="tam-page"><PageHead kicker="ACTIVITY" title="History" text="Completed and closed agent payment activity."/>
 <div className="tam-request-list">{history.map((r,i)=><button className="tam-request-row" key={r.RequestID||r.ID||i} onClick={()=>onDetail({title:r.ClientName||'Request History',data:r})}><span className="tam-request-icon"><Clock3 size={17}/></span><div><strong>{r.ClientName||'Payment Request'}</strong><small>{r.RequestedAt||r.UpdatedAt||r.PaymentDate||'—'}</small></div><span className={'tam-request-status '+String(r.Status||r.RequestStatus||'COMPLETED').toLowerCase()}>{r.Status||r.RequestStatus||'COMPLETED'}</span><ChevronRight size={17}/></button>)}</div>
 {!history.length&&<Empty icon={Clock3} title="No history yet" text="Completed request activity will appear here."/>}
 </div>
}

function MorePage({onLogout}){
 return <div className="tam-page tam-more"><div className="tam-more-icon"><MoreHorizontal size={25}/></div><small>ADMIN TOOLS</small><h1>More</h1><p>Additional administration tools will be added here next.</p><div className="tam-more-card"><Activity size={20}/><div><strong>More controls coming</strong><span>We will add settings, reports and advanced controls here without changing the five-button navigation.</span></div></div><button className="tam-signout tam-more-signout" onClick={onLogout}><LogOut size={16}/>Sign Out</button></div>
}

function PageHead({kicker,title,text,action,loading}){
 return <div className="tam-page-head"><div><small>{kicker}</small><h1>{title}</h1><p>{text}</p></div>{action&&<button className="tam-refresh" onClick={action} disabled={loading}><RefreshCw size={15} className={loading?'tam-spin':''}/>Refresh</button>}</div>
}
function SearchBox({value,setValue,placeholder}){return <div className="tam-search"><Users size={15}/><input value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder}/>{value&&<button onClick={()=>setValue('')}><X size={14}/></button>}</div>}
function Empty({icon:Icon,title,text}){return <div className="tam-empty"><Icon size={21}/><strong>{title}</strong><span>{text}</span></div>}
function apiError(e){const m=String(e?.message||'Request failed.');return /API request failed \(404\)/i.test(m)?'ERP backend returned 404. Update the Apps Script Web App deployment to the current backend version.':m}

function Login({login,setLogin,loading,error,onSubmit}){
 const[showPassword,setShowPassword]=useState(false)
 return <div className="tam-login"><div className="tam-login-card">
   <div className="tam-login-brand"><img src={LOGO} alt="Trusted Circle"/><div><strong>Trusted Circle</strong><small>Admin Portal</small></div></div>
   <div className="tam-login-icon"><ShieldCheck size={24}/></div><small className="tam-login-kicker">SECURE ADMIN ACCESS</small><h1>Welcome back.</h1><p>Sign in to manage Trusted Circle agent operations.</p>
   <form onSubmit={onSubmit}>
    <label>Email<input type="email" value={login.email} onChange={e=>setLogin({...login,email:e.target.value})} required autoComplete="username"/></label>
    <label>Password<div className="tam-password"><KeyRound size={15}/><input type={showPassword?'text':'password'} value={login.password} onChange={e=>setLogin({...login,password:e.target.value})} required autoComplete="current-password"/><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={15}/>:<Eye size={15}/>}</button></div></label>
    {error&&<div className="tam-login-error"><AlertTriangle size={14}/>{error}</div>}
    <button className="tam-login-submit" disabled={loading}>{loading?<RefreshCw className="tam-spin"/>:<LogIn size={16}/>}<span>{loading?'Signing in…':'Sign In'}</span></button>
   </form>
   <div className="tam-login-footer"><ShieldCheck size={13}/> Admin only · Trusted Circle</div>
 </div></div>
}
