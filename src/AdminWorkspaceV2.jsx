import {useEffect,useState} from 'react'
import {AlertTriangle,ChevronRight,Eye,EyeOff,KeyRound,LogOut,Menu,RefreshCw,ShieldCheck,Users,X} from 'lucide-react'
import {api} from './api'
import './admin-workspace.css'
import './admin-upgrade.css'

const LOGO='https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'

export default function AdminWorkspaceV2(){
  const[token,setToken]=useState(()=>localStorage.getItem('tc_erp_session')||'')
  const[user,setUser]=useState(null)
  const[login,setLogin]=useState({email:'trustedcircle2026@gmail.com',password:''})
  const[error,setError]=useState('')
  const[loading,setLoading]=useState(false)
  const[menuOpen,setMenuOpen]=useState(false)

  useEffect(()=>{
    if(!window.location.hash.replace(/^#\/?/,'').startsWith('erp'))return
    const t=localStorage.getItem('tc_erp_session')
    if(t)restore(t)
  },[])

  async function restore(t){
    setLoading(true)
    setError('')
    try{
      const stored=JSON.parse(localStorage.getItem('tc_erp_admin_user')||'null')
      setToken(t)
      setUser(stored||{email:'trustedcircle2026@gmail.com'})
    }catch(e){
      localStorage.removeItem('tc_erp_session')
      localStorage.removeItem('tc_erp_admin_user')
      setToken('')
      setUser(null)
      setError(apiError(e))
    }finally{
      setLoading(false)
    }
  }

  async function loginSubmit(e){
    e.preventDefault()
    setLoading(true)
    setError('')
    try{
      const r=await api.adminLogin(login.email,login.password)
      localStorage.setItem('tc_erp_session',r.session.token)
      localStorage.setItem('tc_erp_admin_user',JSON.stringify(r.user||{}))
      setToken(r.session.token)
      setUser(r.user)
      setMenuOpen(false)
    }catch(e){
      setError(apiError(e))
    }finally{
      setLoading(false)
    }
  }

  function logout(){
    localStorage.removeItem('tc_erp_session')
    localStorage.removeItem('tc_erp_admin_user')
    localStorage.removeItem('tc_erp_sidebar')
    setToken('')
    setUser(null)
    setMenuOpen(false)
    window.location.href='/admin.html'
  }

  if(!token||!user)return <Login login={login} setLogin={setLogin} loading={loading} error={error} onSubmit={loginSubmit}/>

  return <div className="tc-admin-shell tc-erp-minimal">
    <aside className={`tc-admin-sidebar tc-erp-sidebar tc-minimal-sidebar ${menuOpen?'open':''}`}>
      <div className="tc-admin-brand tc-erp-brand">
        <button className="tc-brand-home" onClick={()=>window.location.assign('/')} title="Trusted Circle home">
          <img src={LOGO} alt="Trusted Circle"/>
        </button>
        <div><b>Trusted Circle</b><small>OPERATIONS ERP</small></div>
        <button className="tc-sidebar-close" onClick={()=>setMenuOpen(false)} title="Close menu"><X size={17}/></button>
      </div>
      <div className="tc-minimal-sidebar-body">
        <span>MENU</span>
        <p>Admin pages will be added here as required.</p>
      </div>
      <div className="tc-admin-foot">
        <span><i/> Live backend</span>
        <button onClick={logout}><LogOut size={15}/> Sign out</button>
      </div>
    </aside>

    <main className="tc-admin-main tc-minimal-main">
      <header className="tc-admin-header tc-command-header tc-minimal-header">
        <div className="tc-command-left">
          <button className="tc-command-menu tc-command-menu-always" onClick={()=>setMenuOpen(v=>!v)} title={menuOpen?'Close menu':'Open menu'} aria-label={menuOpen?'Close menu':'Open menu'}>
            <Menu size={19}/>
          </button>
          <button className="tc-header-logo" onClick={()=>window.location.assign('/')} title="Trusted Circle home">
            <img src={LOGO} alt="Trusted Circle"/>
          </button>
          <div className="tc-command-title">
            <small>TRUSTED CIRCLE / OPERATIONS</small>
            <h1>Admin</h1>
          </div>
        </div>
        <div className="tc-command-actions">
          <div className="tc-live-pill"><i></i><span>LIVE</span></div>
          <button className="tc-command-refresh" onClick={()=>restore(token)} title="Refresh"><RefreshCw size={16} className={loading?'tc-spin':''}/></button>
          <button className="tc-command-profile" title={user.email}>
            <span>{String(user.email||'A').slice(0,1).toUpperCase()}</span>
            <div><b>Admin</b><small>{user.email}</small></div>
          </button>
        </div>
      </header>

      {error&&<div className="tc-admin-alert"><AlertTriangle size={15}/><span>{error}</span><button onClick={()=>setError('')}><X size={14}/></button></div>}

      <section className="tc-admin-page tc-empty-admin-page">
        <div className="tc-empty-admin-card">
          <div className="tc-empty-admin-icon"><ShieldCheck size={25}/></div>
          <small>ADMIN WORKSPACE</small>
          <h2>Ready for the required pages.</h2>
          <p>All previous admin pages and navigation have been removed. The next admin page will be added only from the required UI specification.</p>
        </div>
      </section>
    </main>
  </div>
}

function apiError(e){
  const m=String(e?.message||'Request failed.')
  return /API request failed \(404\)/i.test(m)
    ?'ERP backend returned 404. Update the Apps Script Web App deployment to the current backend version.'
    :m
}

function Login({login,setLogin,loading,error,onSubmit}){
  const[showPassword,setShowPassword]=useState(false)
  return <div className="tc-login-screen">
    <div className="tc-login-orb orb-one"></div><div className="tc-login-orb orb-two"></div><div className="tc-login-grid"></div>
    <div className="tc-login-shell">
      <section className="tc-login-brand-panel">
        <div className="tc-login-brand-mark"><img src={LOGO} alt="Trusted Circle"/></div>
        <div className="tc-login-brand-name">Trusted Circle</div>
        <span className="tc-login-kicker">OPERATIONS CONTROL CENTRE</span>
        <h1>Run every<br/><span>operation</span> with clarity.</h1>
        <p>Secure administration for Trusted Circle operations.</p>
        <div className="tc-login-flow">
          <div><b>01</b><span>Authenticate</span></div><i></i><div><b>02</b><span>Open menu</span></div><i></i><div><b>03</b><span>Operate</span></div>
        </div>
        <div className="tc-login-live"><span></span><b>Backend connected</b><small>Trusted Circle Operations</small></div>
      </section>
      <section className="tc-login-card">
        <div className="tc-login-card-top"><span>SECURE ACCESS</span><div className="tc-login-shield"><ShieldCheck size={18}/></div></div>
        <div className="tc-login-card-head"><h2>Welcome back.</h2><p>Sign in to continue to the operations ERP.</p></div>
        <form onSubmit={onSubmit} className="tc-login-form">
          <label><span>Email address</span><div className="tc-login-input"><Users size={16}/><input type="email" value={login.email} onChange={e=>setLogin({...login,email:e.target.value})} required autoComplete="username" placeholder="admin@trustedcircle.in"/></div></label>
          <label><span>Password</span><div className="tc-login-input"><KeyRound size={16}/><input type={showPassword?'text':'password'} value={login.password} onChange={e=>setLogin({...login,password:e.target.value})} required autoComplete="current-password" placeholder="Enter your password"/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
          {error&&<div className="tc-login-error"><AlertTriangle size={15}/><span>{error}</span></div>}
          <button className="tc-login-submit" disabled={loading}><span>{loading?'Authenticating…':'Enter Operations ERP'}</span>{loading?<RefreshCw size={17} className="tc-spin"/>:<ChevronRight size={18}/>}</button>
        </form>
        <div className="tc-login-footer"><ShieldCheck size={14}/><span>Protected operations access</span><i></i><small>Admin only</small></div>
      </section>
    </div>
    <div className="tc-login-bottom">TRUSTED CIRCLE <span>•</span> OPERATIONS <span>•</span> SECURE ERP</div>
  </div>
}
