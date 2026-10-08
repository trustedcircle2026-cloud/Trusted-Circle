import { useEffect,useState } from 'react'
import { ArrowLeft,ArrowRight,CheckCircle2,History,WalletCards,Plus,Minus,ShieldCheck,ExternalLink,Clock3 } from 'lucide-react'
import { api } from '../api'
import { walletApi } from '../wallet-services-api'
import '../wallet.css'
const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const date=v=>v?new Date(v).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'
export default function WalletPage({token,onBack}){
 const [data,setData]=useState({wallet:{balance:0,cashbackBalance:0,totalBalance:0,totalEarned:0,totalRedeemed:0},transactions:[]})
 const [shopping,setShopping]=useState({balance:0,cashback:0,total:0,transactions:[]})
 const [view,setView]=useState('wallet')
 const [addAmounts,setAddAmounts]=useState([500,1000,1500,2000]),[showAdd,setShowAdd]=useState(false),[showGateway,setShowGateway]=useState(false),[selectedAmount,setSelectedAmount]=useState(500),[gateway,setGateway]=useState(null),[amount,setAmount]=useState(''),[upiId,setUpiId]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)

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
   const cashback=Number(next?.cashbackBalance??next?.cashback??next?.availableCashback??next?.wallet?.cashbackBalance??next?.wallet?.cashback??0)
   const balance=Number(next?.balance??next?.walletBalance??next?.wallet?.balance??0)
   setShopping({balance:0,cashback:balance,total:balance,transactions:rawTx,totalEarned:Number(next?.wallet?.totalEarned||0),totalRedeemed:Number(next?.wallet?.totalRedeemed||0)})
  }catch(error){console.warn('Shopping wallet unavailable',error)}
 }
 const load=async()=>{await Promise.all([loadWallet(),loadShopping()])}
 useEffect(()=>{load()},[token])

 const startAddMoney=async()=>{
  setMessage('');setBusy(true);let popup=null
  try{
   popup=window.open('about:blank','trustedCircleWalletPayment','width=470,height=760,resizable=yes,scrollbars=yes')
   if(popup){try{popup.document.write('<!doctype html><html><head><title>Trusted Circle — Add Money</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;font-family:Arial,sans-serif;background:#f4f8f5;color:#173c2a;display:grid;place-items:center;height:100vh"><div style="text-align:center;padding:30px"><div style="font-size:30px;margin-bottom:12px">+</div><strong style="font-size:18px">Preparing Add Money</strong><p style="font-size:12px;color:#6f7772">Please wait while Trusted Circle creates your secure transaction.</p></div></body></html>');popup.document.close()}catch(_){}}
   const result=await walletApi.addMoney(token,selectedAmount),tx=result?.transaction||result?.data?.transaction,link=result?.paymentLink||result?.data?.paymentLink,expiresAt=result?.expiresAt||result?.data?.expiresAt
   if(!link)throw new Error('No payment gateway is available for this denomination right now.')
   const transactionId=tx?.transactionId||tx?.TransactionID
   if(!transactionId)throw new Error('Payment transaction could not be created.')
   setGateway({amount:selectedAmount,paymentLink:link,expiresAt,transaction:tx});setShowAdd(false);setShowGateway(false)
   const target=`#/wallet-payment/${encodeURIComponent(transactionId)}`
   if(popup&&!popup.closed){popup.location.href=window.location.origin+window.location.pathname+target;popup.focus()}else window.location.hash=target
  }catch(error){if(popup&&!popup.closed)popup.close();setMessage(error.message||'Unable to create the payment request.')}finally{setBusy(false)}
 }
 const withdraw=async e=>{
  e.preventDefault();setMessage('');setBusy(true)
  try{await walletApi.withdraw(token,Number(amount),upiId);setMessage('Withdrawal request received.');setAmount('');setUpiId('');setShowWithdraw(false);await loadWallet();window.dispatchEvent(new CustomEvent('tc:wallet-updated'))}
  catch(error){setMessage(error.message||'Unable to process withdrawal request.')}finally{setBusy(false)}
 }
 const active= view==='wallet'
 const txs=active?data.transactions:shopping.transactions
 const txTitle=active?'Wallet Services transactions':'Shopping transactions'
 const txLabel=tx=>active?(tx.type==='ADD_MONEY'?'Money added':tx.type==='WITHDRAW'?'Money withdrawn':String(tx.type||'Wallet transaction').replace(/_/g,' ')):(tx.description||tx.type||'Shopping transaction')
 const txAmount=tx=>Number(tx.amount??tx.Amount??0)
 return <main className="page-shell wallet-page">
  <div className="page-banner compact"><button className="back-link" onClick={onBack}><ArrowLeft size={16}/> Back</button><span className="eyebrow">WALLET</span><h1>Your wallet.</h1><p>Manage your Trusted Circle Wallet and Shopping balance separately.</p></div>

  <div className="wallet-source-switch" role="tablist" aria-label="Wallet account selection">
   <button className={active?'active':''} onClick={()=>setView('wallet')}><WalletCards size={17}/><span><strong>Wallet Services</strong><small>Cash balance & payments</small></span></button>
   <button className={!active?'active':''} onClick={()=>setView('shopping')}><ShieldCheck size={17}/><span><strong>Shopping Wallet</strong><small>Shopping cashback & rewards</small></span></button>
  </div>

  {active?<section className="wallet-hero">
   <div className="wallet-balance"><span><WalletCards size={20}/> Total balance</span><strong>{money(data.wallet.totalBalance)}</strong><small>Wallet + Cashback</small></div>
   <div className="wallet-stats"><div><span>Wallet</span><strong>{money(data.wallet.balance)}</strong></div><div><span>Cashback</span><strong>{money(data.wallet.cashbackBalance)}</strong></div></div>
   <div className="wallet-action-stack"><button className="btn-primary" onClick={()=>{setSelectedAmount(500);setShowAdd(true)}}><Plus size={16}/> Add Money</button><button className="wallet-withdraw-btn" onClick={()=>{setAmount('');setUpiId('');setShowWithdraw(true)}} disabled={Number(data.wallet.balance)<=0}><Minus size={16}/> Withdraw Money</button></div>
  </section>:<section className="wallet-hero shopping-wallet-hero">
   <div className="wallet-balance"><span><ShieldCheck size={20}/> Shopping cashback</span><strong>{money(shopping.cashback)}</strong><small>Earned from Shopping vouchers & orders</small></div>
   <div className="wallet-stats"><div><span>Total earned</span><strong>{money(shopping.totalEarned)}</strong></div><div><span>Total redeemed</span><strong>{money(shopping.totalRedeemed)}</strong></div></div>
   <div className="shopping-cashback-note"><CheckCircle2 size={17}/><span>Your Shopping cashback is shown here separately and is never mixed with Wallet Services funds.</span></div>
  </section>}

  <section className="wallet-history"><div className="section-title"><div><span className="eyebrow">{active?'WALLET SERVICES':'SHOPPING'}</span><h2>{txTitle}</h2></div><History size={20}/></div>
   {txs.length?txs.map((tx,index)=>{const n=txAmount(tx);return <article className="wallet-tx" key={String(tx.createdAt||tx.CreatedAt||'')+'-'+index}><div className="wallet-tx-icon">{n>=0?<Plus size={17}/>:<Minus size={17}/>}</div><div><strong>{txLabel(tx)}</strong><span>{tx.notes||tx.Note||tx.status||'Transaction'}</span><small>{date(tx.createdAt||tx.CreatedAt)}</small></div><b className={n>=0?'credit':'debit'}>{n>=0?'+':'−'}{money(Math.abs(n))}</b></article>}) : <div className="empty-panel"><WalletCards size={28}/><h3>No transactions yet</h3><p>Your {active?'Wallet Services':'Shopping'} activity will appear here.</p></div>}
  </section>

  {message&&<div className="form-message">{message}</div>}
  {showAdd&&<div className="modal-layer" onMouseDown={e=>e.target===e.currentTarget&&setShowAdd(false)}><div className="wallet-add-modal"><button className="wallet-modal-close" onClick={()=>setShowAdd(false)}>×</button><div className="wallet-modal-icon"><Plus size={21}/></div><span className="eyebrow">ADD MONEY</span><h2>Choose an amount</h2><p>Select one of the supported denominations. A secure payment gateway link will be reserved from Trusted Circle Wallet Services.</p><div className="wallet-denomination-grid">{addAmounts.map(v=><button key={v} className={selectedAmount===v?'selected':''} onClick={()=>setSelectedAmount(v)}><span>{money(v)}</span><small>Payment gateway</small></button>)}</div><div className="wallet-safe-note"><ShieldCheck size={18}/><div><strong>Adding safely in Trusted Circle</strong><span>Your payment link is generated by the Wallet Apps Script and matched to this denomination.</span></div></div><div className="wallet-modal-actions"><button className="btn-quiet" onClick={()=>setShowAdd(false)}>Cancel</button><button className="btn-primary" onClick={startAddMoney} disabled={busy}>{busy?'Preparing…':'Add Money'} <ArrowRight size={16}/></button></div></div></div>}
  {showGateway&&gateway&&<div className="modal-layer" onMouseDown={e=>e.target===e.currentTarget&&setShowGateway(false)}><div className="wallet-gateway-modal"><div className="wallet-gateway-top"><div className="wallet-gateway-lock"><ShieldCheck size={22}/></div><div><span className="eyebrow">SECURE PAYMENT</span><h2>Add {money(gateway.amount)}</h2></div><button className="wallet-modal-close" onClick={()=>setShowGateway(false)}>×</button></div><div className="wallet-gateway-card"><div><small>Amount to add</small><strong>{money(gateway.amount)}</strong></div><span className="wallet-gateway-status"><span/> Gateway reserved</span></div><div className="wallet-gateway-message"><ShieldCheck size={19}/><div><strong>Your money is being added safely in Trusted Circle</strong><p>Continue to the secure payment gateway below. Your Wallet balance is updated only after payment is verified by the Wallet Admin.</p></div></div>{gateway.expiresAt&&<div className="wallet-expiry"><Clock3 size={15}/> Payment link reserved until {date(gateway.expiresAt)}</div>}<a className="wallet-gateway-open" href={gateway.paymentLink} target="_blank" rel="noopener noreferrer" onClick={()=>setMessage('Payment gateway opened. Complete the payment, then wait for Wallet Admin verification.')}>Open Secure Payment Gateway <ExternalLink size={16}/></a><div className="wallet-gateway-footer"><span>Transaction {gateway.transaction?.TransactionID||gateway.transaction?.transactionId||'created'}</span><button onClick={()=>{setShowGateway(false);loadWallet()}}>Done</button></div></div></div>}
  {showWithdraw&&<div className="modal-layer"><div className="wallet-redeem-modal"><button className="wallet-modal-close" onClick={()=>setShowWithdraw(false)}>×</button><span className="eyebrow">WITHDRAW MONEY</span><h2>Transfer from your wallet</h2><p>Available: <strong>{money(data.wallet.balance)}</strong></p><form onSubmit={withdraw}><label>Amount<input type="number" min="1" max={Number(data.wallet.balance)} step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required/></label><label>UPI ID<input value={upiId} onChange={e=>setUpiId(e.target.value)} placeholder="name@bank" required/></label><div className="wallet-safe-note compact"><ShieldCheck size={18}/><div><strong>Secure withdrawal request</strong><span>Trusted Circle will review and process the transfer.</span></div></div><div className="wallet-modal-actions"><button type="button" className="btn-quiet" onClick={()=>setShowWithdraw(false)}>Cancel</button><button type="submit" className="btn-primary" disabled={busy}>{busy?'Submitting…':'Withdraw Money'} <CheckCircle2 size={16}/></button></div></form></div></div>}
 </main>
}
