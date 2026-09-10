import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronRight, Link2, LockKeyhole, Maximize2, QrCode, ShieldCheck, Smartphone, X } from 'lucide-react'
import { api } from '../api'
import './PaymentGateway.css'

const UPI_URI = 'upi://pay?pa=paytm.s2eunub@pty&pn=Paytm&tn=Verified%20Paytm%20Account'
const UPI_LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg'
const LINK_WAIT_SECONDS = 30
const LINK_VALIDITY_SECONDS = 3 * 60 * 60
const methods = [
  { id: 'qr', label: 'QR Code', icon: QrCode },
  { id: 'upiapps', label: 'UPI Apps', icon: Smartphone },
  { id: 'link', label: 'Payment Link', icon: Link2 },
]
const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const formatDuration = seconds => {
  const value = Math.max(0, Number(seconds || 0))
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  const secs = value % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`
}
const extractPaymentLink = value => {
  const candidates = [value, value?.Link, value?.link, value?.url, value?.URL, value?.paymentLink?.Link, value?.paymentLink?.link, value?.paymentLink?.url, value?.data?.paymentLink?.Link, value?.data?.paymentLink?.link, value?.order?.paymentLink?.Link, value?.order?.paymentLink?.link]
  for (const candidate of candidates) if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate)) return candidate
  return ''
}

export default function PaymentGateway({ mode = 'checkout', user, items = [], total, cashback = 0, logoUrl, qrUrl, onBack, onCreateOrder, orderId = '' }) {
  const [selected, setSelected] = useState('upiapps')
  const [qrOpen, setQrOpen] = useState(false)
  const [linkRequest, setLinkRequest] = useState(null)
  const [linkWaitSeconds, setLinkWaitSeconds] = useState(0)
  const [linkValidSeconds, setLinkValidSeconds] = useState(0)
  const [linkLoading, setLinkLoading] = useState(false)
  const overLimit = Number(total) > 2000
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + Number(item.Quantity || 0), 0), [items])
  const active = methods.find(method => method.id === selected) || methods[1]
  const ActiveIcon = active.icon
  const activeLink = Boolean(linkRequest?.link && linkValidSeconds > 0)

  useEffect(() => {
    if (!linkLoading && linkWaitSeconds <= 0 && linkValidSeconds <= 0) return undefined
    const timer = setInterval(() => {
      setLinkWaitSeconds(value => linkLoading ? Math.max(0, value - 1) : value)
      setLinkValidSeconds(value => linkRequest?.link ? Math.max(0, value - 1) : value)
    }, 1000)
    return () => clearInterval(timer)
  }, [linkLoading, linkWaitSeconds, linkValidSeconds, linkRequest?.link])

  const requestPaymentLink = async () => {
    if (overLimit || linkLoading) return
    setLinkLoading(true)
    setLinkWaitSeconds(LINK_WAIT_SECONDS)
    setLinkValidSeconds(0)
    setLinkRequest(null)
    try {
      const token = localStorage.getItem('tc_session')
      if (!token) throw new Error('Please sign in first.')
      let result
      if (mode === 'checkout') {
        if (!items.length) throw new Error('Your cart is empty.')
        result = await api.placeOrder(token, 'link')
      } else {
        if (!orderId) throw new Error('Order could not be found.')
        result = await api.requestPaymentLink(token, orderId)
      }
      const link = extractPaymentLink(result)
      const resolvedOrderId = result?.order?.OrderID || result?.OrderID || orderId
      if (!link) throw new Error('Payment link was not returned. Please try again.')
      const expiresAt = result?.expiresAt || result?.paymentLink?.ExpiresAt || result?.order?.ExpiresAt || ''
      const validSeconds = expiresAt ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)) : LINK_VALIDITY_SECONDS
      setLinkRequest({ link, expiresAt })
      setLinkValidSeconds(validSeconds || LINK_VALIDITY_SECONDS)
      setLinkWaitSeconds(0)

      // The link is already created by placeOrder(). Send the transactional email
      // in the background so Gmail latency never blocks the customer's payment UI.
      if (mode === 'checkout' && resolvedOrderId) {
        void api.requestPaymentLink(token, resolvedOrderId).catch(() => {})
      }
    } catch (error) {
      setLinkRequest({ error: error.message || 'Could not request payment link.' })
      setLinkWaitSeconds(0)
      setLinkValidSeconds(0)
    } finally {
      setLinkLoading(false)
    }
  }

  const startUpiPayment = async event => {
    event?.preventDefault?.()
    if (overLimit) return
    if (mode === 'checkout') {
      await onCreateOrder?.('upiapps')
      return
    }
    window.location.href = UPI_URI
  }

  const chooseMethod = id => {
    setSelected(id)
    setQrOpen(false)
    if (id !== 'link') {
      setLinkRequest(null)
      setLinkWaitSeconds(0)
      setLinkValidSeconds(0)
      setLinkLoading(false)
    }
  }

  const paymentLinkMessage = linkRequest?.error
    ? linkRequest.error
    : linkLoading
      ? `Wait, payment link is getting... ${linkWaitSeconds}s`
      : activeLink
        ? `Payment link ready. Valid for ${formatDuration(linkValidSeconds)}.`
        : linkRequest?.link
          ? 'The 3-hour payment-link validity has ended. Get a new link.'
          : 'Get a stocked payment link for this order.'

  return (
    <div className={`payment-gateway payment-gateway-${mode}`}>
      <header className="gateway-topbar">
        <button className="gateway-back" onClick={onBack}><ChevronRight size={17} style={{ transform: 'rotate(180deg)' }} /> Back</button>
        <div className="gateway-title"><LockKeyhole size={15} /> Secure Checkout</div>
        <div className="gateway-secure"><ShieldCheck size={15} /> Trusted Circle</div>
      </header>

      <div className="gateway-shell">
        {mode === 'checkout' && <aside className="gateway-summary">
          <div className="gateway-summary-brand"><div className="gateway-logo"><img src={logoUrl} alt="Trusted Circle" /></div><div><strong>Trusted Circle</strong><small>Gift Vouchers</small></div></div>
          <div className="gateway-stepper"><span className="done">1</span><div><b>Cart</b><small>{itemCount} item{itemCount === 1 ? '' : 's'}</small></div><span className="active">2</span><div><b>Payment</b><small>Choose a method</small></div></div>
          <div className="gateway-price-label">PAY NOW</div><div className="gateway-total">{money(total)}</div>
          <div className="gateway-account-pill"><CheckCircle2 size={15} /><span>{user?.email || 'Signed in'}</span></div>
          <div className="gateway-order-lines"><div><span>Voucher value</span><b>{money(total)}</b></div><div><span>Cashback</span><b className="gateway-green">+ {money(cashback)}</b></div></div>
          {overLimit && <div className="gateway-note"><ShieldCheck size={14} /> Order limit is ₹2,000. Remove items to continue.</div>}
          <div className="gateway-summary-footer"><ShieldCheck size={16} /><span>Cashback is added after payment verification.</span></div>
        </aside>}

        <section className="gateway-payment">
          <div className="gateway-payment-head"><div><span className="gateway-kicker">PAYMENT</span><h1>{mode === 'checkout' ? 'Choose how to pay' : 'Complete payment'}</h1><p>{mode === 'checkout' ? 'Pay the full voucher value.' : 'Pay the pending order amount to continue.'}</p></div><button className="gateway-close" onClick={onBack} aria-label="Close checkout"><X size={16} /></button></div>
          <div className="gateway-mobile-method-trigger" role="button" tabIndex={0} onClick={event => event.currentTarget.nextElementSibling?.querySelector('.gateway-methods')?.classList.toggle('mobile-open')}><ActiveIcon size={18} /><div><small>Payment method</small><strong>{active.label}</strong></div><ChevronRight size={17} /></div>

          <div className="gateway-body">
            <nav className="gateway-methods" aria-label="Payment methods">
              <div className="gateway-method-heading">PAYMENT METHODS</div>
              {methods.map(method => { const Icon = method.icon; return <button key={method.id} className={`gateway-method ${selected === method.id ? 'selected' : ''}`} onClick={() => chooseMethod(method.id)}><Icon size={18} /><span>{method.label}</span>{selected === method.id && <ChevronRight size={14} className="method-arrow" />}</button> })}
            </nav>

            <div className="gateway-content">
              <div className="gateway-content-title"><div><ActiveIcon size={17} /><strong>{active.label}</strong></div><span className="gateway-session"><ShieldCheck size={12} /> Secure</span></div>

              {selected === 'upiapps' && <div className="gateway-upi-apps-panel gateway-upi-primary">
                <div className="gateway-upi-brand-row"><img className="upi-logo-image checkout-upi-logo" src={UPI_LOGO_URL} alt="UPI" /><span className="gateway-session"><ShieldCheck size={12} /> UPI secure</span></div>
                <div className="gateway-upi-apps-intro"><span className="gateway-mini-label">UPI</span><h2>{money(total)}</h2><p>Pay instantly with any UPI app.</p></div>
                <a className="gateway-pay-button gateway-pay-link gateway-primary-action" href={mode === 'order' ? UPI_URI : '#'} onClick={startUpiPayment} aria-disabled={overLimit}><Smartphone size={17} /> Pay with UPI Apps <ChevronRight size={17} /></a>
                <div className="gateway-return-card"><CheckCircle2 size={17} /><div><strong>After payment</strong><span>{mode === 'checkout' ? 'Your order will open after the payment handoff.' : 'Return here to see the updated order status.'}</span></div></div>
                <div className="gateway-note"><ShieldCheck size={14} /> Cashback is added after verified payment.</div>
              </div>}

              {selected === 'qr' && <div className="gateway-upi-panel">
                <button className="gateway-qr-card" onClick={() => setQrOpen(true)} aria-label="Enlarge UPI QR"><img src={qrUrl} alt="Trusted Circle UPI QR" /><span className="qr-expand-hint"><Maximize2 size={13} /> Tap to enlarge</span></button>
                <div className="gateway-upi-copy"><img className="upi-logo-image checkout-upi-logo compact-logo" src={UPI_LOGO_URL} alt="UPI" /><span className="gateway-mini-label">SCAN &amp; PAY</span><h2>{money(total)}</h2><p>Scan with any UPI app. Then return to Trusted Circle.</p><div className="gateway-note"><ShieldCheck size={14} /> Cashback is added after verified payment.</div></div>
              </div>}

              {selected === 'link' && <div className="gateway-link-area">
                <div className="gateway-link-panel"><div className="gateway-link-icon"><Link2 size={22} /></div><div><span className="gateway-mini-label">SECURE PAYMENT LINK</span><strong>Pay through the assigned link</strong><p>One stocked link is reserved for this order for 3 hours. Once the link is received, it remains valid for the full 3-hour reservation period.</p></div></div>
                <div className="gateway-link-methods"><span><CheckCircle2 size={14} /> UPI</span><span><CheckCircle2 size={14} /> Cards*</span><span><CheckCircle2 size={14} /> Other provider methods</span></div>
                <div className={`gateway-link-status ${activeLink ? 'active' : ''} ${linkLoading ? 'loading' : ''}`}>
                  <div><strong>{linkLoading ? 'Getting your payment link' : activeLink ? 'Payment link ready' : 'Get payment link'}</strong><span>{paymentLinkMessage}</span></div>
                  {activeLink ? <a className="gateway-pay-button gateway-pay-link" href={linkRequest.link} target="_blank" rel="noreferrer"><Link2 size={17} /> Pay with linked payment <ChevronRight size={17} /></a> : <button className="gateway-pay-button" type="button" onClick={requestPaymentLink} disabled={overLimit || linkLoading}>{linkLoading ? `Getting link… ${linkWaitSeconds}s` : overLimit ? 'Limit ₹2,000' : 'Get payment link'}</button>}
                </div>
                <p className="gateway-link-footnote">* Card availability is controlled by the payment-link provider. Trusted Circle does not collect separate card details. The assigned payment link and its order reservation are valid for 3 hours.</p>
              </div>}

              <div className="gateway-amount-bar"><div><small>PAY NOW</small><strong>{money(total)}</strong></div>{selected === 'upiapps' && <a className="gateway-pay-button gateway-pay-link" href={mode === 'order' ? UPI_URI : '#'} onClick={startUpiPayment} aria-disabled={overLimit}><Smartphone size={17} /> Pay with UPI Apps <ChevronRight size={17} /></a>}</div>
              <p className="gateway-disclaimer"><LockKeyhole size={12} /> Payment is checked before cashback is added.</p>
            </div>
          </div>
        </section>
      </div>

      {linkLoading && <div className="payment-link-loading-overlay" role="status" aria-live="polite"><div className="payment-link-loading-card"><div className="payment-link-logo-wrap"><img src={logoUrl} alt="Trusted Circle" /></div><strong>Wait, payment link is getting...</strong><span>Your secure payment link is being prepared.</span><div className="payment-link-loading-track"><i style={{ width: `${((LINK_WAIT_SECONDS - linkWaitSeconds) / LINK_WAIT_SECONDS) * 100}%` }} /></div><small>Maximum wait time: 30 seconds</small><b>{linkWaitSeconds}s</b></div></div>}

      {qrOpen && <div className="qr-lightbox" role="dialog" aria-modal="true" aria-label="UPI QR" onClick={() => setQrOpen(false)}><div className="qr-lightbox-card" onClick={event => event.stopPropagation()}><button className="qr-lightbox-close" onClick={() => setQrOpen(false)} aria-label="Close QR"><X size={18} /></button><img src={qrUrl} alt="Trusted Circle UPI QR" /><strong>Scan to pay {money(total)}</strong><span>Use any UPI app.</span></div></div>}
    </div>
  )
}
