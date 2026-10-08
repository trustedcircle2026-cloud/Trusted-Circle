import {ArrowDownToLine,ArrowRight,CheckCircle2,Clock3,History,LogOut,RefreshCw,UserRound,WalletCards,X,Plus,ArrowDown,Percent} from 'lucide-react'
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
 let y=startY;const x0=14,totalW=widths.reduce((a,b)=>a+b,0);
 const header=()=>{doc.setFontSize(8);doc.setFont(undefined,'bold');doc.setFillColor(232,245,238);doc.rect(x0,y-7,totalW,10,'F');let x=x0;headers.forEach((h,i)=>{doc.text(String(h),x+2,y);x+=widths[i]});y+=10;doc.setFont(undefined,'normal')};
 header();
 rows.forEach(row=>{
  const cells=row.map((v,i)=>doc.splitTextToSize(String(v??''),Math.max(10,widths[i]-4)));
  const rowH=Math.max(10,Math.max(...cells.map(a=>a.length||1))*4.5+5);
  if(y+rowH>276){doc.addPage();y=20;header()}
  doc.setDrawColor(225,233,228);doc.rect(x0,y-7,totalW,rowH);
  let x=x0;cells.forEach((lines,i)=>{doc.text(lines,x+2,y);x+=widths[i]});
  y+=rowH;
 });
 return y;
}
async function saveTransactionPdf(tx,user,wallet,filename='trusted-circle-wallet-transaction.pdf'){
 const doc=new jsPDF();await addPdfHeader(doc,'Wallet Services — Transaction Details','System generated transaction document');
 doc.setFontSize(10);doc.setFont(undefined,'bold');doc.text('TRANSACTION SUMMARY',14,49);doc.setFont(undefined,'normal');
 const type=tx.type==='ADD_MONEY'?'Add Money':tx.type==='CASHBACK_EARNED'?'Cashback Earned':tx.type==='REDEMPTION_REQUEST'?'Cashback Redemption':'Withdrawal';
 const ledger=tx.type==='CASHBACK_EARNED'||tx.type==='REDEMPTION_REQUEST'?'Cashback Wallet':'Money Wallet';
 const rows=[['Transaction ID',tx.transactionId],['Customer',user?.name||'—'],['Email',user?.email||'—'],['Transaction Date',new Date(tx.createdAt).toLocaleString('en-IN')],['Completed Date',tx.completedAt?new Date(tx.completedAt).toLocaleString('en-IN'):'—'],['Ledger',ledger],['Transaction Type',type],['Amount','Rs. '+money(Math.abs(tx.amount))],['Status',String(tx.status||'').replace(/_/g,' ')],['UPI ID',tx.upiId||'—'],['Attempt',tx.attempt||1],['Payment Label',tx.paymentLinkLabel||'—'],['Description',tx.notes||'—']];
 let y=56;y=drawTable(doc,['Field','Details'],rows,y,[50,132]);
 y+=10;doc.setFont(undefined,'bold');doc.text('CURRENT ACCOUNT BALANCE',14,y);y+=8;doc.setFont(undefined,'normal');
 const mb=Number(tx.moneyBalance??wallet?.balance??0),cb=Number(tx.cashbackBalance??wallet?.cashbackBalance??wallet?.cashbackWallet?.balance??0),combined=Number(tx.combinedBalance??(mb+cb));
 drawTable(doc,['Wallet','Current Balance'],[['Money Wallet','Rs. '+money(mb)],['Cashback Wallet','Rs. '+money(cb)],['Combined Balance','Rs. '+money(combined)]],y,[75,107]);
 doc.setFontSize(8);doc.setTextColor(105);doc.text('Trusted Circle Wallet Services · System generated document · No signature required',14,286);doc.setTextColor(20,39,31);doc.save(filename)
}
async function saveTransactionsPdf(transactions,user,wallet,from,to){
 const doc=new jsPDF();await addPdfHeader(doc,'Wallet Services — Account Statement','Period: '+from+' to '+to);
 doc.setFontSize(10);doc.setFont(undefined,'bold');doc.text('CUSTOMER',14,49);doc.setFont(undefined,'normal');doc.text((user?.name||'Trusted Circle User')+'  ·  '+(user?.email||''),14,55);
 const rows=transactions.map(t=>[new Date(t.createdAt).toLocaleDateString('en-IN'),t.transactionId,t.type==='ADD_MONEY'?'Add Money':t.type==='CASHBACK_EARNED'?'Cashback Earned':t.type==='REDEMPTION_REQUEST'?'Cashback Redemption':'Withdrawal','Rs. '+money(Math.abs(t.amount)),Number(t.amount||0)>=0?'CREDIT':'DEBIT',String(t.status||'').replace(/_/g,' '),'Rs. '+money(t.balanceAfter)]);
 let y=66;y=drawTable(doc,['Date','Transaction ID','Type','Amount','Flow','Status','Ledger Balance'],rows,y,[21,39,25,22,20,29,26]);
 if(y>250){doc.addPage();y=20}else y+=8;
 doc.setFont(undefined,'bold');doc.text('STATEMENT SUMMARY',14,y);y+=8;doc.setFont(undefined,'normal');
 const totalAdd=transactions.filter(t=>t.type==='ADD_MONEY'&&String(t.status).includes('COMPLETED')).reduce((s,t)=>s+Math.abs(Number(t.amount||0)),0);
 const totalWithdraw=transactions.filter(t=>t.type==='WITHDRAW'&&String(t.status).includes('COMPLETED')).reduce((s,t)=>s+Math.abs(Number(t.amount||0)),0);
 const totalCashback=transactions.filter(t=>t.type==='CASHBACK_EARNED'&&String(t.status).includes('COMPLETED')).reduce((s,t)=>s+Math.abs(Number(t.amount||0)),0);
 const totalRedeem=transactions.filter(t=>t.type==='REDEMPTION_REQUEST'&&String(t.status).includes('COMPLETED')).reduce((s,t)=>s+Math.abs(Number(t.amount||0)),0);
 y=drawTable(doc,['Summary Item','Amount'],[['Completed Money Additions','Rs. '+money(totalAdd)],['Completed Money Withdrawals','Rs. '+money(totalWithdraw)],['Cashback Earned','Rs. '+money(totalCashback)],['Cashback Redeemed','Rs. '+money(totalRedeem)],['Transactions Included',String(transactions.length)]],y,[100,82]);
 if(y>245){doc.addPage();y=20}else y+=8;
 doc.setFont(undefined,'bold');doc.text('CURRENT ACCOUNT BALANCE',14,y);y+=8;doc.setFont(undefined,'normal');
 const mb=Number(wallet?.balance||0),cb=Number(wallet?.cashbackBalance??wallet?.cashbackWallet?.balance??0),combined=Number(wallet?.totalBalance??(mb+cb));
 drawTable(doc,['Wallet','Current Balance'],[['Money Wallet','Rs. '+money(mb)],['Cashback Wallet','Rs. '+money(cb)],['Combined Balance','Rs. '+money(combined)]],y,[100,82]);
 doc.setFontSize(8);doc.setTextColor(105);doc.text('Trusted Circle Wallet Services · System generated account statement · No signature required',14,286);doc.setTextColor(20,39,31);
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
  const requestedAmount=Number(amount||retryTransaction?.amount||0);
  const paymentWindow=window.open('about:blank','TrustedCircleWalletPayment','width=520,height=760,resizable=yes,scrollbars=yes');
  const draft={
    transactionId:retryTransaction?.transactionId||'CREATING…',
    amount:requestedAmount,
    status:'CREATING_PAYMENT',
    balanceBefore:Number(wallet?.balance||0),
    balanceAfter:Number(wallet?.balance||0),
    createdAt:new Date().toISOString(),
    attempt:Number(retryTransaction?.attempt||1)
  };
  setModal({type:'payment',phase:'opening',transaction:draft,expiresAt:null,user,amount:requestedAmount,linkTimeout:false,adminEmailSent:null});
  let settled=false;
  const uiTimer=setTimeout(()=>{
    if(!settled){
      setModal(prev=>prev?.type==='payment'?{...prev,phase:'link-timeout',linkTimeout:true}:prev);
    }
  },20000);
  try{
    const d=retryTransaction
      ?await walletApi.retryAddMoney(user,retryTransaction.transactionId)
      :await walletApi.addMoney(user,requestedAmount);
    settled=true;
    clearTimeout(uiTimer);
    const paymentLink=String(d?.paymentLink||d?.data?.paymentLink||'').trim();
    if(!paymentLink)throw new Error('Payment link was not returned from Wallet Services.');
    if(paymentWindow&&!paymentWindow.closed)paymentWindow.location.href=paymentLink;
    else window.open(paymentLink,'TrustedCircleWalletPayment','width=520,height=760,resizable=yes,scrollbars=yes');
    const realTx=d.transaction||d.data?.transaction;
    setModal(prev=>({
      ...(prev||{}),
      type:'payment',
      phase:'verifying',
      transaction:realTx||draft,
      expiresAt:d.expiresAt||d.data?.expiresAt||new Date(Date.now()+15*60*1000).toISOString(),
      user,
      amount:requestedAmount,
      linkTimeout:false,
      adminEmailSent:d.adminEmailSent!==false&&d.data?.adminEmailSent!==false
    }));
  }catch(e){
    settled=true;
    clearTimeout(uiTimer);
    if(paymentWindow&&!paymentWindow.closed)paymentWindow.close();
    setModal(prev=>prev?.type==='payment'
      ?{...prev,phase:'error',error:e.message,linkTimeout:false}
      :null);
  }
 };
 const startAdd=amount=>openPaymentFlow(amount);
 const retry=tx=>openPaymentFlow(null,tx);

 const withdraw=async(amount,upi)=>{const d=await walletApi.withdraw(user,amount,upi);setModal(null);setSelectedTx(d.transaction);await load()}
 const openOrders=async()=>{setNotice('');try{const o=await walletApi.orders(user);setOrders(o.transactions||[]);setModal({type:'orders'})}catch(e){setNotice(e.message)}}
 const downloadAll=()=>setStatementOpen(true)
 const balance=Number(wallet?.balance||0),available=Number(wallet?.availableBalance||0),cashbackBalance=Number(wallet?.cashbackBalance ?? (wallet?.cashbackWallet?.balance || 0)),combinedBalance=Number(wallet?.totalBalance ?? (balance+cashbackBalance))
 return <main className="wallet-services-page"><section className="wallet-services-shell">
  <aside className="wallet-left-panel">
   <div className="wallet-profile-wrap"><button className="wallet-profile-btn" onClick={()=>setProfileOpen(v=>!v)} title="Profile"><UserRound size={19}/></button>{profileOpen&&<ProfileMenu user={user} onLogout={onLogout} onClose={()=>setProfileOpen(false)}/>}</div>
   <div className="wallet-left-content"><span className="wallet-services-eyebrow">WALLET OVERVIEW</span><strong className="wallet-main-balance">₹{money(combinedBalance)}</strong><div className="wallet-balance-meta"><WalletCards size={13}/> Combined Balance</div>
    <div className="wallet-balance-breakup">
      <div className="wallet-balance-card money"><span><WalletCards size={15}/> Money</span><b>₹{money(balance)}</b><small>Available ₹{money(available)}{wallet?.reservedBalance?' · Reserved ₹'+money(wallet.reservedBalance):''}</small></div>
      <div className="wallet-balance-card cashback"><span><Percent size={15}/> Cashback</span><b>₹{money(cashbackBalance)}</b><small>Shopping cashback</small></div>
    </div>
    <div className="wallet-primary-actions"><button onClick={()=>setModal({type:'add'})} title="Add Money"><span><Plus size={18}/></span><div><b>Add</b><small>₹500 · ₹1,000 · ₹1,500 · ₹2,000</small></div></button><button onClick={()=>setModal({type:'withdraw'})} title="Withdraw"><span><ArrowDown size={18}/></span><div><b>Withdraw</b><small>To UPI</small></div></button></div>
    <div className="wallet-left-note"><CheckCircle2 size={16}/> Money Wallet + Cashback Wallet are linked to your Trusted Circle account.</div>
   </div>
   <div className="wallet-left-footer"><span>© Trusted Circle</span><span>{user.email}</span></div>
  </aside>
  <section className="wallet-right-panel">
   <header className="wallet-transactions-header"><div><span className="wallet-services-eyebrow">HISTORY</span><h1>Transactions</h1><p>Wallet activity</p></div><div className="wallet-section-tools"><button onClick={downloadAll} title="Download statement PDF" aria-label="Download statement PDF"><ArrowDownToLine size={17}/></button><button onClick={openOrders} title="View all transactions" aria-label="View all transactions"><History size={17}/></button><button className="wallet-refresh-btn" onClick={load} title="Refresh"><RefreshCw size={17}/></button></div></header>
   {notice&&<div className="wallet-notice">{notice}</div>}
   {busy?<div className="wallet-empty">Loading transactions…</div>:orders.length?<div className="wallet-transactions-scroll">{orders.map(t=>{const isCashback=t.type==='CASHBACK_EARNED';const isAdd=t.type==='ADD_MONEY'||isCashback;return <button className="wallet-transaction" key={t.transactionId} onClick={()=>setSelectedTx(t)}><span className={'wallet-tx-icon '+(isAdd?'add':'withdraw')}>{isAdd?'+':'−'}</span><span className="wallet-tx-main"><b>{isCashback?'Cashback Earned':t.type==='ADD_MONEY'?'Add Money':'Withdraw'}</b><small>{new Date(t.createdAt).toLocaleString('en-IN')}</small></span><span className="wallet-tx-right"><b>{isAdd?'+':'−'}₹{money(t.amount)}</b><small className={'wallet-status '+statusClass(t.status)}>{t.status.replace(/_/g,' ')}</small></span></button>})}</div>:<div className="wallet-empty">No wallet transactions yet.</div>}
   <div className="wallet-right-footer"><span>Click any transaction for full details & PDF</span><span>Trusted Circle Wallet Services</span></div>
  </section>
  {modal&&<WalletModal modal={modal} onClose={()=>setModal(null)} onAdd={startAdd} onWithdraw={withdraw} onRetry={retry} orders={orders} setSelectedTx={setSelectedTx} onOpenOrders={openOrders} onViewBalance={()=>{setModal(null);load()}}/>}
  {statementOpen&&<StatementModal transactions={orders} user={user} wallet={wallet} onClose={()=>setStatementOpen(false)}/>}
  {selectedTx&&!modal&&<TransactionModal tx={selectedTx} user={user} wallet={wallet} onClose={()=>setSelectedTx(null)} onRetry={retry}/>}
 </section></main>
}

function WalletModal({modal,onClose,onAdd,onWithdraw,onRetry,orders,setSelectedTx,onOpenOrders,onViewBalance}){
 const[type]=useState(modal.type),[amount,setAmount]=useState('500'),[busy,setBusy]=useState(false)
 if(type==='add')return <div className="wallet-modal-layer"><div className="wallet-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><span className="wallet-services-eyebrow">ADD MONEY</span><h2>Select Amount</h2><div className="wallet-denoms">{[500,1000,1500,2000].map(a=><button className={amount==a?'selected':''} key={a} onClick={()=>setAmount(String(a))}>₹{money(a)}</button>)}</div><button className="wallet-submit" onClick={async()=>{setBusy(true);await onAdd(Number(amount));setBusy(false)}} disabled={busy}>{busy?'Preparing Payment…':'Continue to Payment'} <ArrowRight size={17}/></button></div></div>
 if(type==='withdraw')return <WithdrawModal onClose={onClose} onSubmit={onWithdraw}/>
 if(type==='orders')return <div className="wallet-modal-layer"><div className="wallet-modal wallet-orders-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><span className="wallet-services-eyebrow">WALLET ORDERS</span><h2>All Transactions</h2><div className="wallet-order-list">{orders.map(t=><button key={t.transactionId} onClick={()=>{onClose();setSelectedTx(t)}} className="wallet-transaction"><span className="wallet-tx-main"><b>{t.type==='ADD_MONEY'?'Add Money':'Withdraw'}</b><small>{t.transactionId}</small></span><span className="wallet-tx-right"><b>₹{money(t.amount)}</b><small className={'wallet-status '+statusClass(t.status)}>{t.status.replace(/_/g,' ')}</small></span></button>)}</div></div></div>
 return <PaymentWaiting user={modal.user} tx={modal.transaction} amount={modal.amount} error={modal.error} expiresAt={modal.expiresAt} phase={modal.phase} adminEmailSent={modal.adminEmailSent} onClose={onClose} onRetry={onRetry} onOpenOrders={onOpenOrders} onViewBalance={onViewBalance}/>
}

function WithdrawModal({onClose,onSubmit}){const[amount,setAmount]=useState(''),[upi,setUpi]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');return <div className="wallet-modal-layer"><div className="wallet-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><span className="wallet-services-eyebrow">WITHDRAW</span><h2>Withdraw to UPI</h2><label>Amount</label><input className="wallet-field" type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="₹ 0"/><label>UPI ID</label><input className="wallet-field" value={upi} onChange={e=>setUpi(e.target.value)} placeholder="name@upi"/>{error&&<div className="wallet-login-message">{error}</div>}<button className="wallet-submit" disabled={busy||!amount||!upi} onClick={async()=>{setBusy(true);setError('');try{await onSubmit(Number(amount),upi)}catch(e){setError(e.message)}finally{setBusy(false)}}}>{busy?'Submitting…':'Request Withdrawal'} <ArrowRight size={17}/></button></div></div>}

function PaymentWaiting({user,tx,expiresAt,onClose,onRetry,onOpenOrders,onViewBalance,phase,adminEmailSent,amount,error}){
 const initialSeconds=expiresAt?Math.max(0,Math.floor((new Date(expiresAt)-Date.now())/1000)):900;
 const[left,setLeft]=useState(initialSeconds),[result,setResult]=useState(null),[liveTx,setLiveTx]=useState(tx);
 useEffect(()=>{
   if(phase!=='verifying'||!liveTx?.transactionId||liveTx.transactionId==='CREATING…')return;
   let active=true;
   const check=async()=>{
     try{
       const d=await walletApi.transactionStatus(user,liveTx.transactionId);
       const next=d?.transaction;
       if(!active||!next)return;
       setLiveTx(next);
       setLeft(expiresAt?Math.max(0,Math.floor((new Date(expiresAt)-Date.now())/1000)):900);
       if(['COMPLETED','NOT_RECEIVED','REJECTED'].includes(String(next.status||'').toUpperCase()))setResult(next);
     }catch{}
   };
   check();
   const timer=setInterval(check,4000);
   return()=>{active=false;clearInterval(timer)};
 },[user,liveTx?.transactionId,expiresAt,phase]);
 if(phase==='error')return <div className="wallet-modal-layer"><div className="wallet-modal payment-result">
   <div className="wallet-result-icon failed"><X size={42}/></div>
   <span className="wallet-services-eyebrow">PAYMENT SETUP FAILED</span>
   <h2>Could Not Prepare Payment</h2>
   <p>{error||'We could not prepare the payment link.'}</p>
   <div className="wallet-result-actions"><button className="wallet-submit" onClick={onClose}>Close</button></div>
 </div></div>;
 if(phase==='opening'||phase==='link-timeout')return <div className="wallet-modal-layer"><div className="wallet-modal payment-waiting payment-live-card">
   <button className="wallet-modal-x" onClick={onClose}><X size={18}/></button>
   <div className="wallet-payment-live-head">
     <div className="wallet-loading-ring"><Clock3 size={31}/></div>
     <div><span className="wallet-services-eyebrow">ADD MONEY · LIVE STATUS</span><h2>{phase==='opening'?'Getting Secure Payment Link':'Still Getting Payment Link'}</h2><p>Your payment request is active. This screen will remain open while Trusted Circle prepares the secure payment page.</p></div>
   </div>
   <div className="wallet-live-summary">
     <div><span>Transaction No.</span><b>{tx?.transactionId||'CREATING…'}</b></div>
     <div><span>Amount</span><b>₹{money(amount||tx?.amount)}</b></div>
     <div><span>Current Status</span><b className="live-status pending">PREPARING PAYMENT</b></div>
   </div>
   <div className="wallet-payment-steps">
     <div className="wallet-payment-step done"><CheckCircle2 size={18}/><span>Request created</span></div>
     <div className="wallet-payment-step pending"><Clock3 size={18}/><span>{phase==='opening'?'Getting payment link':'Link taking longer than expected'}</span></div>
     <div className="wallet-payment-step pending"><Clock3 size={18}/><span>Open secure Paytm page</span></div>
   </div>
   <div className="wallet-progress"><span className="wallet-progress-indeterminate"/></div>
   <strong>{phase==='opening'?'Preparing your payment…':'Still processing — you can wait here'}</strong>
   <small>{phase==='opening'?'The loading indicator is limited to 20 seconds. The request continues safely in the background.':'The 20-second UI limit has passed, but the backend request is still running. We will open the payment page automatically if the link arrives.'}</small>
   <button className="wallet-secondary-btn" onClick={onClose}>Continue in Wallet</button>
 </div></div>;
 if(result){
   const success=String(result.status||'').toUpperCase()==='COMPLETED';
   const notReceived=String(result.status||'').toUpperCase()==='NOT_RECEIVED';
   return <div className="wallet-modal-layer"><div className="wallet-modal payment-result payment-live-card">
     <div className={'wallet-result-icon '+(success?'success':'failed')}>{success?<CheckCircle2 size={42}/>:<X size={42}/>}</div>
     <span className="wallet-services-eyebrow">ADMIN ACTION COMPLETED</span>
     <h2>{success?'Payment Successful':notReceived?'Payment Not Received':'Payment Failed / Rejected'}</h2>
     <div className="wallet-live-summary result-summary">
       <div><span>Transaction No.</span><b>{result.transactionId}</b></div>
       <div><span>Amount</span><b>₹{money(result.amount)}</b></div>
       <div><span>Final Status</span><b className={'live-status '+(success?'success':'failed')}>{String(result.status).replace(/_/g,' ')}</b></div>
     </div>
     <p>{success?'Admin confirmed the payment and the amount has been credited to your Money Wallet.':notReceived?'Admin could not confirm the payment. You can retry using a fresh payment link.':'Admin rejected the payment request. No amount was added to your Money Wallet.'}</p>
     <div className="wallet-result-actions">
       {notReceived&&<button className="wallet-submit" onClick={()=>{onClose();onRetry(result)}}>Retry Payment <RefreshCw size={16}/></button>}
       <button className="wallet-secondary-btn" onClick={onViewBalance}>Refresh Wallet Balance</button>
       <button className="wallet-secondary-btn" onClick={onClose}>Close</button>
     </div>
   </div></div>
 }
 const currentStatus=String(liveTx?.status||'PENDING_PAYMENT').replace(/_/g,' ');
 return <div className="wallet-modal-layer"><div className="wallet-modal payment-waiting payment-live-card">
   <button className="wallet-modal-x" onClick={onClose}><X size={18}/></button>
   <div className="wallet-payment-live-head">
     <div className="wallet-loading-ring"><Clock3 size={31}/></div>
     <div><span className="wallet-services-eyebrow">PAYMENT VERIFICATION · LIVE</span><h2>Payment Page Opened</h2><p>Keep this status window open. It checks the Admin action automatically.</p></div>
   </div>
   <div className="wallet-live-summary">
     <div><span>Transaction No.</span><b>{liveTx?.transactionId||'—'}</b></div>
     <div><span>Amount</span><b>₹{money(liveTx?.amount||amount)}</b></div>
     <div><span>Active Status</span><b className="live-status pending">{currentStatus}</b></div>
   </div>
   <div className="wallet-payment-steps">
     <div className="wallet-payment-step done"><CheckCircle2 size={17}/><span>Secure link received</span></div>
     <div className="wallet-payment-step done"><CheckCircle2 size={17}/><span>Payment page opened</span></div>
     <div className={'wallet-payment-step '+(adminEmailSent===false?'failed':'done')}>{adminEmailSent===false?<X size={17}/>:<CheckCircle2 size={17}/>}<span>{adminEmailSent===false?'Admin email failed':'Admin notified'}</span></div>
     <div className="wallet-payment-step pending"><Clock3 size={17}/><span>Waiting for Admin action</span></div>
   </div>
   <div className="wallet-progress"><span style={{width:Math.max(3,Math.min(100,(left/900)*100))+'%'}}/></div>
   <strong>{left>0?'Waiting for Admin action · '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0'):'Waiting for Admin action'}</strong>
   <small>When Admin selects <b>Received</b>, <b>Not Received</b>, or <b>Rejected</b>, this same popup will immediately show the final result.</small>
   <button className="wallet-secondary-btn" onClick={onClose}>Continue in Wallet</button>
 </div></div>
}
function StatementModal({transactions,user,wallet,onClose}){
 const[from,setFrom]=useState(''),[to,setTo]=useState(''),[kind,setKind]=useState('completed'),[error,setError]=useState('')
 const download=async()=>{setError('');if(!from||!to){setError('Select both From Date and To Date.');return}if(new Date(from)>new Date(to)){setError('From Date cannot be after To Date.');return}let data=transactions.filter(t=>{const d=new Date(t.createdAt);return d>=new Date(from+'T00:00:00')&&d<=new Date(to+'T23:59:59')});if(kind==='completed')data=data.filter(t=>String(t.status).includes('COMPLETED'));if(!data.length){setError('No transactions found for the selected timeline.');return}await saveTransactionsPdf(data,user,wallet,from,to);onClose()}
 return <div className="wallet-modal-layer"><div className="wallet-modal wallet-statement-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><img className="wallet-modal-logo" src={LOGO_URL} alt="Trusted Circle"/><span className="wallet-services-eyebrow">DOWNLOAD STATEMENT</span><h2>Choose Timeline</h2><p>Select the period before downloading your PDF statement.</p><div className="wallet-statement-type"><button className={kind==='all'?'selected':''} onClick={()=>setKind('all')}>All Transactions</button><button className={kind==='completed'?'selected':''} onClick={()=>setKind('completed')}>Completed Statement</button></div><div className="wallet-date-grid"><div><label>From Date</label><input className="wallet-field" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></div><div><label>To Date</label><input className="wallet-field" type="date" value={to} onChange={e=>setTo(e.target.value)}/></div></div>{error&&<div className="wallet-login-message wallet-error">{error}</div>}<button className="wallet-submit" onClick={download}><ArrowDownToLine size={16}/> Download PDF</button></div></div>
}
function TransactionModal({tx,user,wallet,onClose,onRetry}){
 const download=()=>saveTransactionPdf(tx,user,wallet,'trusted-circle-'+tx.transactionId+'.pdf')
 return <div className="wallet-modal-layer"><div className="wallet-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><img className="wallet-modal-logo" src={LOGO_URL} alt="Trusted Circle"/><span className="wallet-services-eyebrow">TRANSACTION DETAILS</span><h2>{tx.type==='ADD_MONEY'?'Add Money':tx.type==='CASHBACK_EARNED'?'Cashback Earned':'Withdrawal'}</h2><div className="wallet-detail-amount">₹{money(tx.amount)}</div><div className={'wallet-detail-status '+statusClass(tx.status)}>{tx.status.replace(/_/g,' ')}</div><div className="wallet-detail-grid"><span>Transaction ID</span><b>{tx.transactionId}</b><span>Date</span><b>{new Date(tx.createdAt).toLocaleString('en-IN')}</b><span>Balance Before</span><b>₹{money(tx.balanceBefore)}</b><span>Balance After</span><b>₹{money(tx.balanceAfter)}</b>{tx.upiId&&<><span>UPI ID</span><b>{tx.upiId}</b></>}</div><div className="wallet-detail-actions"><button className="wallet-submit" onClick={download}><ArrowDownToLine size={16}/> Download PDF</button>{tx.status==='NOT_RECEIVED'&&<button className="wallet-secondary-btn" onClick={()=>onRetry(tx)}>Retry Payment <RefreshCw size={16}/></button>}</div><button className="wallet-change-email" onClick={onClose}>Close</button></div></div>
}

export default function WalletServicesPage({shoppingUser=null,onShoppingLogout}){
 useEffect(()=>{document.body.classList.add('wallet-services-lock');return()=>document.body.classList.remove('wallet-services-lock')},[])
 if(!shoppingUser)return <main className="wallet-services-page"><section className="wallet-empty" style={{maxWidth:640,margin:'60px auto'}}>Trusted Circle account details are required to open Wallet Services.</section></main>
 return <WalletHome user={shoppingUser} onLogout={()=>onShoppingLogout?.()} initialWallet={null}/>
}
