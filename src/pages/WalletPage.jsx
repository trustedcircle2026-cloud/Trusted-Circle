import { useEffect,useState } from 'react'
import { ArrowLeft,ArrowRight,CheckCircle2,History,WalletCards,Plus,Minus,ShieldCheck,ExternalLink,Clock3,ChevronRight,ReceiptText,Landmark,Sparkles,LockKeyhole,RefreshCw } from 'lucide-react'
import { api } from '../api'
import { walletApi } from '../wallet-services-api'
import '../wallet.css'

const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const date=v=>v?new Date(v).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'

export default function WalletPage({token,onBack}){
 const [data,setData]=useState({wallet:{balance:0,cashbackBalance:0,totalBalance:0,totalEarned:0,totalRedeemed:0},transactions:[]})
 const [shopping,setShopping]=useState({balance:0,cashback:0,total:0,totalEarned:0,totalRedeemed:0,transactions:[]})
 const [view,setView]=useState('wallet')
 const [addAmounts,setAddAmounts]=useState([500,1000,1500,2000]),[showAdd,setShowAdd]=useState(false),[showGateway,setShowGateway]=useState(false),[showPaymentPreparing,setShowPaymentPreparing]=useState(false),[showWithdraw,setShowWithdraw]=useState(false),[selectedAmount,setSelectedAmount]=useState(500),[gateway,setGateway]=useState(null),[paymentProgress,setPaymentProgress]=useState(0),[paymentStep,setPaymentStep]=useState('Preparing your payment request…'),[paymentError,setPaymentError]=useState(''),[amount,setAmount]=useState(''),[upiId,setUpiId]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)

 const loadWallet=async()=>{
  try{
   const next=await walletApi.wallet(token),txs=next?.transactions||[]
   const added=txs.filter(x=>x.type==='ADD_MONEY'&&x.status==='COMPLETED').reduce((s,x)=>s+Number(x.amount||0),0)
   const withdrawn=txs.filter(x=>x.type==='WITHDRAW'&&x.status==='WITHDRAWAL_COMPLETED').reduce((s,x)=>s+Number(x.amount||0),0)
   setData({wallet:{balance:Number(next?.balance||0),cashbackBalance:Number(next?.cashbackBalance||0),totalBalance:Number(next?.totalBalance||0),totalEarned:added,totalRedeemed:withdrawn},transactions:txs})
   setAddAmounts(Array.isArray(next?.addAmounts)&&next.addAmounts.length===4?next.addAmounts.map(Number):[500,1000,1500,2000])
  }catch(error){setMessage(error.message||'Unable to load Wallet Services.')}
 }
 const loadShopping=async()=>{
  try{
   const next=await api.wallet(token)
   const rawTx=Array.isArray(next?.transactions)?next.transactions:Array.isArray(next?.wallet?.transactions)?next.wallet.transactions:[]
   const balance=Number(next?.balance??next?.walletBalance??next?.wallet?.balance??0)
   setShopping({balance:0,cashback:balance,total:balance,transactions:rawTx,totalEarned:Number(next?.wallet?.totalEarned||0),totalRedeemed:Number(next?.wallet?.totalRedeemed||0)})
  }catch(error){console.warn('Shopping wallet unavailable',error)}
 }
 const load=async()=>{await Promise.all([loadWallet(),loadShopping()])}
 useEffect(()=>{load()},[token])

 const startAddMoney=async()=>{
  setMessage('');setPaymentError('');setBusy(true);setShowPaymentPreparing(true);setPaymentProgress(12);setPaymentStep('Finding a secure payment link for '+money(selectedAmount)+'…')
  let popup=null
  try{
   setPaymentProgress(28)
   const gatewayCheck=await walletApi.walletGateway(token,selectedAmount)
   const gatewayData=gatewayCheck?.data&&typeof gatewayCheck.data==='object'?gatewayCheck.data:gatewayCheck
   const gatewayLink=gatewayData?.paymentLink||gatewayData?.PaymentLink||''
   setPaymentProgress(48);setPaymentStep('Creating your Wallet transaction…')
   const result=await walletApi.addMoney(token,selectedAmount)
   const resultData=result?.data&&typeof result.data==='object'?result.data:result
   const tx=resultData?.transaction||resultData?.Transaction||null
   const link=resultData?.paymentLink||resultData?.PaymentLink||tx?.PaymentLink||tx?.paymentLink||gatewayLink
   const expiresAt=resultData?.expiresAt||resultData?.ExpiresAt||tx?.ExpiresAt||''
   const transactionId=tx?.transactionId||tx?.TransactionID||resultData?.transactionId||resultData?.TransactionID
   if(!link)throw new Error('The Wallet backend did not return a payment link. Please redeploy the latest Wallet Apps Script and try again.')
   if(!transactionId)throw new Error('Payment transaction could not be created.')
   setGateway({amount:selectedAmount,paymentLink:link,expiresAt,transaction:tx})
   setPaymentProgress(82);setPaymentStep('Secure payment link received. Opening Wallet payment page…')
   await new Promise(resolve=>setTimeout(resolve,500))
   setPaymentProgress(100)
   setShowPaymentPreparing(false);setShowAdd(false);setShowGateway(false)
   // Always use the dedicated Wallet Payment Page. It loads the transaction
   // from Wallet Services, displays the assigned gateway, and polls payment
   // verification. This avoids popup blockers and keeps the payment flow
   // connected to the transaction record.
   window.location.hash='#/wallet-payment/'+encodeURIComponent(transactionId)
  }catch(error){
   if(popup&&!popup.closed)popup.close()
   setPaymentError(error.message||'Unable to create the payment request.')
   setPaymentStep('Payment could not be prepared.')
   setPaymentProgress(100)
  }finally{setBusy(false)}
 }

 const withdraw=async e=>{
  e.preventDefault();setMessage('');setBusy(true)
  try{
   await walletApi.withdraw(token,Number(amount),upiId)
   setMessage('Withdrawal request received.');setAmount('');setUpiId('');setShowWithdraw(false)
   await loadWallet();window.dispatchEvent(new CustomEvent('tc:wallet-updated'))
  }catch(error){setMessage(error.message||'Unable to process withdrawal request.')}finally{setBusy(false)}
 }

 const active=view==='wallet'
 const txs=active?data.transactions:shopping.transactions
 const txTitle=active?'Wallet Services activity':'Shopping activity'
 const txLabel=tx=>active?(tx.type==='ADD_MONEY'?'Money added':tx.type==='WITHDRAW'?'Money withdrawn':String(tx.type||'Wallet transaction').replace(/_/g,' ')):(tx.description||tx.type||'Shopping transaction')
 const txAmount=tx=>Number(tx.amount??tx.Amount??0)
 const txStatus=tx=>String(tx.status||'').replace(/_/g,' ').toLowerCase()
 const total=active?data.wallet.totalBalance:shopping.cashback

 return <main className="page-shell wallet-page wallet-modern">
  <header className="wallet-topbar">
   <div className="wallet-topbar-left">
    <button className="wallet-back-button" onClick={onBack}><ArrowLeft size={16}/><span>Back</span></button>
    <div className="wallet-brand-mark"><WalletCards size={18}/></div>
    <div><strong>Trusted Circle</strong><span>Wallet Services</span></div>
   </div>
   <div className="wallet-topbar-right"><span className="wallet-secure-pill"><LockKeyhole size={13}/> Secure account</span><button className="wallet-refresh" onClick={load}><RefreshCw size={15}/></button></div>
  </header>

  <section className="wallet-intro">
   <div>
    <span className="eyebrow">PERSONAL FINANCE</span>
    <h1>{active?'Your money, organised.':'Your shopping rewards.'}</h1>
    <p>{active?'A cleaner view of your Wallet balance, payments and withdrawals.':'Your Shopping cashback stays separate from Wallet Services funds.'}</p>
   </div>
   <div className="wallet-account-chip"><span className="wallet-account-dot"/><div><strong>Account active</strong><small>Trusted Circle member</small></div></div>
  </section>

  <div className="wallet-modern-switch" role="tablist">
   <button className={active?'active':''} onClick={()=>setView('wallet')}><Landmark size={17}/><span><b>Wallet Services</b><small>Cash & payments</small></span><ChevronRight size={15}/></button>
   <button className={!active?'active':''} onClick={()=>setView('shopping')}><Sparkles size={17}/><span><b>Shopping Wallet</b><small>Cashback & rewards</small></span><ChevronRight size={15}/></button>
  </div>

  {active?
   <section className="wallet-command-grid">
    <div className="wallet-balance-card">
     <div className="wallet-card-top"><span>AVAILABLE TOTAL</span><span className="wallet-card-live"><i/> LIVE</span></div>
     <strong>{money(data.wallet.totalBalance)}</strong>
     <p>Wallet + Cashback</p>
     <div className="wallet-card-breakdown">
      <div><span>Wallet</span><b>{money(data.wallet.balance)}</b></div>
      <div><span>Cashback</span><b>{money(data.wallet.cashbackBalance)}</b></div>
     </div>
     <div className="wallet-card-number">TC •••• •••• •••• 2026</div>
    </div>
    <div className="wallet-quick-actions">
     <div className="wallet-section-kicker">QUICK ACTIONS</div>
     <button className="wallet-action-primary" onClick={()=>{setSelectedAmount(500);setShowAdd(true)}}><span className="action-icon"><Plus size={18}/></span><span><b>Add money</b><small>Top up your Wallet balance</small></span><ArrowRight size={16}/></button>
     <button className="wallet-action-secondary" onClick={()=>{setAmount('');setUpiId('');setShowWithdraw(true)}} disabled={Number(data.wallet.balance)<=0}><span className="action-icon"><Minus size={18}/></span><span><b>Withdraw</b><small>Transfer Wallet funds to UPI</small></span><ArrowRight size={16}/></button>
     <div className="wallet-action-note"><ShieldCheck size={15}/><span>Every payment is linked to a Wallet transaction and reviewed securely.</span></div>
    </div>
   </section>
   :
   <section className="wallet-command-grid shopping-command">
    <div className="wallet-balance-card shopping-balance-card">
     <div className="wallet-card-top"><span>SHOPPING CASHBACK</span><span className="wallet-card-live"><i/> SEPARATE</span></div>
     <strong>{money(shopping.cashback)}</strong>
     <p>Earned from Shopping</p>
     <div className="wallet-card-breakdown">
      <div><span>Total earned</span><b>{money(shopping.totalEarned)}</b></div>
      <div><span>Total redeemed</span><b>{money(shopping.totalRedeemed)}</b></div>
     </div>
     <div className="wallet-card-number">REWARDS • TRUSTED CIRCLE</div>
    </div>
    <div className="wallet-reward-panel">
     <div className="wallet-section-kicker">REWARD ACCOUNT</div>
     <div className="wallet-reward-icon"><Sparkles size={21}/></div>
     <h2>Shopping cashback is protected.</h2>
     <p>Your voucher and order rewards are kept separate, so adding or withdrawing Wallet Services money never changes your Shopping cashback.</p>
     <div className="wallet-reward-line"><CheckCircle2 size={15}/> Separate accounting</div>
    </div>
   </section>
  }

  <section className="wallet-activity">
   <div className="wallet-activity-head">
    <div><span className="eyebrow">{active?'WALLET SERVICES':'SHOPPING'}</span><h2>{txTitle}</h2></div>
    <span className="wallet-activity-count">{txs.length} {txs.length===1?'entry':'entries'}</span>
   </div>
   {txs.length?
    <div className="wallet-timeline">
     {txs.map((tx,index)=>{
      const n=txAmount(tx)
      return <article className="wallet-timeline-row" key={String(tx.createdAt||tx.CreatedAt||'')+'-'+index}>
       <div className={n>=0?'timeline-icon credit':'timeline-icon debit'}>{n>=0?<Plus size={16}/>:<Minus size={16}/>}</div>
       <div className="timeline-copy"><strong>{txLabel(tx)}</strong><span>{tx.notes||tx.Note||txStatus(tx)||'Transaction'}</span><small>{date(tx.createdAt||tx.CreatedAt)}</small></div>
       <div className="timeline-value"><b className={n>=0?'credit':'debit'}>{n>=0?'+':'−'}{money(Math.abs(n))}</b><small>{String(tx.status||'').replace(/_/g,' ')}</small></div>
      </article>
     })}
    </div>
    :
    <div className="wallet-empty-modern"><div><ReceiptText size={22}/></div><h3>No activity yet</h3><p>Your {active?'Wallet Services':'Shopping'} transactions will appear here.</p></div>
   }
  </section>

  {message&&<div className="wallet-toast"><CheckCircle2 size={16}/><span>{message}</span></div>}

  {showAdd&&<div className="wallet-overlay wallet-overlay-light" onMouseDown={e=>e.target===e.currentTarget&&setShowAdd(false)}>
   <div className="wallet-choice-panel">
    <div className="wallet-panel-head"><div><span className="eyebrow">ADD MONEY</span><h2>Choose your top-up.</h2><p>Select a denomination and we’ll reserve the matching secure payment link.</p></div><button onClick={()=>setShowAdd(false)}>×</button></div>
    <div className="wallet-denominations-modern">{addAmounts.map(v=><button key={v} className={selectedAmount===v?'selected':''} onClick={()=>setSelectedAmount(v)}><strong>{money(v)}</strong><span>Secure payment</span>{selectedAmount===v&&<CheckCircle2 size={16}/>}</button>)}</div>
    <div className="wallet-panel-security"><LockKeyhole size={16}/><div><b>Protected checkout</b><span>Payment links are supplied by Wallet Services and tied to this transaction.</span></div></div>
    <div className="wallet-panel-actions"><button className="wallet-button-ghost" onClick={()=>setShowAdd(false)}>Cancel</button><button className="wallet-button-primary" onClick={startAddMoney} disabled={busy}>{busy?'Preparing…':'Continue'} <ArrowRight size={16}/></button></div>
   </div>
  </div>}

  {showPaymentPreparing&&<div className="wallet-overlay wallet-payment-overlay">
   <div className="wallet-handoff-panel">
    <div className="wallet-handoff-top"><div className="wallet-handoff-brand"><div className="wallet-brand-mark"><WalletCards size={17}/></div><div><b>Trusted Circle</b><small>Secure payment handoff</small></div></div><span className="wallet-handoff-amount">{money(selectedAmount)}</span></div>
    <div className={paymentError?'wallet-handoff-status error':'wallet-handoff-status'}>
     <div className="wallet-handoff-orb">{paymentError?<span>!</span>:<div className="wallet-spinner"/>}</div>
     <span className="eyebrow">{paymentError?'PAYMENT BLOCKED':'SECURE CHECKOUT'}</span>
     <h2>{paymentError?'We couldn’t open checkout.':'Setting up your payment.'}</h2>
     <p>{paymentError?'The payment link was not returned by Wallet Services. Your balance has not been changed.':paymentStep}</p>
    </div>
    {!paymentError&&<div className="wallet-handoff-steps">
     <div className={paymentProgress>=28?'done':''}><span>01</span><b>Find gateway</b><small>Matching denomination</small></div>
     <div className={paymentProgress>=48?'done':''}><span>02</span><b>Create transaction</b><small>Secure reservation</small></div>
     <div className={paymentProgress>=82?'done':''}><span>03</span><b>Open checkout</b><small>Ready to pay</small></div>
    </div>}
    {!paymentError&&<div className="wallet-handoff-progress"><span style={{width:paymentProgress+'%'}}/></div>}
    {paymentError&&<div className="wallet-handoff-error"><strong>What happened?</strong><span>{paymentError}</span></div>}
    <div className="wallet-handoff-footer">
     {paymentError?<><button className="wallet-button-ghost" onClick={()=>{setShowPaymentPreparing(false);setPaymentError('')}}>Close</button><button className="wallet-button-primary" onClick={startAddMoney} disabled={busy}>Try again <ArrowRight size={15}/></button></>:<span><LockKeyhole size={13}/> No balance is credited until payment is verified.</span>}
    </div>
   </div>
  </div>}

  {showGateway&&gateway&&<div className="wallet-overlay wallet-overlay-light" onMouseDown={e=>e.target===e.currentTarget&&setShowGateway(false)}>
   <div className="wallet-gateway-new">
    <div className="wallet-panel-head"><div><span className="eyebrow">SECURE PAYMENT</span><h2>Checkout is ready.</h2><p>Complete payment for {money(gateway.amount)} using the reserved gateway.</p></div><button onClick={()=>setShowGateway(false)}>×</button></div>
    <div className="wallet-ready-card"><div className="wallet-ready-icon"><CheckCircle2 size={22}/></div><div><span>AMOUNT</span><strong>{money(gateway.amount)}</strong><small>Transaction {gateway.transaction?.TransactionID||gateway.transaction?.transactionId||'created'}</small></div><b>READY</b></div>
    <div className="wallet-panel-security"><ShieldCheck size={16}/><div><b>Verification after payment</b><span>Complete the gateway payment, then Wallet Admin will verify and credit the balance.</span></div></div>
    {gateway.expiresAt&&<div className="wallet-expiry-new"><Clock3 size={14}/> Reserved until {date(gateway.expiresAt)}</div>}
    <a className="wallet-button-primary wallet-gateway-new-open" href={gateway.paymentLink} target="_blank" rel="noopener noreferrer">Open secure checkout <ExternalLink size={15}/></a>
    <button className="wallet-done-link" onClick={()=>{setShowGateway(false);loadWallet()}}>I’ve completed payment</button>
   </div>
  </div>}

  {showWithdraw&&<div className="wallet-overlay wallet-overlay-light"><div className="wallet-withdraw-new">
   <div className="wallet-panel-head"><div><span className="eyebrow">WITHDRAW</span><h2>Move money to UPI.</h2><p>Available Wallet balance: <strong>{money(data.wallet.balance)}</strong></p></div><button onClick={()=>setShowWithdraw(false)}>×</button></div>
   <form onSubmit={withdraw} className="wallet-withdraw-form">
    <label>Amount<input type="number" min="1" max={Number(data.wallet.balance)} step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" required/></label>
    <label>UPI ID<input value={upiId} onChange={e=>setUpiId(e.target.value)} placeholder="name@bank" required/></label>
    <div className="wallet-panel-security"><ShieldCheck size={16}/><div><b>Secure withdrawal request</b><span>Trusted Circle will review and process the transfer.</span></div></div>
    <div className="wallet-panel-actions"><button type="button" className="wallet-button-ghost" onClick={()=>setShowWithdraw(false)}>Cancel</button><button type="submit" className="wallet-button-primary" disabled={busy}>{busy?'Submitting…':'Request withdrawal'} <ArrowRight size={15}/></button></div>
   </form>
  </div></div>}
 </main>
}
