import {useEffect,useMemo,useState} from 'react'
import {Activity,ArrowLeft,BarChart3,BriefcaseBusiness,Calculator,CardSim,CheckCircle2,ChevronRight,CircleDollarSign,FileText,LayoutDashboard,Plus,RefreshCw,Search,ShieldCheck,Users,WalletCards,X} from 'lucide-react'
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

const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(n||0))
const title=s=>String(s||'').replace(/([a-z])([A-Z])/g,'$1 $2')

export default function AgentBusinessPage(){
 const[dashboard,setDashboard]=useState(null),[module,setModule]=useState('Agents'),[rows,setRows]=useState([]),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[search,setSearch]=useState(''),[showForm,setShowForm]=useState(false),[form,setForm]=useState({}),[showPassword,setShowPassword]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[calc,setCalc]=useState({premiumAmount:10000,discountRate:.02,cashbackRate:.05}),[calcResult,setCalcResult]=useState(null)

 const loadDashboard=async()=>{setRefreshing(true);setError('');try{setDashboard(await agentBusinessApi.dashboard())}catch(e){setError(e.message)}finally{setRefreshing(false)}}
 const loadModule=async()=>{if(!agentBusinessApi.isConfigured())return;setLoading(true);try{const r=await agentBusinessApi.list(module,{search});setRows(r.items||[])}catch(e){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{loadDashboard();},[])
 useEffect(()=>{loadModule()},[module])
 const metrics=dashboard?.metrics||{}
 const count=key=>dashboard?.counts?.[key]||0
 const fields=useMemo(()=>rows.length?Object.keys(rows[0]).slice(0,10):[],[rows])
 const save=async()=>{try{setError('');setNotice('');if(module==='Agents'){await agentBusinessApi.createAgent(form);setNotice('Agent created. The 4-digit password is active immediately.')}else await agentBusinessApi.save(module,form);setShowForm(false);setForm({});await loadModule();await loadDashboard()}catch(e){setError(e.message)}}
 const resetAgentPassword=async agentId=>{const password=window.prompt('Enter a new 4-digit password for this agent:');if(password===null)return;if(!/^\\d{4}$/.test(password)){setError('Password must be exactly 4 digits.');return}try{await agentBusinessApi.setAgentPassword(agentId,password);setNotice('Agent password updated successfully.')}catch(e){setError(e.message)}}
 const calculate=async()=>{try{setCalcResult(await agentBusinessApi.calculate(calc))}catch(e){setError(e.message)}}

 return <div className="agent-business-page">
  <div className="ab-shell">
   <aside className="ab-sidebar">
    <div className="ab-brand"><span className="ab-logo">TC</span><div><strong>Trusted Circle</strong><small>Admin Portal</small></div></div>
    <div className="ab-nav-label">CONTROL CENTER</div>
    <button className={module==='__dashboard'?'active':''} onClick={()=>setModule('__dashboard')}><LayoutDashboard size={17}/>Dashboard</button>
    {MODULES.map(m=>{const Icon=m.icon;return <button key={m.key} className={module===m.key?'active':''} onClick={()=>setModule(m.key)}><Icon size={17}/><span>{m.label}</span></button>})}
    <div className="ab-side-note"><ShieldCheck size={16}/><span>Private business workspace</span></div>
   </aside>

   <main className="ab-main">
    <header className="ab-topbar"><div><span className="ab-eyebrow">TRUSTED CIRCLE · ADMIN PORTAL</span><h1>{module==='__dashboard'?'Admin Dashboard':title(module)}</h1></div><div className="ab-top-actions"><button onClick={()=>{loadDashboard();loadModule()}} disabled={refreshing}><RefreshCw size={16} className={refreshing?'spin':''}/>Refresh</button><a href="./"><ArrowLeft size={16}/>Shopping</a></div></header>

    {error&&<div className="ab-error"><X size={17}/><span>{error}</span><button onClick={()=>setError('')}>Dismiss</button></div>}
    {notice&&<div className="ab-success"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={()=>setNotice('')}>Dismiss</button></div>}

    {module==='__dashboard'?<section className="ab-content">
      <div className="ab-hero"><div><span className="ab-eyebrow">BUSINESS OVERVIEW</span><h2>One place to manage agents, payments & cashback.</h2><p>Operate the complete agent payment workflow from request to reconciliation.</p></div><div className="ab-hero-mark"><Activity size={34}/></div></div>
      <div className="ab-metrics">
       <Metric label="Payment Volume" value={money(metrics.paymentVolume)} icon={CircleDollarSign}/>
       <Metric label="Customer Collected" value={money(metrics.customerCollected)} icon={WalletCards}/>
       <Metric label="Expected Cashback" value={money(metrics.expectedCashback)} icon={BarChart3}/>
       <Metric label="Actual Cashback" value={money(metrics.actualCashback)} icon={CheckCircle2}/>
       <Metric label="Customer Discount" value={money(metrics.customerDiscount)} icon={Calculator}/>
       <Metric label="Pending Bills" value={metrics.pendingBills||0} icon={FileText}/>
      </div>
      <div className="ab-grid">
       <div className="ab-panel"><div className="ab-panel-head"><div><span className="ab-eyebrow">QUICK ACCESS</span><h3>Admin modules</h3></div></div><div className="ab-module-grid">{MODULES.slice(0,8).map(m=><button key={m.key} onClick={()=>setModule(m.key)}><m.icon size={20}/><strong>{m.label}</strong><small>{count(m.key)} records</small><ChevronRight size={15}/></button>)}</div></div>
       <div className="ab-panel"><div className="ab-panel-head"><div><span className="ab-eyebrow">2% DISCOUNT ENGINE</span><h3>Payment calculator</h3></div></div><div className="ab-calc"><label>Premium Amount<input type="number" value={calc.premiumAmount} onChange={e=>setCalc({...calc,premiumAmount:e.target.value})}/></label><label>Discount %<input type="number" step=".01" value={Number(calc.discountRate)*100} onChange={e=>setCalc({...calc,discountRate:Number(e.target.value)/100})}/></label><label>Cashback %<input type="number" step=".01" value={Number(calc.cashbackRate)*100} onChange={e=>setCalc({...calc,cashbackRate:Number(e.target.value)/100})}/></label><button className="ab-primary" onClick={calculate}><Calculator size={16}/>Calculate</button>{calcResult&&<div className="ab-calc-result"><span>Customer Pays <strong>{money(calcResult.customerPayable)}</strong></span><span>Discount <strong>{money(calcResult.discountAmount)}</strong></span><span>Expected Cashback <strong>{money(calcResult.expectedCashback)}</strong></span><span>Expected Net Benefit <strong>{money(calcResult.expectedNetBenefit)}</strong></span></div>}</div></div>
      </div>
    </section>:<section className="ab-content">
      <div className="ab-section-head"><div><span className="ab-eyebrow">DATABASE</span><h2>{title(module)}</h2><p>Manage records stored in the dedicated Agent Business Google Sheet.</p></div><button className="ab-primary" onClick={()=>{setForm({});setShowForm(true)}}><Plus size={17}/>Add {module==='Agents'?'Agent':module==='Clients'?'Client':module==='Cards'?'Card':'Record'}</button></div>
      <div className="ab-table-panel"><div className="ab-table-tools"><div className="ab-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadModule()} placeholder={'Search '+title(module)}/></div><button onClick={loadModule}><RefreshCw size={15}/>Refresh</button></div>
       {loading?<div className="ab-empty">Loading records…</div>:rows.length?<div className="ab-table-wrap"><table><thead><tr>{fields.map(f=><th key={f}>{title(f)}</th>)}{module==='Agents'&&<th>Access</th>}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{fields.map(f=><td key={f}>{String(r[f]??'').length>55?String(r[f]).slice(0,55)+'…':String(r[f]??'')}</td>)}{module==='Agents'&&<td><button className="ab-small-action" onClick={()=>resetAgentPassword(r.AgentID)}>Reset Password</button></td>}</tr>)}</tbody></table></div>:<div className="ab-empty"><div className="ab-empty-icon"><FileText size={22}/></div><strong>No records yet</strong><span>Add your first record to start building the business database.</span><button className="ab-primary" onClick={()=>{setForm({});setShowForm(true)}}><Plus size={15}/>Add Record</button></div>}
      </div>
    </section>}

   </main>
  </div>
  {showForm&&<div className="ab-modal-backdrop"><div className="ab-modal"><button className="ab-modal-x" onClick={()=>setShowForm(false)}><X size={18}/></button><span className="ab-eyebrow">NEW RECORD</span><h3>Add {title(module)}</h3><p>Enter the fields required for this record. IDs and timestamps are generated automatically.</p><div className="ab-form-grid">{(MODULES.find(m=>m.key===module)?['Name','Mobile','Email','Status','Notes']:['Name','Amount','Status','Notes']).map(f=><label key={f}>{f}<input value={form[f]||''} onChange={e=>setForm({...form,[f]:e.target.value})} placeholder={f}/></label>)}</div><button className="ab-primary wide" onClick={save}><CheckCircle2 size={16}/>Save Record</button></div></div>}
 </div>
}

function Metric({label,value,icon:Icon}){return <div className="ab-metric"><span className="ab-metric-icon"><Icon size={18}/></span><small>{label}</small><strong>{value}</strong></div>}
