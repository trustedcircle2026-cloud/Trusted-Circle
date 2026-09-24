import { useEffect,useState } from 'react'
import { CheckCircle2,ChevronRight,Mail,MessageCircle,PackageCheck,RefreshCw,ShieldCheck,ShoppingBag,Home,Smartphone,X } from 'lucide-react'
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
  const [paymentRequested,setPaymentRequested]=useState(false)
  const [paymentRequesting,setPaymentRequesting]=useState(false)
  const [paymentState,setPaymentState]=useState(String(order?.order?.Status||'PENDING_PAYMENT').toUpperCase())
  const [latestOrder,setLatestOrder]=useState(order?.order||order||null)
  const [paymentError,setPaymentError]=useState('')
  const [deliveryOpen,setDeliveryOpen]=useState(false)
  const [sentChannel,setSentChannel]=useState('')
  const [retrying,setRetrying]=useState(false)
  const handoff=sessionStorage.getItem('tc_upi_handoff')==='1'&&!returned

  useEffect(()=>{
    const initial=String(order?.order?.Status||order?.Status||'PENDING_PAYMENT').toUpperCase()
    setPaymentState(initial)
    setLatestOrder(order?.order||order||null)
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
        const status=String(fresh?.Status||'').toUpperCase()
        if(status){
          if(status==='PAID'){setPaymentState('PAID')
          }else if(status==='CANCELLED'){setPaymentState('CANCELLED')
          }else if(paymentRequested){setPaymentState('PAYMENT_PROCESSING')
          }else{setPaymentState(status)}
          if(status==='PAID'){
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
  },[token,orderId,paymentRequested])

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

  const requestPaymentCheck=async()=>{
    if(paymentRequesting||!token||!orderId)return
    setPaymentRequesting(true)
    setPaymentError('')
    try{
      const result=await api.paymentCheckRequested(token,orderId)
      if(result?.requested){
        setPaymentRequested(true)
        setPaymentState('PAYMENT_PROCESSING')
      }else setPaymentError('We could not send the payment check request. Please try again.')
    }catch(error){
      setPaymentError(String(error?.message||'Payment check could not be requested.'))
    }finally{
      setPaymentRequesting(false)
    }
  }

  const retry=async()=>{
    if(retrying||!onRetryPayment)return
    setRetrying(true)
    setPaymentError('')
    try{await onRetryPayment(orderId);setPaymentState('PENDING_PAYMENT')}catch(error){setPaymentError(String(error?.message||'Unable to reopen payment.'))}finally{setRetrying(false)}
  }

  const sendOrder=channel=>{
    const email=order?.snapshot?.user?.email||''
    const customer=order?.snapshot?.user?.name||'Trusted Circle Member'
    const text=`Hello Trusted Circle,

Order Number: ${orderNumber}
Customer: ${customer}
Email: ${email}

${items.map(i=>`• ${i.brand} — ${i.title} × ${i.quantity} — ${money(i.total)}`).join('\n')}

Total: ${money(order?.snapshot?.total||order?.order?.Total)}

Payment has been verified. Please send my digital voucher.`
    const emailHref=`mailto:info@trustedcircle.in?subject=${encodeURIComponent(`Trusted Circle Order ${orderNumber}`)}&body=${encodeURIComponent(text)}`
    const whatsappHref=`https://wa.me/919442456039?text=${encodeURIComponent(text)}`
    setSentChannel(channel)
    window.setTimeout(()=>{
      if(channel==='whatsapp')window.open(whatsappHref,'_blank','noopener,noreferrer')
      else window.location.href=emailHref
    },650)
  }

  const statusLabel=paymentState==='PAID'?'PAYMENT VERIFIED':paymentState==='CANCELLED'?'ORDER REJECTED':paymentState==='PAYMENT_PROCESSING'?'CHECKING PAYMENT':'PAYMENT PENDING'
  const statusTone=paymentState==='PAID'?'paid':paymentState==='CANCELLED'?'rejected':paymentState==='PAYMENT_PROCESSING'?'checking':'pending'
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
    <div className={`success-ring success-pop status-${statusTone}`}><CheckCircle2 size={42}/></div>
    <span className="eyebrow">{paymentState==='PAID'?'PAYMENT VERIFIED':'ORDER RECEIVED'}</span>
    <h1>{paymentState==='PAID'?'Payment verified':'Order received'}</h1>
    <p className="success-lead">{paymentState==='PAID'?'Your payment is verified.':'Sit back and relax — your order is with us.'}</p>

    {order?.order&&<div className="success-order"><div><small>ORDER</small><strong>{orderNumber}</strong></div><div><small>TOTAL</small><strong>{money(order.order.Total)}</strong></div><div className={`success-status ${statusTone}`}><small>STATUS</small><strong>{statusLabel}</strong></div></div>}

    {paymentState!=='PAID'&&<div className="payment-action-panel"><div><span className="eyebrow">PAYMENT</span><h2>Select payment status</h2></div><div className="payment-action-buttons"><button className="payment-done-btn" onClick={requestPaymentCheck} disabled={paymentRequesting||paymentState==='PAYMENT_PROCESSING'}><CheckCircle2 size={19}/>{paymentRequesting?'Sending…':paymentState==='PAYMENT_PROCESSING'?'Checking…':'Payment Done'}</button><button className="payment-retry-btn" onClick={retry} disabled={retrying}><RefreshCw size={18}/>{retrying?'Opening…':'Payment Failed · Retry'}</button></div>{paymentError&&<div className="payment-action-error">{paymentError}</div>}</div>}

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

  {deliveryOpen&&<div className="delivery-modal-backdrop" role="dialog" aria-modal="true"><div className="delivery-modal">
    {!sentChannel?<><button className="delivery-close" onClick={()=>setDeliveryOpen(false)} aria-label="Close"><X size={18}/></button><div className="delivery-success-mark"><CheckCircle2 size={30}/></div><span className="eyebrow">PAYMENT VERIFIED</span><h2>How should we send your voucher?</h2><p>Your payment is verified. Choose a delivery option and Trusted Circle will open it for you.</p><div className="delivery-choice-grid"><button className="delivery-choice whatsapp-choice" onClick={()=>sendOrder('whatsapp')}><span className="delivery-icon whatsapp-icon"><MessageCircle size={24}/></span><span><strong>Send via WhatsApp</strong><small>Open WhatsApp with your order ready</small></span><ChevronRight size={18}/></button><button className="delivery-choice email-choice" onClick={()=>sendOrder('email')}><span className="delivery-icon gmail-icon"><Mail size={24}/></span><span><strong>Send via Email</strong><small>Open Gmail / your email app</small></span><ChevronRight size={18}/></button></div><div className="delivery-note"><ShieldCheck size={16}/> Order details are pre-filled for faster delivery.</div></>:<div className="order-sent-animation"><div className="sent-orbit"><span></span></div><div className="sent-check"><CheckCircle2 size={52}/></div><span className="eyebrow">DELIVERY REQUESTED</span><h2>Order sent successfully!</h2><p>{sentChannel==='whatsapp'?'WhatsApp is opening with your order details.':'Your email app is opening with your order details.'}</p><div className="sent-progress"><span></span></div></div>}
  </div></div>}
  </main>
}
