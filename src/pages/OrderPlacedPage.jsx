import { useEffect,useState } from 'react'
import { CheckCircle2,ChevronRight,Link2,MessageCircle,PackageCheck,RefreshCw,ShieldCheck,ShoppingBag,Home,Smartphone,X } from 'lucide-react'
import BrandLogo from '../components/BrandLogo'
import { api } from '../api'

const money=value=>`₹${Number(value||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const UPI_APPS_URL='upi://pay?pa=paytm.s2eunub@pty&pn=Paytm&tn=Verified%20Paytm%20Account'

export default function OrderPlacedPage({order,token,onOrders,onShop,onHome,onRetryPayment}){
  const items=order?.snapshot?.items||[]
  const orderNumber=order?.order?.OrderNumber||order?.OrderNumber||'Your order'
  const orderId=order?.order?.OrderID||order?.OrderID||''
  const [returned,setReturned]=useState(()=>sessionStorage.getItem('tc_upi_returned')==='1')
  const [launching,setLaunching]=useState(false)
  const [paymentState,setPaymentState]=useState(String(order?.order?.Status||'PENDING_PAYMENT').toUpperCase())
  const [latestOrder,setLatestOrder]=useState(order?.order||order||null)
  const [latestPaymentLink,setLatestPaymentLink]=useState(order?.paymentLink||order?.order?.paymentLink||null)
  const [deliveryOpen,setDeliveryOpen]=useState(false)
  const [retrying,setRetrying]=useState(false)
  const [retryError,setRetryError]=useState('')
  const [verificationStartedAt,setVerificationStartedAt]=useState(()=>Number(sessionStorage.getItem('tc_payment_verification_started_at')||0))
  const [verificationSeconds,setVerificationSeconds]=useState(()=>{const started=Number(sessionStorage.getItem('tc_payment_verification_started_at')||0);return started?Math.max(0,120-Math.floor((Date.now()-started)/1000)):0})
  const paymentLink=latestPaymentLink||order?.paymentLink||order?.order?.paymentLink||null
  const paymentLinkUrl=paymentLink?.Link||paymentLink?.link||''
  const handoff=sessionStorage.getItem('tc_upi_handoff')==='1'&&!returned

  useEffect(()=>{
    const initial=String(order?.order?.Status||order?.Status||'PENDING_PAYMENT').toUpperCase()
    setPaymentState(initial)
    setLatestOrder(order?.order||order||null)
    setLatestPaymentLink(order?.paymentLink||order?.order?.paymentLink||null)
    setRetryError('')
    if(initial==='PAID')setDeliveryOpen(true)
  },[order])

  useEffect(()=>{
    if(!token||!orderId)return undefined
    let active=true
    let timer=null
    const refresh=async()=>{
      try{
        const data=await api.orderDetails(token,orderId)
        if(!active)return
        const fresh=data?.order||null
        if(fresh)setLatestOrder(fresh)
        if(data?.paymentLink)setLatestPaymentLink(data.paymentLink)
        const orderStatus=String(fresh?.Status||'').toUpperCase()
        const paymentStatus=String(data?.payment?.Status||'').toUpperCase()
        const status=paymentStatus==='NOT_RECEIVED'?'NOT_RECEIVED':orderStatus
        if(status){
          if(status==='PAID'){setPaymentState('PAID')
          }else if(status==='CANCELLED'){setPaymentState('CANCELLED')
          }else if(status==='NOT_RECEIVED'){setPaymentState('NOT_RECEIVED');setLatestPaymentLink(null)
          }else{setPaymentState(status)}
          if(status==='PAID'){
            sessionStorage.removeItem('tc_payment_verification_started_at')
            setVerificationStartedAt(0)
            setVerificationSeconds(0)
            setDeliveryOpen(true)
            return
          }
          if(status==='CANCELLED'){
            setDeliveryOpen(false)
            return
          }
        }
      }catch{}
      if(active)timer=window.setTimeout(refresh,5000)
    }
    refresh()
    return()=>{active=false;if(timer)window.clearTimeout(timer)}
  },[token,orderId])

  useEffect(()=>{
    if(!verificationStartedAt)return undefined
    const tick=()=>{const remaining=Math.max(0,120-Math.floor((Date.now()-verificationStartedAt)/1000));setVerificationSeconds(remaining)}
    tick()
    const timer=window.setInterval(tick,1000)
    return()=>window.clearInterval(timer)
  },[verificationStartedAt])

  useEffect(()=>{
    if(!handoff)return undefined
    let active=true
    const started=Number(sessionStorage.getItem('tc_upi_started_at')||Date.now())
    const markReturned=()=>{
      if(Date.now()-started<1200)return
      sessionStorage.setItem('tc_upi_returned','1')
      if(active)setReturned(true)
    }
    const onVisibility=()=>{if(document.visibilityState==='visible')markReturned()}
    const timer=window.setTimeout(()=>{if(active&&!returned){setLaunching(true);window.location.href=UPI_APPS_URL}},450)
    window.addEventListener('focus',markReturned)
    window.addEventListener('pageshow',markReturned)
    document.addEventListener('visibilitychange',onVisibility)
    return()=>{active=false;window.clearTimeout(timer);window.removeEventListener('focus',markReturned);window.removeEventListener('pageshow',markReturned);document.removeEventListener('visibilitychange',onVisibility)}
  },[handoff,returned])



  const clearHandoff=()=>{
    sessionStorage.removeItem('tc_upi_handoff')
    sessionStorage.removeItem('tc_upi_started_at')
    sessionStorage.removeItem('tc_upi_returned')
  }

  const startPaymentVerification=()=>{
    const started=Date.now()
    sessionStorage.setItem('tc_payment_verification_started_at',String(started))
    setVerificationStartedAt(started)
    setVerificationSeconds(120)
    if(token&&orderId)api.paymentLinkOpened(token,orderId).catch(()=>{})
  }

  const retry=async()=>{
    if(retrying||!onRetryPayment)return
    setRetrying(true)
    setRetryError('')
    try{
      const result=await onRetryPayment(orderId)
      const nextLink=result?.paymentLink||result?.order?.paymentLink||null
      if(nextLink)setLatestPaymentLink(nextLink)
      setPaymentState('PENDING_PAYMENT')
      startPaymentVerification()
    }catch(error){setRetryError(String(error?.message||'Unable to reopen payment.'))}finally{setRetrying(false)}
  }

  const shareOrderOnWhatsApp=()=>{
    const customer=order?.snapshot?.user?.name||'Trusted Circle Member'
    const text='🎉 Trusted Circle Order Confirmed!\n\nOrder Number: '+orderNumber+'\nCustomer: '+customer+'\nTotal: '+money(order?.snapshot?.total||order?.order?.Total)+'\n\n✅ Payment verified successfully.\nThank you for shopping with Trusted Circle!'
    const whatsappHref='https://wa.me/?text='+encodeURIComponent(text)
    window.open(whatsappHref,'_blank','noopener,noreferrer')
  }

  const statusLabel=paymentState==='PAID'?'PAYMENT VERIFIED':paymentState==='CANCELLED'?'ORDER REJECTED':paymentState==='NOT_RECEIVED'?'PAYMENT FAILED':paymentState==='PAYMENT_PROCESSING'?'PAYMENT PROCESSING':paymentLinkUrl?'PAYMENT LINK READY':'PAYMENT PENDING'
  const paymentFailed=paymentState==='NOT_RECEIVED'
  const verificationActive=paymentState!=='PAID'&&paymentState!=='CANCELLED'&&!paymentFailed&&verificationStartedAt>0
  const verificationProgress=verificationStartedAt?Math.min(100,((120-verificationSeconds)/120)*100):0
  const statusTone=paymentState==='PAID'?'paid':paymentState==='CANCELLED'?'rejected':paymentState==='NOT_RECEIVED'?'failed':paymentState==='PAYMENT_PROCESSING'?'checking':'pending'
  const rejected=paymentState==='CANCELLED'
  const orderTotal=latestOrder?.Total||order?.order?.Total||order?.Total

  if(handoff&&!returned)return <main className="page-shell order-placed-page payment-return-page"><section className="order-success payment-handoff-card"><div className="success-ring pulse"><Smartphone size={38}/></div><span className="eyebrow">PAYMENT</span><h1>Opening UPI…</h1><p>Complete the payment in your UPI app, then return here.</p><div className="handoff-steps"><div className="handoff-step done"><span>✓</span><div><b>Order created</b><small>Payment pending</small></div></div><ChevronRight/><div className="handoff-step active"><span>2</span><div><b>Pay in UPI</b><small>Use your app</small></div></div><ChevronRight/><div className="handoff-step"><span>3</span><div><b>Return</b><small>See your order</small></div></div></div><div className="upi-launch-card"><div className="upi-hero-mark"><span>UPI</span></div><div><strong>{money(order?.order?.Total)}</strong><small>Pay using UPI</small></div><a href={UPI_APPS_URL} onClick={event=>{event.preventDefault();setLaunching(true);window.location.href=UPI_APPS_URL}}><Smartphone size={17}/> {launching?'Opening…':'Open UPI App'}</a></div><div className="order-payment-note"><ShieldCheck size={17}/><span>Payment is confirmed only after verified payment data is received.</span></div></section></main>

  if(rejected)return <main className="page-shell order-placed-page"><section className="order-success order-success-rich order-rejected-state">
    <div className="rejected-mark"><X size={40}/></div>
    <span className="eyebrow">ORDER UPDATE</span>
    <h1>Order rejected by Admin</h1>
    <p className="success-lead">This order has been cancelled. You can place a new order anytime.</p>
    <div className="success-order rejected-order-meta"><div><small>ORDER</small><strong>{orderNumber}</strong></div><div><small>AMOUNT</small><strong>{money(orderTotal)}</strong></div><div className="success-status rejected"><small>STATUS</small><strong>ORDER REJECTED</strong></div></div>
    <div className="rejected-contact-card">
      <div><span className="eyebrow">NEED HELP?</span><h2>Please contact us</h2><p>Choose a contact option. Your WhatsApp message will open empty so you can type it yourself.</p></div>
      <div className="rejected-contact-actions">
        <a className="rejected-contact whatsapp" href="https://wa.me/919442456039" target="_blank" rel="noreferrer" aria-label="Contact Trusted Circle on WhatsApp"><MessageCircle size={28}/></a>
        <a className="rejected-contact email" href="mailto:info@trustedcircle.in" aria-label="Contact Trusted Circle by email"><Mail size={28}/></a>
      </div>
    </div>
    <div className="success-actions final-order-actions"><button className="btn-primary" onClick={()=>{clearHandoff();onShop()}}><ShoppingBag size={17}/> Shop more</button><button className="btn-quiet" onClick={()=>{clearHandoff();onHome()}}><Home size={17}/> Home</button></div>
  </section></main>

  return <main className="page-shell order-placed-page"><section className="order-success order-success-rich">
    <div className={`success-ring success-pop status-${statusTone}`}>{paymentFailed?<X size={42}/>:<CheckCircle2 size={42}/>}</div>
    <span className="eyebrow">{paymentState==='PAID'?'PAYMENT VERIFIED':paymentFailed?'PAYMENT FAILED':'ORDER RECEIVED'}</span>
    <h1>{paymentState==='PAID'?'Payment verified':paymentFailed?'Payment was not received':'Order received'}</h1>
    <p className="success-lead">{paymentState==='PAID'?'Your payment is verified.':paymentFailed?'The previous payment attempt was not received. You can retry the payment below.':'Sit back and relax — your order is with us.'}</p>

    {order?.order&&<div className="success-order"><div><small>ORDER</small><strong>{orderNumber}</strong></div><div><small>TOTAL</small><strong>{money(order.order.Total)}</strong></div><div className={`success-status ${statusTone}`}><small>STATUS</small><strong>{statusLabel}</strong></div></div>}

    {paymentState!=='PAID'&&<div className={'payment-link-ready-panel '+(paymentFailed?'payment-link-failed-panel':'')}>
      <div className="payment-link-ready-copy">
        <span className="eyebrow">{paymentFailed?'PAYMENT UPDATE':'ORDER CONFIRMATION'}</span>
        <h2>{paymentFailed?'Payment was not received':'Your order is successfully placed'}</h2>
        <p>{paymentFailed?'Admin has marked the previous payment attempt as not received. The payment link is available again for retry.':'Your order has been received successfully. Complete the secure payment and we will verify it automatically.'}</p>
      </div>
      <div className="payment-link-ready-actions">
        {paymentFailed&&<div className="payment-failed-badge">Payment attempt failed</div>}
        {paymentLinkUrl&&<a className="payment-link-open-btn" href={paymentLinkUrl} target="_blank" rel="noopener noreferrer" onClick={startPaymentVerification}><Link2 size={18}/> Open payment link</a>}
        {paymentFailed&&<button className="payment-link-retry-btn" onClick={retry} disabled={retrying}><RefreshCw size={17}/>{retrying?'Preparing…':'Retry payment'}</button>}
        {!paymentFailed&&!paymentLinkUrl&&<button className="payment-link-retry-btn" onClick={retry} disabled={retrying}><RefreshCw size={17}/>{retrying?'Preparing…':'Generate payment link'}</button>}
      </div>
      {!paymentFailed&&verificationActive&&<div className="payment-verification-card">
        <div className="payment-verification-icon"><ShieldCheck size={20}/></div>
        <div className="payment-verification-copy">
          <strong>Payment verification is in process</strong>
          <span>{verificationSeconds>0?'We are checking automatically for up to 2 minutes. '+Math.floor(verificationSeconds/60)+':'+String(verificationSeconds%60).padStart(2,'0')+' remaining.':'Verification is taking a little longer than expected. We are still checking automatically.'}</span>
          <div className="payment-verification-bar"><span style={{width:verificationProgress+'%'}}></span></div>
        </div>
        <div className="payment-verification-live"><i></i>LIVE</div>
      </div>}
      {retryError&&<div className="payment-link-retry-error" role="alert">{retryError}</div>}
    </div>
    {paymentState==='PAYMENT_PROCESSING'&&<div className="order-waiting-screen">
      <img className="waiting-logo" src="https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg" alt="Trusted Circle"/>
      <strong>Sit back and relax</strong>
      <p>Your order is with us. We’ll update you soon.</p>
      <div className="waiting-progress" aria-label="Order verification in progress"><span></span></div>
      <small className="waiting-caption">Verification in progress</small>
    </div>}

    <div className="order-confirmation-grid"><div className="confirmation-card"><div className="confirmation-card-head"><PackageCheck size={18}/><div><span className="eyebrow">ORDER</span><h2>Voucher details</h2></div></div>
      {items.length?items.map((item,index)=><div className="confirmation-item" key={`${item.title}-${index}`}><BrandLogo name={item.brand} size="md"/><div><strong>{item.brand}</strong><span>{item.title}</span><small>{money(item.faceValue)} × {item.quantity}</small></div><b>{money(item.total)}</b></div>):null}
      <div className="confirmation-totals"><div><span>Voucher value</span><b>{money(order?.snapshot?.subtotal)}</b></div><div><span>Cashback</span><b>+ {money(order?.snapshot?.cashback||order?.snapshot?.savings)}</b></div><div className="grand"><span>Total</span><strong>{money(order?.snapshot?.total||order?.order?.Total)}</strong></div></div>
    </div><div className="confirmation-side"><div className="next-card"><strong>{paymentState==='PAID'?'Ready to send':'Payment status'}</strong><span>{paymentState==='PAID'?'Choose a delivery option.':'Update the payment status above.'}</span></div><div className="customer-card"><span className="eyebrow">CUSTOMER</span><strong>{order?.snapshot?.user?.name||'Trusted Circle Member'}</strong><span>{order?.snapshot?.user?.email||'—'}</span></div></div></div>

    {paymentState==='PAID'&&<div className="success-actions final-order-actions"><button className="btn-primary" onClick={()=>{clearHandoff();onShop()}}><ShoppingBag size={17}/> Shop more</button><button className="btn-quiet" onClick={()=>{clearHandoff();onHome()}}><Home size={17}/> Home</button></div>}
  </section>

  {deliveryOpen&&<div className="delivery-modal-backdrop payment-verified-overlay" role="dialog" aria-modal="true">
    <div className="payment-verified-modal">
      <div className="verified-confetti confetti-one"></div><div className="verified-confetti confetti-two"></div><div className="verified-confetti confetti-three"></div>
      <div className="verified-hero-ring"><div className="verified-hero-check"><CheckCircle2 size={78}/></div></div>
      <span className="eyebrow">PAYMENT VERIFIED</span>
      <h2>🎉 Your order is successfully placed!</h2>
      <p>Your payment has been received and verified successfully.</p>
      <div className="verified-order-pill"><span>{orderNumber}</span><strong>{money(orderTotal)}</strong></div>
      <div className="verified-actions">
        <button className="verified-share-btn" onClick={shareOrderOnWhatsApp}><MessageCircle size={19}/> Share Order</button>
        <button className="verified-orders-btn" onClick={()=>{setDeliveryOpen(false);clearHandoff();onOrders()}}><PackageCheck size={19}/> View Orders</button>
      </div>
    </div>
  </div>
  </main>
}
