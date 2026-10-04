import {useEffect,useMemo,useState} from 'react'
import {ArrowRight,Bell,CheckCircle2,CircleUserRound,Download,ExternalLink,FileText,Home,Link2,LogIn,Plus,RefreshCw,ShieldCheck,Users,X,LogOut,Send,CalendarDays,Clock3,ChevronRight,Edit3,WalletCards,MoreHorizontal} from 'lucide-react'
import {agentBusinessApi} from '../agentBusinessApi'
import '../agent-portal.css'

const LOGO_URL='https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'
const COMMON_AGENT_PAYMENT_LINK='upi://pay?pa=llingesh836-7@okhdfcbank&pn=Lingeshwaran%20R&aid=uGICAgIC1rKa0NQ'
const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(n||0))
const displayDate=value=>{const raw=String(value||'').trim();if(!raw)return '—';const dm=raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(dm)return dm[1]+'-'+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(dm[2])-1]+'-'+dm[3];const iso=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);if(iso)return iso[3]+'-'+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(iso[2])-1]+'-'+iso[1];const d=new Date(raw);if(Number.isNaN(d.getTime()))return raw;return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}).replace(/ /g,'-')}
const emptyPolicy={ClientName:'',PolicyNumber:'',DateOfBirth:''}
const inputDob=value=>{const raw=String(value||'').trim();const m=raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?m[3]+'-'+m[2]+'-'+m[1]:raw.slice(0,10)}
const savedDob=value=>{const raw=String(value||'').trim();const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+'/'+m[2]+'/'+m[1]:raw}
const loadingMessages=['Securing your agent session…','Loading your policy workspace……','Syncing your latest requests…','Preparing your workspace…']

export default function AgentPortalPage(){
 const[session,setSession]=useState(()=>localStorage.getItem('tc_agent_session')||'')
 const[agent,setAgent]=useState(null),[clients,setClients]=useState([]),[requests,setRequests]=useState([]),[invoices,setInvoices]=useState([]),[payableAmount,setPayableAmount]=useState(0),[earningsToDate,setEarningsToDate]=useState(0)
 const[mobile,setMobile]=useState(''),[password,setPassword]=useState('')
 const[policyForm,setPolicyForm]=useState(emptyPolicy),[showForm,setShowForm]=useState(false),[editingPolicyId,setEditingPolicyId]=useState('')
 const[clientSearch,setClientSearch]=useState(''),[history,setHistory]=useState(null),[historyLoading,setHistoryLoading]=useState(false)
 const[loading,setLoading]=useState(false),[loadingText,setLoadingText]=useState(loadingMessages[0]),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const[activeTab,setActiveTab]=useState('home'),[detail,setDetail]=useState(null),[showProfile,setShowProfile]=useState(false)

 const load=async token=>{
  setLoading(true);setError('')
  let timer
  try{
   let i=0;setLoadingText(loadingMessages[0]);timer=setInterval(()=>setLoadingText(loadingMessages[++i%loadingMessages.length]),850)
   const data=await agentBusinessApi.agentBootstrap(token)
   const invoiceData=await agentBusinessApi.agentInvoices(token)
   setAgent(data.agent);setClients(data.clients?.items||[]);setRequests(data.requests?.items||[]);setInvoices(invoiceData.items||[]);setPayableAmount(Number(invoiceData.outstandingAmount||0));setEarningsToDate(Number(invoiceData.earningsToDate||0))
  }catch(e){
   localStorage.removeItem('tc_agent_session');setSession('');setAgent(null);setClients([]);setRequests([]);setInvoices([]);setPayableAmount(0);setEarningsToDate(0);setError(e.message)
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
 const openEditPolicy=r=>{setError('');setNotice('');setEditingPolicyId(r.PolicyID);setPolicyForm({ClientName:r.ClientName||'',PolicyNumber:r.PolicyNumber||'',DateOfBirth:inputDob(r.DateOfBirth)});setShowForm(true)}
 const addPolicy=async()=>{
  setLoading(true);setError('');setNotice('');setLoadingText('Adding policy to your workspace…')
  try{
   const data=await agentBusinessApi.agentAddPolicy(session,{...policyForm,DateOfBirth:savedDob(policyForm.DateOfBirth)})
   setClients(current=>[data.policy,...current]);setPolicyForm(emptyPolicy);setShowForm(false)
   setNotice('Client added successfully.')
  }catch(e){setError(e.message)}finally{setLoading(false)}
 }
 const editPolicy=async()=>{
  setLoading(true);setError('');setNotice('');setLoadingText('Updating client and policy details…')
  try{
   await agentBusinessApi.agentEditPolicy(session,{...policyForm,DateOfBirth:savedDob(policyForm.DateOfBirth),PolicyID:editingPolicyId})
   await load(session);setPolicyForm(emptyPolicy);setEditingPolicyId('');setShowForm(false);setNotice('Client details updated successfully.')
  }catch(e){setError(e.message)}finally{setLoading(false)}
 }
 const requestPayment=async policy=>{
  if(!policy.ClientID)return setError('Client reference is missing. Refresh the workspace.')
  if(!window.confirm('Request premium payment for this selected policy on behalf of the client?'))return
  setLoading(true);setError('');setNotice('');setLoadingText('Sending payment request to Admin…')
  // Request is keyed by ClientID; backend resolves the owned policy server-side.
  try{
   const data=await agentBusinessApi.agentRequestPayment(session,{ClientID:policy.ClientID,PolicyID:policy.PolicyID||''})
   setRequests(current=>[data.paymentRequest,...current]);await load(session);setActiveTab('requests');setNotice('Payment request sent successfully.')
  }catch(e){setError(e.message)}finally{setLoading(false)}
 }
 const cancelRequest=async requestId=>{
  if(!window.confirm('Cancel this payment request?'))return
  setLoading(true);setError('');setNotice('');setLoadingText('Cancelling payment request…')
  try{await agentBusinessApi.agentCancelPaymentRequest(session,requestId);await load(session);setNotice('Payment request cancelled successfully.')}
  catch(e){setError(e.message)}finally{setLoading(false)}
 }
 const logout=async()=>{try{if(session)await agentBusinessApi.agentLogout(session)}catch{}localStorage.removeItem('tc_agent_session');setSession('');setAgent(null);setClients([]);setRequests([]);setInvoices([]);setPayableAmount(0);setEarningsToDate(0)}
 const reportInvoicePaymentDone=async invoice=>{
  if(!invoice?.InvoiceID)return;
  if(!window.confirm('Have you completed the payment for '+(invoice.InvoiceNumber||'this invoice')+'? This will notify Trusted Circle Admin for verification.'))return;
  setLoading(true);setError('');setNotice('');setLoadingText('Sending payment completion report to Admin…');
  try{
    await agentBusinessApi.agentReportInvoicePaymentDone(session,invoice.InvoiceID);
    await load(session);
    setNotice('Payment marked as done. Trusted Circle Admin has been notified for verification.');
  }catch(e){setError(e.message)}finally{setLoading(false)}
 }
 const downloadInvoice=async invoice=>{try{setLoading(true);setError('');const data=await agentBusinessApi.agentInvoicePdf(session,invoice.InvoiceID);const bytes=Uint8Array.from(atob(data.pdfBase64),ch=>ch.charCodeAt(0));const blob=new Blob([bytes],{type:'application/pdf'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=data.fileName||((invoice.InvoiceNumber||'Trusted-Circle-Invoice')+'.pdf');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){setError(e.message)}finally{setLoading(false)}}
 const downloadOutstandingSummary=async()=>{try{setLoading(true);setError('');const data=await agentBusinessApi.agentOutstandingSummary(session);const bytes=Uint8Array.from(atob(data.base64),ch=>ch.charCodeAt(0));const blob=new Blob([bytes],{type:'application/pdf'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=data.fileName||'Outstanding-Summary.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){setError(e.message)}finally{setLoading(false)}} const downloadReceipt=async item=>{try{setLoading(true);setError('');const data=await agentBusinessApi.agentReceiptFile(session,item.PaymentID);const bytes=Uint8Array.from(atob(data.base64),ch=>ch.charCodeAt(0));const blob=new Blob([bytes],{type:data.mimeType||'application/octet-stream'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=data.fileName||'Premium-Payment-Receipt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){setError(e.message)}finally{setLoading(false)}}
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
   <header className="ap-mobile-header">
    <div className="ap-mobile-brand">
     <img src={LOGO_URL} alt="Trusted Circle"/>
     <div><strong>Trusted Circle</strong><small>Agent Portal</small></div>
    </div>
    <div className="ap-mobile-header-actions">
     <button className="ap-header-action" onClick={()=>setActiveTab('requests')} aria-label="Payment requests" title="Payment requests">
      <Bell size={21}/>{pending>0&&<span className="ap-header-badge">{pending}</span>}
     </button>
     <button className="ap-profile-header" onClick={()=>setShowProfile(true)} aria-label="Open agent profile" title="Agent profile">
      <span className="ap-profile-avatar">{String(agent.AgentName||'A').trim().charAt(0).toUpperCase()}</span>
      <span className="ap-profile-name">{agent.AgentName||'Agent'}</span>
      <CircleUserRound size={19}/>
     </button>
    </div>
   </header>
   {error&&<div className="ap-error ap-banner"><X size={15}/><span>{error}</span><button onClick={()=>setError('')}>Dismiss</button></div>}
   {notice&&<div className="ap-success ap-banner"><CheckCircle2 size={16}/><span>{notice}</span><button onClick={()=>setNotice('')}>Dismiss</button></div>}

   {activeTab==='home'?<section className="ap-panel ap-data ap-home-panel">
    <div className="ap-home-hero"><span className="ap-eyebrow">AGENT DASHBOARD</span><h1>Agent Dashboard</h1><p>Manage your clients, premium requests and Trusted Circle earnings from one place.</p></div>
    <div className="ap-home-stats ap-home-stats-four">
      <button onClick={()=>setActiveTab('policies')}><Users size={20}/><strong>{clients.length}</strong><span>My Clients</span></button>
      <button onClick={()=>setActiveTab('requests')}><Send size={20}/><strong>{pending}</strong><span>Pending Requests</span></button>
      <button onClick={()=>setActiveTab('invoices')}><WalletCards size={20}/><strong>{payableAmount?money(payableAmount):'₹0'}</strong><span>Payable Amount</span></button>
      <button className="ap-earnings-stat" onClick={()=>setActiveTab('invoices')}><CheckCircle2 size={20}/><strong>{money(earningsToDate)}</strong><span>Earnings Till Date</span><small>Received discount</small></button>
    </div>
    {payableAmount>0?<div className="ap-payable-box ap-home-payable-summary">
      <div className="ap-payable-head"><div><span className="ap-eyebrow">PAYABLE NOW</span><h2>Amount Payable to Trusted Circle</h2><p>Latest invoice and payment are shown below.</p></div><span className="ap-payable-total">{money(payableAmount)}</span></div>
      {invoices.find(inv=>!['PAID','SETTLED','CANCELLED'].includes(String(inv.PaymentStatus||'UNPAID').toUpperCase()))&&<div className="ap-home-invoice-mini"><div><strong>{invoices.find(inv=>!['PAID','SETTLED','CANCELLED'].includes(String(inv.PaymentStatus||'UNPAID').toUpperCase())).InvoiceNumber||'Invoice'}</strong><small>{displayDate(invoices.find(inv=>!['PAID','SETTLED','CANCELLED'].includes(String(inv.PaymentStatus||'UNPAID').toUpperCase())).InvoiceDate)} · {String(invoices.find(inv=>!['PAID','SETTLED','CANCELLED'].includes(String(inv.PaymentStatus||'UNPAID').toUpperCase())).PaymentStatus||'PAYABLE')}</small></div><strong>{money(invoices.find(inv=>!['PAID','SETTLED','CANCELLED'].includes(String(inv.PaymentStatus||'UNPAID').toUpperCase())).NetPayable||0)}</strong><div className="ap-home-invoice-actions"><button className="ap-secondary" onClick={()=>downloadInvoice(invoices.find(inv=>!['PAID','SETTLED','CANCELLED'].includes(String(inv.PaymentStatus||'UNPAID').toUpperCase())))}><Download size={13}/>Invoice</button><button className="ap-primary" onClick={()=>window.open(COMMON_AGENT_PAYMENT_LINK,'_blank','noopener,noreferrer')}><ExternalLink size={13}/>Pay</button></div></div>}
      <button className="ap-secondary wide" onClick={()=>setActiveTab('invoices')}><WalletCards size={16}/>View Payables & Invoices <ChevronRight size={15}/></button>
    </div>:<div className="ap-next-cycle-card">
      <div><span className="ap-eyebrow">NO PENDING PAYABLE</span><h2>Ready for the next premium cycle?</h2><p>Raise a new premium payment request for any eligible client policy.</p></div>
      <button className="ap-primary" onClick={()=>setActiveTab('policies')}><Send size={15}/>Raise New Request</button>
    </div>}
   </section>:activeTab==='policies'?<section className="ap-panel ap-data">
    <div className="ap-panel-head"><div><span className="ap-eyebrow">CLIENT WORKSPACE</span><h2>My Clients</h2><p>Save your client's policy details once. You can raise a new premium request for every unpaid premium cycle.</p></div><button className="ap-primary" onClick={openAddPolicy}><Plus size={15}/>Add Client</button></div>
    <div className="ap-client-search"><div><Users size={15}/><input value={clientSearch} onChange={e=>setClientSearch(e.target.value)} placeholder="Search client or policy number"/></div>{clientSearch&&<button onClick={()=>setClientSearch('')}><X size={14}/></button>}</div>
    {filteredClients.length?<div className="ap-client-grid">{filteredClients.map(r=><div className="ap-client-card ap-policy-card" key={r.PolicyID||r.ClientID}>
      <div className="ap-client-top"><span className="ap-avatar">{String(r.ClientName||'?').trim().charAt(0).toUpperCase()}</span><div><strong>{r.ClientName}</strong><small>Policy {r.PolicyNumber}</small></div><ChevronRight className="ap-client-chevron" size={20}/></div>
      <div className="ap-client-meta"><span><CalendarDays size={13}/>{r.DateOfBirth}</span><span><FileText size={13}/>Policy</span></div>
      <div className="ap-client-bottom"><span>Latest request <b>{r.RequestStatus&&r.RequestStatus!=='PENDING'?r.RequestStatus:'Ready'}</b></span><span className={'ap-request-pill '+String(r.RequestStatus||'READY').toLowerCase()}>{r.RequestStatus&&r.RequestStatus!=='PENDING'?r.RequestStatus:'READY'}</span></div>
      <div className="ap-card-actions ap-client-actions">
       <button className="ap-secondary" onClick={()=>openHistory(r)}><Clock3 size={14}/>History</button>
       <button className="ap-secondary" onClick={()=>openEditPolicy(r)}><Edit3 size={14}/>Edit</button>
       <button className="ap-primary ap-request-action" disabled={loading||['PENDING','SUBMITTED'].includes(String(r.RequestStatus||'').toUpperCase())} onClick={()=>requestPayment(r)}><Send size={14}/>{String(r.RequestStatus||'').toUpperCase()==='PENDING'?'Requested':String(r.RequestStatus||'').toUpperCase()==='SUBMITTED'?'In Process':String(r.RequestStatus||'').toUpperCase()==='PAID'||String(r.RequestStatus||'').toUpperCase()==='COMPLETED'?'New Premium Request':'Raise Request'}</button>
      </div>
    </div>)}</div>:<div className="ap-empty ap-empty-color"><div className="ap-empty-icon"><Users size={23}/></div><b>{clientSearch?'No matching client':'No clients added yet'}</b><span>{clientSearch?'Try the client name or policy number.':'Add the client and policy details first. You can raise premium payment requests whenever required.'}</span>{!clientSearch&&<button className="ap-primary" onClick={openAddPolicy}><Plus size={15}/>Add First Client</button>}</div>}
   </section>:activeTab==='requests'?<section className="ap-panel ap-data">
    <div className="ap-panel-head"><div><span className="ap-eyebrow">PAYMENT WORKFLOW</span><h2>Payment Requests</h2><p>Track every request raised for your clients and its current status.</p></div><button className="ap-secondary" onClick={()=>load(session)} disabled={loading}><RefreshCw size={15}/>Refresh</button></div>
    {latestRequests.length?<div className="ap-request-list">{latestRequests.map(r=><div className="ap-request-card" key={r.RequestID}>
      <div className="ap-request-icon"><Send size={17}/></div>
      <div className="ap-request-main"><strong>{r.ClientName||'Client'}</strong><span>Policy {r.PolicyNumber}</span><small>Raised {r.RequestedAt?new Date(r.RequestedAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'just now'}</small></div>
      <span className={'ap-request-pill '+String(r.Status||'PENDING').toLowerCase()}>{r.Status||'PENDING'}</span>
      {['PENDING','SUBMITTED'].includes(String(r.Status||'').toUpperCase())&&<button className="ap-secondary ap-cancel-request" disabled={loading} onClick={()=>cancelRequest(r.RequestID)}>Cancel</button>}
      <button className="ap-icon-action" title="View client history" onClick={()=>{const client=clients.find(c=>String(c.ClientID)===String(r.ClientID));client?openHistory(client):setDetail({type:'Payment Request',data:r})}}><ChevronRight size={17}/></button>
    </div>)}</div>:<div className="ap-empty"><Send size={22}/><b>No payment requests yet</b><span>Search My Clients and raise a request whenever a premium needs to be paid.</span></div>}
   </section>:activeTab==='history'?<section className="ap-panel ap-data ap-history-page-panel">
    <div className="ap-panel-head"><div><span className="ap-eyebrow">ACTIVITY</span><h2>History</h2><p>Review recent premium payment requests raised for your clients.</p></div><button className="ap-secondary" onClick={()=>load(session)} disabled={loading}><RefreshCw size={15}/>Refresh</button></div>
    {latestRequests.length?<div className="ap-request-list">{latestRequests.map(r=><div className="ap-request-card" key={r.RequestID}>
      <div className="ap-request-icon"><Clock3 size={17}/></div>
      <div className="ap-request-main"><strong>{r.ClientName||'Client'}</strong><span>Policy {r.PolicyNumber}</span><small>{r.RequestedAt?new Date(r.RequestedAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—'}</small></div>
      <span className={'ap-request-pill '+String(r.Status||'PENDING').toLowerCase()}>{r.Status||'PENDING'}</span>{String(r.Status||'').toUpperCase()==='PAID'&&r.PaymentID&&<button className="ap-secondary ap-receipt-button" onClick={()=>downloadReceipt(r)}><Download size={13}/>Premium Receipt</button>}
      <button className="ap-icon-action" title="View client history" onClick={()=>{const client=clients.find(c=>String(c.ClientID)===String(r.ClientID));client?openHistory(client):setDetail({type:'Payment Request',data:r})}}><ChevronRight size={17}/></button>
    </div>)}</div>:<div className="ap-empty"><Clock3 size={22}/><b>No history yet</b><span>Payment request and paid-premium history will appear here.</span></div>}
   </section>:activeTab==='invoices'?<section className="ap-panel ap-data ap-invoices-page">
    <div className="ap-panel-head"><div><span className="ap-eyebrow">FINANCE</span><h2>Payables & Invoices</h2><p>All invoices, payment links and payment status are maintained here.</p></div><button className="ap-secondary" onClick={()=>load(session)} disabled={loading}><RefreshCw size={15}/>Refresh</button></div>
    <div className="ap-finance-summary"><div><small>Outstanding Payable</small><strong>{money(payableAmount)}</strong></div><div><small>Earnings Till Date</small><strong>{money(earningsToDate)}</strong></div><div><small>Total Invoices</small><strong>{invoices.length}</strong></div></div>
    <div className="ap-invoice-list">{invoices.length?invoices.map(invoice=><AgentInvoiceCard key={invoice.InvoiceID} invoice={invoice} onDownload={downloadInvoice} onPaymentDone={reportInvoicePaymentDone}/>):<div className="ap-invoice-empty"><FileText size={18}/><span>No invoices have been generated for your account yet.</span></div>}</div>
   </section>:activeTab==='more'?<section className="ap-panel ap-data ap-more-panel">
    <div className="ap-more-head"><div className="ap-more-icon"><MoreHorizontal size={24}/></div><span className="ap-eyebrow">AGENT CENTRE</span><h2>More</h2><p>Client tools, payment history and account options.</p></div>
    <div className="ap-more-section"><span className="ap-more-section-title">FINANCE</span><button className="ap-more-command" onClick={()=>setActiveTab('invoices')}><WalletCards size={18}/><div><strong>Payables & Invoices</strong><small>{payableAmount>0?money(payableAmount)+' outstanding':'No pending payable'} · {invoices.length} invoices</small></div><ChevronRight size={16}/></button><button className="ap-more-command" onClick={()=>setActiveTab('invoices')}><CheckCircle2 size={18}/><div><strong>Earnings Till Date</strong><small>{money(earningsToDate)} total received Trusted Circle discount</small></div><ChevronRight size={16}/></button><button className="ap-more-command" onClick={downloadOutstandingSummary}><FileText size={18}/><div><strong>Current Outstanding Summary</strong><small>Download a PDF of all currently outstanding premium payables.</small></div><ChevronRight size={16}/></button></div>
    <div className="ap-more-section"><span className="ap-more-section-title">CLIENT & POLICY</span><button className="ap-more-command" onClick={()=>setActiveTab('policies')}><Users size={18}/><div><strong>My Clients & Policies</strong><small>View, add and update your client policy records.</small></div><ChevronRight size={16}/></button></div>
    <div className="ap-more-section"><span className="ap-more-section-title">PAYMENT WORKFLOW</span><button className="ap-more-command" onClick={()=>setActiveTab('requests')}><Send size={18}/><div><strong>Payment Requests</strong><small>Track premium requests raised for your clients.</small></div><ChevronRight size={16}/></button><button className="ap-more-command" onClick={()=>setActiveTab('history')}><Clock3 size={18}/><div><strong>Payment History</strong><small>View paid premiums and download receipts.</small></div><ChevronRight size={16}/></button></div>
    <div className="ap-more-section"><span className="ap-more-section-title">ACCOUNT</span><button className="ap-more-command" onClick={()=>setShowProfile(true)}><CircleUserRound size={18}/><div><strong>My Profile</strong><small>View your Trusted Circle agent account details.</small></div><ChevronRight size={16}/></button><button className="ap-secondary ap-profile-logout" onClick={logout}><LogOut size={16}/>Sign Out</button></div>
   </section>:null}  </main>

  {showProfile&&<div className="ap-modal-backdrop ap-profile-backdrop" onClick={()=>setShowProfile(false)}>
   <div className="ap-modal ap-profile-modal" onClick={e=>e.stopPropagation()}>
    <button className="ap-close" onClick={()=>setShowProfile(false)}><X/></button>
    <div className="ap-profile-card-head">
      <span className="ap-profile-large-avatar">{String(agent.AgentName||'A').trim().charAt(0).toUpperCase()}</span>
      <div><span className="ap-eyebrow">AGENT PROFILE</span><h2>{agent.AgentName||'Agent'}</h2><p>Trusted Circle Agent</p></div>
    </div>
    <div className="ap-profile-details">
      {Object.entries(agent||{}).filter(([k,v])=>v!==null&&v!==undefined&&v!==''&&!/password|token|secret|otp/i.test(k)).map(([k,v])=><div key={k}><small>{k.replace(/([a-z])([A-Z])/g,'$1 $2')}</small><strong>{String(v)}</strong></div>)}
    </div>
    <button className="ap-secondary ap-profile-logout" onClick={logout}><LogOut size={16}/>Sign Out</button>
   </div>
  </div>}

  {history&&<div className="ap-modal-backdrop" onClick={()=>!historyLoading&&setHistory(null)}><div className="ap-modal ap-detail-modal ap-history-modal" onClick={e=>e.stopPropagation()}><button className="ap-close" onClick={()=>!historyLoading&&setHistory(null)}><X/></button><span className="ap-eyebrow">CLIENT PAYMENT HISTORY</span><h2>{history.client.ClientName}</h2><p className="ap-history-sub">Policy {history.client.PolicyNumber} · Request and payment status</p><div className="ap-history-summary"><div><small>Requests</small><strong>{history.totalRequests}</strong></div><div><small>Payments</small><strong>{history.totalPayments}</strong></div><div><small>Current</small><strong>{history.client.Status||'ACTIVE'}</strong></div></div>{historyLoading?<div className="ap-empty"><RefreshCw className="spin"/><span>Loading history…</span></div>:history.requests.length?<div className="ap-history-list">{history.requests.map(x=><div className="ap-history-item" key={x.RequestID}><div><strong>Premium Request</strong><small>{x.RequestedAt?new Date(x.RequestedAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—'}</small></div><span className={'ap-request-pill '+String(x.Status||'PENDING').toLowerCase()}>{x.Status||'PENDING'}</span>{x.PaymentID&&<div className="ap-history-payment"><WalletCards size={13}/><span>Paid {x.PaymentDate?new Date(x.PaymentDate).toLocaleDateString('en-IN'):'—'} · {x.ReferenceNumber||'Payment recorded'}</span></div>}</div>)}</div>:<div className="ap-empty"><Clock3 size={22}/><b>No payment history</b><span>This client has not had a premium payment request yet.</span></div>}<button className="ap-primary wide" onClick={()=>setHistory(null)}>Close</button></div></div>}

  {detail&&<div className="ap-modal-backdrop" onClick={()=>setDetail(null)}><div className="ap-modal ap-detail-modal" onClick={e=>e.stopPropagation()}><button className="ap-close" onClick={()=>setDetail(null)}><X/></button><span className="ap-eyebrow">{detail.type.toUpperCase()}</span><h2>{detail.data.ClientName||'Client'}</h2><div className="ap-detail-grid">{Object.entries(detail.data).filter(([k])=>!['ClientID','RequestID'].includes(k)).map(([k,v])=><div key={k}><small>{k.replace(/([a-z])([A-Z])/g,'$1 $2')}</small><strong>{String(v??'—')}</strong></div>)}</div><button className="ap-primary wide" onClick={()=>setDetail(null)}>Close</button></div></div>}

  <nav className="ap-bottom-nav" aria-label="Primary navigation">
   <button className={activeTab==='home'?'active':''} onClick={()=>{setActiveTab('home');window.scrollTo({top:0,behavior:'smooth'})}}><Home size={21}/><span>Home</span></button>
   <button className={activeTab==='policies'?'active':''} onClick={()=>setActiveTab('policies')}><Users size={21}/><span>My Clients</span></button>
   <button className={activeTab==='requests'?'active':''} onClick={()=>setActiveTab('requests')}><Send size={21}/>{pending>0&&<b>{pending}</b>}<span>Requests</span></button>
   <button className={activeTab==='history'?'active':''} onClick={()=>setActiveTab('history')}><Clock3 size={21}/><span>History</span></button>
   <button className={activeTab==='more'?'active':''} onClick={()=>setActiveTab('more')}><MoreHorizontal size={21}/><span>More</span></button>
  </nav>

  {showForm&&<div className="ap-modal-backdrop"><div className="ap-modal ap-wizard ap-simple-submit">
   <button className="ap-close" onClick={()=>!loading&&setShowForm(false)}><X/></button>
   <div className="ap-wizard-head"><span className="ap-eyebrow">{editingPolicyId?'EDIT SAVED POLICY':'ADD NEW POLICY'}</span><h2>{editingPolicyId?'Edit Client & Policy':'Add Policy'}</h2><p>{editingPolicyId?'Update the saved client and policy details.':'Add the client once. Premium payment requests are raised separately whenever a new premium is due.'}</p></div>
   <div className="ap-simple-flow"><span>1</span><i></i><span>2</span><i></i><span>3</span><small>Client</small><small>Policy</small><small>Ready</small></div>
   <div className="ap-form-grid ap-three-fields">
    <label>Client Full Name<input value={policyForm.ClientName} onChange={e=>setPolicyForm({...policyForm,ClientName:e.target.value})} placeholder="Enter client's full name" autoComplete="name"/></label>
    <label>LIC Policy Number<input value={policyForm.PolicyNumber} onChange={e=>setPolicyForm({...policyForm,PolicyNumber:e.target.value.toUpperCase()})} placeholder="Enter policy number" autoComplete="off"/></label>
    <label>Client Date of Birth<input type="date" value={policyForm.DateOfBirth} onChange={e=>setPolicyForm({...policyForm,DateOfBirth:e.target.value})}/></label>
   </div>
   <div className="ap-info-note"><ShieldCheck size={15}/><div><strong>Client profile only</strong><span>No premium amount or payment details are required here. Add the client once; every premium payment request and payment history will be recorded separately.</span></div></div>
   <div className="ap-wizard-actions"><button className="ap-secondary" onClick={()=>setShowForm(false)} disabled={loading}>Cancel</button><button className="ap-primary ap-send" disabled={loading||!policyForm.ClientName||!policyForm.PolicyNumber||!policyForm.DateOfBirth} onClick={editingPolicyId?editPolicy:addPolicy}>{loading?<RefreshCw className="spin"/>:editingPolicyId?<CheckCircle2 size={15}/>:<Plus size={15}/>} {editingPolicyId?'Save Changes':'Add Policy'}<ArrowRight size={15}/></button></div>
  </div></div>}
 </div>
}

function AgentInvoiceCard({invoice,onDownload,onPaymentDone}){const status=String(invoice.PaymentStatus||'UNPAID').toUpperCase();const payable=Number(invoice.NetPayable||0);const paymentLink=COMMON_AGENT_PAYMENT_LINK;const reported=status==='AGENT_REPORTED';const paid=['PAID','SETTLED'].includes(status);return <div className="ap-invoice-card"><div className="ap-invoice-card-head"><div><strong>{invoice.InvoiceNumber||'Invoice'}</strong><small>{displayDate(invoice.InvoiceDate)} · {status}</small></div><span>{money(payable)}</span></div><div className="ap-invoice-meta"><span>Gross {money(invoice.TotalAmount||0)}</span><span>Discount 2% · {money(invoice.DiscountAmount||0)}</span></div><div className="ap-invoice-actions"><button className="ap-secondary" onClick={()=>onDownload(invoice)}><Download size={14}/>Download Invoice</button>{!paid&&!reported&&<><button className="ap-primary" onClick={()=>window.open(paymentLink,'_blank','noopener,noreferrer')}><ExternalLink size={14}/>Pay {money(payable)}</button><button className="ap-secondary ap-payment-done" onClick={()=>onPaymentDone&&onPaymentDone(invoice)}><CheckCircle2 size={14}/>Payment Done</button></>}{reported&&<button className="ap-secondary" disabled><Clock3 size={14}/>Admin Verification Pending</button>}{paid&&<button className="ap-secondary" disabled><CheckCircle2 size={14}/>Payment Received</button>}</div></div>}
function LoadingOverlay({text}){return <div className="ap-loading-overlay"><div className="ap-loader-card"><div className="ap-loader-logo"><img src={LOGO_URL} alt="Trusted Circle"/><span></span></div><strong>{text}</strong><small>Trusted Circle is securely preparing your workspace.</small><div className="ap-loader-line"><i></i></div></div></div>}
