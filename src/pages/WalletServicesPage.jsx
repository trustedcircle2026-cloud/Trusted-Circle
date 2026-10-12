import {ArrowDownToLine,ArrowRight,CheckCircle2,Clock3,History,LogOut,RefreshCw,UserRound,WalletCards,X,Plus,ArrowDown,Percent,Smartphone} from 'lucide-react'
import {jsPDF} from 'jspdf'
import {useEffect,useState} from 'react'
import {walletApi} from '../wallet-services-api'
import {api} from '../api'
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

function readWalletCache(identity){
 try{const key='tc_wallet_snapshot_v1_'+(identity?.userId||identity?.email||'guest');const parsed=JSON.parse(localStorage.getItem(key)||'null');return parsed?.wallet||null}catch{return null}
}
function WalletHome({user,identity,onLogout,initialWallet=null,shoppingToken=''}){
 const cachedWallet=initialWallet||readWalletCache(identity);
 const[wallet,setWallet]=useState(cachedWallet),[orders,setOrders]=useState(cachedWallet?.transactions||[]),[busy,setBusy]=useState(false),[swipeStart,setSwipeStart]=useState(null),[swipeOffset,setSwipeOffset]=useState(0),[modal,setModal]=useState(null),[selectedTx,setSelectedTx]=useState(null),[notice,setNotice]=useState(''),[profileOpen,setProfileOpen]=useState(false),[statementOpen,setStatementOpen]=useState(false),[txFilter,setTxFilter]=useState('all'),[txStatus,setTxStatus]=useState('all'),[txSearch,setTxSearch]=useState(''),[successNotice,setSuccessNotice]=useState(null),[showMoreTransactions,setShowMoreTransactions]=useState(false),[transactionPage,setTransactionPage]=useState(1)
 const load=async()=>{
  setBusy(false);
  try{
    const w=await walletApi.snapshot(identity);
    setWallet(w);
    try{localStorage.setItem('tc_wallet_snapshot_v1_'+(identity?.userId||identity?.email||'guest'),JSON.stringify({savedAt:Date.now(),wallet:w}))}catch{}
    const refreshedTransactions=w.transactions||[];
    setOrders(refreshedTransactions);
    const completedTopUp=refreshedTransactions.find(t=>t.type==='ADD_MONEY'&&String(t.status||'').toUpperCase()==='COMPLETED');
    if(completedTopUp){
     const seenKey='tc_wallet_success_seen_'+completedTopUp.transactionId;
     let seen=false;try{seen=localStorage.getItem(seenKey)==='1'}catch{}
     if(!seen){try{localStorage.setItem(seenKey,'1')}catch{}setSuccessNotice(completedTopUp)}
    }
    setNotice('');
  }catch(e){
    setNotice(e.message);
  }finally{
    setBusy(false);
  }
 }
 useEffect(()=>{if(!initialWallet)load()},[initialWallet])
 useEffect(()=>{if(!wallet)return;try{localStorage.setItem('tc_wallet_snapshot_v1_'+(identity?.userId||identity?.email||'guest'),JSON.stringify({savedAt:Date.now(),wallet}))}catch{}},[wallet,identity?.userId,identity?.email])
 // Quiet background sync: refresh balances and transaction history every 15 seconds.
 useEffect(()=>{
  let active=true,syncing=false;
  const syncWalletSilently=async()=>{
   if(syncing)return;
   syncing=true;
   try{const latest=await walletApi.snapshot(identity);if(active&&latest){setWallet(latest);setOrders(latest.transactions||[]);try{localStorage.setItem('tc_wallet_snapshot_v1_'+(identity?.userId||identity?.email||'guest'),JSON.stringify({savedAt:Date.now(),wallet:latest}))}catch{}}}catch{}finally{syncing=false}
  };
  const timer=setInterval(syncWalletSilently,30000);
  return()=>{active=false;clearInterval(timer)};
 },[identity.email,identity.userId]);
 const pendingWalletSignature=orders.filter(t=>t.type==='ADD_MONEY'&&String(t.status||'').toUpperCase()==='PENDING_PAYMENT').map(t=>t.transactionId).join('|')
 useEffect(()=>{
  if(!pendingWalletSignature)return
  let active=true
  const checkPendingWalletPayments=async()=>{
   const ids=pendingWalletSignature.split('|').filter(Boolean)
   for(const transactionId of ids){
    try{
     const result=await walletApi.transactionStatus(identity,transactionId)
     const updated=result?.transaction
     if(!active||!updated)continue
     const status=String(updated.status||'').toUpperCase()
     if(status==='COMPLETED'){
      const seenKey='tc_wallet_success_seen_'+updated.transactionId
      let seen=false;try{seen=localStorage.getItem(seenKey)==='1'}catch{}
      if(!modal||modal.type!=='payment'){if(!seen){try{localStorage.setItem(seenKey,'1')}catch{}setSuccessNotice(updated)}}
      const refreshed=await walletApi.snapshot(identity)
      if(active){setWallet(refreshed);setOrders(refreshed.transactions||[])}
      return
     }
     if(['NOT_RECEIVED','REJECTED'].includes(status))setOrders(previous=>previous.map(t=>t.transactionId===updated.transactionId?updated:t))
    }catch{}
   }
  }
  const timer=setInterval(checkPendingWalletPayments,1000)
  checkPendingWalletPayments()
  return()=>{active=false;clearInterval(timer)}
 },[pendingWalletSignature,identity.email,identity.userId,modal?.type])

 const openPaymentFlow=async(amount,retryTransaction=null,options={})=>{
  setNotice('');
  const requestedAmount=Number(amount||retryTransaction?.amount||0);
  if(!retryTransaction&&options.manualUPI&&window.matchMedia('(min-width: 768px)').matches){setModal({type:'custom-mobile-only'});return;}
  const draft={
    transactionId:retryTransaction?.transactionId||'CREATING…',
    amount:requestedAmount,
    status:'CREATING_PAYMENT',
    balanceBefore:Number(wallet?.balance||0),
    balanceAfter:Number(wallet?.balance||0),
    createdAt:new Date().toISOString(),
    attempt:Number(retryTransaction?.attempt||1)
  };
  // IMPORTANT: show the Trusted Circle status popup immediately.
  // Do not open a blank/payment browser window before the secure link exists.
  setModal({type:'payment',phase:'opening',transaction:draft,expiresAt:null,user,amount:requestedAmount,linkTimeout:false,adminEmailSent:null});
  let settled=false;
  const uiTimer=setTimeout(()=>{
    if(!settled){
      setModal(prev=>prev?.type==='payment'?{...prev,phase:'link-timeout',linkTimeout:true}:prev);
    }
  },20000);
  try{
    const d=retryTransaction
      ?await walletApi.retryAddMoney(identity,retryTransaction.transactionId)
      :await walletApi.addMoney(identity,requestedAmount,{manualUPI:!!options.manualUPI,notes:String(options.notes||'Verified')});
    settled=true;
    clearTimeout(uiTimer);
    const paymentLink=String(d?.paymentLink||d?.data?.paymentLink||'').trim();
    if(!paymentLink)throw new Error('Payment link was not returned from Wallet Services.');
    const realTx=d.transaction||d.data?.transaction||draft;

    // On mobile, do not auto-launch a browser or UPI app. Show a clear
    // user-initiated button so one tap can invoke Android's "Open with" chooser.
    let paymentOpened=false;
    const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||window.matchMedia('(max-width: 767px)').matches;
    if(!mobile){
      try{
        const paymentWindow=window.open(paymentLink,'TrustedCircleWalletPayment','width=520,height=760,resizable=yes,scrollbars=yes');
        paymentOpened=!!paymentWindow;
      }catch{}
    }
    setModal(prev=>({
      ...(prev||{}),
      type:'payment',
      phase:'verifying',
      transaction:realTx,
      expiresAt:d.expiresAt||d.data?.expiresAt||new Date(Date.now()+15*60*1000).toISOString(),
      user,
      amount:requestedAmount,
      paymentLink,
      paymentOpened,
      linkTimeout:false,
      adminEmailSent:d.adminEmailSent!==false&&d.data?.adminEmailSent!==false
    }));
  }catch(e){
    settled=true;
    clearTimeout(uiTimer);
    setModal(prev=>prev?.type==='payment'
      ?{...prev,phase:'error',error:e.message,linkTimeout:false}
      :null);
  }
 }; const startAdd=(amount,options={})=>openPaymentFlow(amount,null,options);
 const retry=tx=>openPaymentFlow(null,tx);
 const beginAdd=()=>{const pending=orders.filter(t=>t.type==='ADD_MONEY'&&String(t.status||'').toUpperCase()==='PENDING_PAYMENT');setModal(pending.length?{type:'pending-summary',pending}:{type:'add'})};
 const retryPending=tx=>{const link=String(tx.paymentLink||tx.PaymentLink||'').trim();if(link)window.open(link,'TrustedCircleWalletPayment','width=520,height=760,resizable=yes,scrollbars=yes');setModal({type:'payment',phase:'verifying',transaction:tx,expiresAt:null,user,amount:tx.amount,paymentLink:link,paymentOpened:!!link,adminEmailSent:null})};
 const cancelPending=async tx=>{try{await walletApi.cancelAddMoney(identity,tx.transactionId);const w=await walletApi.snapshot(identity);setWallet(w);setOrders(w.transactions||[]);const pending=(w.transactions||[]).filter(t=>t.type==='ADD_MONEY'&&String(t.status||'').toUpperCase()==='PENDING_PAYMENT');setModal(pending.length?{type:'pending-summary',pending}:null)}catch(e){setNotice(e.message||'Could not cancel this payment.')}};

 const withdraw=async(amount,upi,accountType='MONEY_WALLET')=>{let d;if(accountType==='CASHBACK_WALLET'){d=await api.redeemWallet(shoppingToken,amount,'UPI',{upiId:upi});setSelectedTx({transactionId:d?.redemption?.RedemptionID||d?.redemption?.redemptionId||'Cashback redemption',type:'REDEMPTION_REQUEST',amount,status:'REQUESTED',createdAt:new Date().toISOString(),upiId:upi,notes:'Cashback withdrawal request'})}else{d=await walletApi.withdraw(identity,amount,upi);setSelectedTx(d.transaction)}setModal(null);await load()}
 const openOrders=async()=>{setNotice('');try{const o=await walletApi.orders(identity);setOrders(o.transactions||[]);setModal({type:'orders'})}catch(e){setNotice(e.message)}}
 const downloadAll=()=>setStatementOpen(true)
 const balance=Number(wallet?.balance||0),available=Number(wallet?.availableBalance||0),cashbackBalance=Number(wallet?.cashbackBalance ?? (wallet?.cashbackWallet?.balance || 0)),combinedBalance=Number(wallet?.totalBalance ?? (balance+cashbackBalance))
 const isCashbackTx=t=>t.source==='CASHBACK'||t.type==='CASHBACK_EARNED'||t.type==='REDEMPTION_REQUEST';
 const matchesStatus=t=>txStatus==='all'||(txStatus==='success'?String(t.status||'').toUpperCase()==='COMPLETED':txStatus==='pending'?['PENDING_PAYMENT','WITHDRAWAL_REQUESTED','RETRY_CREATED','CREATING_PAYMENT','REQUESTED','PROCESSING'].includes(String(t.status||'').toUpperCase()):String(t.status||'').toUpperCase()==='CANCELLED');
 const matchesSearch=t=>!txSearch.trim()||[t.transactionId,t.type,t.status,t.notes].some(v=>String(v||'').toLowerCase().includes(txSearch.trim().toLowerCase()));
 const visibleOrders=orders.filter(t=>(txFilter==='all'||(txFilter==='cashback'?isCashbackTx(t):!isCashbackTx(t)))&&matchesStatus(t)&&matchesSearch(t)).sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
 const transactionPageSize=15;
 const displayedOrders=showMoreTransactions?visibleOrders.slice((transactionPage-1)*transactionPageSize,transactionPage*transactionPageSize):visibleOrders.slice(0,5);
 const activeCountFor=key=>orders.filter(t=>(key==='all'||(key==='cashback'?isCashbackTx(t):!isCashbackTx(t)))&&matchesStatus(t)&&matchesSearch(t)).length;
 return <main className="wallet-services-page wallet-single-page wallet-split-page">
 <section className="wallet-single-shell wallet-split-shell">
  <header className="wallet-single-topbar">
   <div className="wallet-single-brand"><WalletCards size={21}/><div><b>Wallet Services</b><small>Trusted Circle · Secure account</small></div></div>
   <div className="wallet-single-tools"><button onClick={load} title="Refresh balances and transactions" aria-label="Refresh balances and transactions"><RefreshCw size={18}/></button><button onClick={downloadAll} title="Download statement" aria-label="Download statement"><ArrowDownToLine size={18}/></button></div>
  </header>
  <div className="wallet-split-layout">
   <section className="wallet-split-left">
    <div className="wallet-balance-overview">
     <div className="wallet-total-card"><span className="wallet-services-eyebrow">TOTAL WALLET BALANCE</span><strong>₹{money(combinedBalance)}</strong><small><WalletCards size={14}/> Money + Cashback combined</small></div>
     <div className="wallet-split-balances"><div className="wallet-balance-card money"><span><WalletCards size={15}/> Money Wallet</span><b>₹{money(balance)}</b><small>Available ₹{money(available)}{wallet?.reservedBalance?' · Reserved ₹'+money(wallet.reservedBalance):''}</small></div><div className="wallet-balance-card cashback"><span><Percent size={15}/> Cashback Wallet</span><b>₹{money(cashbackBalance)}</b><small>Shopping cashback</small></div></div>
    </div>
    <div className="wallet-swipe-actions" aria-label="Swipe to add money or withdraw">
      <div className="wallet-swipe-direction wallet-swipe-add"><Plus size={16}/><span>Swipe right to Add Money</span></div>
      <div className="wallet-swipe-direction wallet-swipe-withdraw"><span>Swipe left to Withdraw</span><ArrowDown size={16}/></div>
      <div className="wallet-swipe-track" onPointerMove={e=>{if(swipeStart!==null)setSwipeOffset(Math.max(-105,Math.min(105,e.clientX-swipeStart)))}} onPointerUp={e=>{if(swipeStart===null)return;const delta=e.clientX-swipeStart;setSwipeStart(null);setSwipeOffset(0);if(delta>55)beginAdd();else if(delta< -55)setModal({type:'withdraw',cashbackBalance,moneyBalance:available})}} onPointerCancel={()=>{setSwipeStart(null);setSwipeOffset(0)}}>
        <div className={'wallet-swipe-fill '+(swipeOffset>0?'toward-add':swipeOffset<0?'toward-withdraw':'')} style={{transform:`scaleX(${Math.abs(swipeOffset)/105})`,transformOrigin:swipeOffset<0?'right':'left'}}/>
        <div className="wallet-swipe-thumb" style={{transform:`translateX(${swipeOffset}px)`}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setSwipeStart(e.clientX);setSwipeOffset(0)}}><span className="wallet-swipe-thumb-left"><ArrowRight size={17}/></span><span className="wallet-swipe-thumb-center"><WalletCards size={19}/></span><span className="wallet-swipe-thumb-right"><ArrowRight size={17}/></span></div>
      </div>
      <small className="wallet-swipe-hint">Drag the handle either way · no accidental taps</small>
    </div>
    <div className="wallet-left-security"><CheckCircle2 size={16}/><span><b>Separate wallet ledgers</b><small>Money Wallet and Cashback Wallet balances are tracked independently.</small></span></div>
   </section>
   <section className="wallet-split-right">
    <div className="wallet-history-title"><h1>Transaction History</h1><div className="wallet-transaction-controls"><input className="wallet-field wallet-transaction-search" value={txSearch} onChange={e=>{setTxSearch(e.target.value);setTransactionPage(1)}} placeholder="Search transactions or ID…" aria-label="Search transactions"/><select className="wallet-field wallet-transaction-status" value={txStatus} onChange={e=>{setTxStatus(e.target.value);setTransactionPage(1)}} aria-label="Filter by status"><option value="all">All Status</option><option value="success">Success</option><option value="pending">Pending</option></select></div></div>
    <div className="wallet-history-filters" role="tablist" aria-label="Filter transactions">{[['all','All'],['cashback','Cashback'],['money','Money Wallet']].map(([key,label])=><button key={key} role="tab" aria-selected={txFilter===key} className={txFilter===key?'active':''} onClick={()=>{setTxFilter(key);setTransactionPage(1)}}>{label}<span>{activeCountFor(key)}</span></button>)}</div>
    {notice&&<div className="wallet-notice">{notice}</div>}
    <div className="wallet-history-scroll">{visibleOrders.length?displayedOrders.map(t=>{const isCashback=t.source==='CASHBACK'||t.type==='CASHBACK_EARNED'||t.type==='REDEMPTION_REQUEST';const isCredit=isCashback?t.type==='CASHBACK_EARNED':t.type==='ADD_MONEY';return <button className="wallet-transaction wallet-single-transaction wallet-split-transaction" key={t.transactionId} onClick={()=>setSelectedTx(t)}><span className={'wallet-tx-icon '+(isCredit?'add':'withdraw')}>{isCredit?'+':'−'}</span><span className="wallet-tx-main"><b>{isCashback?(t.type==='REDEMPTION_REQUEST'?'Cashback Redemption':'Cashback Earned'):t.type==='ADD_MONEY'?'Add Money':t.type==='WITHDRAW'?'Withdrawal':'Wallet Transaction'}</b><small>{new Date(t.createdAt).toLocaleString('en-IN')} · {isCashback?'Cashback Wallet':'Money Wallet'}</small></span><span className="wallet-tx-right"><b className={isCredit?'wallet-credit-amount':'wallet-debit-amount'}>{isCredit?'+':'−'}₹{money(Math.abs(Number(t.amount||0)))}</b><small className={'wallet-status '+statusClass(t.status)}>{String(t.status||'').replace(/_/g,' ')}</small></span><ArrowRight className="wallet-single-tx-arrow" size={16}/></button>}):<div className="wallet-empty wallet-filter-empty">{txFilter==='cashback'?'No cashback transactions found.':txFilter==='money'?'No Money Wallet transactions found.':'No wallet transactions yet.'}</div>}</div>
    {visibleOrders.length>5&&<div className="wallet-transaction-pagination">{!showMoreTransactions?<button className="wallet-view-more" onClick={()=>{setShowMoreTransactions(true);setTransactionPage(1)}}>View More <ArrowRight size={15}/></button>:<><span className="wallet-page-count">Showing {Math.min((transactionPage-1)*transactionPageSize+1,visibleOrders.length)}–{Math.min(transactionPage*transactionPageSize,visibleOrders.length)} of {visibleOrders.length}</span><div className="wallet-page-buttons"><button disabled={transactionPage===1} onClick={()=>setTransactionPage(p=>Math.max(1,p-1))}>Previous</button><span>Page {transactionPage} of {Math.max(1,Math.ceil(visibleOrders.length/transactionPageSize))}</span><button disabled={transactionPage>=Math.ceil(visibleOrders.length/transactionPageSize)} onClick={()=>setTransactionPage(p=>Math.min(Math.ceil(visibleOrders.length/transactionPageSize),p+1))}>Next</button></div></>}</div>}
     <div className="wallet-history-foot"><span>{visibleOrders.length} matching transaction{visibleOrders.length===1?'':'s'}</span><span>Live account ledger</span></div>
   </section>
  </div>
  <footer className="wallet-single-footer"><span>© Trusted Circle</span><span>{user.email}</span><span>Money + Cashback Wallet</span></footer>
 </section>
 {modal&&<WalletModal identity={identity} modal={modal} onClose={()=>setModal(null)} onAdd={startAdd} onSelectAdd={(amount,options)=>setModal({type:'add-summary',amount,...options})} onContinueAdd={()=>setModal({type:'add'})} onRetryPending={retryPending} onCancelPending={cancelPending} onEditAdd={(amount,options)=>setModal({type:'add',amount,...options})} onWithdraw={withdraw} onRetry={retry} orders={orders} setSelectedTx={setSelectedTx} onOpenOrders={openOrders} onViewBalance={()=>{setModal(null);load()}}/>}
 {statementOpen&&<StatementModal transactions={orders} user={user} wallet={wallet} onClose={()=>setStatementOpen(false)}/>}
 {selectedTx&&!modal&&<TransactionModal tx={selectedTx} user={user} wallet={wallet} onClose={()=>setSelectedTx(null)} onRetry={retry}/>}
 {successNotice&&<div className="wallet-modal-layer"><div className="wallet-modal payment-result wallet-persistent-success"><div className="wallet-result-icon success"><CheckCircle2 size={54}/></div><span className="wallet-services-eyebrow">PAYMENT SUCCESSFUL</span><h2>Your money was added successfully</h2><div className="wallet-live-summary result-summary"><div><span>Transaction No.</span><b>{successNotice.transactionId}</b></div><div><span>Amount Added</span><b>₹{money(successNotice.amount)}</b></div></div><button className="wallet-submit" onClick={()=>{try{localStorage.setItem('tc_wallet_success_seen_'+successNotice.transactionId,'1')}catch{}setSuccessNotice(null);load()}}>View Updated Balance <ArrowRight size={16}/></button><button className="wallet-secondary-btn" onClick={()=>{try{localStorage.setItem('tc_wallet_success_seen_'+successNotice.transactionId,'1')}catch{}setSuccessNotice(null)}}>Close</button></div></div>}
</main>
}

function WalletModal({identity,modal,onClose,onAdd,onSelectAdd,onContinueAdd,onRetryPending,onCancelPending,onEditAdd,onWithdraw,onRetry,orders,setSelectedTx,onOpenOrders,onViewBalance}){
 const type=modal.type,desktopUPI=typeof window!=='undefined'&&window.matchMedia('(min-width: 768px)').matches,[amount,setAmount]=useState(String(modal.amount||'500')),[manual,setManual]=useState(!!modal.manualUPI),[notes,setNotes]=useState(modal.notes||'Verified'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 if(type==='custom-mobile-only')return <div className="wallet-modal-layer"><div className="wallet-modal wallet-custom-mobile-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><div className="wallet-summary-icon"><Smartphone size={28}/></div><span className="wallet-services-eyebrow">CUSTOM UPI PAYMENT</span><h2>Use your mobile to add custom money</h2><p>Custom amount UPI links can open only in a mobile UPI app. Please open Trusted Circle on your mobile and choose Custom Amount to continue.</p><button className="wallet-submit" onClick={onClose}>Understood</button></div></div>;
 if(type==='pending-summary'&&!modal.pending?.length)return null;
 if(type==='pending-summary')return <div className="wallet-modal-layer"><div className="wallet-modal wallet-pending-summary"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><span className="wallet-services-eyebrow">PENDING WALLET PAYMENTS</span><h2>Resolve previous top-ups</h2><p>You have {modal.pending.length} pending add-money transaction{modal.pending.length===1?'':'s'}. Retry an existing payment before creating another.</p><div className="wallet-pending-list">{modal.pending.map(t=><div className="wallet-pending-item" key={t.transactionId}><div><b>₹{money(t.amount)}</b><small>{t.transactionId}</small><small>{String(t.status).replace(/_/g,' ')}</small></div><div className="wallet-pending-row-actions"><button className="wallet-secondary-btn" onClick={()=>onCancelPending(t)}>Cancel</button><button className="wallet-submit" onClick={()=>onRetryPending(t)}>Retry <RefreshCw size={15}/></button></div></div>)}</div><div className="wallet-pending-actions"><button className="wallet-secondary-btn" onClick={onClose}>Cancel</button>{modal.pending.length<3&&<button className="wallet-submit" onClick={onContinueAdd}>Continue to Add Money <ArrowRight size={15}/></button>}</div>{modal.pending.length>=3&&<p className="wallet-pending-block-note">New top-ups are blocked while 3 or more payments are pending. Resolve an existing payment first.</p>}</div></div>;
if(type==='add')return <div className="wallet-modal-layer"><div className="wallet-modal wallet-add-select-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><img className="wallet-modal-logo" src={LOGO_URL} alt="Trusted Circle"/><span className="wallet-services-eyebrow">ADD MONEY</span><h2>Choose an amount</h2><p>Select a quick amount or enter a custom amount to pay through UPI.</p><div className="wallet-denoms">{[500,1000,1500,2000].map(a=><button className={!manual&&Number(amount)===a?'selected':''} key={a} onClick={()=>{setAmount(String(a));setManual(false)}}>₹{money(a)}</button>)}</div><label className="wallet-custom-label">Custom amount (₹)</label><input className="wallet-field wallet-custom-amount" type="number" min="1" step="0.01" value={manual?amount:''} placeholder="Enter any amount" onChange={e=>{setAmount(e.target.value);setManual(true)}}/><div className="wallet-add-hint">{manual?'Custom amount uses UPI with your editable payment note.':'Quick amounts use an available payment link from Trusted Circle stock.'}</div>{manual&&desktopUPI&&<div className="wallet-custom-mobile-warning"><Smartphone size={17}/><span><b>Mobile required for custom UPI</b><small>Custom amount UPI links open in mobile UPI apps only. Please use Trusted Circle on your mobile to add a custom amount.</small></span></div>}{manual&&<><label className="wallet-custom-label">UPI payment note</label><input className="wallet-field" maxLength="80" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="TC-Wallet"/></>}{error&&<div className="wallet-login-message">{error}</div>}<button className="wallet-submit add-money-primary" disabled={!Number(amount)||Number(amount)<=0||busy||(manual&&desktopUPI)} onClick={()=>{if(!Number(amount)||Number(amount)<=0){setError('Enter a valid amount.');return}onSelectAdd(Number(amount),{manualUPI:manual,notes:notes.trim()||'Verified'})}}>Review Payment <ArrowRight size={17}/></button></div></div>;
 if(type==='add-summary')return <div className="wallet-modal-layer"><div className="wallet-modal wallet-add-summary-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><div className="wallet-summary-icon"><WalletCards size={28}/></div><span className="wallet-services-eyebrow">PAYMENT SUMMARY</span><h2>Confirm Add Money</h2><p>Review your wallet top-up before creating the payment request.</p><div className="wallet-add-summary-amount"><span>Amount to add</span><strong>₹{money(modal.amount)}</strong></div><div className="wallet-add-summary-row"><span>Destination</span><b>Trusted Circle Money Wallet</b></div><div className="wallet-add-summary-row"><span>Payment method</span><b>{modal.manualUPI?'UPI payment request':'Secure payment link from stock'}</b></div>{modal.manualUPI&&<div className="wallet-add-summary-row"><span>UPI note</span><b>{modal.notes||'Verified'}</b></div>}<div className="wallet-add-summary-safe"><CheckCircle2 size={17}/><span>Your balance updates only after the admin confirms receipt.</span></div><button className="wallet-submit add-money-primary" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await onAdd(Number(modal.amount),{manualUPI:!!modal.manualUPI,notes:modal.notes||'TC-Wallet'})}catch(e){setError(e.message||'Could not start payment.')}finally{setBusy(false)}}}>{busy?<><RefreshCw size={16} className="wallet-spin"/> Preparing payment…</>:<>Make Payment <ArrowRight size={17}/></>}</button>{error&&<div className="wallet-login-message">{error}</div>}<button className="wallet-secondary-btn" onClick={()=>onEditAdd(modal.amount,{manualUPI:!!modal.manualUPI,notes:modal.notes||'TC-Wallet'})}>Edit Amount</button></div></div>;
 if(type==='withdraw')return <WithdrawModal onClose={onClose} onSubmit={onWithdraw} cashbackBalance={Number(modal.cashbackBalance||0)} moneyBalance={Number(modal.moneyBalance||0)}/>;
 if(type==='orders')return <div className="wallet-modal-layer"><div className="wallet-modal wallet-orders-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><span className="wallet-services-eyebrow">WALLET ORDERS</span><h2>All Transactions</h2><div className="wallet-order-list">{orders.map(t=><button key={t.transactionId} onClick={()=>{onClose();setSelectedTx(t)}} className="wallet-transaction"><span className="wallet-tx-main"><b>{t.type==='ADD_MONEY'?'Add Money':'Withdraw'}</b><small>{t.transactionId}</small></span><span className="wallet-tx-right"><b>₹{money(t.amount)}</b><small className={'wallet-status '+statusClass(t.status)}>{t.status.replace(/_/g,' ')}</small></span></button>)}</div></div></div>;
 return <PaymentWaiting identity={identity} user={modal.user} tx={modal.transaction} amount={modal.amount} error={modal.error} expiresAt={modal.expiresAt} phase={modal.phase} adminEmailSent={modal.adminEmailSent} paymentLink={modal.paymentLink} paymentOpened={modal.paymentOpened} onClose={onClose} onRetry={onRetry} onOpenOrders={onOpenOrders} onViewBalance={onViewBalance}/>
}

function WithdrawModal({onClose,onSubmit,cashbackBalance=0,moneyBalance=0}){const[amount,setAmount]=useState(''),[upi,setUpi]=useState(''),[account,setAccount]=useState('MONEY_WALLET'),[busy,setBusy]=useState(false),[error,setError]=useState('');const activeBalance=account==='CASHBACK_WALLET'?cashbackBalance:moneyBalance;return <div className="wallet-modal-layer"><div className="wallet-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><span className="wallet-services-eyebrow">WITHDRAW</span><h2>Withdraw to UPI</h2><label>Withdraw From</label><select className="wallet-field" value={account} onChange={e=>{setAccount(e.target.value);setAmount('');setError('')}}><option value="MONEY_WALLET">Money Wallet · Available ₹{money(moneyBalance)}</option><option value="CASHBACK_WALLET">Cashback Wallet · Available ₹{money(cashbackBalance)}</option></select><div className="wallet-withdraw-balance">Available to withdraw <b>₹{money(activeBalance)}</b></div><label>Amount</label><input className="wallet-field" type="number" min="1" max={activeBalance} step="0.01" value={amount} onChange={e=>{setAmount(e.target.value);setError(Number(e.target.value)>activeBalance?'Amount exceeds the selected wallet balance.':'')}} placeholder="Enter withdrawal amount"/><label>UPI ID</label><input className="wallet-field" value={upi} onChange={e=>setUpi(e.target.value)} placeholder="name@upi"/>{error&&<div className="wallet-login-message">{error}</div>}<button className="wallet-submit" disabled={busy||!amount||Number(amount)<=0||Number(amount)>activeBalance||!upi.trim()} onClick={async()=>{setBusy(true);setError('');try{await onSubmit(Number(amount),upi.trim(),account)}catch(e){setError(e.message)}finally{setBusy(false)}}}>{busy?'Submitting…':'Request Withdrawal'} <ArrowRight size={17}/></button></div></div>}

function PaymentWaiting({identity,user,tx,expiresAt,onClose,onRetry,onOpenOrders,onViewBalance,phase,adminEmailSent,amount,error,paymentLink,paymentOpened}){
 const initialSeconds=expiresAt?Math.max(0,Math.floor((new Date(expiresAt)-Date.now())/1000)):900;
 const[left,setLeft]=useState(initialSeconds),[result,setResult]=useState(null),[liveTx,setLiveTx]=useState(tx);
 useEffect(()=>{
   if(result||phase!=='verifying'||!liveTx?.transactionId||liveTx.transactionId==='CREATING…')return;
   let active=true;
   const check=async()=>{
     try{
       const d=await walletApi.transactionStatus(identity,liveTx.transactionId);
       const next=d?.transaction;
       if(!active||!next)return;
       setLiveTx(next);
       setLeft(expiresAt?Math.max(0,Math.floor((new Date(expiresAt)-Date.now())/1000)):900);
       if(['COMPLETED','NOT_RECEIVED','REJECTED'].includes(String(next.status||'').toUpperCase()))setResult(next);
     }catch{}
   };
   check();
   const timer=setInterval(check,1000)
   return()=>{active=false;clearInterval(timer)};
 },[user,liveTx?.transactionId,expiresAt,phase,result?.status]);
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
     <div className="wallet-loading-ring wallet-brand-loading"><img src={LOGO_URL} alt="Trusted Circle loading"/></div>
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
     <div className={'wallet-result-icon '+(success?'success wallet-wallet-success-icon':'failed')}>{success?<CheckCircle2 size={42}/>:<X size={42}/>}</div>
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
  const openPaymentLink=()=>{try{const isMobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||window.matchMedia('(max-width: 767px)').matches;if(/^upi:\/\//i.test(paymentLink)){window.location.href=paymentLink;return}const opened=window.open(paymentLink,'TrustedCircleWalletPayment',isMobile?'_blank':'TrustedCircleWalletPayment,width=520,height=760,resizable=yes,scrollbars=yes');if(!opened)window.location.href=paymentLink}catch{window.location.href=paymentLink}};
  return <div className="wallet-modal-layer"><div className="wallet-modal wallet-status-compact" role="status" aria-live="polite"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><span className="wallet-services-eyebrow">ADD MONEY · LIVE STATUS</span><h2>Checking Payment Status</h2><div className="wallet-status-horizontal"><div><small>AMOUNT</small><strong>₹{money(liveTx?.amount||amount)}</strong></div><div><small>PAYMENT STATUS</small><strong className={'live-status '+(String(liveTx?.status||'').toUpperCase()==='COMPLETED'?'success':'pending')}>{currentStatus}</strong></div></div><div className="wallet-progress"><span className="wallet-progress-indeterminate"/></div><p>We’re checking your payment status automatically. Your wallet balance updates after confirmation.</p>{paymentLink&&<div className="wallet-payment-link-panel"><span>Payment link ready</span><button type="button" onClick={openPaymentLink}><ArrowRight size={16}/> {/^upi:\/\//i.test(paymentLink)?'Choose UPI App':'Open Payment Link'}</button><small>{/^upi:\/\//i.test(paymentLink)?'Tap once to open Android’s available UPI apps.':'Tap once to open the secure payment page.'}</small></div>}</div></div>
}
function StatementModal({transactions,user,wallet,onClose}){
 const[account,setAccount]=useState('all'),[range,setRange]=useState('monthly'),[month,setMonth]=useState(String(new Date().getMonth()+1)),[year,setYear]=useState(String(new Date().getFullYear())),[fy,setFy]=useState('2025-26'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[fileType,setFileType]=useState('PDF'),[status,setStatus]=useState('all'),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const resolveRange=()=>{if(range==='monthly'){const y=Number(year),m=Number(month);return{from:new Date(y,m-1,1),to:new Date(y,m,0,23,59,59,999)}}if(range==='yearly'){const y=Number(fy.slice(0,4));return{from:new Date(y,3,1),to:new Date(y+1,2,31,23,59,59,999)}}if(!from||!to)throw new Error('Select both From Date and Till Date.');return{from:new Date(from+'T00:00:00'),to:new Date(to+'T23:59:59.999')}}
 const isCashback=t=>t.source==='CASHBACK'||t.type==='CASHBACK_EARNED'||t.type==='REDEMPTION_REQUEST'
 const exportExcel=(rows,startDate,endDate)=>{const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');const body=rows.map((t,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(t.transactionId)+'</td><td>'+esc(isCashback(t)?'Cashback Wallet':'Money Wallet')+'</td><td>'+esc(t.type)+'</td><td>'+esc(new Date(t.createdAt).toLocaleString('en-IN'))+'</td><td>'+esc(t.status)+'</td><td class="num">'+Number(t.amount||0).toFixed(2)+'</td><td>'+esc(t.upiId||'')+'</td></tr>').join('');const html='<html><head><meta charset="utf-8"></head><body><table><thead><tr><th colspan="8" style="font-size:18px;background:#173c2a;color:#fff;height:32px">TRUSTED CIRCLE — WALLET STATEMENT</th></tr><tr><th colspan="8" style="background:#e7f4eb">Account: '+esc(account==='all'?'All Accounts':account==='cashback'?'Cashback Wallet':'Money Wallet')+' | Period: '+esc(startDate.toLocaleDateString('en-IN'))+' to '+esc(endDate.toLocaleDateString('en-IN'))+' | User: '+esc(user.name||user.email)+'</th></tr><tr style="background:#dce9e1"><th>S.No.</th><th>Transaction ID</th><th>Account Type</th><th>Transaction</th><th>Date &amp; Time</th><th>Status</th><th>Amount (INR)</th><th>UPI ID</th></tr></thead><tbody>'+body+'</tbody><tfoot><tr style="font-weight:bold;background:#e7f4eb"><td colspan="6">Total Transactions: '+rows.length+'</td><td class="num">'+rows.reduce((n,t)=>n+Number(t.amount||0),0).toFixed(2)+'</td><td></td></tr></tfoot></table><style>body{font-family:Arial;color:#18241e}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cddbd2;padding:8px;text-align:left}th{font-weight:bold}.num{text-align:right;mso-number-format:"#,##0.00"}</style></body></html>';const blob=new Blob(['\ufeff',html],{type:'application/vnd.ms-excel;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='trusted-circle-wallet-statement.xls';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}
 const download=async()=>{setError('');setBusy(true);try{const{from:startDate,to:endDate}=resolveRange();if(startDate>endDate)throw new Error('Start date cannot be after end date.');let data=transactions.filter(t=>{const d=new Date(t.createdAt);return d>=startDate&&d<=endDate});if(account==='cashback')data=data.filter(isCashback);else if(account==='money')data=data.filter(t=>!isCashback(t));if(status==='success')data=data.filter(t=>String(t.status||'').toUpperCase()==='COMPLETED');if(status==='pending')data=data.filter(t=>['PENDING_PAYMENT','WITHDRAWAL_REQUESTED','RETRY_CREATED','CREATING_PAYMENT'].includes(String(t.status||'').toUpperCase()));if(!data.length)throw new Error('No transactions found for the selected account, status and period.');if(fileType==='Excel')exportExcel(data,startDate,endDate);else await saveTransactionsPdf(data,user,wallet,startDate.toISOString().slice(0,10),endDate.toISOString().slice(0,10));onClose()}catch(e){setError(e.message||'Could not create the statement.')}finally{setBusy(false)}}
 return <div className="wallet-modal-layer"><div className="wallet-modal wallet-statement-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><img className="wallet-modal-logo" src={LOGO_URL} alt="Trusted Circle"/><span className="wallet-services-eyebrow">DOWNLOAD STATEMENT</span><h2>Export Wallet Statement</h2><label className="wallet-custom-label">Account Type</label><select className="wallet-field" value={account} onChange={e=>setAccount(e.target.value)}><option value="all">All Accounts</option><option value="cashback">Cashback Wallet</option><option value="money">Money Wallet</option></select><label className="wallet-custom-label">Date Range</label><div className="wallet-statement-type">{[['monthly','Monthly'],['yearly','Financial Year'],['custom','Custom']].map(([v,l])=><button key={v} className={range===v?'selected':''} onClick={()=>setRange(v)}>{l}</button>)}</div>{range==='monthly'&&<div className="wallet-date-grid"><div><label>Month</label><select className="wallet-field" value={month} onChange={e=>setMonth(e.target.value)}>{Array.from({length:12},(_,i)=><option key={i} value={i+1}>{new Date(2000,i,1).toLocaleString('en-IN',{month:'long'})}</option>)}</select></div><div><label>Year</label><select className="wallet-field" value={year} onChange={e=>setYear(e.target.value)}>{Array.from({length:8},(_,i)=>new Date().getFullYear()-5+i).map(y=><option key={y}>{y}</option>)}</select></div></div>}{range==='yearly'&&<div><label>Financial Year (1 April – 31 March)</label><select className="wallet-field" value={fy} onChange={e=>setFy(e.target.value)}>{Array.from({length:8},(_,i)=>{const y=new Date().getFullYear()-5+i;return <option key={y} value={y+'-'+String(y+1).slice(-2)}>{y+'-'+String(y+1).slice(-2)+' (1 Apr '+y+' – 31 Mar '+(y+1)+')'}</option>})}</select></div>}{range==='custom'&&<div className="wallet-date-grid"><div><label>From Date</label><input className="wallet-field" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></div><div><label>Till Date</label><input className="wallet-field" type="date" value={to} onChange={e=>setTo(e.target.value)}/></div></div>}<label className="wallet-custom-label">Transaction Status</label><select className="wallet-field" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All Statuses</option><option value="success">Success</option><option value="pending">Pending</option></select><label className="wallet-custom-label">File Type</label><div className="wallet-statement-type">{['PDF','Excel'].map(v=><button key={v} className={fileType===v?'selected':''} onClick={()=>setFileType(v)}>{v==='Excel'?'Excel (.xls)':'PDF'}</button>)}</div>{error&&<div className="wallet-login-message wallet-error">{error}</div>}<button className="wallet-submit" disabled={busy} onClick={download}>{busy?'Preparing statement…':<> <ArrowDownToLine size={16}/> Download {fileType}</>}</button></div></div>
}
function TransactionModal({tx,user,wallet,onClose,onRetry}){
 const download=()=>saveTransactionPdf(tx,user,wallet,'trusted-circle-'+tx.transactionId+'.pdf')
 return <div className="wallet-modal-layer"><div className="wallet-modal"><button className="wallet-modal-x" onClick={onClose}><X size={18}/></button><img className="wallet-modal-logo" src={LOGO_URL} alt="Trusted Circle"/><span className="wallet-services-eyebrow">TRANSACTION DETAILS</span><h2>{tx.type==='ADD_MONEY'?'Add Money':tx.type==='CASHBACK_EARNED'?'Cashback Earned':'Withdrawal'}</h2><div className="wallet-detail-amount">₹{money(tx.amount)}</div><div className={'wallet-detail-status '+statusClass(tx.status)}>{tx.status.replace(/_/g,' ')}</div><div className="wallet-detail-grid"><span>Transaction ID</span><b>{tx.transactionId}</b><span>Date</span><b>{new Date(tx.createdAt).toLocaleString('en-IN')}</b><span>Balance Before</span><b>₹{money(tx.balanceBefore)}</b><span>Balance After</span><b>₹{money(tx.balanceAfter)}</b>{tx.upiId&&<><span>UPI ID</span><b>{tx.upiId}</b></>}</div><div className="wallet-detail-actions"><button className="wallet-submit" onClick={download}><ArrowDownToLine size={16}/> Download PDF</button>{tx.status==='NOT_RECEIVED'&&<button className="wallet-secondary-btn" onClick={()=>onRetry(tx)}>Retry Payment <RefreshCw size={16}/></button>}</div><button className="wallet-change-email" onClick={onClose}>Close</button></div></div>
}

export default function WalletServicesPage({shoppingToken='',shoppingUser=null,onShoppingLogout}){
 useEffect(()=>{document.body.classList.add('wallet-services-lock');return()=>document.body.classList.remove('wallet-services-lock')},[])
 if(!shoppingUser)return <main className="wallet-services-page"><section className="wallet-empty" style={{maxWidth:640,margin:'60px auto'}}>Trusted Circle account details are required to open Wallet Services.</section></main>
 const walletIdentity={email:String(shoppingUser.email||shoppingUser.Email||'').trim().toLowerCase(),userId:String(shoppingUser.userId||shoppingUser.UserID||shoppingUser.id||shoppingUser.ID||'').trim()};
 return <WalletHome user={shoppingUser} identity={walletIdentity} onLogout={()=>onShoppingLogout?.()} initialWallet={null} shoppingToken={shoppingToken}/>
}
