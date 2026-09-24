import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronRight, Clock3, Link2, LockKeyhole, Mail, MessageCircle, ShieldCheck, X } from 'lucide-react'
import { api } from '../api'
import './PaymentGateway.css'

const LINK_WAIT_SECONDS = 50
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

export default function PaymentGateway({ mode = 'checkout', user, items = [], total, cashback = 0, logoUrl, onBack, onCreateOrder, orderId = '' }) {
  const [linkRequest, setLinkRequest] = useState(null)
  const [linkWaitSeconds, setLinkWaitSeconds] = useState(0)
  const [linkValidSeconds, setLinkValidSeconds] = useState(0)
  const [linkLoading, setLinkLoading] = useState(false)
  const [paymentCheck, setPaymentCheck] = useState('idle')
  const [paymentCheckMessage, setPaymentCheckMessage] = useState('')
  const [paymentCheckLoading, setPaymentCheckLoading] = useState(false)
  const overLimit = Number(total) > 2000
  const activeLink = Boolean(linkRequest?.link && linkValidSeconds > 0)
  const orderRef = linkRequest?.orderId || orderId
  const checkPayment = async () => {
    if (!orderRef || paymentCheckLoading) return
    setPaymentCheckLoading(true)
    setPaymentCheck('checking')
    setPaymentCheckMessage('Checking the latest payment status…')
    try {
      const token = localStorage.getItem('tc_session')
      if (!token) throw new Error('Please sign in again.')
      try { await api.paymentCheckRequested(token, orderRef) } catch (_) {}
      let latest = null
      for (let attempt = 0; attempt < 6; attempt += 1) {
        latest = await api.orderDetails(token, orderRef)
        const status = String(latest?.payment?.Status || latest?.order?.PaymentStatus || '').toUpperCase()
        const orderStatus = String(latest?.order?.Status || '').toUpperCase()
        if (['PAID','VERIFIED','SUCCESS','CAPTURED'].includes(status) || ['PAID','DELIVERED','COMPLETED'].includes(orderStatus)) {
          setPaymentCheck('paid')
          setPaymentCheckMessage('Payment received. Your order status has been updated.')
          return
        }
        if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 3000))
      }
      setPaymentCheck('pending')
      setPaymentCheckMessage('Payment is still pending verification. If you have completed payment, please check again shortly.')
    } catch (error) {
      setPaymentCheck('retry')
      setPaymentCheckMessage(error.message || 'We could not check the payment status. Please try again.')
    } finally {
      setPaymentCheckLoading(false)
    }
  }
  const sharePaymentLink = kind => {
    if (!linkRequest?.link) return
    const text = 'Trusted Circle payment link — ' + money(total) + '\n' + linkRequest.link
    if (kind === 'whatsapp') window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer')
    else window.location.href = 'mailto:' + encodeURIComponent(user?.email || '') + '?subject=' + encodeURIComponent('Trusted Circle payment link') + '&body=' + encodeURIComponent(text)
  }

  useEffect(() => {
    if (!linkLoading && !linkRequest?.link) return undefined
    const timer = setInterval(() => {
      if (linkLoading) setLinkWaitSeconds(value => Math.max(0, value - 1))
      if (linkRequest?.link) setLinkValidSeconds(value => Math.max(0, value - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [linkLoading, linkRequest?.link])

  

  const requestPayment = async () => {
    if (overLimit || linkLoading) return

    // IMPORTANT: reserve the popup synchronously inside the user's click.
    // Opening it only after the async Apps Script request completes can be
    // treated as an unsolicited popup and blocked by the browser.
    const isMobileViewport = window.matchMedia('(max-width: 760px)').matches
    // Mobile browsers often ignore popup dimensions and render the temporary
    // about:blank document in a tiny desktop viewport. Use the current tab on
    // phones so the payment provider opens in the full mobile viewport.
    let popup = null
    if (!isMobileViewport) {
      const popupWidth = 500
      const popupHeight = 620
      const left = Math.max(0, Math.round((window.screen.availWidth - popupWidth) / 2))
      const top = Math.max(0, Math.round((window.screen.availHeight - popupHeight) / 2))
      popup = window.open(
        'about:blank',
        'TrustedCirclePayment',
        `popup=yes,width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=yes`
      )
    }

    // Show a useful temporary state in the reserved popup instead of leaving
    // the customer with a blank about:blank window while Apps Script generates
    // the secure payment link.
    if (popup && !popup.closed) {
      try {
        popup.document.title = 'Trusted Circle — Preparing Payment'
        const viewport = popup.document.createElement('meta')
        viewport.name = 'viewport'
        viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover'
        popup.document.head.appendChild(viewport)
        popup.document.body.style.cssText = 'margin:0;width:100%;min-width:0;overflow:hidden;background:#f7faf8;'
        popup.document.body.innerHTML = `
          <div style="width:100%;min-height:100svh;display:flex;align-items:center;justify-content:center;margin:0;padding:24px;box-sizing:border-box;background:#f7faf8;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#17352a;text-align:center;">
            <div style="max-width:360px;">
              <div style="width:58px;height:58px;margin:0 auto 22px;border-radius:18px;background:#e6f5ed;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(18,90,61,.10);">
                <div style="width:24px;height:24px;border:3px solid #b8ddca;border-top-color:#138a5b;border-radius:50%;animation:tcSpin .85s linear infinite;"></div>
              </div>
              <div style="font-size:18px;font-weight:700;margin-bottom:8px;">Please wait…</div>
              <div style="font-size:14px;line-height:1.6;color:#5c6d65;">Your secure payment link is being generated. This window will open the payment page automatically.</div>
              <div style="margin-top:18px;font-size:12px;color:#819088;">Trusted Circle • Secure Payment</div>
            </div>
          </div>
          <style>@keyframes tcSpin{to{transform:rotate(360deg)}}</style>
        `
      } catch (_) {
        // The payment flow can continue even if the temporary document cannot
        // be written in the newly opened window.
      }
    }

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
      setLinkRequest({ link, expiresAt, orderId: result?.order?.order?.OrderID || result?.order?.OrderID || orderId })
      setLinkValidSeconds(validSeconds || LINK_VALIDITY_SECONDS)
      setLinkWaitSeconds(0)

      if (isMobileViewport) {
        // Keep mobile payment in the current full-screen tab. This avoids the
        // tiny about:blank viewport shown by some Android Chrome builds.
        api.paymentLinkOpened(token, result?.order?.order?.OrderID || result?.order?.OrderID || orderId).catch(()=>{})
        if (mode === 'checkout' && typeof onCreateOrder === 'function') {
          onCreateOrder(result)
        }
        window.location.assign(link)
      } else if (popup && !popup.closed) {
        popup.location.replace(link)
        popup.focus()
        api.paymentLinkOpened(token, result?.order?.order?.OrderID || result?.order?.OrderID || orderId).catch(()=>{})
        if (mode === 'checkout' && typeof onCreateOrder === 'function') {
          onCreateOrder(result)
        }
      } else {
        setLinkRequest({ link, expiresAt, orderId: result?.order?.order?.OrderID || result?.order?.OrderID || orderId, error: 'Your browser blocked the payment window. Use the Open payment page button below, or allow popups for Trusted Circle.' })
      }
    } catch (error) {
      if (popup && !popup.closed) popup.close()
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
            <div><span className="gateway-kicker">PAYMENT</span><h1>{mode === 'checkout' ? 'Payment' : 'Pay pending order'}</h1></div>
            <button className="gateway-close" onClick={onBack} aria-label="Close payment"><X size={16} /></button>
          </div>

          <div className="gateway-single-payment">
            <div className="gateway-single-icon"><Link2 size={24} /></div>
            <span className="gateway-mini-label">SECURE PAYMENT</span>
            <h2>{money(total)}</h2>
            <strong>{linkLoading ? 'Preparing payment…' : activeLink ? 'Payment link ready' : 'Ready to pay?'}</strong>
            {linkLoading ? <div className="gateway-link-progress" role="progressbar" aria-label="Preparing secure payment link" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.min(100,Math.max(0,((LINK_WAIT_SECONDS-linkWaitSeconds)/LINK_WAIT_SECONDS)*100))}><i style={{width:`${Math.min(100,Math.max(0,((LINK_WAIT_SECONDS-linkWaitSeconds)/LINK_WAIT_SECONDS)*100))}%`}} /></div> : activeLink ? <p>Link valid for {formatDuration(linkValidSeconds)}.</p> : null}
            <button className="gateway-pay-button gateway-primary-action" type="button" onClick={requestPayment} disabled={overLimit || linkLoading}>
              {linkLoading ? 'Preparing secure payment…' : activeLink ? 'Make Payment Again' : 'Make Payment'}
              <ChevronRight size={17} />
            </button>
            {overLimit && <div className="gateway-note"><ShieldCheck size={14} /> Maximum order value is ₹2,000.</div>}
            {linkRequest?.error && <div className="gateway-error"><X size={15} /><span>{linkRequest.error}</span></div>}
            {linkRequest?.link && linkRequest?.error && <a className="gateway-pay-button gateway-fallback-link" href={linkRequest.link} target="_blank" rel="noopener noreferrer" onClick={()=>{const token=localStorage.getItem('tc_session');const id=linkRequest?.orderId||orderId;if(token&&id)api.paymentLinkOpened(token,id).catch(()=>{})}}><Link2 size={17} /> Open payment page <ChevronRight size={17} /></a>}
            {activeLink && paymentCheck === 'idle' && <div className="gateway-payment-actions">
              <button className="gateway-secondary-action" type="button" onClick={checkPayment} disabled={paymentCheckLoading}><CheckCircle2 size={16}/> I completed payment — Check status</button>
              <div className="gateway-share-row"><span>Send payment link</span><button type="button" onClick={()=>sharePaymentLink('whatsapp')}><MessageCircle size={15}/> WhatsApp</button><button type="button" onClick={()=>sharePaymentLink('email')}><Mail size={15}/> Email</button></div>
            </div>}
            {paymentCheck !== 'idle' && <div className={'gateway-payment-check gateway-payment-check-' + paymentCheck}>
              {paymentCheck === 'checking' ? <Clock3 size={20}/> : paymentCheck === 'paid' ? <CheckCircle2 size={20}/> : <ShieldCheck size={20}/>}
              <div><strong>{paymentCheck === 'checking' ? 'Checking payment…' : paymentCheck === 'paid' ? 'Payment received' : paymentCheck === 'pending' ? 'Payment still pending' : 'Payment check needs a retry'}</strong><span>{paymentCheckMessage}</span></div>
              {paymentCheck !== 'paid' && <button type="button" onClick={paymentCheck === 'pending' ? checkPayment : requestPayment} disabled={paymentCheckLoading}>{paymentCheck === 'pending' ? 'Check again' : 'Retry payment'} <ChevronRight size={15}/></button>}
            </div>}
            {activeLink && <div className="gateway-return-card"><Clock3 size={17} /><div><strong>After payment</strong><span>Return to My Orders to see the updated payment status. Cashback is added only after payment verification.</span></div></div>}
          </div>

          <div className="gateway-amount-bar">
            <div><small>PAY NOW</small><strong>{money(total)}</strong></div>
            <span><ShieldCheck size={14} /> Secure payment link</span>
          </div>
          <p className="gateway-disclaimer"><LockKeyhole size={12} /> Payment is handled on the provider page. Never share your OTP, card number, CVV or UPI PIN.</p>
        </section>
      </div>


    </div>
  )
}
