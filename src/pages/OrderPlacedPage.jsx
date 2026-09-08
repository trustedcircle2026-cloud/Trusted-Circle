import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Mail,
  MessageCircle,
  PackageCheck,
  ShoppingBag,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const UPI_APPS_URL = 'upi://pay?pa=paytm.s2eunub@pty&pn=Paytm&tn=Verified%20Paytm%20Account'

export default function OrderPlacedPage({ order, onOrders, onShop, emailHref, whatsappHref }) {
  const items = order?.snapshot?.items || []
  const [returned, setReturned] = useState(() => sessionStorage.getItem('tc_upi_returned') === '1')
  const [launching, setLaunching] = useState(false)
  const handoff = sessionStorage.getItem('tc_upi_handoff') === '1' && !returned

  useEffect(() => {
    if (!handoff) return undefined
    let active = true
    const started = Number(sessionStorage.getItem('tc_upi_started_at') || Date.now())

    const markReturned = () => {
      if (Date.now() - started < 1200) return
      sessionStorage.setItem('tc_upi_returned', '1')
      if (active) setReturned(true)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') markReturned()
    }

    const timer = window.setTimeout(() => {
      if (active && !returned) {
        setLaunching(true)
        window.location.href = UPI_APPS_URL
      }
    }, 450)

    window.addEventListener('focus', markReturned)
    window.addEventListener('pageshow', markReturned)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      active = false
      window.clearTimeout(timer)
      window.removeEventListener('focus', markReturned)
      window.removeEventListener('pageshow', markReturned)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [handoff, returned])

  const clearHandoff = () => {
    sessionStorage.removeItem('tc_upi_handoff')
    sessionStorage.removeItem('tc_upi_started_at')
    sessionStorage.removeItem('tc_upi_returned')
  }

  if (handoff && !returned) {
    return (
      <main className="page-shell order-placed-page payment-return-page">
        <section className="order-success payment-handoff-card">
          <div className="success-ring pulse"><Smartphone size={38} /></div>
          <span className="eyebrow">PAYMENT HANDOFF</span>
          <h1>Opening your UPI app…</h1>
          <p>Your pending order has been created securely. Complete the payment in your UPI app, then return to this browser to continue.</p>
          <div className="handoff-steps">
            <div className="handoff-step done"><span>✓</span><div><b>Order created</b><small>Pending payment</small></div></div>
            <ChevronRight />
            <div className="handoff-step active"><span>2</span><div><b>Pay in UPI</b><small>Use your installed app</small></div></div>
            <ChevronRight />
            <div className="handoff-step"><span>3</span><div><b>Return here</b><small>See order confirmation</small></div></div>
          </div>
          <div className="upi-launch-card">
            <div className="upi-hero-mark"><span>UPI</span></div>
            <div><strong>{money(order?.order?.Total)}</strong><small>Pay using your preferred UPI app</small></div>
            <a href={UPI_APPS_URL} onClick={event => { event.preventDefault(); setLaunching(true); window.location.href = UPI_APPS_URL }}>
              <Smartphone size={17} /> {launching ? 'Opening…' : 'Open UPI App'}
            </a>
          </div>
          <div className="order-payment-note"><ShieldCheck size={17} /><span>Opening UPI does not itself mark the order paid. Payment is confirmed only after verified payment data is received.</span></div>
        </section>
      </main>
    )
  }

  const orderNumber = order?.order?.OrderNumber || order?.OrderNumber || 'Your order'

  return (
    <main className="page-shell order-placed-page">
      <section className="order-success order-success-rich">
        <div className="success-ring success-pop"><CheckCircle2 size={42} /></div>
        <span className="eyebrow">ORDER RECEIVED</span>
        <h1>Your order is confirmed in Trusted Circle.</h1>
        <p className="success-lead">We received your order and returned you from the payment app. The order below remains subject to verified payment confirmation before fulfilment.</p>
        {order?.order && (
          <div className="success-order">
            <div><small>ORDER NUMBER</small><strong>{orderNumber}</strong></div>
            <div><small>PAYABLE</small><strong>{money(order.order.Total)}</strong></div>
            <div><small>STATUS</small><strong>PAYMENT PENDING</strong></div>
          </div>
        )}
        <div className="order-confirmation-grid">
          <div className="confirmation-card">
            <div className="confirmation-card-head"><PackageCheck size={18} /><div><span className="eyebrow">ORDER SUMMARY</span><h2>Voucher details</h2></div></div>
            {items.length ? items.map((item, index) => (
              <div className="confirmation-item" key={`${item.title}-${index}`}>
                <div><strong>{item.brand}</strong><span>{item.title}</span><small>₹{Number(item.faceValue || 0).toLocaleString('en-IN')} × {item.quantity}</small></div>
                <b>{money(item.total)}</b>
              </div>
            )) : <p>No item snapshot available.</p>}
            <div className="confirmation-totals">
              <div><span>Subtotal</span><b>{money(order?.snapshot?.subtotal)}</b></div>
              <div><span>Savings</span><b>− {money(order?.snapshot?.savings)}</b></div>
              <div className="grand"><span>Total</span><strong>{money(order?.snapshot?.total || order?.order?.Total)}</strong></div>
            </div>
          </div>
          <div className="confirmation-side">
            <div className="next-card"><Clock3 size={18} /><div><strong>What happens next?</strong><span>Trusted Circle verifies the payment, fulfils the voucher and sends the digital voucher to your registered email.</span></div></div>
            <div className="customer-card"><span className="eyebrow">CUSTOMER</span><strong>{order?.snapshot?.user?.name || 'Trusted Circle Member'}</strong><span>{order?.snapshot?.user?.email || '—'}</span></div>
          </div>
        </div>
        <div className="contact-order-card">
          <div><span className="eyebrow">ORDER DETAILS</span><h2>Need to share this order?</h2><p>Your order details can be sent by email or WhatsApp without retyping the information.</p></div>
          <div className="contact-order-actions">
            <a className="contact-action email" href={emailHref}><Mail size={19} /><span><strong>Send by Email</strong><small>info@trustedcircle.in</small></span></a>
            <a className="contact-action whatsapp" href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={20} /><span><strong>Send on WhatsApp</strong><small>+91 94424 56039</small></span></a>
          </div>
        </div>
        <div className="success-actions">
          <button className="btn-primary" onClick={() => { clearHandoff(); onOrders() }}><FileText size={17} /> View order</button>
          <button className="btn-quiet" onClick={() => { clearHandoff(); onShop() }}><ShoppingBag size={17} /> Buy a new voucher</button>
        </div>
      </section>
    </main>
  )
}
