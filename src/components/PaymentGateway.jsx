import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ChevronRight, Clock3, Link2, LockKeyhole, MessageCircle, ShieldCheck, X, RefreshCw, Home, PackageCheck, AlertCircle, Ban } from 'lucide-react'
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

export default function PaymentGateway({ mode = 'checkout', user, items = [], total, cashback = 0, logoUrl, onBack, onCreateOrder, onOrders, orderId = '' }) {
  const [linkRequest, setLinkRequest] = useState(null)
  const [linkWaitSeconds, setLinkWaitSeconds] = useState(0)
  const [linkValidSeconds, setLinkValidSeconds] = useState(0)
  const [linkLoading, setLinkLoading] = useState(false)
  const [paymentCheck, setPaymentCheck] = useState('idle')
  const [paymentCheckMessage, setPaymentCheckMessage] = useState('')
  const [paymentCheckLoading, setPaymentCheckLoading] = useState(false)
  const [verificationStartedAt, setVerificationStartedAt] = useState(0)
  const [verificationSeconds, setVerificationSeconds] = useState(0)
  const [verified, setVerified] = useState(false)
  const [orderPlacedOpen, setOrderPlacedOpen] = useState(false)
  const [gatewayOutcome, setGatewayOutcome] = useState('pending')
  const [outcomePopup, setOutcomePopup] = useState(null)
  const [latestOrder, setLatestOrder] = useState(null)
  const linkRequestInFlight = useRef(false)
  const overLimit = Number(total) > 2000
  const activeLink = Boolean(linkRequest?.link && linkValidSeconds > 0)
  const orderRef = linkRequest?.orderId || orderId
  const readPaymentStatus = async ({showResult=true}={}) => {
    if (!orderRef || paymentCheckLoading) return false
    setPaymentCheckLoading(true)
    if (showResult) {
      setPaymentCheck('checking')
      setPaymentCheckMessage('Checking the latest payment status…')
    }
    try {
      const token = localStorage.getItem('tc_session')
      if (!token) throw new Error('Please sign in again.')
      const latest = await api.orderDetails(token, orderRef)
      const status = String(latest?.payment?.Status || latest?.order?.PaymentStatus || '').toUpperCase()
      const orderStatus = String(latest?.order?.Status || '').toUpperCase()
      if (latest?.order) setLatestOrder(latest.order)
      const paid = ['PAID','VERIFIED','SUCCESS','CAPTURED'].includes(status) || ['PAID','DELIVERED','COMPLETED'].includes(orderStatus)
      if (paid) {
        setPaymentCheck('paid')
        setPaymentCheckMessage('Payment received. Your order status has been updated.')
        setGatewayOutcome('received')
        setOrderPlacedOpen(false)
        setOutcomePopup(null)
        setVerified(true)
        setVerificationStartedAt(0)
        setVerificationSeconds(0)
        return true
      }
      if (orderStatus === 'CANCELLED') {
        setGatewayOutcome('cancelled')
        setOrderPlacedOpen(false)
        setOutcomePopup('cancelled')
        setPaymentCheck('cancelled')
        setPaymentCheckMessage('This order was cancelled by Trusted Circle. Please create a new order to continue.')
        setVerificationStartedAt(0)
        setVerificationSeconds(0)
        setVerified(false)
        return false
      }
      if (status === 'NOT_RECEIVED') {
        setGatewayOutcome('not_received')
        setOrderPlacedOpen(false)
        setOutcomePopup('not_received')
        setPaymentCheck('retry')
        setPaymentCheckMessage('The previous payment attempt was not received. You can create a fresh payment link.')
        return false
      }
      if (showResult) {
        setPaymentCheck('pending')
        setPaymentCheckMessage('Payment is still pending verification. The status will update automatically.')
      }
      return false
    } catch (error) {
      if (showResult) {
        setPaymentCheck('retry')
        setPaymentCheckMessage(error.message || 'We could not check the payment status. Please try again.')
      }
      return false
    } finally {
      setPaymentCheckLoading(false)
    }
  }
  const checkPayment = async () => {
    let paid = false
    for (let attempt = 0; attempt < 6; attempt += 1) {
      paid = await readPaymentStatus()
      if (paid) return
      if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }

  const shareOrder = () => {
    const order = latestOrder || {}
    const number = order.OrderNumber || linkRequest?.orderNumber || orderId || 'N/A'
    const paymentStatus = String(order.PaymentStatus || (gatewayOutcome === 'received' ? 'PAID / VERIFIED' : gatewayOutcome === 'not_received' ? 'PAYMENT FAILED' : 'PENDING')).replaceAll('_', ' ')
    const orderStatus = String(order.Status || (gatewayOutcome === 'received' ? 'ORDER PLACED' : 'PENDING PAYMENT')).replaceAll('_', ' ')
    const amount = money(order.Total || total)
    const subtotal = money(order.Subtotal || total)
    const cashbackAmount = money(order.Discount || cashback)
    const createdAt = order.CreatedAt ? new Date(order.CreatedAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')
    const itemLines = (items || []).map((item, index) => {
      const title = item.title || item.Title || item.product?.Title || item.BrandName || item.Brand || 'Gift Voucher'
      const qty = Number(item.quantity || item.Quantity || 1)
      const face = Number(item.faceValue || item.denomination || item.Denomination || item.FaceValue || 0)
      const lineTotal = Number(item.total || item.Total || face * qty)
      return `${index + 1}. ${title} × ${qty} — ${money(lineTotal)}`
    }).join('\n')
    const text = [
      '🎉 TRUSTED CIRCLE — ORDER DETAILS',
      '',
      `Order Number: ${number}`,
      `Order Status: ${orderStatus}`,
      `Payment Status: ${paymentStatus}`,
      `Order Date: ${createdAt}`,
      '',
      'ITEMS:',
      itemLines || 'Gift Voucher order',
      '',
      `Subtotal: ${subtotal}`,
      `Cashback: ${cashbackAmount}`,
      `Total Paid: ${amount}`,
      '',
      'Payment verified by Trusted Circle.' 
    ].join('\n')
    window.open('https://wa.me/919442456039?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer')
  }

  const sharePaymentLink = kind => {
    if (!linkRequest?.link) return
    const text = 'Trusted Circle payment link — ' + money(total) + '\n' + linkRequest.link
    if (kind === 'whatsapp') window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer')
    else window.location.href = 'mailto:' + encodeURIComponent(user?.email || '') + '?subject=' + encodeURIComponent('Trusted Circle payment link') + '&body=' + encodeURIComponent(text)
  }

  useEffect(() => {
    if (!verificationStartedAt || !orderRef || verified) return undefined
    const tick = () => {
      const remaining = Math.max(0, 120 - Math.floor((Date.now() - verificationStartedAt) / 1000))
      setVerificationSeconds(remaining)
    }
    tick()
    const timer = window.setInterval(() => {
      tick()
      if (Date.now() - verificationStartedAt >= 120000) {
        window.clearInterval(timer)
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [verificationStartedAt, orderRef, verified])

  useEffect(() => {
    if (!verificationStartedAt || !orderRef || verified) return undefined
    let active = true
    let timer = null
    const poll = async () => {
      if (!active) return
      const paid = await readPaymentStatus({showResult:false})
      if (!active || paid) return
      if (Date.now() - verificationStartedAt < 120000) {
        timer = window.setTimeout(poll, 5000)
      }
    }
    poll()
    return () => {
      active = false
      if (timer) window.clearTimeout(timer)
    }
  }, [verificationStartedAt, orderRef, verified])

  useEffect(() => {
    if (!linkLoading && !linkRequest?.link) return undefined
    const timer = setInterval(() => {
      if (linkLoading) setLinkWaitSeconds(value => Math.max(0, value - 1))
      if (linkRequest?.link) setLinkValidSeconds(value => Math.max(0, value - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [linkLoading, linkRequest?.link])

  

  const openResolvedPayment = () => {
    const link = String(linkRequest?.link || '').trim()
    if (!link) return
    window.open(link, '_blank', 'noopener,noreferrer')
    const token = localStorage.getItem('tc_session')
    const id = linkRequest?.orderId || orderId
    if (token && id) api.paymentLinkOpened(token, id).catch(()=>{})
  }

  const requestPayment = async () => {
    if (overLimit || linkLoading || linkRequestInFlight.current) return
    linkRequestInFlight.current = true

    // IMPORTANT: reserve the popup synchronously inside the user's click.
    // Opening it only after the async Apps Script request completes can be
    // treated as an unsolicited popup and blocked by the browser.
    const isMobileViewport = window.matchMedia('(max-width: 760px)').matches
    // Mobile browsers often ignore popup dimensions and render the temporary
    // about:blank document in a tiny desktop viewport. Use the current tab on
    // phones so the payment provider opens in the full mobile viewport.
    let popup = null
    if (isMobileViewport) {
      // IMPORTANT: reserve a real browser tab synchronously from the user's
      // tap. The payment URL is only assigned after Apps Script has returned
      // a valid link, so the original Trusted Circle tab keeps its session and
      // the customer can return to the order-confirmation popup.
      popup = window.open('about:blank', '_blank')
    } else {
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

    // The network request continues in the background after 10 seconds.
    // Only the blocking preparation UI is removed.
    let uiTimedOut = false
    const uiTimer = window.setTimeout(() => {
      uiTimedOut = true
      setLinkLoading(false)
      setLinkWaitSeconds(0)
      if (popup && !popup.closed) popup.close()
    }, 10000)

    try {
      const token = localStorage.getItem('tc_session')
      if (!token) throw new Error('Please sign in first.')
      let result
      if (orderId) {
        result = await api.requestPaymentLink(token, orderId)
      } else {
        if (!items.length) throw new Error('Your cart is empty.')
        result = await api.placeOrder(token, 'link')
      }

      const link = extractPaymentLink(result)
      if (!link) throw new Error('Payment link was not returned. Please try again.')
      const expiresAt = result?.expiresAt || result?.paymentLink?.ExpiresAt || ''
      const validSeconds = expiresAt ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)) : LINK_VALIDITY_SECONDS
      const resolvedOrderId = result?.order?.order?.OrderID || result?.order?.OrderID || orderId
      setLinkRequest({ link, expiresAt, orderId: resolvedOrderId, orderNumber: result?.order?.order?.OrderNumber || result?.order?.OrderNumber || '' })
      setLinkValidSeconds(validSeconds || LINK_VALIDITY_SECONDS)
      setLinkWaitSeconds(0)
      if (resolvedOrderId) {
        setOrderPlacedOpen(true)
        setOutcomePopup(null)
        setVerified(false)
        setGatewayOutcome('pending')
        const started = Date.now()
        setVerificationStartedAt(started)
        setVerificationSeconds(120)
        setPaymentCheck('checking')
        setPaymentCheckMessage('Payment status will update automatically after you return from the payment page.')
      }

      if (popup && !popup.closed) {
        // The tab was opened by the original user gesture. Keep the temporary
        // Trusted Circle loading screen visible until the real payment URL has
        // been generated, then navigate that same tab to the provider.
        popup.location.replace(link)
        popup.focus()
        api.paymentLinkOpened(token, result?.order?.order?.OrderID || result?.order?.OrderID || orderId).catch(()=>{})
        if (!orderId && typeof onCreateOrder === 'function') {
          onCreateOrder(result)
        }
      } else if (uiTimedOut) {
        // The original popup was intentionally closed after 10 seconds.
        // Keep the returned link on the normal checkout screen so the user
        // can open it manually without restarting the backend request.
        setLinkRequest({
          link,
          expiresAt,
          orderId: result?.order?.order?.OrderID || result?.order?.OrderID || orderId,
          orderNumber: result?.order?.order?.OrderNumber || result?.order?.OrderNumber || ''
        })
      } else {
        setLinkRequest({
          link,
          expiresAt,
          orderId: result?.order?.order?.OrderID || result?.order?.OrderID || orderId,
          error: isMobileViewport
            ? 'Payment tab was blocked. Allow pop-ups for Trusted Circle and tap Make Payment again.'
            : 'Your browser blocked the payment window. Use the Open payment page button below, or allow popups for Trusted Circle.'
        })
      }
    } catch (error) {
      if (popup && !popup.closed) popup.close()
      setLinkRequest({ error: error.message || 'Could not prepare payment.' })
      setLinkWaitSeconds(0)
      setLinkValidSeconds(0)
    } finally {
      window.clearTimeout(uiTimer)
      setLinkLoading(false)
      linkRequestInFlight.current = false
    }
  }

  const refreshPaymentStatus = async () => {
    await readPaymentStatus({showResult:true})
  }

  return (
    <div className={`payment-gateway payment-gateway-${mode}`}>
      <div className="gateway-shell">
        <aside className="gateway-summary">
          <div className="gateway-summary-brand">
            <div className="gateway-logo">{logoUrl && <img src={logoUrl} alt="Trusted Circle" />}</div>
            <div><strong>Trusted Circle</strong><small>Gift Vouchers</small></div>
          </div>
          <div className="gateway-stepper">
            <span className="done">1</span><div><b>{orderId ? 'Order' : 'Cart'}</b><small>{orderId ? (latestOrder?.OrderNumber || 'Existing order') : `${items.length} item${items.length === 1 ? '' : 's'}`}</small></div>
            <span className="active">2</span><div><b>Payment</b><small>Secure payment</small></div>
          </div>
          <div className="gateway-price-label">PAY NOW</div>
          <div className="gateway-total">{money(total)}</div>
          <div className="gateway-account-pill"><CheckCircle2 size={15} /><span>{user?.email || 'Trusted Circle account'}</span></div>
          <div className="gateway-order-lines">
            <div><span>Voucher value</span><b>{money(total)}</b></div>
            <div><span>Cashback</span><b className="gateway-green">+ {money(cashback)}</b></div>
          </div>
          {overLimit && <div className="gateway-note"><ShieldCheck size={14} /> Order limit is ₹2,000. Remove items to continue.</div>}
          <div className="gateway-summary-footer"><ShieldCheck size={16} /><span>Cashback is added after payment verification.</span></div>
        </aside>

        <section className="gateway-payment">
          <div className="gateway-payment-head">
            <div><span className="gateway-kicker">PAYMENT</span><h1>Secure Payment</h1><p>{orderId ? 'Complete payment for your pending order.' : 'Complete your order securely.'}</p></div>
            <button className="gateway-close" onClick={onBack} aria-label="Close payment"><X size={16} /></button>
          </div>

          <div className="gateway-single-payment">
            <div className="gateway-single-icon"><Link2 size={24} /></div>
            <span className="gateway-mini-label">SECURE PAYMENT</span>
            <h2>{money(total)}</h2>
            <strong>{linkLoading ? 'Preparing payment…' : activeLink ? 'Payment link ready' : 'Ready to pay?'}</strong>
            {linkLoading ? <div className="gateway-link-progress" role="progressbar" aria-label="Preparing secure payment link" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.min(100,Math.max(0,((LINK_WAIT_SECONDS-linkWaitSeconds)/LINK_WAIT_SECONDS)*100))}><i style={{width:`${Math.min(100,Math.max(0,((LINK_WAIT_SECONDS-linkWaitSeconds)/LINK_WAIT_SECONDS)*100))}%`}} /></div> : activeLink ? <p>Link valid for {formatDuration(linkValidSeconds)}.</p> : null}
            <button className="gateway-pay-button gateway-primary-action" type="button" onClick={activeLink ? openResolvedPayment : requestPayment} disabled={overLimit || linkLoading || linkRequestInFlight.current}>
              {linkLoading ? 'Preparing secure payment…' : activeLink ? 'Open Payment Page' : 'Make Payment'}
              <ChevronRight size={17} />
            </button>
            {overLimit && <div className="gateway-note"><ShieldCheck size={14} /> Maximum order value is ₹2,000.</div>}
            {linkRequest?.error && <div className="gateway-error"><X size={15} /><span>{linkRequest.error}</span></div>}
            {linkRequest?.link && linkRequest?.error && <a className="gateway-pay-button gateway-fallback-link" href={linkRequest.link} target="_blank" rel="noopener noreferrer" onClick={()=>{const token=localStorage.getItem('tc_session');const id=linkRequest?.orderId||orderId;if(token&&id)api.paymentLinkOpened(token,id).catch(()=>{})}}><Link2 size={17} /> Open payment page <ChevronRight size={17} /></a>}
            {activeLink && !verified && paymentCheck !== 'paid' && <div className="gateway-payment-actions">
              <button className="gateway-secondary-action" type="button" onClick={checkPayment} disabled={paymentCheckLoading}><CheckCircle2 size={16}/> I completed payment — Check status</button>
              <div className="gateway-share-row"><span>Send payment link</span><button type="button" onClick={()=>sharePaymentLink('whatsapp')}><MessageCircle size={15}/> WhatsApp</button></div>
            </div>}
            {paymentCheck !== 'idle' && <div className={'gateway-payment-check gateway-payment-check-' + paymentCheck}>
              {paymentCheck === 'checking' ? <Clock3 size={20}/> : paymentCheck === 'paid' ? <CheckCircle2 size={20}/> : <ShieldCheck size={20}/>}
              <div><strong>{paymentCheck === 'checking' ? 'Checking payment…' : paymentCheck === 'paid' ? 'Payment received' : paymentCheck === 'pending' ? 'Payment still pending' : 'Payment check needs a retry'}</strong><span>{paymentCheckMessage}</span></div>
              {paymentCheck !== 'paid' && <button type="button" onClick={paymentCheck === 'pending' ? checkPayment : requestPayment} disabled={paymentCheckLoading}>{paymentCheck === 'pending' ? 'Check again' : 'Retry payment'} <ChevronRight size={15}/></button>}
            </div>}
            {verificationStartedAt > 0 && !verified && <div className="payment-verification-card tc-premium-verification">
              <div className="payment-verification-icon tc-premium-verification-icon"><ShieldCheck size={20}/></div>
              <div className="payment-verification-copy tc-premium-verification-copy">
                <strong>Payment status checking</strong>
                <span>{verificationSeconds > 0 ? `We are checking the payment automatically for up to 2 minutes. ${verificationSeconds}s remaining.` : 'Automatic checking window ended. You can check the status again.'}</span>
                <div className="payment-verification-bar tc-premium-progress"><span style={{width:`${Math.max(0,Math.min(100,((120-verificationSeconds)/120)*100))}%`}} /></div>
              </div>
              <div className="payment-verification-live tc-premium-live"><i/> LIVE</div>
            </div>}
            {verified && <div className="payment-verification-card payment-verification-card-success">
              <div className="payment-verification-icon"><CheckCircle2 size={20}/></div>
              <div className="payment-verification-copy"><strong>Payment verified</strong><span>Your payment has been confirmed by Trusted Circle.</span></div>
            </div>}
            {activeLink && !verified && <div className="gateway-return-card"><Clock3 size={17} /><div><strong>After payment</strong><span>Return here. We will check the order automatically using the latest server payment status.</span></div></div>}
          </div>

          <div className="gateway-amount-bar">
            <div><small>PAY NOW</small><strong>{money(total)}</strong></div>
            <span><ShieldCheck size={14} /> Secure payment link</span>
          </div>
          <p className="gateway-disclaimer"><LockKeyhole size={12} /> Payment is handled on the provider page. Never share your OTP, card number, CVV or UPI PIN.</p>
        </section>
      </div>

      {orderPlacedOpen && <div className="order-placed-gateway-overlay" role="dialog" aria-modal="true">
        <div className="order-placed-gateway-modal tc-premium-surface">
          <button className="order-placed-gateway-refresh" type="button" onClick={refreshPaymentStatus} disabled={paymentCheckLoading} aria-label="Refresh payment status" title="Refresh payment status">
            <RefreshCw size={18} className={paymentCheckLoading ? 'is-spinning' : ''}/>
          </button>
          <div className="order-placed-gateway-ring"><div><CheckCircle2 size={70}/></div></div>
          <span className="eyebrow">ORDER CONFIRMATION</span>
          <h2>🎉 Your order is successfully placed!</h2>
          <p>Your order has been received. We are checking the payment status automatically.</p>
          <div className="order-placed-gateway-pill">
            <span>{linkRequest?.orderNumber || latestOrder?.OrderNumber || orderRef}</span>
            <strong>{money(latestOrder?.Total || total)}</strong>
          </div>
          <div className="tc-premium-verification order-placed-gateway-verification">
            <div className="tc-premium-verification-icon"><ShieldCheck size={20}/></div>
            <div className="tc-premium-verification-copy">
              <strong>Checking payment status</strong>
              <p>{verificationSeconds > 0 ? 'LIVE · Checking automatically for 2 minutes. ' + Math.floor(verificationSeconds/60) + ':' + String(verificationSeconds%60).padStart(2,'0') + ' remaining.' : 'The 2-minute automatic checking window has ended. Use refresh to check again.'}</p>
              <div className="tc-premium-progress"><span style={{width:`${Math.max(0,Math.min(100,((120-verificationSeconds)/120)*100))}%`}}/></div>
            </div>
            <div className="tc-premium-live"><i/> LIVE</div>
          </div>
          <div className="order-placed-gateway-actions">
            <button type="button" className="order-placed-home-btn" onClick={onBack}><Home size={17}/> Home</button>
            <button type="button" className="order-placed-orders-btn" onClick={onOrders || onBack}><PackageCheck size={17}/> View Orders</button>
          </div>
        </div>
      </div>}

      {outcomePopup && <div className={`order-placed-gateway-overlay gateway-outcome-${outcomePopup}`} role="dialog" aria-modal="true">
        <div className="order-placed-gateway-modal tc-premium-surface">
          <button className="order-placed-gateway-refresh" type="button" onClick={refreshPaymentStatus} disabled={paymentCheckLoading} aria-label="Refresh payment status" title="Refresh payment status">
            <RefreshCw size={18} className={paymentCheckLoading ? 'is-spinning' : ''}/>
          </button>
          {outcomePopup === 'not_received' ? (
            <>
              <div className="order-placed-gateway-ring outcome-failed"><div><AlertCircle size={70}/></div></div>
              <span className="eyebrow">PAYMENT FAILED</span>
              <h2>Payment was not received</h2>
              <p>The previous payment attempt was not received. Please retry again to complete your order.</p>
            </>
          ) : (
            <>
              <div className="order-placed-gateway-ring outcome-cancelled"><div><X size={68}/></div></div>
              <span className="eyebrow">ORDER CANCELLED</span>
              <h2>Your order is cancelled</h2>
              <p>This order was rejected by Trusted Circle and cannot be paid again.</p>
            </>
          )}
          <div className="order-placed-gateway-pill">
            <span>{linkRequest?.orderNumber || latestOrder?.OrderNumber || orderRef}</span>
            <strong>{money(latestOrder?.Total || total)}</strong>
          </div>
          <div className={`tc-premium-status ${outcomePopup === 'not_received' ? 'failed' : 'success'} order-outcome-status`}>
            <div className="status-icon">{outcomePopup === 'not_received' ? <AlertCircle size={19}/> : <X size={19}/>}</div>
            <div>
              <strong>{outcomePopup === 'not_received' ? 'Payment attempt failed' : 'Order cancelled'}</strong>
              <p>{outcomePopup === 'not_received' ? 'A new payment link can be generated immediately.' : 'Please create a new order if you wish to continue.'}</p>
            </div>
          </div>
          <div className="order-placed-gateway-actions">
            {outcomePopup === 'not_received' ? (
              <>
                <button type="button" className="order-placed-orders-btn" onClick={()=>{setOutcomePopup(null);requestPayment()}} disabled={linkLoading}>
                  <RefreshCw size={17}/>{linkLoading ? 'Preparing…' : 'Retry Payment'}
                </button>
                <button type="button" className="order-placed-home-btn" onClick={()=>{setOutcomePopup(null);onOrders ? onOrders() : onBack?.()}}><PackageCheck size={17}/> View Orders</button>
              </>
            ) : (
              <>
                <button type="button" className="order-placed-home-btn" onClick={()=>{setOutcomePopup(null);onBack?.()}}><Home size={17}/> Home</button>
                <button type="button" className="order-placed-orders-btn" onClick={()=>{setOutcomePopup(null);onOrders ? onOrders() : onBack?.()}}><PackageCheck size={17}/> View Orders</button>
              </>
            )}
          </div>
        </div>
      </div>}

      {verified && !orderPlacedOpen && <div className="delivery-modal-backdrop payment-verified-overlay" role="dialog" aria-modal="true">
        <div className="payment-verified-modal tc-premium-surface">
          <span className="verified-confetti confetti-one"/>
          <span className="verified-confetti confetti-two"/>
          <span className="verified-confetti confetti-three"/>
          <div className="verified-hero-ring"><div className="verified-hero-check"><CheckCircle2 size={72}/></div></div>
          <span className="eyebrow">PAYMENT VERIFIED</span>
          <h2>Payment successful</h2>
          <p>Your payment has been confirmed and the order is now moving to the next stage.</p>
          <div className="verified-order-pill"><span>{latestOrder?.OrderNumber || linkRequest?.orderNumber || orderId}</span><strong>{money(latestOrder?.Total || total)}</strong></div>
          <div className="verified-actions">
            <button className="verified-share-btn" type="button" onClick={shareOrder}><MessageCircle size={17}/> Share Order</button>
            <button className="verified-orders-btn" type="button" onClick={()=>{setVerified(false);if(typeof onOrders==='function')onOrders();else onBack?.()}}>View Orders</button>
          </div>
        </div>
      </div>}
    </div>
  )
}
