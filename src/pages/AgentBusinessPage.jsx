import {useEffect,useMemo,useState} from 'react'
import {Activity,ArrowLeft,BarChart3,BriefcaseBusiness,Calculator,CardSim,CheckCircle2,ChevronRight,CircleDollarSign,CircleUserRound,FileText,LayoutDashboard,Plus,RefreshCw,Search,Send,ShieldCheck,Users,WalletCards,X} from 'lucide-react'
import {agentBusinessApi} from '../agentBusinessApi'
import '../agent-business.css'

const MODULES=[
  {key:'Agents',label:'Agents',icon:Users,desc:'Manage agent profiles and access.'},
  {key:'Clients',label:'Clients',icon:Users,desc:'Manage clients under each agent.'},
  {key:'Policies',label:'Policies',icon:FileText,desc:'Track policies and premium schedules.'},
  {key:'PremiumBills',label:'Premium Bills',icon:FileText,desc:'Track upcoming and paid premiums.'},
  {key:'PaymentRequests',label:'Payment Requests',icon:Activity,desc:'Review and process payment requests.'},
  {key:'Payments',label:'Payments',icon:CircleDollarSign,desc:'Record actual payments and receipts.'},
  {key:'Cards',label:'Cards',icon:CardSim,desc:'Manage your credit and debit cards.'},
  {key:'CardRules',label:'Card Rules',icon:ShieldCheck,desc:'Manage cashback eligibility and limits.'},
  {key:'Cashback',label:'Cashback',icon:WalletCards,desc:'Track expected and actual cashback.'},
  {key:'MoneyLedger',label:'Money Ledger',icon:BarChart3,desc:'Track all money movement.'},
  {key:'AgentSettlements',label:'Settlements',icon:BriefcaseBusiness,desc:'Manage agent settlements.'},
  {key:'Expenses',label:'Expenses',icon:CircleDollarSign,desc:'Track business expenses.'},
]

const LOGO_URL='https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'
const AMAZON_INSURANCE_URL='https://www.amazon.in/apay/interstitial/insurance/LICOB?ref_=apay_interstitial_biller_search_to_form_field_insurance'
const PAYMENT_RECEIPT_EMAIL='info@trustedcircle.in'
const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(n||0))
const title=s=>String(s||'').replace(/([a-z])([A-Z])/g,'$1 $2')

export default function AgentBusinessPage(){
 const[adminToken,setAdminToken]=useState(()=>localStorage.getItem('tc_agent_admin_session')||''),[adminPassword,setAdminPassword]=useState(''),[dashboard,setDashboard]=useState(null),[module,setModule]=useState('Agents'),[rows,setRows]=useState([]),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[search,setSearch]=useState(''),[showForm,setShowForm]=useState(false),[form,setForm]=useState({}),[error,setError]=useState(''),[notice,setNotice]=useState(''),[calc,setCalc]=useState({premiumAmount:10000,discountRate:.02,cashbackRate:.05}),[calcResult,setCalcResult]=useState(null),[schema,setSchema]=useState([]),[editing,setEditing]=useState(false),[activeTab,setActiveTab]=useState('home'),[profileOpen,setProfileOpen]=useState(false)

 const loadDashboard=async()=>{if(!adminToken)return;setRefreshing(true);setError('');try{setDashboard(await agentBusinessApi.dashboard(adminToken))}catch(e){if(/session expired|session is required|invalid admin password/i.test(e.message)){localStorage.removeItem('tc_agent_admin_session');setAdminToken('')}setError(e.message)}finally{setRefreshing(false)}}
 const loadModule=async()=>{if(module==='__dashboard'||!agentTokenReady(adminToken)||!agentBusinessApi.isConfigured())return;setLoading(true);try{
   const [r,s]=await Promise.all([agentBusinessApi.list(module,{search},adminToken),agentBusinessApi.schema(module,adminToken)])
   let items=r.items||[]
   // PaymentRequests only stores ClientID in the business database. Enrich each request
   // from Clients so Admin always sees the policy number and DOB entered by the agent.
   if(module==='PaymentRequests'&&items.length){
     try{
       const clientResult=await agentBusinessApi.list('Clients',{limit:500},adminToken)
       const clients=clientResult.items||[]
       const byId=new Map(clients.map(client=>[String(client.ClientID),client]))
       items=items.map(request=>{
         const client=byId.get(String(request.ClientID))||{}
         return {
           ...request,
           ClientName:request.ClientName||client.ClientName||'',
           PolicyNumber:request.PolicyNumber||client.PolicyNumber||'',
           DateOfBirth:request.DateOfBirth||client.DateOfBirth||'',
         }
       })
       // Requests view is intentionally an active-work queue. Paid/completed/cancelled
       // requests belong in payment history, not the Requests tab.
       items=items.filter(request=>!['PAID','COMPLETED','CANCELLED'].includes(String(request.Status||request.RequestStatus||'').toUpperCase()))
     }catch(e){
       // Keep the request list usable even if the client enrichment call fails.
     }
   }
   setRows(items);setSchema(s.fields||[])
 }catch(e){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{if(!adminToken)return; if(module==='__dashboard')loadDashboard(); else loadModule()},[module,adminToken])
 const metrics=dashboard?.metrics||{}
 const count=key=>dashboard?.counts?.[key]||0
 const fields=useMemo(()=>rows.length?Object.keys(rows[0]).slice(0,10):[],[rows])
 const save=async()=>{try{setError('');setNotice('');if(module==='Agents'&&!editing){await agentBusinessApi.createAgent(form,adminToken);setNotice('Agent created. The 4-digit password is active immediately.')}else{await agentBusinessApi.save(module,form,adminToken);setNotice((editing?'Record updated.':'Record added.')+' Successfully.')}setShowForm(false);setForm({});setEditing(false);await loadModule();await loadDashboard()}catch(e){setError(e.message)}}
 const editRow=async row=>{setError('');setNotice('');setForm({...row});setEditing(true);setShowForm(true)}
 const deleteRow=async row=>{const idField=schema[0]||Object.keys(row)[0];const id=row[idField];if(!id)return;if(!window.confirm('Delete this '+title(module)+' record? This action cannot be undone.'))return;try{setError('');await agentBusinessApi.remove(module,id,idField,adminToken);setNotice(title(module)+' record deleted.');await loadModule();await loadDashboard()}catch(e){setError(e.message)}}
 const resetAgentPassword=async agentId=>{const password=window.prompt('Enter a new 4-digit password for this agent:');if(password===null)return;if(!/^\\d{4}$/.test(password)){setError('Password must be exactly 4 digits.');return}try{await agentBusinessApi.setAgentPassword(agentId,password,adminToken);setNotice('Agent password updated successfully.')}catch(e){setError(e.message)}}
 const calculate=async()=>{try{setCalcResult(await agentBusinessApi.calculate(calc,adminToken))}catch(e){setError(e.message)}}
 const login=async()=>{try{setError('');const r=await agentBusinessApi.adminLogin(adminPassword);localStorage.setItem('tc_agent_admin_session',r.token);setAdminToken(r.token);setAdminPassword('')}catch(e){setError(e.message)}}
 const logout=async()=>{try{if(adminToken)await agentBusinessApi.adminLogout(adminToken)}catch{}localStorage.removeItem('tc_agent_admin_session');setAdminToken('');setDashboard(null);setRows([])}

 if(!adminToken)return <div className="agent-business-page"><div className="tc-admin-login"><div className="tc-login-card"><div className="tc-brand"><img src={LOGO_URL} alt="Trusted Circle"/><div><strong>Trusted Circle</strong><small>Insurance Admin Portal</small></div></div><span className="tc-kicker">SECURE ADMIN ACCESS</span><h1>Admin Sign In</h1><p>Sign in to manage Trusted Circle agents, payment requests and insurance business operations.</p><label>Admin Password<input type="password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} autoFocus placeholder="Enter admin password"/></label>{error&&<div className="tc-toast tc-error"><X size={15}/><span>{error}</span></div>}<button className="tc-login-button" onClick={login} disabled={!adminPassword}><ShieldCheck size={16}/>Sign In</button><a href="./">Back to Trusted Circle</a></div></div></div>

 const setPage=(tab)=>{
   setActiveTab(tab)
   if(tab==='home'){setModule('__dashboard');return}
   if(tab==='agents'){setModule('Agents');return}
   if(tab==='requests'){setModule('PaymentRequests');return}
   if(tab==='history'){setModule('Payments');return}
   if(tab==='more'){setModule('__dashboard');return}
 }
 const titleForTab=activeTab==='home'?'Home':activeTab==='agents'?'Agents':activeTab==='requests'?'Requests':activeTab==='history'?'History':'More'
 const currentRows=module==='PaymentRequests'?rows:module==='Payments'?rows:rows
 const profileName='Admin'
 const moreModules=MODULES.filter(m=>!['Agents','PaymentRequests','Payments'].includes(m.key))

 return <div className="agent-business-page tc-admin-page">
  <main className="tc-admin-shell">
   <header className="tc-admin-header">
    <div className="tc-admin-brand"><img src={LOGO_URL} alt="Trusted Circle"/><div><strong>Trusted Circle</strong><small>Admin Portal</small></div></div>
    <div className="tc-admin-header-actions">
      <button className="tc-icon-button" onClick={()=>setPage('requests')} aria-label="Payment requests"><Activity size={20}/>{count('PaymentRequests')>0&&<b>{count('PaymentRequests')}</b>}</button>
      <button className="tc-profile-button" onClick={()=>setProfileOpen(true)} aria-label="Admin profile"><span>A</span><strong>Admin</strong><CircleUserRound size={17}/></button>
    </div>
   </header>

   {error&&<div className="tc-toast tc-error"><X size={15}/><span>{error}</span><button onClick={()=>setError('')}>Dismiss</button></div>}
   {notice&&<div className="tc-toast tc-success"><CheckCircle2 size={15}/><span>{notice}</span><button onClick={()=>setNotice('')}>Dismiss</button></div>}

   <section className="tc-admin-content">
    {activeTab==='home'&&<section className="tc-home">
      <div className="tc-home-hero"><span className="tc-kicker">TRUSTED CIRCLE · INSURANCE ADMIN</span><h1>Insurance Dashboard</h1><p>Manage agents, clients, policies, premium payments and business activity from one place.</p></div>
      <div className="tc-stat-grid">
       <button onClick={()=>setPage('agents')}><Users size={20}/><strong>{count('Agents')}</strong><span>Agents</span></button>
       <button onClick={()=>setPage('requests')}><Activity size={20}/><strong>{count('PaymentRequests')}</strong><span>Requests</span></button>
       <button onClick={()=>setPage('history')}><CircleDollarSign size={20}/><strong>{count('Payments')}</strong><span>Payments</span></button>
      </div>
      <div className="tc-home-section"><div><span className="tc-kicker">AGENTS</span><h2>Agent Workspace</h2></div><button onClick={()=>setPage('agents')}>View all <ChevronRight size={15}/></button></div>
      <div className="tc-agent-mini-grid">{(dashboard?.recentAgents||[]).slice(0,6).map((a,i)=><button key={i} onClick={()=>setPage('agents')}><span>{String(a.AgentName||a.Name||'?').charAt(0).toUpperCase()}</span><div><strong>{a.AgentName||a.Name||'Agent'}</strong><small>{a.Mobile||a.Phone||a.Email||'Agent account'}</small></div><ChevronRight size={15}/></button>)}</div>
      {!(dashboard?.recentAgents||[]).length&&<div className="tc-empty"><Users size={22}/><strong>Agent workspace</strong><span>Open Agents to manage the agent records in your business database.</span><button onClick={()=>setPage('agents')}>Open Agents</button></div>}
      <div className="tc-quick-grid"><button onClick={()=>setPage('requests')}><Activity size={18}/><span>Payment Requests</span><ChevronRight size={15}/></button><button onClick={()=>setPage('history')}><CircleDollarSign size={18}/><span>Payment History</span><ChevronRight size={15}/></button></div>
    </section>}

    {activeTab==='agents'&&<section className="tc-page">
      <PageHeader kicker="AGENT MANAGEMENT" title="Agents" text="Manage agent profiles and access." onRefresh={()=>loadModule()} loading={loading} onAdd={()=>{setForm({});setEditing(false);setShowForm(true)}} addLabel="Add Agent"/>
      <div className="tc-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadModule()} placeholder="Search agents"/></div>
      <RecordList rows={rows} fields={fields} loading={loading} onEdit={editRow} onDelete={deleteRow} onPassword={resetAgentPassword} module="Agents"/>
    </section>}

    {activeTab==='requests'&&<section className="tc-page">
      <PageHeader kicker="PAYMENT WORKFLOW" title="Requests" text="Review and process payment requests raised by agents." onRefresh={()=>loadModule()} loading={loading}/>
      <div className="tc-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadModule()} placeholder="Search payment requests"/></div>
      <PaymentRequestList rows={rows} loading={loading} onRefresh={loadModule} onEdit={editRow} onDelete={deleteRow}/>
    </section>}

    {activeTab==='history'&&<section className="tc-page">
      <PageHeader kicker="PAYMENT HISTORY" title="History" text="View completed payment records and receipts." onRefresh={()=>loadModule()} loading={loading}/>
      <div className="tc-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadModule()} placeholder="Search payment history"/></div>
      <RecordList rows={rows} fields={fields} loading={loading} onEdit={editRow} onDelete={deleteRow} module="Payments"/>
    </section>}

    {activeTab==='more'&&<section className="tc-page tc-more-page">
      <div className="tc-more-head"><div className="tc-more-icon"><Activity size={24}/></div><span className="tc-kicker">ADMIN TOOLS</span><h1>More</h1><p>Insurance business modules and controls.</p></div>
      <div className="tc-more-summary">
        <div className="tc-more-summary-icon"><BarChart3 size={22}/></div>
        <div><strong>Business Control Centre</strong><small>Everything beyond Agents, Requests and History.</small></div>
      </div>
      <div className="tc-more-group">
        <span className="tc-more-group-title">CUSTOMER & POLICY</span>
        {moreModules.filter(m=>['Clients','Policies','PremiumBills'].includes(m.key)).map(m=><button className="tc-more-item" key={m.key} onClick={()=>{setModule(m.key);setActiveTab('more');loadModule()}}><span className="tc-more-item-icon"><m.icon size={18}/></span><div><strong>{m.label}</strong><small>{m.desc}</small></div><ChevronRight size={16}/></button>)}
      </div>
      <div className="tc-more-group">
        <span className="tc-more-group-title">MONEY & CARDS</span>
        {moreModules.filter(m=>['Cards','CardRules','Cashback','MoneyLedger','Expenses'].includes(m.key)).map(m=><button className="tc-more-item" key={m.key} onClick={()=>{setModule(m.key);setActiveTab('more');loadModule()}}><span className="tc-more-item-icon"><m.icon size={18}/></span><div><strong>{m.label}</strong><small>{m.desc}</small></div><ChevronRight size={16}/></button>)}
      </div>
      <div className="tc-more-group">
        <span className="tc-more-group-title">OPERATIONS</span>
        {moreModules.filter(m=>m.key==='AgentSettlements').map(m=><button className="tc-more-item" key={m.key} onClick={()=>{setModule(m.key);setActiveTab('more');loadModule()}}><span className="tc-more-item-icon"><m.icon size={18}/></span><div><strong>{m.label}</strong><small>{m.desc}</small></div><ChevronRight size={16}/></button>)}
      </div>
      <button className="tc-more-logout" onClick={logout}><ShieldCheck size={16}/>Sign Out</button>
    </section>}
   </section>

   <nav className="tc-bottom-nav">
    <button className={activeTab==='home'?'active':''} onClick={()=>setPage('home')}><LayoutDashboard size={21}/><span>Home</span></button>
    <button className={activeTab==='agents'?'active':''} onClick={()=>setPage('agents')}><Users size={21}/><span>Agents</span><small>{count('Agents')}</small></button>
    <button className={activeTab==='requests'?'active':''} onClick={()=>setPage('requests')}><Activity size={21}/><span>Requests</span>{count('PaymentRequests')>0&&<small>{count('PaymentRequests')}</small>}</button>
    <button className={activeTab==='history'?'active':''} onClick={()=>setPage('history')}><CircleDollarSign size={21}/><span>History</span></button>
    <button className={activeTab==='more'?'active':''} onClick={()=>setPage('more')}><BarChart3 size={21}/><span>More</span></button>
   </nav>
  </main>

  {profileOpen&&<div className="tc-modal-backdrop" onClick={()=>setProfileOpen(false)}><div className="tc-profile-modal" onClick={e=>e.stopPropagation()}><button className="tc-modal-close" onClick={()=>setProfileOpen(false)}><X size={18}/></button><div className="tc-profile-avatar">A</div><span className="tc-kicker">ADMIN PROFILE</span><h2>Admin</h2><p>Trusted Circle Administrator</p><div className="tc-profile-detail"><small>Access</small><strong>Full Business Administration</strong></div><div className="tc-profile-detail"><small>Portal</small><strong>Trusted Circle Insurance Admin Portal</strong></div><button className="tc-more-logout" onClick={logout}><ShieldCheck size={16}/>Sign Out</button></div></div>}

  {showForm&&<div className="tc-modal-backdrop" onClick={()=>{setShowForm(false);setEditing(false)}}><div className="tc-crud-modal" onClick={e=>e.stopPropagation()}><button className="tc-modal-close" onClick={()=>{setShowForm(false);setEditing(false)}}><X size={18}/></button><span className="tc-kicker">{editing?'EDIT':'NEW'} {module==='Agents'?'AGENT':'RECORD'}</span><h2>{editing?'Edit ':'Add '}{title(module)}</h2><p>Manage the record details below.</p><div className="tc-form-grid">{schema.filter(f=>!['CreatedAt','UpdatedAt'].includes(f)).map(f=>{const isId=f===schema[0];if(isId)return <label key={f}>{title(f)}<input value={form[f]||''} disabled/></label>;return <label key={f}>{title(f)}<input value={form[f]||''} onChange={e=>setForm({...form,[f]:e.target.value})} disabled={editing&&['AgentID','AgentUserID'].includes(f)} placeholder={title(f)}/></label>})}{module==='Agents'&&!editing&&<label>4-Digit Password<input type="password" value={form.Password||''} onChange={e=>setForm({...form,Password:e.target.value.replace(/\D/g,'').slice(0,4)})} inputMode="numeric" maxLength="4" placeholder="4-digit password"/></label>}</div><button className="tc-save-button" disabled={module==='Agents'&&!editing&&(!/^\d{10}$/.test(form.Mobile||'')||!/^\d{4}$/.test(form.Password||'')||!form.AgentName)} onClick={save}><CheckCircle2 size={16}/>{editing?'Update Record':module==='Agents'?'Create Agent':'Save Record'}</button></div></div>}
 </div>
}

function PageHeader({kicker,title,text,onRefresh,loading,onAdd,addLabel}){return <div className="tc-page-head"><div><span className="tc-kicker">{kicker}</span><h1>{title}</h1><p>{text}</p></div><div className="tc-page-actions">{onRefresh&&<button onClick={onRefresh} disabled={loading}><RefreshCw size={15} className={loading?'tc-spin':''}/></button>}{onAdd&&<button className="tc-add-button" onClick={onAdd}><Plus size={16}/><span>{addLabel}</span></button>}</div></div>}
function PaymentRequestList({rows,loading,onRefresh,onEdit,onDelete}){if(loading)return <div className="tc-empty"><RefreshCw className="tc-spin" size={22}/><span>Loading payment requests…</span></div>;if(!rows.length)return <div className="tc-empty"><Send size={22}/><strong>No payment requests</strong><span>Requests raised by agents will appear here.</span></div>;return <div className="tc-payment-request-list">{rows.map((r,i)=><PaymentRequestCard key={r.RequestID||i} request={r} onEdit={onEdit} onDelete={onDelete}/>)}</div>}
function PaymentRequestCard({request:r,onEdit,onDelete}){const [copied,setCopied]=useState('');const status=String(r.Status||r.RequestStatus||'PENDING').toUpperCase();const policy=r.PolicyNumber||r.PolicyNo||'';const dob=r.DateOfBirth||r.DOB||'';const client=r.ClientName||r.Name||'Client';const copy=async(label,value)=>{if(!value)return;try{await navigator.clipboard.writeText(String(value));setCopied(label);setTimeout(()=>setCopied(''),1300)}catch{setCopied('Copy manually')}};const startPayment=async()=>{const bundle='Policy Number: '+policy+'\\nDate of Birth: '+dob+'\\nReceipt Email: '+PAYMENT_RECEIPT_EMAIL;try{await navigator.clipboard.writeText(bundle)}catch{}window.open(AMAZON_INSURANCE_URL,'_blank','noopener,noreferrer')};return <div className="tc-payment-card"><div className="tc-payment-head"><div className="tc-record-avatar"><Send size={16}/></div><div><strong>{client}</strong><small>Payment Request · {status}</small></div><span className={'tc-status '+status.toLowerCase()}>{status}</span></div><div className="tc-payment-details"><div><small>Policy Number</small><strong>{policy||'Not available'}</strong><button onClick={()=>copy('policy',policy)}>{copied==='policy'?'✓ Copied':'Copy'}</button></div><div><small>Date of Birth</small><strong>{dob||'Not available'}</strong><button onClick={()=>copy('dob',dob)}>{copied==='dob'?'✓ Copied':'Copy'}</button></div><div><small>Receipt Email</small><strong>{PAYMENT_RECEIPT_EMAIL}</strong><button onClick={()=>copy('email',PAYMENT_RECEIPT_EMAIL)}>{copied==='email'?'✓ Copied':'Copy'}</button></div></div><div className="tc-payment-actions"><button className="tc-amazon-button" disabled={!policy||!dob} onClick={startPayment}><span>₹</span> Open Amazon Insurance</button><button onClick={()=>onEdit(r)}>Details</button>{['PENDING','SUBMITTED'].includes(status)&&<button className="danger" onClick={()=>onDelete(r)}>Cancel</button>}</div><div className="tc-payment-hint">Opening Amazon also copies the Policy Number, DOB and receipt email to your clipboard for quick entry. Amazon's public insurance URL does not expose a documented query-string autofill interface.</div></div>}
function RecordList({rows,fields,loading,onEdit,onDelete,onPassword,module}){if(loading)return <div className="tc-empty"><RefreshCw className="tc-spin" size={22}/><span>Loading records…</span></div>;if(!rows.length)return <div className="tc-empty"><FileText size={22}/><strong>No records found</strong><span>Add records or refresh to load the latest data.</span></div>;return <div className="tc-record-list">{rows.map((r,i)=><div className="tc-record-card" key={i}><div className="tc-record-main"><span className="tc-record-avatar">{String(r.AgentName||r.ClientName||r.Name||r.PolicyNumber||'?').trim().charAt(0).toUpperCase()}</span><div><strong>{r.AgentName||r.ClientName||r.Name||r.PolicyNumber||module}</strong><small>{r.Mobile||r.Phone||r.Email||r.PolicyNumber||r.Status||r.RequestStatus||'Record'}</small></div><ChevronRight size={17}/></div><div className="tc-record-fields">{fields.slice(0,5).map(f=><div key={f}><small>{title(f)}</small><span>{String(r[f]??'').length>60?String(r[f]).slice(0,60)+'…':String(r[f]??'')}</span></div>)}</div><div className="tc-record-actions"><button onClick={()=>onEdit(r)}>Edit</button><button className="danger" onClick={()=>onDelete(r)}>Delete</button>{module==='Agents'&&<button onClick={()=>onPassword(r.AgentID)}>Password</button>}</div></div>)}</div>}
function agentTokenReady(token){return Boolean(token)}

function Metric({label,value,icon:Icon}){return <div className="ab-metric"><span className="ab-metric-icon"><Icon size={18}/></span><small>{label}</small><strong>{value}</strong></div>}
