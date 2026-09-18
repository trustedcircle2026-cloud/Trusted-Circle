import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronRight, Clock3, Link2, LockKeyhole, ShieldCheck, X } from 'lucide-react'
import { api } from '../api'
import './PaymentGateway.css'

const LINK_WAIT_SECONDS = 30
const LINK_VALIDITY_SECONDS = 3 * 60 * 60
const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const formatDuration = seconds => {
  const value = Math.max(0, Number(seconds || 0))
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  const secs = value % 60
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : `${minutes}:${String(secs).padStart(2, '0')}`
}
const extractPaymentLink = value => {
  const candidates = [
    value?.paymentLink?.Link, value?.paymentLink?.link, value?.paymentLink?.url,
    value?.Link, value?.link, value?.url, value?.URL,
    value?.order?.paymentLink?.Link, value?.order?.paymentLink?.link
  ]
  for (const candidate of candidates) if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate)) return candidate
  return ''
}

export default function PaymentGateway({ mode = 'checkout', user, items = [], total, cashback = 0, logoUrl, onBack, orderId = '' }) {
  const [linkRequest, setLinkRequest] = useState(null)
  const [linkWaitSeconds, setLinkWaitSeconds] = useState(0)
  const [linkValidSeconds, setLinkValidSeconds] = useState(0)
  const [linkLoading, setLinkLoading] = useState(false)
  const overLimit = Number(total) > 2000
  const activeLink = Boolean(linkRequest?.link && linkValidSeconds > 0)

  useEffect(() => {
    if (!linkLoading && !linkRequest?.link) return undefined
    const timer = setInterval(() => {
      if (linkLoading) setLinkWaitSeconds(value => Math.max(0, value - 1))
      if (linkRequest?.link) setLinkValidSeconds(value => Math.max(0, value - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [linkLoading, linkRequest?.link])

  const openPaymentWindow = () => {
    const width = Math.min(560, Math.max(390, (window.screen?.availWidth || 600) - 30))
    const height = Math.min(900, Math.max(700, (window.screen?.availHeight || 800) - 50))
    const left = Math.max(0, Math.round(((window.screen?.availWidth || width) - width) / 2))
    const top = Math.max(0, Math.round(((window.screen?.availHeight || height) - height) / 2))
    const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,noopener=yes,noreferrer=yes`
    const popup = window.open('about:blank', 'trustedcircle-payment', features)
    if (!popup) return null
    try {
      popup.document.title = 'Trusted Circle — Payment'
      popup.document.body.innerHTML = '<p style="font:600 15px system-ui;padding:32px">Preparing secure payment…</p>'
    } catch {}
    popup.focus?.()
    return popup
  }

  const requestPayment = async () => {
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
      if (!link) throw new Error('Payment link was not returned. Please try again.')
      const expiresAt = result?.expiresAt || result?.paymentLink?.ExpiresAt || ''
      const validSeconds = expiresAt ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)) : LINK_VALIDITY_SECONDS
      setLinkRequest({ link, expiresAt })
      setLinkValidSeconds(validSeconds || LINK_VALIDITY_SECONDS)
      setLinkWaitSeconds(0)
      const popup = openPaymentWindow()
      if (popup && !popup.closed) {
        popup.location.href = link
        popup.focus?.()
      } else {
        setLinkRequest({ link, expiresAt, popupBlocked: true })
      }
    } catch (error) {
      setLinkRequest({ error: error.message || 'Could not prepare payment.' })
      setLinkWaitSeconds(0)
      setLinkValidSeconds(0)
    } finally {
      setLinkLoading(false)
    }
  }

  return (
    <div className={`payment-gateway payment-gateway-${mode}`}>
      <div className="gateway-shell">
        {mode === 'checkout' && <aside className="gateway-summary">
          <div className="gateway-summary-brand">
            <div className="gateway-logo"><img src={logoUrl} alt="Trusted Circle" /></div>
            <div><strong>Trusted Circle</strong><small>Gift Vouchers</small></div>
          </div>
          <div className="gateway-stepper">
            <span className="done">1</span><div><b>Cart</b><small>{items.length} item{items.length === 1 ? '' : 's'}</small></div>
            <span className="active">2</span><div><b>Payment</b><small>Secure payment</small></div>
          </div>
          <div className="gateway-price-label">PAY NOW</div>
          <div className="gateway-total">{money(total)}</div>
          <div className="gateway-account-pill"><CheckCircle2 size={15} /><span>{user?.email || 'Signed in'}</span></div>
          <div className="gateway-order-lines">
            <div><span>Voucher value</span><b>{money(total)}</b></div>
            <div><span>Cashback</span><b className="gateway-green">+ {money(cashback)}</b></div>
          </div>
          {overLimit && <div className="gateway-note"><ShieldCheck size={14} /> Order limit is ₹2,000. Remove items to continue.</div>}
          <div className="gateway-summary-footer"><ShieldCheck size={16} /><span>Cashback is added after payment verification.</span></div>
        </aside>}

        <section className="gateway-payment">
          <div className="gateway-payment-head">
            <div><span className="gateway-kicker">PAYMENT</span><h1>{mode === 'checkout' ? 'Complete your payment' : 'Pay pending order'}</h1><p>Click once. We will wait for the secure payment link to be fully assigned before opening the payment page.</p></div>
            <button className="gateway-close" onClick={onBack} aria-label="Close payment"><X size={16} /></button>
          </div>

          <div className="gateway-single-payment">
            <div className="gateway-single-icon"><Link2 size={24} /></div>
            <span className="gateway-mini-label">SECURE PAYMENT</span>
            <h2>{money(total)}</h2>
            <strong>{linkLoading ? 'Preparing payment…' : activeLink ? 'Payment link ready' : 'Ready to pay?'}</strong>
            <p>{linkLoading ? `Getting your payment link… ${linkWaitSeconds}s` : activeLink ? `Link valid for ${formatDuration(linkValidSeconds)}.` : 'Click Make Payment once. Your assigned secure payment page will open automatically.'}</p>
            <button className="gateway-pay-button gateway-primary-action" type="button" onClick={requestPayment} disabled={overLimit || linkLoading}>
              {linkLoading ? `Getting payment link… ${linkWaitSeconds}s` : activeLink ? 'Open payment again' : 'Make Payment'}
              <ChevronRight size={17} />
            </button>
            {overLimit && <div className="gateway-note"><ShieldCheck size={14} /> Maximum order value is ₹2,000.</div>}
            {linkRequest?.popupBlocked && activeLink && <button className="gateway-fallback-open" type="button" onClick={() => window.open(linkRequest.link, '_blank', 'noopener,noreferrer')}>Open payment page</button>}
            {linkRequest?.error && <div className="gateway-error"><X size={15} /><span>{linkRequest.error}</span></div>}
            {activeLink && <div className="gateway-return-card"><Clock3 size={17} /><div><strong>After payment</strong><span>Return to My Orders to see the updated payment status. Cashback is added only after payment verification.</span></div></div>}
          </div>

          <div className="gateway-amount-bar">
            <div><small>PAY NOW</small><strong>{money(total)}</strong></div>
            <span><ShieldCheck size={14} /> Secure payment link</span>
          </div>
          <p className="gateway-disclaimer"><LockKeyhole size={12} /> Payment is handled on the provider page. Never share your OTP, card number, CVV or UPI PIN.</p>
        </section>
      </div>

      {linkLoading && <div className="payment-link-loading-overlay" role="status" aria-live="polite">
        <div className="payment-link-loading-card">
          <div className="payment-link-logo-wrap"><img src={logoUrl} alt="Trusted Circle" /></div>
          <strong>Preparing your payment</strong>
          <span>Getting your secure payment link…</span>
          <div className="payment-link-loading-track"><i style={{ width: `${((LINK_WAIT_SECONDS - linkWaitSeconds) / LINK_WAIT_SECONDS) * 100}%` }} /></div>
          <small>Maximum wait time: 30 seconds</small><b>{linkWaitSeconds}s</b>
        </div>
      </div>}
    </div>
  )
}
