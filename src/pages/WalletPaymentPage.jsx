import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, Clock3, ExternalLink, ShieldCheck, WalletCards, XCircle } from 'lucide-react'
import { walletApi } from '../wallet-services-api'
import '../wallet.css'

const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const date=v=>v?new Date(v).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'

export default function WalletPaymentPage({transactionId}){
  const [tx,setTx]=useState(null)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(true)

  const load=useCallback(async()=>{
    const token=localStorage.getItem('tc_session')||''
    if(!token){setError('Your Trusted Circle login session is not available.');setBusy(false);return}
    try{
      const result=await walletApi.transactionStatus(token,transactionId)
      setTx(result?.transaction||result?.data?.transaction||null)
      setError('')
    }catch(e){
      setError(e.message||'Unable to check payment status.')
    }finally{setBusy(false)}
  },[transactionId])

  useEffect(()=>{
    load()
    const timer=setInterval(load,4000)
    return()=>clearInterval(timer)
  },[load])

  const status=String(tx?.status||'PENDING_PAYMENT').toUpperCase()
  const isComplete=status==='COMPLETED'
  const isFailed=['NOT_RECEIVED','REJECTED'].includes(status)
  const statusText=useMemo(()=>{
    if(isComplete)return'Payment received'
    if(isFailed)return status==='NOT_RECEIVED'?'Payment not received':'Payment rejected'
    return'Payment is in progress'
  },[isComplete,isFailed,status])

  const close=()=>{try{window.close()}catch{}}
  const openGateway=()=>{
    if(!tx?.paymentLink)return
    window.open(tx.paymentLink,'_blank','noopener,noreferrer')
  }

  return <main className="wallet-payment-page">
    <div className="wallet-payment-shell">
      <div className="wallet-payment-brand"><WalletCards size={18}/><div><strong>Trusted Circle Pay</strong><span>Secure Wallet Payment</span></div><b>🔒 SECURE</b></div>

      <section className={`wallet-payment-status ${isComplete?'success':isFailed?'failed':'pending'}`}>
        <div className="wallet-payment-status-icon">
          {isComplete?<CheckCircle2 size={27}/>:isFailed?<XCircle size={27}/>:<Clock3 size={27}/>}
        </div>
        <span className="eyebrow">ADD MONEY</span>
        <h1>{statusText}</h1>
        <p>{isComplete?'Your wallet has been credited after payment verification.':isFailed?'Please review the transaction and contact Trusted Circle if you need help.':'Complete the payment using the secure gateway. Trusted Circle will keep checking this transaction automatically.'}</p>
      </section>

      {tx&&<section className="wallet-payment-details">
        <div className="wallet-payment-amount"><small>Amount</small><strong>{money(tx.amount)}</strong><span>{tx.paymentLinkLabel||'Trusted Circle Payment Gateway'}</span></div>
        <div className="wallet-payment-grid">
          <div><small>Transaction ID</small><strong>{tx.transactionId||'—'}</strong></div>
          <div><small>Transaction date</small><strong>{date(tx.createdAt)}</strong></div>
          <div><small>Payment status</small><strong>{String(tx.status||'PENDING_PAYMENT').replace(/_/g,' ')}</strong></div>
          <div><small>Attempt</small><strong>#{Number(tx.attempt||1)}</strong></div>
        </div>
      </section>}

      {!isComplete&&!isFailed&&<section className="wallet-payment-action">
        <div className="wallet-payment-action-copy">
          <ShieldCheck size={19}/>
          <div><strong>Make Payment</strong><span>Use the payment gateway assigned to this denomination. Do not close this window until you finish the payment.</span></div>
        </div>
        <button className="wallet-payment-pay-btn" onClick={openGateway} disabled={!tx?.paymentLink}>
          Proceed to Payment <ExternalLink size={16}/>
        </button>
      </section>}

      {busy&&!tx&&<div className="wallet-payment-loading"><span className="wallet-payment-spinner"/>Preparing your secure payment details…</div>}
      {error&&<div className="wallet-payment-error">{error}<button onClick={load}>Retry</button></div>}

      <div className="wallet-payment-progress">
        <div className={status!=='PENDING_PAYMENT'?'done':''}><span>1</span><label>Transaction created</label></div>
        <div className={isComplete?'done':''}><span>2</span><label>Make payment</label></div>
        <div className={isComplete?'done':''}><span>3</span><label>Wallet verification</label></div>
      </div>

      <div className="wallet-payment-gateway-info"><div><small>PAYMENT AMOUNT</small><strong>{money(tx?.amount)}</strong></div><div><small>GATEWAY</small><strong>{tx?.paymentLinkLabel||'Secure Payment Gateway'}</strong></div><div><small>REFERENCE</small><strong>{tx?.transactionId||'—'}</strong></div></div>\n\n      <div className="wallet-payment-wait">
        <Clock3 size={15}/>
        <span>{isComplete?'Payment completed successfully. You may close this window.':'Payment is in progress. Please wait while Trusted Circle verifies your payment.'}</span>
      </div>

      <div className="wallet-payment-footer">
        <button onClick={close}><XCircle size={15}/> Close</button>
        <button onClick={()=>{window.location.href='#/wallet'}}><ArrowLeft size={15}/> Back to Wallet</button>
      </div>
    </div>
  </main>
}
