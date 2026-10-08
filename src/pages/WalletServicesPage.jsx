import {ArrowDownToLine,ArrowRight,CheckCircle2,Clock3,History,LogOut,RefreshCw,UserRound,WalletCards,X} from 'lucide-react'
import {jsPDF} from 'jspdf'
import {useEffect,useState} from 'react'
import {walletApi} from '../wallet-services-api'
import './wallet-services.css'

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
 const rows=[['Transaction ID',tx.transactionId],['Customer Name',user?.name||'—'],['Customer Email',user?.email||'—'],['Transaction Date',new Date(tx.createdAt).toLocaleString('en-IN')],['Completed Date',tx.completedAt?new Date(tx.completedAt).toLocaleString('en-IN'):'—'],['Type',tx.type==='ADD_MONEY'?'Add Money':tx.type==='CASHBACK_EARNED'?'Cashback Earned':'Withdrawal'],['Amount','₹'+money(tx.amount)],['Status',String(tx.status).replace(/_/g,' ')],['Balance Before','₹'+money(tx.balanceBefore)],['Balance After','₹'+money(tx.balanceAfter)],['UPI ID',tx.upiId||'—'],['Attempt',tx.attempt||1],['Payment Label',tx.paymentLinkLabel||'—'],['Notes',tx.notes||'—']];
 drawTable(doc,['Field','Details'],rows,59,[48,134]);
 doc.setFontSize(8);doc.setTextColor(105);doc.text('Trusted Circle Wallet Services · System generated document',14,286);doc.setTextColor(20,39,31);doc.save(filename)
}
async function saveTransactionsPdf(transactions,user,from,to){
 const doc=new jsPDF();await addPdfHeader(doc,'Wallet Services — Account Statement','Period: '+from+' to '+to);
 doc.setFontSize(10);doc.setFont(undefined,'bold');doc.text('CUSTOMER',14,50);doc.setFont(undefined,'normal');doc.text((user?.name||'Trusted Circle User')+'  ·  '+(user?.email||''),14,56);
 const rows=transactions.map(t=>[new Date(t.createdAt).toLocaleDateString('en-IN'),t.transactionId,t.type==='ADD_MONEY'?'Add Money':t.type==='CASHBACK_EARNED'?'Cashback Earned':'Withdrawal','₹'+money(t.amount),String(t.status).replace(/_/g,' '),'₹'+money(t.balanceAfter)]);
 let y=68;y=drawTable(doc,['Date','Transaction ID','Type','Amount','Status','Balance After'],rows,y,[24,47,27,25,31,28]);
 y+=10;doc.setFont(undefined,'bold');doc.text('STATEMENT SUMMARY',14,y);y+=8;doc.setFont(undefined,'normal');
 const totalAdd=transactions.filter(t=>t.type==='ADD_MONEY'&&String(t.status).includes('COMPLETED')).reduce((s,t)=>s+Number(t.amount||0),0);
 const totalWithdraw=transactions.filter(t=>t.type==='WITHDRAW'&&String(t.status).includes('COMPLETED')).reduce((s,t)=>s+Number(t.amount||0),0);
 doc.text('Completed Add Money: ₹'+money(totalAdd),14,y);doc.text('Completed Withdrawals: ₹'+money(totalWithdraw),100,y);y+=7;doc.text('Transactions included: '+transactions.length,14,y);
 doc.setFontSize(8);doc.setTextColor(105);doc.text('Trusted Circle Wallet Services · System generated completed/account statement',14,286);doc.setTextColor(20,39,31);
 doc.save('trusted-circle-wallet-statement-'+from+'-to-'+to+'.pdf')
}

function ProfileMenu({user,onLogout,onClose}){
 return <div className="wallet-profile-menu"><div className="wallet-profile-head"><div className="wallet-profile-avatar"><UserRound size={20}/></div><div><b>{user.name}</b><small>{user.email}</small></div></div><button onClick={onClose}><WalletCards size={16}/> Wallet Home</button><button onClick={onLogout}><LogOut size={16}/> Logout</button></div>
}

function WalletHome({user,onLogout,initialWallet=null}){
 const[wallet,setWallet]=useState(initialWallet),[orders,setOrders]=useState(initialWallet?.transactions||[]),[busy,setBusy]=useState(!initialWallet),[modal,setModal]=useState(null),[selectedTx,setSelectedTx]=useState(null),[notice,setNotice]=useState(''),[profileOpen,setProfileOpen]=useState(false),[statementOpen,setStatementOpen]=useState(false)
 const load=async()=>{
  setBusy(true);
  const safetyTimer=setTimeout(()=>{
    // Hide only the blocking loading UI. The request continues in the background.
    setBusy(false);
    setNotice('Wallet data is still loading in the background. You can continue using the Wallet.');
  },10000);
  try{
    const w=await walletApi.snapshot(user);
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
  setModal({type:'payment',phase:'opening',transaction:retryTransaction||null,expiresAt:null,user});
  let timedOut=false;
  const safetyTimer=setTimeout(()=>{
    timedOut=true;
    // Keep the reserved browser window alive. The main-page loading UI is removed,
    // while the background request continues and can navigate this window later.
    setModal(null);
    setNotice('Payment preparation took longer than 10 seconds. Your Wallet is ready. Please try again.');
  },20000);
  try{
    // Wallet backend allocates the next AVAILABLE link from WalletPaymentLinks,
    // reserves it against this transaction, and returns the reserved checkout URL.
    const d=retryTransaction?await walletApi.retryAddMoney(user,retryTransaction.transactionId):await walletApi.addMoney(user,amount);
    clearTimeout(safetyTimer);
    const paymentLink=String(d?.paymentLink||d?.data?.paymentLink||'').trim();
    if(!paymentLink)throw new Error('Payment link was not returned from Wallet Services.');
    if(paymentWindow&&!paymentWindow.closed){
      paymentWindow.location.href=paymentLink;
    }else{
      window.location.href=paymentLink;
    }
    setModal({
      type:'payment',
      phase:'verifying',
      transaction:d.transaction||d.data?.transaction,
      expiresAt:d.expiresAt||d.data?.expiresAt,
      user,
      adminEmailSent:d.adminEmailSent!==false&&d.data?.adminEmailSent!==false
    });
  }catch(e){
    clearTimeout(safetyTimer);
    if(paymentWindow&&!paymentWindow.closed)paymentWindow.close();
    if(!timedOut){setModal(null);setNotice(e.message);}
  }
 }
 const startAdd=amount=>openPaymentFlow(amount);
 const retry=tx=>openPaymentFlow(null,tx);

 const withdraw=async(amount,upi)=>{const d=await walletApi.withdraw(user,amount,upi);setModal(null);setSelectedTx(d.transaction);await load()}
 const openOrders=async()=>{setNotice('');try{const o=await walletApi.orders(user);setOrders(o.transactions||[]);setModal({type:'orders'})}catch(e){setNotice(e.message)}}
 const downloadAll=()=>setStatementOpen(true)
 const balance=Number(wallet?.balance||0),available=Number(wallet?.availableBalance||0),cashbackBalance=Number(wallet?.cashbackBalance ?? (wallet?.cashbackWallet?.balance || 0)),combinedBalance=Number(wallet?.totalBalance ?? (balance+cashbackBalance))
 return <main className="wallet-services-page"><section className="wallet-services-shell">
  <aside className="wallet-left-panel">
   <div className="wallet-brand-row"><img src={LOGO_URL} alt="Trusted Circle"/><div><b>Trusted Circle</b><span>Wallet Services</span></div></div>
   <div className="wallet-profile-wrap"><button className="wallet-profile-btn" onClick={()=>setProfileOpen(v=>!v)} title="Profile"><UserRound size={19}/></button>{profileOpen&&<ProfileMenu user={user} onLogout={onLogout} onClose={()=>setProfileOpen(false)}/>}</div>
   <div className="wallet-left-content"><span className="wallet-services-eyebrow">WALLET OVERVIEW</span><strong className="wallet-main-balance">₹{money(combinedBalance)}</strong><div className="wallet-balance-meta">Combined Trusted Circle balance</div>
    <div className="wallet-balance-breakup">
      <div className="wallet-balance-card money"><span>Money Wallet</span><b>₹{money(balance)}</b><small>Available ₹{money(available)}{wallet?.reservedBalance?' · Reserved ₹'+money(wallet.reservedBalance):''}</small></div>
      <div className="wallet-balance-card cashback"><span>Cashback Wallet</span><b>₹{money(cashbackBalance)}</b><small>Shopping cashback balance</small></div>
    </div>
    <div className="wallet-primary-actions"><button onClick={()=>setModal({type:'add'})}><span>+</span><div><b>Add Money</b><small>₹500 · ₹1,000 · ₹1,500 · ₹2,000</small></div><ArrowRight size={17}/></button><button onClick={()=>setModal({type:'withdraw'})}><span>↓</span><div><b>Withdraw</b><small>Transfer available balance to UPI</small></div><ArrowRight size={17}/></button></div>
    <div className="wallet-left-note"><CheckCircle2 size={16}/> Money Wallet + Cashback Wallet are linked to your Trusted Circle account.</div>
   </div>
   <div className="wallet-left-footer"><span>© Trusted Circle</span><span>{user.email}</span></div>
  </aside>
  <section className="wallet-right-panel">
   <header className="wallet-transactions-header"><div><span className="wallet-services-eyebrow">WALLET SERVICES</span><h1>Transactions</h1><p>Complete wallet history</p></div><div className="wallet-section-tools"><button onClick={downloadAll}><ArrowDownToLine size={16}/> Download PDF</button><button onClick={openOrders}><History size={16}/> View All</button><button className="wallet-refresh-btn" onClick={load} title="Refresh"><RefreshCw size={17}/></button></div></header>
   {notice&&<div className="wallet-notice">{notice}</div>}
   {busy?<div className="wallet-empty">Loading transactions…</div>:orders.length?<div className="wallet-transactions-scroll">{orders.map(t=>{const isCashback=t.type==='CASHBACK_EARNED';const isAdd=t.type==='ADD_MONEY'||isCashback;return <button className="wallet-transaction" key={t.transactionId} onClick={()=>setSelectedTx(t)}><span className={'wallet-tx-icon '+(isAdd?'add':'withdraw')}>{isAdd?'+':'−'}</span><span className="wallet-tx-main"><b>{isCashback?'Cashback Earned':t.type==='ADD_MONEY'?'Add Money':'Withdraw'}</b><small>{new Date(t.createdAt).toLocaleString('en-IN')}</small></span><span className="wallet-tx-right"><b>{isAdd?'+':'−'}₹{money(t.amount)}</b><small className={'wallet-status '+statusClass(t.status)}>{t.status.replace(/_/g,' ')}</small></span></button>})}</div>:<div className="wallet-empty">No wallet transactions yet.</div>}
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
 return <PaymentWaiting user={modal.user} tx={modal.transaction} expiresAt={modal.expiresAt} phase={modal.phase} adminEmailSent={modal.adminEmailSent} onClose={onClose} onRetry={onRetry} onOpenOrders={onOpenOrders} onViewBalance={onViewBalance}/>
}

function WithdrawModal({onClose,onSubmit}){const[amount,setAmount]=useState(''),[upi,setUpi]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');return <div className="wallet-modal-layer"><div className="wallet-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><span className="wallet-services-eyebrow">WITHDRAW</span><h2>Withdraw to UPI</h2><label>Amount</label><input className="wallet-field" type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="₹ 0"/><label>UPI ID</label><input className="wallet-field" value={upi} onChange={e=>setUpi(e.target.value)} placeholder="name@upi"/>{error&&<div className="wallet-login-message">{error}</div>}<button className="wallet-submit" disabled={busy||!amount||!upi} onClick={async()=>{setBusy(true);setError('');try{await onSubmit(Number(amount),upi)}catch(e){setError(e.message)}finally{setBusy(false)}}}>{busy?'Submitting…':'Request Withdrawal'} <ArrowRight size={17}/></button></div></div>}

function PaymentWaiting({user,tx,expiresAt,onClose,onRetry,onOpenOrders,onViewBalance,phase,adminEmailSent}){
 const[left,setLeft]=useState(expiresAt?Math.max(0,Math.floor((new Date(expiresAt)-Date.now())/1000)):900),[result,setResult]=useState(null)
 useEffect(()=>{
   if(phase!=='verifying'||!expiresAt||!tx?.transactionId)return
   const timer=setInterval(async()=>{
     setLeft(Math.max(0,Math.floor((new Date(expiresAt)-Date.now())/1000)))
     try{
       const d=await walletApi.transactionStatus(user,tx.transactionId)
       const next=d.transaction
       if(['COMPLETED','NOT_RECEIVED','REJECTED'].includes(next.status)){setResult(next);clearInterval(timer)}
     }catch{}
   },5000)
   return()=>clearInterval(timer)
 },[user,tx?.transactionId,expiresAt,phase])
 if(phase==='opening')return <div className="wallet-modal-layer"><div className="wallet-modal payment-waiting">
   <div className="wallet-payment-hero"><div className="wallet-loading-ring"><Clock3 size={31}/></div><div><span className="wallet-services-eyebrow">SECURE PAYMENT</span><h2>Preparing Your Payment</h2><p>We are getting your secure payment link from Trusted Circle.</p></div></div>
   <div className="wallet-payment-steps">
     <div className="wallet-payment-step done"><CheckCircle2 size={18}/><span>Wallet request received</span></div>
     <div className="wallet-payment-step pending"><Clock3 size={18}/><span>Getting payment link</span></div>
     <div className="wallet-payment-step pending"><Clock3 size={18}/><span>Opening secure Paytm page</span></div>
   </div>
   <div className="wallet-progress"><span className="wallet-progress-indeterminate"/></div>
   <strong>Please wait — up to 20 seconds</strong><small>The payment page will open automatically as soon as the link is ready.</small>
 </div></div>
 if(result)return <div className="wallet-modal-layer"><div className="wallet-modal payment-result">
   <div className={'wallet-result-icon '+(result.status==='COMPLETED'?'success':'failed')}>{result.status==='COMPLETED'?<CheckCircle2 size={42}/>:<X size={42}/>}</div>
   <span className="wallet-services-eyebrow">ADMIN ACTION RESULT</span>
   <h2>{result.status==='COMPLETED'?'Money Added Successfully':result.status==='NOT_RECEIVED'?'Payment Not Received':'Payment Rejected'}</h2>
   <p>{result.status==='COMPLETED'?'Admin confirmed your payment. The amount has been credited to your Money Wallet.':result.status==='NOT_RECEIVED'?'Admin could not confirm the payment. You can retry with a fresh payment link.':'Admin rejected this payment request. You can create a new payment.'}</p>
   <div className="wallet-result-actions">
     {result.status==='NOT_RECEIVED'&&<button className="wallet-submit" onClick={()=>{onClose();onRetry(result)}}>Retry Payment <RefreshCw size={16}/></button>}
     {result.status==='REJECTED'&&<button className="wallet-submit" onClick={onClose}>Create New Payment</button>}
     <button className="wallet-secondary-btn" onClick={onViewBalance}>View Balance</button>
     <button className="wallet-secondary-btn" onClick={onClose}>Close</button>
   </div>
 </div></div>
 return <div className="wallet-modal-layer"><div className="wallet-modal payment-waiting">
   <div className="wallet-loading-ring"><Clock3 size={29}/></div>
   <span className="wallet-services-eyebrow">PAYMENT VERIFICATION</span>
   <h2>Payment Page Opened</h2>
   <p>Transaction <b>{tx?.transactionId||'—'}</b></p>
   <div className="wallet-payment-steps">
     <div className="wallet-payment-step done"><CheckCircle2 size={17}/><span>Secure payment link received</span></div>
     <div className="wallet-payment-step done"><CheckCircle2 size={17}/><span>Payment page opened</span></div>
     <div className={'wallet-payment-step '+(adminEmailSent===false?'failed':'done')}>{adminEmailSent===false?<X size={17}/>:<CheckCircle2 size={17}/>}<span>{adminEmailSent===false?'Admin email could not be sent':'Admin notified by email'}</span></div>
     <div className="wallet-payment-step pending"><Clock3 size={17}/><span>Waiting for Admin action</span></div>
   </div>
   <div className="wallet-progress"><span style={{width:Math.max(5,(left/900*100))+'%'}}/></div>
   <strong>{left>0?('Admin response in '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0')):'Waiting for Admin action'}</strong>
   <small>After Admin selects Received, Not Received, or Rejected, this popup will show the final result.</small>
   <button className="wallet-secondary-btn" onClick={onClose}>Continue in Wallet</button>
 </div></div>
}

function StatementModal({transactions,user,onClose}){
 const[from,setFrom]=useState(''),[to,setTo]=useState(''),[kind,setKind]=useState('completed'),[error,setError]=useState('')
 const download=async()=>{setError('');if(!from||!to){setError('Select both From Date and To Date.');return}if(new Date(from)>new Date(to)){setError('From Date cannot be after To Date.');return}let data=transactions.filter(t=>{const d=new Date(t.createdAt);return d>=new Date(from+'T00:00:00')&&d<=new Date(to+'T23:59:59')});if(kind==='completed')data=data.filter(t=>String(t.status).includes('COMPLETED'));if(!data.length){setError('No transactions found for the selected timeline.');return}await saveTransactionsPdf(data,user,from,to);onClose()}
 return <div className="wallet-modal-layer"><div className="wallet-modal wallet-statement-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><img className="wallet-modal-logo" src={LOGO_URL} alt="Trusted Circle"/><span className="wallet-services-eyebrow">DOWNLOAD STATEMENT</span><h2>Choose Timeline</h2><p>Select the period before downloading your PDF statement.</p><div className="wallet-statement-type"><button className={kind==='all'?'selected':''} onClick={()=>setKind('all')}>All Transactions</button><button className={kind==='completed'?'selected':''} onClick={()=>setKind('completed')}>Completed Statement</button></div><div className="wallet-date-grid"><div><label>From Date</label><input className="wallet-field" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></div><div><label>To Date</label><input className="wallet-field" type="date" value={to} onChange={e=>setTo(e.target.value)}/></div></div>{error&&<div className="wallet-login-message wallet-error">{error}</div>}<button className="wallet-submit" onClick={download}><ArrowDownToLine size={16}/> Download PDF</button></div></div>
}
function TransactionModal({tx,user,onClose,onRetry}){
 const download=()=>saveTransactionPdf(tx,user,'trusted-circle-'+tx.transactionId+'.pdf')
 return <div className="wallet-modal-layer"><div className="wallet-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><img className="wallet-modal-logo" src={LOGO_URL} alt="Trusted Circle"/><span className="wallet-services-eyebrow">TRANSACTION DETAILS</span><h2>{tx.type==='ADD_MONEY'?'Add Money':tx.type==='CASHBACK_EARNED'?'Cashback Earned':'Withdrawal'}</h2><div className="wallet-detail-amount">₹{money(tx.amount)}</div><div className={'wallet-detail-status '+statusClass(tx.status)}>{tx.status.replace(/_/g,' ')}</div><div className="wallet-detail-grid"><span>Transaction ID</span><b>{tx.transactionId}</b><span>Date</span><b>{new Date(tx.createdAt).toLocaleString('en-IN')}</b><span>Balance Before</span><b>₹{money(tx.balanceBefore)}</b><span>Balance After</span><b>₹{money(tx.balanceAfter)}</b>{tx.upiId&&<><span>UPI ID</span><b>{tx.upiId}</b></>}</div><div className="wallet-detail-actions"><button className="wallet-submit" onClick={download}><ArrowDownToLine size={16}/> Download PDF</button>{tx.status==='NOT_RECEIVED'&&<button className="wallet-secondary-btn" onClick={()=>onRetry(tx)}>Retry Payment <RefreshCw size={16}/></button>}</div><button className="wallet-change-email" onClick={onClose}>Close</button></div></div>
}

export default function WalletServicesPage({shoppingUser=null,onShoppingLogout}){
 useEffect(()=>{document.body.classList.add('wallet-services-lock');return()=>document.body.classList.remove('wallet-services-lock')},[])
 if(!shoppingUser)return <main className="wallet-services-page"><section className="wallet-empty" style={{maxWidth:640,margin:'60px auto'}}>Trusted Circle account details are required to open Wallet Services.</section></main>
 return <WalletHome user={shoppingUser} onLogout={()=>onShoppingLogout?.()} initialWallet={null}/>
}
