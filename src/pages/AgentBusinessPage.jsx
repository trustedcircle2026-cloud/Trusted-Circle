import {useEffect,useMemo,useState} from 'react'
import {Activity,ArrowLeft,BarChart3,BriefcaseBusiness,Calculator,CardSim,CheckCircle2,ChevronRight,CircleDollarSign,CircleUserRound,Download,ExternalLink,FileText,LayoutDashboard,Link2,Plus,RefreshCw,Search,Send,ShieldCheck,Users,WalletCards,X,CreditCard,CalendarDays,ReceiptText,QrCode} from 'lucide-react'
import jsQR from 'jsqr'
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
 const[adminToken,setAdminToken]=useState(()=>localStorage.getItem('tc_agent_admin_session')||''),[adminPassword,setAdminPassword]=useState(''),[dashboard,setDashboard]=useState(null),[module,setModule]=useState('Agents'),[rows,setRows]=useState([]),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[search,setSearch]=useState(''),[showForm,setShowForm]=useState(false),[form,setForm]=useState({}),[error,setError]=useState(''),[notice,setNotice]=useState(''),[calc,setCalc]=useState({premiumAmount:10000,discountRate:.02,cashbackRate:.05}),[calcResult,setCalcResult]=useState(null),[schema,setSchema]=useState([]),[editing,setEditing]=useState(false),[activeTab,setActiveTab]=useState('home'),[profileOpen,setProfileOpen]=useState(false),[paymentModal,setPaymentModal]=useState(null),[paymentForm,setPaymentForm]=useState({amount:'',paymentDate:localIsoDate(),paymentMode:'Credit Card',cardId:''}),[cards,setCards]=useState([]),[paying,setPaying]=useState(false),[invoiceModal,setInvoiceModal]=useState(null),[invoiceRows,setInvoiceRows]=useState([]),[invoiceSelection,setInvoiceSelection]=useState([]),[invoiceDate,setInvoiceDate]=useState(localIsoDate()),[invoiceLoading,setInvoiceLoading]=useState(false),[invoiceAgents,setInvoiceAgents]=useState([]),[invoiceAdminRows,setInvoiceAdminRows]=useState([]),[invoiceAdminLoading,setInvoiceAdminLoading]=useState(false),[invoiceLinkModal,setInvoiceLinkModal]=useState(null),[invoiceLinkForm,setInvoiceLinkForm]=useState(''),[qrBusy,setQrBusy]=useState(false),[invoiceHistoryModal,setInvoiceHistoryModal]=useState(false),[receivableModal,setReceivableModal]=useState(false),[receivableRows,setReceivableRows]=useState([]),[receivableLoading,setReceivableLoading]=useState(false)

 const loadDashboard=async()=>{if(!adminToken)return;setRefreshing(true);setError('');try{setDashboard(await agentBusinessApi.dashboard(adminToken))}catch(e){if(/session expired|session is required|invalid admin password/i.test(e.message)){localStorage.removeItem('tc_agent_admin_session');setAdminToken('')}setError(e.message)}finally{setRefreshing(false)}}
 const openPaymentModal=async request=>{
   setError('');setNotice('');
   try{
     const result=await agentBusinessApi.list('Cards',{limit:500},adminToken);
     const active=(result.items||[]).filter(card=>String(card.Status||'ACTIVE').toUpperCase()!=='INACTIVE');
     setCards(active);
     setPaymentForm({amount:request.PremiumAmount||'',paymentDate:localIsoDate(),paymentMode:'Credit Card',cardId:active[0]?.CardID||''});
     setPaymentModal(request);
   }catch(e){setError(e.message)}
 }
 const submitPayment=async()=>{
   if(!paymentModal||paying)return;
   setPaying(true);setError('');setNotice('');
   try{
     const result=await agentBusinessApi.markPaymentPaid({
       requestId:paymentModal.RequestID,
       amount:Number(paymentForm.amount||0),
       paymentDate:paymentForm.paymentDate,
       paymentMode:paymentForm.paymentMode,
       cardId:paymentForm.cardId
     },adminToken);
     setPaymentModal(null);
     setNotice('Payment recorded. Agent receivable: '+money(result.receivableAmount)+' (after 2% discount).');
     await loadModule();await loadDashboard();
     if(result.receivableId){
       await openInvoiceBuilder(result.agent?.AgentID||paymentModal.AgentID,[result.receivableId]);
     }
   }catch(e){setError(e.message)}
   finally{setPaying(false)}
 }
 const loadAdminInvoices=async()=>{
   if(!adminToken)return;
   setInvoiceAdminLoading(true);setError('');
   try{const result=await agentBusinessApi.list('Invoices',{limit:500},adminToken);setInvoiceAdminRows(result.items||[])}catch(e){setError(e.message)}finally{setInvoiceAdminLoading(false)}
 }
 const openInvoiceLinkManager=async()=>{await loadAdminInvoices();setInvoiceLinkModal({invoiceId:'',paymentLink:''})}
 const decodeInvoiceQr=async file=>{
   if(!file)return;
   setQrBusy(true);setError('');
   try{
     const bitmap=await createImageBitmap(file);
     const max=1800,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height)),width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale));
     const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
     const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0,width,height);
     const image=ctx.getImageData(0,0,width,height);
     const code=jsQR(image.data,image.width,image.height,{inversionAttempts:'attemptBoth'});
     if(!code?.data)throw new Error('No QR code was detected. Upload a clear QR image.');
     const raw=String(code.data).trim();
     if(!/^https?:\/\//i.test(raw))throw new Error('The QR code was read, but it does not contain a payment URL.');
     setInvoiceLinkModal(prev=>prev?{...prev,paymentLink:raw}:{invoiceId:'',paymentLink:raw});
     setNotice('Payment QR read successfully. Verify the extracted link before saving.');
   }catch(e){setError(e.message||'Unable to read the QR image.')}
   finally{setQrBusy(false)}
 }
 const openInvoiceLinkEditor=invoice=>{setInvoiceLinkModal({invoiceId:invoice.InvoiceID,paymentLink:invoice.PaymentLink||''})}
 const openInvoiceHistory=async()=>{await loadAdminInvoices();setInvoiceHistoryModal(true)}
 const openReceivables=async()=>{setReceivableLoading(true);setError('');try{const result=await agentBusinessApi.listReceivables('',adminToken);setReceivableRows(result.items||[]);setReceivableModal(true)}catch(e){setError(e.message)}finally{setReceivableLoading(false)}}
 const saveInvoicePaymentLink=async()=>{
   if(!invoiceLinkModal||invoiceLinkModal.paymentLink===undefined)return;
   setInvoiceAdminLoading(true);setError('');setNotice('');
   try{const result=await agentBusinessApi.assignInvoicePaymentLink(invoiceLinkModal.invoiceId,invoiceLinkModal.paymentLink,adminToken);setInvoiceAdminRows(rows=>rows.map(row=>String(row.InvoiceID)===String(result.invoice.InvoiceID)?{...row,...result.invoice}:row));setNotice(result.invoice.PaymentLink?'Payable link assigned to '+result.invoice.InvoiceNumber+'.':'Payable link removed from '+result.invoice.InvoiceNumber+'.');setInvoiceLinkModal(null)}catch(e){setError(e.message)}finally{setInvoiceAdminLoading(false)}
 }
 const openInvoiceBuilder=async(agentId,preselect=[])=>{
   setError('');setInvoiceLoading(true);
   try{
     const agentsResult=await agentBusinessApi.list('Agents',{limit:500},adminToken);
     const activeAgents=(agentsResult.items||[]).filter(a=>String(a.Status||'ACTIVE').toUpperCase()!=='INACTIVE');
     setInvoiceAgents(activeAgents);
     let selectedAgentId=agentId||activeAgents[0]?.AgentID||'';
     const result=selectedAgentId?await agentBusinessApi.listReceivables(selectedAgentId,adminToken):{items:[]};
     const items=(result.items||[]).filter(row=>String(row.Status||'').toUpperCase()==='RECEIVABLE'||!String(row.Status||'').trim());
     setInvoiceRows(items);
     setInvoiceSelection(preselect.length?preselect:[]);
     setInvoiceDate(localIsoDate());
     setInvoiceModal({agentId:selectedAgentId});
   }catch(e){setError(e.message)}
   finally{setInvoiceLoading(false)}
 }
 const changeInvoiceAgent=async agentId=>{
   setInvoiceModal(prev=>({...prev,agentId}));
   setInvoiceLoading(true);
   try{
     const result=await agentBusinessApi.listReceivables(agentId,adminToken);
     const items=(result.items||[]).filter(row=>String(row.Status||'').toUpperCase()==='RECEIVABLE'||!String(row.Status||'').trim());
     setInvoiceRows(items);setInvoiceSelection([]);
   }catch(e){setError(e.message)}
   finally{setInvoiceLoading(false)}
 }
 const createInvoice=async()=>{
   if(!invoiceModal||!invoiceSelection.length||invoiceLoading)return;
   setInvoiceLoading(true);setError('');setNotice('');
   try{
     const result=await agentBusinessApi.createInvoice({agentId:invoiceModal.agentId,receivableIds:invoiceSelection,invoiceDate},adminToken);
     if(result.pdfBase64){
       const bytes=Uint8Array.from(atob(result.pdfBase64),ch=>ch.charCodeAt(0));
       const blob=new Blob([bytes],{type:'application/pdf'});
       const url=URL.createObjectURL(blob);
       const a=document.createElement('a');a.href=url;a.download=result.fileName||'Trusted-Circle-Invoice.pdf';a.click();
       setTimeout(()=>URL.revokeObjectURL(url),1000);
     }
     setNotice('Invoice '+(result.invoice?.InvoiceNumber||'')+' generated'+(result.sent?' and emailed to the agent.':'.'));
     setInvoiceModal(null);setInvoiceRows([]);setInvoiceSelection([]);
   }catch(e){setError(e.message)}
   finally{setInvoiceLoading(false)}
 }
 const enrichPaymentRequests=async(items)=>{
   if(!items.length)return items
   try{
     const clientResult=await agentBusinessApi.list('Clients',{limit:500},adminToken)
     const clients=clientResult.items||[]
     const byId=new Map(clients.map(client=>[String(client.ClientID),client]))
     return items.map(request=>{
       const client=byId.get(String(request.ClientID))||{}
       return {
         ...request,
         ClientName:request.ClientName||client.ClientName||'',
         PolicyNumber:request.PolicyNumber||client.PolicyNumber||'',
         DateOfBirth:request.DateOfBirth||client.DateOfBirth||'',
       }
     })
   }catch(e){return items}
 }
 const loadHistory=async()=>{
   if(!agentTokenReady(adminToken)||!agentBusinessApi.isConfigured())return
   setLoading(true);setError('')
   try{
     const [paymentsResult,requestsResult,paymentSchema,clientsResult,cardsResult]=await Promise.all([
       agentBusinessApi.list('Payments',{search},adminToken),
       agentBusinessApi.list('PaymentRequests',{search},adminToken),
       agentBusinessApi.schema('Payments',adminToken),
       agentBusinessApi.list('Clients',{limit:500},adminToken),
       agentBusinessApi.list('Cards',{limit:500},adminToken)
     ])
     const clientMap=new Map((clientsResult.items||[]).map(client=>[String(client.ClientID),client]))
     const cardMap=new Map((cardsResult.items||[]).map(card=>[String(card.CardID),card]))
     const payments=(paymentsResult.items||[]).map(row=>{
       const client=clientMap.get(String(row.ClientID))||{}
       const card=cardMap.get(String(row.CardID))||{}
       return {...row,ClientName:row.ClientName||client.ClientName||'',PolicyNumber:row.PolicyNumber||client.PolicyNumber||'',DateOfBirth:row.DateOfBirth||client.DateOfBirth||'',CardNickname:row.CardNickname||card.CardName||card.Bank||'',HistoryType:'PAYMENT'}
     })
     const requests=await enrichPaymentRequests(requestsResult.items||[])
     const historicalRequests=requests
       .filter(row=>!['PENDING','SUBMITTED'].includes(String(row.Status||row.RequestStatus||'').toUpperCase()))
       .map(row=>({...row,HistoryType:'REQUEST'}))
     const merged=[...payments,...historicalRequests]
     merged.sort((a,b)=>{
       const da=new Date(a.PaidAt||a.PaymentDate||a.CreatedAt||a.UpdatedAt||a.RequestDate||0).getTime()
       const db=new Date(b.PaidAt||b.PaymentDate||b.CreatedAt||b.UpdatedAt||b.RequestDate||0).getTime()
       return db-da
     })
     setRows(merged);setSchema(paymentSchema.fields||[])
   }catch(e){setError(e.message)}finally{setLoading(false)}
 }
 const loadModule=async()=>{if(module==='__dashboard'||!agentTokenReady(adminToken)||!agentBusinessApi.isConfigured())return;setLoading(true);try{
   const [r,s]=await Promise.all([agentBusinessApi.list(module,{search},adminToken),agentBusinessApi.schema(module,adminToken)])
   let items=r.items||[]
   if(module==='PaymentRequests')items=await enrichPaymentRequests(items)
   if(module==='PaymentRequests'){
     items=items.filter(request=>!['PAID','COMPLETED','CANCELLED'].includes(String(request.Status||request.RequestStatus||'').toUpperCase()))
   }
   setRows(items);setSchema(s.fields||[])
 }catch(e){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{if(!adminToken)return; if(module==='__dashboard')loadDashboard(); else if(activeTab==='history')loadHistory(); else loadModule()},[module,adminToken,activeTab])
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
      <PaymentRequestList rows={rows} loading={loading} onRefresh={loadModule} onEdit={editRow} onDelete={deleteRow} onPaid={openPaymentModal}/>
    </section>}

    {activeTab==='history'&&<section className="tc-page">
      <PageHeader kicker="PAYMENT HISTORY" title="History" text="View completed payment records and receipts." onRefresh={()=>loadModule()} loading={loading}/>
      <div className="tc-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadModule()} placeholder="Search payment history"/></div>
      <HistoryList rows={rows} loading={loading} onEdit={editRow} onDelete={deleteRow}/>
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
        <span className="tc-more-group-title">AGENT RECEIVABLES</span>
        <button className="tc-more-item" onClick={()=>openInvoiceBuilder('')}><span className="tc-more-item-icon"><ReceiptText size={18}/></span><div><strong>Create Invoice</strong><small>Create a multi-client invoice from unpaid agent receivables.</small></div><ChevronRight size={16}/></button>
        <button className="tc-more-item" onClick={openInvoiceHistory}><span className="tc-more-item-icon"><FileText size={18}/></span><div><strong>Invoice History</strong><small>View generated, reported, paid and failed agent invoices.</small></div><ChevronRight size={16}/></button>
        <button className="tc-more-item" onClick={openInvoiceLinkManager}><span className="tc-more-item-icon"><Link2 size={18}/></span><div><strong>Assign Payment Link</strong><small>Upload the predefined QR and extract its payment URL automatically.</small></div><ChevronRight size={16}/></button>
        <button className="tc-more-item" onClick={openReceivables}><span className="tc-more-item-icon"><WalletCards size={18}/></span><div><strong>Receivables</strong><small>Review agent balances and mark individual receivables as received.</small></div><ChevronRight size={16}/></button>
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

  {paymentModal&&<PaymentVerificationModal request={paymentModal} form={paymentForm} setForm={setPaymentForm} cards={cards} paying={paying} onClose={()=>setPaymentModal(null)} onSubmit={submitPayment}/>}
  {invoiceModal&&<InvoiceBuilderModal agentId={invoiceModal.agentId} agents={invoiceAgents} onAgentChange={changeInvoiceAgent} rows={invoiceRows} selection={invoiceSelection} setSelection={setInvoiceSelection} invoiceDate={invoiceDate} setInvoiceDate={setInvoiceDate} loading={invoiceLoading} onClose={()=>setInvoiceModal(null)} onSubmit={createInvoice}/>}
  {invoiceLinkModal&&<InvoiceLinkManagerModal rows={invoiceAdminRows} loading={invoiceAdminLoading} modal={invoiceLinkModal} setModal={setInvoiceLinkModal} onEdit={openInvoiceLinkEditor} onSave={saveInvoicePaymentLink} onRefresh={loadAdminInvoices} onQrUpload={decodeInvoiceQr} qrBusy={qrBusy}/>}
  {invoiceHistoryModal&&<InvoiceHistoryModal rows={invoiceAdminRows} loading={invoiceAdminLoading} onClose={()=>setInvoiceHistoryModal(false)} onRefresh={loadAdminInvoices} onAssign={openInvoiceLinkEditor}/>}
  {receivableModal&&<ReceivableManagerModal rows={receivableRows} loading={receivableLoading} onClose={()=>setReceivableModal(false)} onRefresh={openReceivables}/>}
  {showForm&&<div className="tc-modal-backdrop" onClick={()=>{setShowForm(false);setEditing(false)}}><div className="tc-crud-modal" onClick={e=>e.stopPropagation()}><button className="tc-modal-close" onClick={()=>{setShowForm(false);setEditing(false)}}><X size={18}/></button><span className="tc-kicker">{editing?'EDIT':'NEW'} {module==='Agents'?'AGENT':'RECORD'}</span><h2>{editing?'Edit ':'Add '}{title(module)}</h2><p>Manage the record details below.</p><div className="tc-form-grid">{schema.filter(f=>!['CreatedAt','UpdatedAt'].includes(f)).map(f=>{const isId=f===schema[0];if(isId)return <label key={f}>{title(f)}<input value={form[f]||''} disabled/></label>;return <label key={f}>{title(f)}<input value={form[f]||''} onChange={e=>setForm({...form,[f]:e.target.value})} disabled={editing&&['AgentID','AgentUserID'].includes(f)} placeholder={title(f)}/></label>})}{module==='Agents'&&!editing&&<label>4-Digit Password<input type="password" value={form.Password||''} onChange={e=>setForm({...form,Password:e.target.value.replace(/\D/g,'').slice(0,4)})} inputMode="numeric" maxLength="4" placeholder="4-digit password"/></label>}</div><button className="tc-save-button" disabled={module==='Agents'&&!editing&&(!/^\d{10}$/.test(form.Mobile||'')||!/^\d{4}$/.test(form.Password||'')||!form.AgentName)} onClick={save}><CheckCircle2 size={16}/>{editing?'Update Record':module==='Agents'?'Create Agent':'Save Record'}</button></div></div>}
 </div>
}

function localIsoDate(){const d=new Date();const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,10)}
function displayDate(value){const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})/);if(!m)return value||'';return m[3]+'-'+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(m[2])-1]+'-'+m[1]}
function PaymentVerificationModal({request,form,setForm,cards,paying,onClose,onSubmit}){const client=request.ClientName||'Client';const discount=Math.round(Number(form.amount||0)*.02*100)/100;const receivable=Math.max(0,Number(form.amount||0)-discount);return <div className="tc-modal-backdrop" onClick={onClose}><div className="tc-crud-modal tc-payment-verify-modal" onClick={e=>e.stopPropagation()}><button className="tc-modal-close" onClick={onClose}><X size={18}/></button><span className="tc-kicker">PAYMENT VERIFICATION</span><h2>Mark Premium as Paid</h2><p>{client} · Policy {request.PolicyNumber||'—'}</p><div className="tc-form-grid"><label>Premium Amount Paid<input type="number" min="0" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="Enter amount"/></label><label>Premium Paid Date<div className="tc-date-display"><CalendarDays size={15}/><input value={displayDate(form.paymentDate)} onChange={e=>{const v=e.target.value;const m=v.match(/^(\d{2})[-\/](\w{3})[-\/](\d{4})$/);if(m){const months={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};setForm({...form,paymentDate:m[3]+'-'+months[m[2]]+'-'+m[1]})}}}/></div><small className="tc-field-note">Auto-filled: {displayDate(localIsoDate())}</small></label><label>Paid By<select value={form.paymentMode} onChange={e=>setForm({...form,paymentMode:e.target.value})}><option>Credit Card</option><option>Debit Card</option></select></label><label>Card Nickname<select value={form.cardId} onChange={e=>setForm({...form,cardId:e.target.value})}><option value="">Select card</option>{cards.map(card=><option key={card.CardID} value={card.CardID}>{card.CardName||card.Bank||'Card'} {card.Last4?'· '+card.Last4:''}</option>)}</select></label></div><div className="tc-payment-summary"><div><span>Premium Paid</span><strong>{money(form.amount||0)}</strong></div><div><span>Discount 2%</span><strong>- {money(discount)}</strong></div><div className="total"><span>Agent Receivable</span><strong>{money(receivable)}</strong></div></div><div className="tc-payment-hint">This records the actual card used, creates the agent receivable, and prepares the item for the invoice. The card nickname is stored so full card rules/details can be added later.</div><button className="tc-save-button" disabled={paying||!(Number(form.amount)>0)||!form.paymentDate||!form.cardId} onClick={onSubmit}><CheckCircle2 size={16}/>{paying?'Saving payment…':'Confirm Paid & Create Receivable'}</button></div></div>}
function InvoiceLinkManagerModal({rows,loading,modal,setModal,onEdit,onSave,onRefresh,onQrUpload,qrBusy}){
 const invoice=modal?.invoiceId?rows.find(r=>String(r.InvoiceID)===String(modal.invoiceId)):null;
 const outstanding=rows.filter(r=>!['PAID','SETTLED','CANCELLED'].includes(String(r.PaymentStatus||'UNPAID').toUpperCase()));
 const reported=rows.filter(r=>String(r.PaymentStatus||'').toUpperCase()==='AGENT_REPORTED');
 return <div className="tc-modal-backdrop" onClick={()=>!loading&&!qrBusy&&setModal(null)}>
  <div className="tc-crud-modal tc-invoice-link-modal" onClick={e=>e.stopPropagation()}>
   <button className="tc-modal-close" onClick={()=>!loading&&!qrBusy&&setModal(null)}><X size={18}/></button>
   <span className="tc-kicker">AGENT PAYABLE CONTROL</span><h2>Assign Payment Link</h2>
   <p>Upload the predefined payment QR. Trusted Circle reads the QR payload and extracts the payment URL.</p>
   <div className="tc-invoice-admin-list">
    {loading&&!rows.length?<div className="tc-empty"><RefreshCw className="tc-spin" size={20}/><span>Loading invoices…</span></div>:
     outstanding.length?outstanding.map(row=><div className="tc-invoice-admin-row" key={row.InvoiceID}>
      <div><strong>{row.InvoiceNumber}</strong><small>{displayDate(row.InvoiceDate)} · {money(row.NetPayable)} payable · {row.PaymentStatus||'UNPAID'}</small></div>
      <span className={'tc-status '+String(row.PaymentStatus||'UNPAID').toLowerCase()}>{row.PaymentStatus||'UNPAID'}</span>
      <button onClick={()=>onEdit(row)}><Link2 size={14}/>{row.PaymentLink?'Edit Link':'Assign Link'}</button>
     </div>):<div className="tc-empty"><ReceiptText size={20}/><strong>No outstanding invoices</strong><span>Generate an invoice first.</span></div>}
   </div>
   {reported.length>0&&<div className="tc-payment-hint"><strong>{reported.length} agent payment report{reported.length>1?'s':''} awaiting admin verification.</strong> Use the email Received/Pending/Failed actions or the Receivables control.</div>}
   {invoice&&<div className="tc-link-editor">
    <label>Invoice<select value={invoice.InvoiceID} disabled><option>{invoice.InvoiceNumber} · {money(invoice.NetPayable)}</option></select></label>
    <label>Payment QR / Image<input type="file" accept="image/*" disabled={qrBusy} onChange={e=>onQrUpload&&onQrUpload(e.target.files?.[0])}/><small className="tc-field-note">{qrBusy?'Reading QR…':'Upload the predefined amount QR image. The decoded URL will appear below.'}</small></label>
    <div className="tc-qr-readout"><QrCode size={18}/><div><small>Extracted Payment Link</small><strong>{modal.paymentLink||'No link extracted yet'}</strong></div></div>
    <label>Payment Link<input value={modal.paymentLink||''} onChange={e=>setModal({...modal,paymentLink:e.target.value})} placeholder="https://…"/></label>
    <div className="tc-link-editor-actions"><button onClick={()=>setModal(null)} disabled={loading||qrBusy}>Cancel</button><button className="tc-save-button" disabled={loading||qrBusy||!/^https?:\\/\\//i.test(String(modal.paymentLink||''))} onClick={onSave}>{loading?'Saving…':'Save Payment Link'}</button></div>
   </div>}
   <button className="tc-secondary-action" onClick={onRefresh} disabled={loading||qrBusy}><RefreshCw size={14}/>Refresh Invoice List</button>
  </div>
 </div>
}
function InvoiceHistoryModal({rows,loading,onClose,onRefresh,onAssign}){
 const ordered=[...rows].sort((a,b)=>new Date(b.InvoiceDate||b.CreatedAt||0)-new Date(a.InvoiceDate||a.CreatedAt||0));
 return <div className="tc-modal-backdrop" onClick={()=>!loading&&onClose()}><div className="tc-crud-modal tc-invoice-history-modal" onClick={e=>e.stopPropagation()}><button className="tc-modal-close" onClick={onClose}><X size={18}/></button><span className="tc-kicker">INVOICE HISTORY</span><h2>Agent Invoice History</h2><p>Every invoice remains recorded here, including payment reports and failed attempts.</p><div className="tc-invoice-history-list">{loading?<div className="tc-empty"><RefreshCw className="tc-spin" size={20}/><span>Loading invoices…</span></div>:ordered.length?ordered.map(row=><div className="tc-invoice-history-row" key={row.InvoiceID}><div><strong>{row.InvoiceNumber}</strong><small>{displayDate(row.InvoiceDate)} · Agent {row.AgentID||'—'}</small></div><div><span className={'tc-status '+String(row.PaymentStatus||'UNPAID').toLowerCase()}>{row.PaymentStatus||'UNPAID'}</span><strong>{money(row.NetPayable)}</strong></div><div className="tc-invoice-history-actions">{row.PdfUrl&&<button onClick={()=>window.open(row.PdfUrl,'_blank','noopener,noreferrer')}><ExternalLink size={14}/>PDF</button>}{!['PAID','SETTLED'].includes(String(row.PaymentStatus||'').toUpperCase())&&<button onClick={()=>onAssign&&onAssign(row)}><Link2 size={14}/>Assign Link</button>}</div></div>):<div className="tc-empty"><FileText size={20}/><strong>No invoices yet</strong></div>}</div><button className="tc-secondary-action" onClick={onRefresh} disabled={loading}><RefreshCw size={14}/>Refresh</button></div></div>
}
function ReceivableManagerModal({rows,loading,onClose,onRefresh}){
 const mark=async id=>{try{await agentBusinessApi.markReceivableReceived(id,localStorage.getItem('tc_agent_admin_session')||'');await onRefresh()}catch(e){window.alert(e.message)}};
 return <div className="tc-modal-backdrop" onClick={()=>!loading&&onClose()}><div className="tc-crud-modal tc-invoice-history-modal" onClick={e=>e.stopPropagation()}><button className="tc-modal-close" onClick={onClose}><X size={18}/></button><span className="tc-kicker">AGENT RECEIVABLES</span><h2>Receivables Control</h2><p>Mark individual agent receivables as received when settlement is confirmed.</p><div className="tc-invoice-history-list">{loading?<div className="tc-empty"><RefreshCw className="tc-spin" size={20}/><span>Loading receivables…</span></div>:rows.length?rows.slice().reverse().map(row=><div className="tc-invoice-history-row" key={row.ReceivableID}><div><strong>{row.ClientName||'Client'}</strong><small>{row.PolicyNumber||'Policy'} · {row.AgentID||'Agent'}</small></div><div><span className={'tc-status '+String(row.Status||'RECEIVABLE').toLowerCase()}>{row.Status||'RECEIVABLE'}</span><strong>{money(row.ReceivableAmount||0)}</strong></div><div className="tc-invoice-history-actions">{String(row.Status||'').toUpperCase()!=='RECEIVED'&&<button className="tc-received-action" onClick={()=>mark(row.ReceivableID)}><CheckCircle2 size={14}/>Mark Received</button>}</div></div>):<div className="tc-empty"><WalletCards size={20}/><strong>No receivables found</strong></div>}</div><button className="tc-secondary-action" onClick={onRefresh} disabled={loading}><RefreshCw size={14}/>Refresh</button></div></div>
}
function InvoiceBuilderModal({agentId,agents,onAgentChange,rows,selection,setSelection,invoiceDate,setInvoiceDate,loading,onClose,onSubmit}){const available=rows.filter(r=>String(r.Status||'').toUpperCase()==='RECEIVABLE'||!String(r.Status||'').trim());const selectedRows=available.filter(r=>selection.includes(String(r.ReceivableID)));const gross=selectedRows.reduce((s,r)=>s+Number(r.GrossAmount||r.ReceivableAmount||0),0);const discount=Math.round(gross*.02*100)/100;const net=Math.max(0,gross-discount);return <div className="tc-modal-backdrop" onClick={onClose}><div className="tc-crud-modal tc-invoice-modal" onClick={e=>e.stopPropagation()}><button className="tc-modal-close" onClick={onClose}><X size={18}/></button><span className="tc-kicker">AGENT INVOICE</span><h2>Create Invoice</h2><p>Add one or multiple funded premium payments. The final invoice deducts the Trusted Circle 2% discount.</p><label className="tc-full-field">Bill To Agent<select value={agentId||''} onChange={e=>onAgentChange(e.target.value)}><option value="">Select agent</option>{agents.map(a=><option key={a.AgentID} value={a.AgentID}>{a.AgentName||a.AgentID}{a.AgencyName?' · '+a.AgencyName:''}</option>)}</select></label><label className="tc-full-field">Invoice Date<input value={displayDate(invoiceDate)} readOnly/></label><div className="tc-invoice-items">{available.map(r=><label key={r.ReceivableID} className="tc-invoice-item"><input type="checkbox" checked={selection.includes(String(r.ReceivableID))} onChange={()=>setSelection(selection.includes(String(r.ReceivableID))?selection.filter(id=>id!==String(r.ReceivableID)):[...selection,String(r.ReceivableID)])}/><div><strong>{r.ClientName||'Client'}</strong><small>{r.PolicyNumber||'Policy'} · {displayDate(r.DateOfBirth)} · Paid {displayDate(r.ReceivableDate)}</small></div><b>{money(r.GrossAmount||r.ReceivableAmount||0)}</b></label>)}{!available.length&&!loading&&<div className="tc-empty"><ReceiptText size={20}/><strong>No un-invoiced receivables</strong><span>Paid premiums will appear here after payment verification.</span></div>}</div><div className="tc-payment-summary"><div><span>Gross Premium</span><strong>{money(gross)}</strong></div><div><span>Less: Discount 2%</span><strong>- {money(discount)}</strong></div><div className="total"><span>Balance Payable</span><strong>{money(net)}</strong></div></div><button className="tc-save-button" disabled={loading||!selection.length||!agentId} onClick={onSubmit}><ReceiptText size={16}/>{loading?'Generating invoice…':'Generate PDF & Send to Agent'}</button></div></div>}
function PageHeader({kicker,title,text,onRefresh,loading,onAdd,addLabel}){return <div className="tc-page-head"><div><span className="tc-kicker">{kicker}</span><h1>{title}</h1><p>{text}</p></div><div className="tc-page-actions">{onRefresh&&<button onClick={onRefresh} disabled={loading}><RefreshCw size={15} className={loading?'tc-spin':''}/></button>}{onAdd&&<button className="tc-add-button" onClick={onAdd}><Plus size={16}/><span>{addLabel}</span></button>}</div></div>}
function PaymentRequestList({rows,loading,onRefresh,onEdit,onDelete,onPaid}){if(loading)return <div className="tc-empty"><RefreshCw className="tc-spin" size={22}/><span>Loading payment requests…</span></div>;if(!rows.length)return <div className="tc-empty"><Send size={22}/><strong>No pending payment requests</strong><span>New requests raised by agents will appear here.</span></div>;return <div className="tc-payment-request-list">{rows.map((r,i)=><PaymentRequestCard key={r.RequestID||i} request={r} onEdit={onEdit} onDelete={onDelete} onPaid={onPaid}/>)}</div>}
function formatAmazonDob(value){const raw=String(value||'').trim();if(!raw)return '';const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[3]+'/'+m[2]+'/'+m[1];const d=new Date(raw);if(!Number.isNaN(d.getTime()))return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();return raw}
function PaymentRequestCard({request:r,onEdit,onDelete,onPaid}){const [copied,setCopied]=useState('');const status=String(r.Status||r.RequestStatus||'PENDING').toUpperCase();const policy=r.PolicyNumber||r.PolicyNo||'';const dob=formatAmazonDob(r.DateOfBirth||r.DOB||'');const client=r.ClientName||r.Name||'Client';const copy=async(label,value)=>{if(!value)return;try{await navigator.clipboard.writeText(String(value));setCopied(label);setTimeout(()=>setCopied(''),1300)}catch{setCopied('Copy manually')}};const startPayment=async()=>{const bundle='Policy Number: '+policy+'\\nDate of Birth: '+dob+'\\nReceipt Email: '+PAYMENT_RECEIPT_EMAIL;try{await navigator.clipboard.writeText(bundle)}catch{}window.open(AMAZON_INSURANCE_URL,'_blank','noopener,noreferrer')};return <div className="tc-payment-card"><div className="tc-payment-head"><div className="tc-record-avatar"><Send size={16}/></div><div><strong>{client}</strong><small>Payment Request · {status}</small></div><span className={'tc-status '+status.toLowerCase()}>{status}</span></div><div className="tc-payment-details"><div><small>Policy Number</small><strong>{policy||'Not available'}</strong><button onClick={()=>copy('policy',policy)}>{copied==='policy'?'✓ Copied':'Copy'}</button></div><div><small>Date of Birth</small><strong>{dob||'Not available'}</strong><button onClick={()=>copy('dob',dob)}>{copied==='dob'?'✓ Copied':'Copy'}</button></div><div><small>Receipt Email</small><strong>{PAYMENT_RECEIPT_EMAIL}</strong><button onClick={()=>copy('email',PAYMENT_RECEIPT_EMAIL)}>{copied==='email'?'✓ Copied':'Copy'}</button></div></div><div className="tc-payment-actions"><button className="tc-amazon-button" disabled={!policy||!dob} onClick={startPayment}><span>₹</span> Open Amazon Insurance</button>{['PENDING','SUBMITTED'].includes(status)&&<button className="tc-paid-button" onClick={()=>onPaid&&onPaid(r)}>✓ Paid</button>}<button onClick={()=>onEdit(r)}>Details</button>{['PENDING','SUBMITTED'].includes(status)&&<button className="danger" onClick={()=>onDelete(r)}>Cancel</button>}</div><div className="tc-payment-hint">After payment, <strong>Paid</strong> opens the premium verification form for amount, payment date, card and receivable/invoice processing.</div></div>}
function HistoryList({rows,loading,onEdit,onDelete}){if(loading)return <div className="tc-empty"><RefreshCw className="tc-spin" size={22}/><span>Loading transaction history…</span></div>;if(!rows.length)return <div className="tc-empty"><FileText size={22}/><strong>No transactions found</strong><span>Paid, cancelled and completed transactions will appear here.</span></div>;return <div className="tc-payment-request-list">{rows.map((r,i)=>{const status=String(r.Status||r.RequestStatus||'PAID').toUpperCase();const isRequest=r.HistoryType==='REQUEST';return <div className="tc-payment-card tc-history-card" key={(r.PaymentID||r.RequestID||r.TransactionID||i)+'-'+i}><div className="tc-payment-head"><div className="tc-record-avatar"><CircleDollarSign size={16}/></div><div><strong>{r.ClientName||r.Name||r.PolicyNumber||r.PolicyNo||'Transaction'}</strong><small>{isRequest?'Payment Request':'Payment'} · {status}</small></div><span className={'tc-status '+status.toLowerCase()}>{status}</span></div><div className="tc-payment-details"><div><small>Policy Number</small><strong>{r.PolicyNumber||r.PolicyNo||'—'}</strong></div><div><small>Amount</small><strong>{money(r.Amount||r.PremiumAmount||r.PaidAmount||0)}</strong></div><div><small>Date</small><strong>{displayDate(String(r.PaidAt||r.PaymentDate||r.CreatedAt||r.UpdatedAt||r.RequestDate||'').slice(0,10))||'—'}</strong></div><div><small>Paid By</small><strong>{r.PaymentMode||r.CardNickname||'—'}</strong></div><div><small>Type</small><strong>{isRequest?'Request History':'Payment Record'}</strong></div></div><div className="tc-payment-actions">{onEdit&&<button onClick={()=>onEdit(r)}>Details</button>}{isRequest&&onDelete&&status==='CANCELLED'&&<button className="danger" onClick={()=>onDelete(r)}>Delete</button>}</div></div>})}</div>}
function RecordList({rows,fields,loading,onEdit,onDelete,onPassword,module}){if(loading)return <div className="tc-empty"><RefreshCw className="tc-spin" size={22}/><span>Loading records…</span></div>;if(!rows.length)return <div className="tc-empty"><FileText size={22}/><strong>No records found</strong><span>Add records or refresh to load the latest data.</span></div>;return <div className="tc-record-list">{rows.map((r,i)=><div className="tc-record-card" key={i}><div className="tc-record-main"><span className="tc-record-avatar">{String(r.AgentName||r.ClientName||r.Name||r.PolicyNumber||'?').trim().charAt(0).toUpperCase()}</span><div><strong>{r.AgentName||r.ClientName||r.Name||r.PolicyNumber||module}</strong><small>{r.Mobile||r.Phone||r.Email||r.PolicyNumber||r.Status||r.RequestStatus||'Record'}</small></div><ChevronRight size={17}/></div><div className="tc-record-fields">{fields.slice(0,5).map(f=><div key={f}><small>{title(f)}</small><span>{String(r[f]??'').length>60?String(r[f]).slice(0,60)+'…':String(r[f]??'')}</span></div>)}</div><div className="tc-record-actions"><button onClick={()=>onEdit(r)}>Edit</button><button className="danger" onClick={()=>onDelete(r)}>Delete</button>{module==='Agents'&&<button onClick={()=>onPassword(r.AgentID)}>Password</button>}</div></div>)}</div>}
function agentTokenReady(token){return Boolean(token)}

function Metric({label,value,icon:Icon}){return <div className="ab-metric"><span className="ab-metric-icon"><Icon size={18}/></span><small>{label}</small><strong>{value}</strong></div>}
