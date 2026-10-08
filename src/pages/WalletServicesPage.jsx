import {ArrowDownToLine,ArrowRight,CheckCircle2,Clock3,History,LogOut,RefreshCw,UserRound,WalletCards,X} from 'lucide-react'
import {jsPDF} from 'jspdf'
import {useEffect,useState} from 'react'
import {walletApi} from '../wallet-services-api'
import {api as shoppingApi} from '../api'
import './wallet-services.css'

const SESSION_KEY='tc_wallet_session'
const LOGO_URL='https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'
const money=n=>Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})
const statusClass=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')

async function logoDataUrl(){
 try{const b=await fetch(LOGO_URL).then(r=>r.blob());return await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(b)})}catch{return null}
}
function pdfText(doc,text,x,y,max=175){const lines=doc.splitTextToSize(String(text||''),max);doc.text(lines,x,y);return y+lines.length*6}
async function addPdfHeader(doc,title,subtitle){
 const logo=await logoDataUrl();if(logo)doc.addImage(logo,'JPEG',14,10,22,22);
 doc.setFontSize(18);doc.setFont(undefined,'bold');doc.setTextColor(20,39,31);doc.text('Trusted Circle',42,20);
 doc.setFontSize(10);doc.setFont(undefined,'normal');doc.setTextColor(90,105,98);doc.text(title,42,27);doc.text(subtitle,42,33);
 doc.setDrawColor(205,218,211);doc.line(14,39,196,39);doc.setTextColor(20,39,31)
}
function drawTable(doc,headers,rows,startY,widths){
 let y=startY;const x0=14;const rowH=8;
 const header=()=>{doc.setFontSize(8);doc.setFont(undefined,'bold');doc.setFillColor(232,245,238);doc.rect(x0,y-6,182,rowH,'F');let x=x0;headers.forEach((h,i)=>{doc.text(h,x+2,y-1);x+=widths[i]});y+=rowH;doc.setFont(undefined,'normal')};
 header();
 rows.forEach(row=>{if(y>270){doc.addPage();y=20;header()}let x=x0;doc.setDrawColor(225,233,228);doc.rect(x0,y-6,182,rowH);row.forEach((v,i)=>{doc.text(doc.splitTextToSize(String(v??''),widths[i]-4),x+2,y-1);x+=widths[i]});y+=rowH});return y
}
async function saveTransactionPdf(tx,user,filename='trusted-circle-wallet-transaction.pdf'){
 const doc=new jsPDF();await addPdfHeader(doc,'Wallet Services — Transaction PDF','Detailed transaction statement');
 doc.setFontSize(11);doc.setFont(undefined,'bold');doc.text('TRANSACTION DETAILS',14,51);
 const rows=[['Transaction ID',tx.transactionId],['Customer Name',user?.name||'—'],['Customer Email',user?.email||'—'],['Transaction Date',new Date(tx.createdAt).toLocaleString('en-IN')],['Completed Date',tx.completedAt?new Date(tx.completedAt).toLocaleString('en-IN'):'—'],['Type',tx.type==='ADD_MONEY'?'Add Money':'Withdrawal'],['Amount','₹'+money(tx.amount)],['Status',String(tx.status).replace(/_/g,' ')],['Balance Before','₹'+money(tx.balanceBefore)],['Balance After','₹'+money(tx.balanceAfter)],['UPI ID',tx.upiId||'—'],['Attempt',tx.attempt||1],['Payment Label',tx.paymentLinkLabel||'—'],['Notes',tx.notes||'—']];
 drawTable(doc,['Field','Details'],rows,59,[48,134]);
 doc.setFontSize(8);doc.setTextColor(105);doc.text('Trusted Circle Wallet Services · System generated document',14,286);doc.setTextColor(20,39,31);doc.save(filename)
}
async function saveTransactionsPdf(transactions,user,from,to){
 const doc=new jsPDF();await addPdfHeader(doc,'Wallet Services — Account Statement','Period: '+from+' to '+to);
 doc.setFontSize(10);doc.setFont(undefined,'bold');doc.text('CUSTOMER',14,50);doc.setFont(undefined,'normal');doc.text((user?.name||'Trusted Circle User')+'  ·  '+(user?.email||''),14,56);
 const rows=transactions.map(t=>[new Date(t.createdAt).toLocaleDateString('en-IN'),t.transactionId,t.type==='ADD_MONEY'?'Add Money':'Withdrawal','₹'+money(t.amount),String(t.status).replace(/_/g,' '),'₹'+money(t.balanceAfter)]);
 let y=68;y=drawTable(doc,['Date','Transaction ID','Type','Amount','Status','Balance After'],rows,y,[24,47,27,25,31,28]);
 y+=10;doc.setFont(undefined,'bold');doc.text('STATEMENT SUMMARY',14,y);y+=8;doc.setFont(undefined,'normal');
 const totalAdd=transactions.filter(t=>t.type==='ADD_MONEY'&&String(t.status).includes('COMPLETED')).reduce((s,t)=>s+Number(t.amount||0),0);
 const totalWithdraw=transactions.filter(t=>t.type==='WITHDRAW'&&String(t.status).includes('COMPLETED')).reduce((s,t)=>s+Number(t.amount||0),0);
 doc.text('Completed Add Money: ₹'+money(totalAdd),14,y);doc.text('Completed Withdrawals: ₹'+money(totalWithdraw),100,y);y+=7;doc.text('Transactions included: '+transactions.length,14,y);
 doc.setFontSize(8);doc.setTextColor(105);doc.text('Trusted Circle Wallet Services · System generated completed/account statement',14,286);doc.setTextColor(20,39,31);
 doc.save('trusted-circle-wallet-statement-'+from+'-to-'+to+'.pdf')
}

function Login({onLogin}){
 const[email,setEmail]=useState(''),[challengeId,setChallengeId]=useState(''),[options,setOptions]=useState([]),[selected,setSelected]=useState(''),[step,setStep]=useState('email'),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const request=async e=>{
   e.preventDefault();
   const em=email.trim().toLowerCase();
   if(!em)return;
   setBusy(true);
   setMessage('');
   let uiTimedOut=false;
   const uiTimer=setTimeout(()=>{
     uiTimedOut=true;
     setBusy(false);
     setMessage('Verification is still being prepared in the background. You can continue using the page.');
   },10000);
   try{
     const d=await walletApi.requestLoginChallenge(em);
     clearTimeout(uiTimer);
     setEmail(em);
     setChallengeId(d.challengeId||'');
     setOptions(Array.isArray(d.options)?d.options.map(String):[]);
     setSelected('');
     setStep('challenge');
   }catch(err){
     clearTimeout(uiTimer);
     if(!uiTimedOut)setMessage('Could not send verification: '+err.message);
   }finally{clearTimeout(uiTimer);if(!uiTimedOut)setBusy(false)}
 }
 const verify=async number=>{
   if(!challengeId||!number||busy)return;
   setSelected(number);
   setBusy(true);
   setMessage('');
   let uiTimedOut=false;
   const uiTimer=setTimeout(()=>{
     uiTimedOut=true;
     setBusy(false);
     setMessage('Login verification is still running in the background. Please wait for the result.');
   },10000);
   try{
     const d=await walletApi.verifyLoginChallenge(email,challengeId,number);
     clearTimeout(uiTimer);
     const token=d?.session?.token||d?.token||'';
     const verifiedUser=d?.user||null;
     if(!token)throw new Error('Login failed. Please request a new verification number.');
     localStorage.setItem(SESSION_KEY,token);
     onLogin(token,verifiedUser,null);
   }catch(err){
     clearTimeout(uiTimer);
     if(!uiTimedOut){
       setBusy(false);
       setSelected('');
       setMessage(err.message);
     }
   }
 }
 return <main className="wallet-services-page wallet-login-page"><section className="wallet-login-card"><div className="wallet-login-brand"><img className="wallet-brand-logo" src={LOGO_URL} alt="Trusted Circle"/><div className="wallet-login-brand-name">Trusted<span>Circle</span></div></div>
 {step==='email'?<form onSubmit={request}><label>Email address</label><input className="wallet-field" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/><button className="wallet-submit" disabled={busy}>{busy?'Sending…':'Continue'} <ArrowRight size={17}/></button></form>:
 <div className="wallet-login-number-only">
   <div className="wallet-services-eyebrow">VERIFY LOGIN</div>
   <h1>Select your number</h1>
   <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginTop:24}}>
     {options.map(n=><button key={n} type="button" onClick={()=>verify(n)} disabled={busy} aria-label={'Select verification number '+n} style={{height:92,border:selected===n?'2px solid #155f42':'1px solid #d5e1da',borderRadius:16,background:selected===n?'#155f42':'#f8fbf9',color:selected===n?'#fff':'#155f42',fontSize:30,fontWeight:900,cursor:busy?'not-allowed':'pointer',opacity:busy&&selected!==n?.55:1,boxShadow:selected===n?'0 8px 20px rgba(21,95,66,.18)':'none'}}>{n}</button>)}
   </div>
   {busy&&<div className="wallet-login-message">Verifying…</div>}
   {message&&<div className="wallet-login-message">{message}</div>}
 </div>}
 {step==='email'&&message&&<div className="wallet-login-message">{message}</div>}
 </section></main>
}
function ProfileMenu({user,onLogout,onClose}){
 return <div className="wallet-profile-menu"><div className="wallet-profile-head"><div className="wallet-profile-avatar"><UserRound size={20}/></div><div><b>{user.name}</b><small>{user.email}</small></div></div><button onClick={onClose}><WalletCards size={16}/> Wallet Home</button><button onClick={onLogout}><LogOut size={16}/> Logout</button></div>
}

function WalletHome({token,user,onLogout,initialWallet=null}){
 const[wallet,setWallet]=useState(initialWallet),[orders,setOrders]=useState(initialWallet?.transactions||[]),[busy,setBusy]=useState(!initialWallet),[modal,setModal]=useState(null),[selectedTx,setSelectedTx]=useState(null),[notice,setNotice]=useState(''),[profileOpen,setProfileOpen]=useState(false),[statementOpen,setStatementOpen]=useState(false)
 const load=async()=>{
  setBusy(true);
  const safetyTimer=setTimeout(()=>{
    // Hide only the blocking loading UI. The request continues in the background.
    setBusy(false);
    setNotice('Wallet data is still loading in the background. You can continue using the Wallet.');
  },10000);
  try{
    const w=await walletApi.wallet(token);
    setWallet(w);
    setOrders(w.transactions||[]);
    setNotice('');
  }catch(e){
    setNotice(e.message);
  }finally{
    clearTimeout(safetyTimer);
    setBusy(false);
  }
 }
 useEffect(()=>{if(!initialWallet)load()},[initialWallet])
 const openPaymentFlow=async(amount,retryTransaction=null)=>{
  setNotice('');
  const paymentWindow=window.open('about:blank','TrustedCircleWalletPayment','width=520,height=760,resizable=yes,scrollbars=yes');
  setModal({type:'payment',phase:'opening',transaction:retryTransaction||null,expiresAt:null,token});
  let timedOut=false;
  const safetyTimer=setTimeout(()=>{
    timedOut=true;
    if(paymentWindow&&!paymentWindow.closed)paymentWindow.close();
    setModal(null);
    setNotice('Payment preparation took longer than 10 seconds. Your Wallet is ready. Please try again.');
  },10000);
  try{
    // Wallet backend allocates the next AVAILABLE link from WalletPaymentLinks,
    // reserves it against this transaction, and returns the reserved checkout URL.
    const d=retryTransaction?await walletApi.retryAddMoney(token,retryTransaction.transactionId):await walletApi.addMoney(token,amount);
    clearTimeout(safetyTimer);
    const paymentLink=String(d?.paymentLink||d?.data?.paymentLink||'').trim();
    if(!paymentLink)throw new Error('Payment link was not returned from Wallet Services.');
    if(paymentWindow)paymentWindow.location.href=paymentLink; else window.location.href=paymentLink;
    setModal({type:'payment',phase:'verifying',transaction:d.transaction||d.data?.transaction,expiresAt:d.expiresAt||d.data?.expiresAt,token});
  }catch(e){
    clearTimeout(safetyTimer);
    if(paymentWindow&&!paymentWindow.closed)paymentWindow.close();
    if(!timedOut){setModal(null);setNotice(e.message);}
  }
 }
 const startAdd=amount=>openPaymentFlow(amount);
 const retry=tx=>openPaymentFlow(null,tx);

 const withdraw=async(amount,upi)=>{const d=await walletApi.withdraw(token,amount,upi);setModal(null);setSelectedTx(d.transaction);await load()}
 const openOrders=async()=>{setNotice('');try{const o=await walletApi.orders(token);setOrders(o.transactions||[]);setModal({type:'orders'})}catch(e){setNotice(e.message)}}
 const downloadAll=()=>setStatementOpen(true)
 const balance=wallet?.balance||0,available=wallet?.availableBalance||0
 return <main className="wallet-services-page"><section className="wallet-services-shell">
  <aside className="wallet-left-panel">
   <div className="wallet-brand-row"><img src={LOGO_URL} alt="Trusted Circle"/><div><b>Trusted Circle</b><span>Wallet Services</span></div></div>
   <div className="wallet-profile-wrap"><button className="wallet-profile-btn" onClick={()=>setProfileOpen(v=>!v)} title="Profile"><UserRound size={19}/></button>{profileOpen&&<ProfileMenu user={user} onLogout={onLogout} onClose={()=>setProfileOpen(false)}/>}</div>
   <div className="wallet-left-content"><span className="wallet-services-eyebrow">AVAILABLE BALANCE</span><strong className="wallet-main-balance">₹{money(available)}</strong><div className="wallet-balance-meta">Total balance ₹{money(balance)}{wallet?.reservedBalance?' · Reserved ₹'+money(wallet.reservedBalance):''}</div>
    <div className="wallet-primary-actions"><button onClick={()=>setModal({type:'add'})}><span>+</span><div><b>Add Money</b><small>₹500 · ₹1,000 · ₹1,500 · ₹2,000</small></div><ArrowRight size={17}/></button><button onClick={()=>setModal({type:'withdraw'})}><span>↓</span><div><b>Withdraw</b><small>Transfer available balance to UPI</small></div><ArrowRight size={17}/></button></div>
    <div className="wallet-left-note"><CheckCircle2 size={16}/> Wallet activity is tracked securely.</div>
   </div>
   <div className="wallet-left-footer"><span>© Trusted Circle</span><span>{user.email}</span></div>
  </aside>
  <section className="wallet-right-panel">
   <header className="wallet-transactions-header"><div><span className="wallet-services-eyebrow">WALLET SERVICES</span><h1>Transactions</h1><p>Complete wallet history</p></div><div className="wallet-section-tools"><button onClick={downloadAll}><ArrowDownToLine size={16}/> Download PDF</button><button onClick={openOrders}><History size={16}/> View All</button><button className="wallet-refresh-btn" onClick={load} title="Refresh"><RefreshCw size={17}/></button></div></header>
   {notice&&<div className="wallet-notice">{notice}</div>}
   {busy?<div className="wallet-empty">Loading transactions…</div>:orders.length?<div className="wallet-transactions-scroll">{orders.map(t=><button className="wallet-transaction" key={t.transactionId} onClick={()=>setSelectedTx(t)}><span className={'wallet-tx-icon '+(t.type==='ADD_MONEY'?'add':'withdraw')}>{t.type==='ADD_MONEY'?'+':'−'}</span><span className="wallet-tx-main"><b>{t.type==='ADD_MONEY'?'Add Money':'Withdraw'}</b><small>{new Date(t.createdAt).toLocaleString('en-IN')}</small></span><span className="wallet-tx-right"><b>{t.type==='ADD_MONEY'?'+':'−'}₹{money(t.amount)}</b><small className={'wallet-status '+statusClass(t.status)}>{t.status.replace(/_/g,' ')}</small></span></button>)}</div>:<div className="wallet-empty">No wallet transactions yet.</div>}
   <div className="wallet-right-footer"><span>Click any transaction for full details & PDF</span><span>Trusted Circle Wallet Services</span></div>
  </section>
  {modal&&<WalletModal modal={modal} onClose={()=>setModal(null)} onAdd={startAdd} onWithdraw={withdraw} onRetry={retry} orders={orders} setSelectedTx={setSelectedTx} onOpenOrders={openOrders} onViewBalance={()=>{setModal(null);load()}}/>}
  {statementOpen&&<StatementModal transactions={orders} user={user} onClose={()=>setStatementOpen(false)}/>}
  {selectedTx&&!modal&&<TransactionModal tx={selectedTx} user={user} onClose={()=>setSelectedTx(null)} onRetry={retry}/>}
 </section></main>
}

function WalletModal({modal,onClose,onAdd,onWithdraw,onRetry,orders,setSelectedTx,onOpenOrders,onViewBalance}){
 const[type]=useState(modal.type),[amount,setAmount]=useState('500'),[busy,setBusy]=useState(false)
 if(type==='add')return <div className="wallet-modal-layer"><div className="wallet-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><span className="wallet-services-eyebrow">ADD MONEY</span><h2>Select Amount</h2><div className="wallet-denoms">{[500,1000,1500,2000].map(a=><button className={amount==a?'selected':''} key={a} onClick={()=>setAmount(String(a))}>₹{money(a)}</button>)}</div><button className="wallet-submit" onClick={async()=>{setBusy(true);await onAdd(Number(amount));setBusy(false)}} disabled={busy}>{busy?'Preparing Payment…':'Continue to Payment'} <ArrowRight size={17}/></button></div></div>
 if(type==='withdraw')return <WithdrawModal onClose={onClose} onSubmit={onWithdraw}/>
 if(type==='orders')return <div className="wallet-modal-layer"><div className="wallet-modal wallet-orders-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><span className="wallet-services-eyebrow">WALLET ORDERS</span><h2>All Transactions</h2><div className="wallet-order-list">{orders.map(t=><button key={t.transactionId} onClick={()=>{onClose();setSelectedTx(t)}} className="wallet-transaction"><span className="wallet-tx-main"><b>{t.type==='ADD_MONEY'?'Add Money':'Withdraw'}</b><small>{t.transactionId}</small></span><span className="wallet-tx-right"><b>₹{money(t.amount)}</b><small className={'wallet-status '+statusClass(t.status)}>{t.status.replace(/_/g,' ')}</small></span></button>)}</div></div></div>
 return <PaymentWaiting token={modal.token} tx={modal.transaction} expiresAt={modal.expiresAt} phase={modal.phase} onClose={onClose} onRetry={onRetry} onOpenOrders={onOpenOrders} onViewBalance={onViewBalance}/>
}

function WithdrawModal({onClose,onSubmit}){const[amount,setAmount]=useState(''),[upi,setUpi]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');return <div className="wallet-modal-layer"><div className="wallet-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><span className="wallet-services-eyebrow">WITHDRAW</span><h2>Withdraw to UPI</h2><label>Amount</label><input className="wallet-field" type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="₹ 0"/><label>UPI ID</label><input className="wallet-field" value={upi} onChange={e=>setUpi(e.target.value)} placeholder="name@upi"/>{error&&<div className="wallet-login-message">{error}</div>}<button className="wallet-submit" disabled={busy||!amount||!upi} onClick={async()=>{setBusy(true);setError('');try{await onSubmit(Number(amount),upi)}catch(e){setError(e.message)}finally{setBusy(false)}}}>{busy?'Submitting…':'Request Withdrawal'} <ArrowRight size={17}/></button></div></div>}

function PaymentWaiting({token,tx,expiresAt,onClose,onRetry,onOpenOrders,onViewBalance,phase}){
 const[left,setLeft]=useState(expiresAt?Math.max(0,Math.floor((new Date(expiresAt)-Date.now())/1000)):900),[result,setResult]=useState(null)
 useEffect(()=>{if(phase!=='verifying'||!expiresAt)return;const timer=setInterval(async()=>{setLeft(Math.max(0,Math.floor((new Date(expiresAt)-Date.now())/1000)));try{const d=await walletApi.transactionStatus(token,tx.transactionId);const next=d.transaction;if(['COMPLETED','NOT_RECEIVED','REJECTED'].includes(next.status)){setResult(next);clearInterval(timer)}}catch{}},5000);return()=>clearInterval(timer)},[token,tx.transactionId,expiresAt])
 if(phase==='opening')return <div className="wallet-modal-layer"><div className="wallet-modal payment-waiting"><div className="wallet-loading-ring"><Clock3 size={29}/></div><span className="wallet-services-eyebrow">PAYMENT LINK</span><h2>Opening Payment Page</h2><p>Your secure payment page is being prepared. Please wait…</p><div className="wallet-progress"><span className="wallet-progress-indeterminate"/></div><strong>Please wait</strong><small>Opening the payment page in a separate window</small></div></div>
 if(result)return <div className="wallet-modal-layer"><div className="wallet-modal payment-result"><div className={'wallet-result-icon '+(result.status==='COMPLETED'?'success':'failed')}>{result.status==='COMPLETED'?<CheckCircle2 size={42}/>:<X size={42}/>}</div><span className="wallet-services-eyebrow">PAYMENT STATUS</span><h2>{result.status==='COMPLETED'?'Your Money Is Added Successfully':result.status==='NOT_RECEIVED'?'Please Try Again':'Your Payment Is Cancelled'}</h2><p>{result.status==='COMPLETED'?'Your money has been added successfully to your wallet.':result.status==='NOT_RECEIVED'?'We could not confirm the payment. Please try the payment again.':'Your payment was rejected. Try creating a new order.'}</p><div className="wallet-result-actions">{result.status==='NOT_RECEIVED'&&<button className="wallet-submit" onClick={()=>{onClose();onRetry(result)}}>Try Again</button>}{result.status==='REJECTED'&&<button className="wallet-submit" onClick={onClose}>Create New Order</button>}<button className="wallet-secondary-btn" onClick={onClose}>Home</button><button className="wallet-secondary-btn" onClick={onViewBalance}>View Balance</button></div></div></div>
 return <div className="wallet-modal-layer"><div className="wallet-modal payment-waiting"><div className="wallet-loading-ring"><Clock3 size={29}/></div><span className="wallet-services-eyebrow">PAYMENT VERIFICATION</span><h2>Checking your payment</h2><p>Transaction <b>{tx.transactionId}</b></p><div className="wallet-progress"><span style={{width:(left/900*100)+'%'}}/></div><strong>{Math.floor(left/60)}:{String(left%60).padStart(2,'0')}</strong><small>Waiting for verification</small><button className="wallet-secondary-btn" onClick={onClose}>Continue in Wallet</button></div></div>
}

function StatementModal({transactions,user,onClose}){
 const[from,setFrom]=useState(''),[to,setTo]=useState(''),[kind,setKind]=useState('completed'),[error,setError]=useState('')
 const download=async()=>{setError('');if(!from||!to){setError('Select both From Date and To Date.');return}if(new Date(from)>new Date(to)){setError('From Date cannot be after To Date.');return}let data=transactions.filter(t=>{const d=new Date(t.createdAt);return d>=new Date(from+'T00:00:00')&&d<=new Date(to+'T23:59:59')});if(kind==='completed')data=data.filter(t=>String(t.status).includes('COMPLETED'));if(!data.length){setError('No transactions found for the selected timeline.');return}await saveTransactionsPdf(data,user,from,to);onClose()}
 return <div className="wallet-modal-layer"><div className="wallet-modal wallet-statement-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><img className="wallet-modal-logo" src={LOGO_URL} alt="Trusted Circle"/><span className="wallet-services-eyebrow">DOWNLOAD STATEMENT</span><h2>Choose Timeline</h2><p>Select the period before downloading your PDF statement.</p><div className="wallet-statement-type"><button className={kind==='all'?'selected':''} onClick={()=>setKind('all')}>All Transactions</button><button className={kind==='completed'?'selected':''} onClick={()=>setKind('completed')}>Completed Statement</button></div><div className="wallet-date-grid"><div><label>From Date</label><input className="wallet-field" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></div><div><label>To Date</label><input className="wallet-field" type="date" value={to} onChange={e=>setTo(e.target.value)}/></div></div>{error&&<div className="wallet-login-message wallet-error">{error}</div>}<button className="wallet-submit" onClick={download}><ArrowDownToLine size={16}/> Download PDF</button></div></div>
}
function TransactionModal({tx,user,onClose,onRetry}){
 const download=()=>saveTransactionPdf(tx,user,'trusted-circle-'+tx.transactionId+'.pdf')
 return <div className="wallet-modal-layer"><div className="wallet-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><img className="wallet-modal-logo" src={LOGO_URL} alt="Trusted Circle"/><span className="wallet-services-eyebrow">TRANSACTION DETAILS</span><h2>{tx.type==='ADD_MONEY'?'Add Money':'Withdrawal'}</h2><div className="wallet-detail-amount">₹{money(tx.amount)}</div><div className={'wallet-detail-status '+statusClass(tx.status)}>{tx.status.replace(/_/g,' ')}</div><div className="wallet-detail-grid"><span>Transaction ID</span><b>{tx.transactionId}</b><span>Date</span><b>{new Date(tx.createdAt).toLocaleString('en-IN')}</b><span>Balance Before</span><b>₹{money(tx.balanceBefore)}</b><span>Balance After</span><b>₹{money(tx.balanceAfter)}</b>{tx.upiId&&<><span>UPI ID</span><b>{tx.upiId}</b></>}</div><div className="wallet-detail-actions"><button className="wallet-submit" onClick={download}><ArrowDownToLine size={16}/> Download PDF</button>{tx.status==='NOT_RECEIVED'&&<button className="wallet-secondary-btn" onClick={()=>onRetry(tx)}>Retry Payment <RefreshCw size={16}/></button>}</div><button className="wallet-change-email" onClick={onClose}>Close</button></div></div>
}

export default function WalletServicesPage({shoppingToken='',shoppingUser=null,onRequireShoppingLogin,onShoppingLogout}){
 const[token,setToken]=useState(()=>localStorage.getItem(SESSION_KEY)||''),[user,setUser]=useState(null),[initialWallet,setInitialWallet]=useState(null),[checking,setChecking]=useState(true),[error,setError]=useState('')
 useEffect(()=>{document.body.classList.add('wallet-services-lock');return()=>document.body.classList.remove('wallet-services-lock')},[])
 useEffect(()=>{
   let active=true;
   const bootTimer=setTimeout(()=>{
     if(!active)return;
     // Never keep the loading screen visible beyond 10 seconds.
     setChecking(false);
   },10000);
   const boot=async()=>{
     setChecking(true);setError('');
     if(shoppingToken&&shoppingUser?.email){
       try{
         const handoff=await shoppingApi.walletIdentity(shoppingToken);
         if(!active)return;
         const d=await walletApi.bootstrapShoppingIdentity(handoff);
         if(!active)return;
         const nextToken=d?.session?.token||'';
         const nextUser=d?.user||null;
         if(!nextToken||!nextUser)throw new Error('Could not create your Wallet profile.');
         localStorage.setItem(SESSION_KEY,nextToken);
         setToken(nextToken);setUser(nextUser);setInitialWallet(null);
         setChecking(false);return;
       }catch(e){
         if(!active)return;
         localStorage.removeItem(SESSION_KEY);setToken('');setUser(null);setError(e.message||'Could not open Wallet Services.');
       }
     }
     const existing=localStorage.getItem(SESSION_KEY)||'';
     if(existing&&!shoppingToken){
       try{
         const d=await walletApi.me(existing);
         if(!active)return;
         setToken(existing);setUser(d.user||d);setChecking(false);return;
       }catch{localStorage.removeItem(SESSION_KEY)}
     }
     if(!active)return;
     setChecking(false);
   };
   boot();
   return()=>{active=false;clearTimeout(bootTimer)};
 },[shoppingToken])
 const logout=()=>{if(token)walletApi.logout(token).catch(()=>{});localStorage.removeItem(SESSION_KEY);setToken('');setUser(null);setInitialWallet(null);if(onShoppingLogout)onShoppingLogout();else onRequireShoppingLogin?.()}
 if(checking)return <main className="wallet-services-page wallet-login-page"><div className="wallet-loading">Connecting to your Trusted Circle account…</div></main>
 if(!shoppingToken&&!token&&!shoppingUser)return <main className="wallet-services-page wallet-login-page"><section className="wallet-login-card"><div className="wallet-login-brand"><img className="wallet-brand-logo" src={LOGO_URL} alt="Trusted Circle"/><div className="wallet-login-brand-name">Trusted<span>Circle</span></div></div><div className="wallet-services-eyebrow">TRUSTED CIRCLE ACCOUNT</div><h1>Sign in once. Use Wallet Services.</h1><p className="wallet-login-message">Wallet Services uses the same Trusted Circle account as Gift Vouchers. No separate Wallet login is required.</p><button className="wallet-submit" onClick={onRequireShoppingLogin}>Continue to Trusted Circle Login <ArrowRight size={17}/></button>{error&&<div className="wallet-login-message">{error}</div>}</section></main>
 if(error&&!token)return <main className="wallet-services-page wallet-login-page"><section className="wallet-login-card"><div className="wallet-login-brand"><img className="wallet-brand-logo" src={LOGO_URL} alt="Trusted Circle"/><div className="wallet-login-brand-name">Trusted<span>Circle</span></div></div><div className="wallet-services-eyebrow">ACCOUNT CONNECTION</div><h1>We couldn't connect your account</h1><p className="wallet-login-message">{error}</p><button className="wallet-submit" onClick={onRequireShoppingLogin}>Return to Trusted Circle Login <ArrowRight size={17}/></button></section></main>
 if(!token||!user)return null
 return <WalletHome token={token} user={user} onLogout={logout} initialWallet={initialWallet}/>
}
