import { useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, ChevronRight, CreditCard, Landmark, Link2, LockKeyhole, Maximize2, Smartphone, WalletCards, ShieldCheck, X, QrCode } from 'lucide-react'
import { api } from '../api'
import './checkout-gateway.css'
const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const UPI_APPS_URL = 'upi://pay?pa=paytm.s2eunub@pty&pn=Paytm&tn=Verified%20Paytm%20Account'
const methods = [
  { id: 'qr', label: 'QR Code', icon: QrCode },
  { id: 'upiapps', label: 'UPI Apps', icon: Smartphone },
  { id: 'cards', label: 'Cards', icon: CreditCard },
  { id: 'netbanking', label: 'Netbanking', icon: Landmark },
  { id: 'wallet', label: 'Wallet', icon: WalletCards },
  { id: 'link', label: 'Payment Link', icon: Link2 },
]
export default function CheckoutPage({ user, items, total, savings, paymentMethod, setPaymentMethod, qrUrl, logoUrl, onBack, onCreateOrder }) {
  const [selected, setSelected] = useState(paymentMethod === 'upi' ? 'upiapps' : (paymentMethod || 'upiapps'))
  const [showMobileMethods, setShowMobileMethods] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [linkRequest, setLinkRequest] = useState(null)
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + Number(item.Quantity || 0), 0), [items])
  const active = methods.find(method => method.id === selected) || methods[1]
  const ActiveIcon = active.icon
  const chooseMethod = id => { setSelected(id); setPaymentMethod(id); setShowMobileMethods(false) }
  const requestPaymentLink = async () => {
    try {
      const token = localStorage.getItem('tc_session')
      if (!token) throw new Error('Please sign in before requesting a payment link.')
      if (!items.length) throw new Error('Your cart is empty.')
      const created = await api.placeOrder(token)
      const orderId = created?.order?.OrderID || created?.OrderID
      if (!orderId) throw new Error('Order could not be created.')
      const requested = await api.requestPaymentLink(token, orderId)
      setLinkRequest(requested?.request || { RequestID: 'submitted', OrderID: orderId })
    } catch (error) {
      setLinkRequest({ error: error.message || 'Unable to request a payment link.' })
    }
  }
  const startUpiPayment = async event => {
    event?.preventDefault?.()
    if (!items.length) return
    sessionStorage.setItem('tc_upi_handoff', '1')
    sessionStorage.setItem('tc_upi_started_at', String(Date.now()))
    await onCreateOrder('upiapps')
  }
  return <main className="checkout-gateway-page">
    <header className="gateway-topbar"><button className="gateway-back" onClick={onBack}><ArrowLeft size={17}/> Back to cart</button><div className="gateway-title"><LockKeyhole size={15}/> Secure Checkout</div><div className="gateway-secure"><ShieldCheck size={15}/> Trusted Circle</div></header>
    <div className="gateway-shell"><aside className="gateway-summary"><div className="gateway-summary-brand"><div className="gateway-logo"><img src={logoUrl} alt="Trusted Circle"/></div><div><strong>Trusted Circle</strong><small>Gift Vouchers</small></div></div><div className="gateway-stepper"><span className="done">1</span><div><b>Cart reviewed</b><small>{itemCount} voucher{itemCount === 1 ? '' : 's'}</small></div><span className="active">2</span><div><b>Payment</b><small>Secure UPI handoff</small></div></div><div className="gateway-price-label">YOU PAY</div><div className="gateway-total">{money(total)}</div><div className="gateway-account-pill"><CheckCircle2 size={15}/><span>{user?.email || 'Signed-in account'}</span></div><div className="gateway-order-lines"><div><span>Items</span><b>{itemCount}</b></div><div><span>Savings</span><b className="gateway-green">− {money(savings)}</b></div><div><span>Subtotal</span><b>{money(Number(total || 0) + Number(savings || 0))}</b></div></div><div className="gateway-summary-footer"><ShieldCheck size={16}/><span>Payment confirmation is controlled by the backend. Opening a UPI app does not by itself mark an order paid.</span></div></aside>
      <section className="gateway-payment"><div className="gateway-payment-head"><div><span className="gateway-kicker">PAYMENT GATEWAY</span><h1>Choose how to pay</h1><p>Use the same secure UPI address from your preferred installed UPI app.</p></div><button className="gateway-close" onClick={onBack} aria-label="Close checkout"><X size={16}/></button></div><button className="gateway-mobile-method-trigger" onClick={() => setShowMobileMethods(value => !value)}><ActiveIcon size={18}/><div><small>Payment method</small><strong>{active.label}</strong></div><ChevronRight size={17}/></button>
        <div className={`gateway-body ${showMobileMethods ? 'methods-open' : ''}`}><nav className="gateway-methods" aria-label="Payment methods"><div className="gateway-method-heading">PAYMENT METHODS</div>{methods.map(method => { const Icon = method.icon; return <button key={method.id} className={`gateway-method ${selected === method.id ? 'selected' : ''}`} onClick={() => chooseMethod(method.id)}><Icon size={18}/><span>{method.label}</span>{selected === method.id && <ChevronRight size={14} className="method-arrow"/>}</button> })}</nav>
          <div className="gateway-content"><div className="gateway-content-title"><div><ActiveIcon size={17}/><strong>{active.label}</strong></div><span className="gateway-session"><ShieldCheck size={12}/> Secure session</span></div>
            {selected === 'upiapps' && <div className="gateway-upi-apps-panel gateway-upi-primary"><div className="upi-hero-mark" aria-label="UPI"><span>UPI</span></div><div className="gateway-upi-apps-intro"><span className="gateway-mini-label">ONE TAP · ALL SUPPORTED UPI APPS</span><h2>{money(total)}</h2><p>Tap once to open your installed UPI app. The same payment address is used for Google Pay, PhonePe, Paytm, BHIM and other supported UPI apps — no separate app buttons.</p></div><a className="gateway-upi-open" href={UPI_APPS_URL} onClick={startUpiPayment}><span className="upi-open-icon"><Smartphone size={21}/></span><span><strong>Open UPI App &amp; Pay</strong><small>Continue to your installed UPI app</small></span><ChevronRight size={19}/></a><div className="gateway-upi-address"><span>Payment address</span><strong>paytm.s2eunub@pty</strong></div><div className="gateway-return-card"><CheckCircle2 size={17}/><div><strong>After payment</strong><span>Return to this browser. Trusted Circle will then show your order confirmation.</span></div></div><div className="gateway-note"><ShieldCheck size={14}/> The order is created as pending first. Payment is marked successful only after verified payment confirmation.</div></div>}
            {selected === 'qr' && <div className="gateway-upi-panel"><button className="gateway-qr-card" onClick={() => setQrOpen(true)} aria-label="Enlarge UPI QR"><img src={qrUrl} alt="Trusted Circle UPI QR"/><span className="qr-expand-hint"><Maximize2 size={13}/> Tap to enlarge</span></button><div className="gateway-upi-copy"><div className="upi-hero-mark compact"><span>UPI</span></div><span className="gateway-mini-label">SCAN &amp; PAY</span><h2>{money(total)}</h2><p>Scan with any supported UPI app. QR payment confirmation is still verified server-side.</p><div className="gateway-note"><ShieldCheck size={14}/> Use the UPI Apps option for the one-tap app handoff.</div></div></div>}
            {selected === 'cards' && <div className="gateway-form-panel"><label>Card number<input inputMode="numeric" autoComplete="cc-number" placeholder="1234  5678  9012  3456"/></label><div className="gateway-form-grid"><label>Expiry<input autoComplete="cc-exp" placeholder="MM / YY"/></label><label>CVV<input inputMode="numeric" autoComplete="cc-csc" placeholder="•••"/></label></div><label>Name on card<input autoComplete="cc-name" placeholder="Enter cardholder name"/></label><div className="gateway-note"><ShieldCheck size={14}/> Card details must be handled by the configured payment gateway before enabling live card capture.</div></div>}
            {selected === 'netbanking' && <div className="gateway-choice-panel"><span className="gateway-mini-label">SELECT YOUR BANK</span><button className="gateway-bank-choice">Choose a bank <ChevronRight size={17}/></button><div className="gateway-bank-grid"><span>HDFC Bank</span><span>ICICI Bank</span><span>Axis Bank</span><span>SBI</span></div></div>}
            {selected === 'wallet' && <div className="gateway-choice-panel"><span className="gateway-mini-label">SELECT WALLET</span><div className="gateway-wallet-grid"><button>Paytm</button><button>Mobikwik</button><button>Amazon Pay</button><button>Other Wallet</button></div></div>}
            {selected === 'link' && <div className="gateway-link-panel"><Link2 size={28}/><div><strong>Request a secure payment link</strong><p>Trusted Circle will create a pending order and send the request to the ERP team. Once the admin adds the payment link, it will be emailed to you and shown in your order.</p></div></div>}
            {linkRequest && <div className="gateway-note" style={{marginTop:16}}>{linkRequest.error ? linkRequest.error : <>Payment-link request submitted. <b>Request ID: {linkRequest.RequestID}</b></>}</div>}
            <div className="gateway-amount-bar"><div><small>PAYABLE AMOUNT</small><strong>{money(total)}</strong></div><div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'flex-end'}}>{selected === 'link' && <button className="gateway-pay-button" type="button" onClick={requestPaymentLink} disabled={Boolean(linkRequest && !linkRequest.error)}><Link2 size={17}/> {linkRequest && !linkRequest.error ? 'Payment Link Requested' : 'Request Payment Link'}</button>}{selected === 'upiapps' && <a className="gateway-pay-button gateway-pay-link" href={UPI_APPS_URL} onClick={startUpiPayment}><Smartphone size={17}/> Open UPI &amp; Pay · {money(total)} <ChevronRight size={17}/></a>}</div></div><p className="gateway-disclaimer"><LockKeyhole size={12}/> The order page is shown after the UPI handoff returns to this browser. Payment itself is confirmed only after verified backend data.</p>
          </div>
        </div>
      </section>
    </div>
    {qrOpen && <div className="qr-lightbox" role="dialog" aria-modal="true" aria-label="Enlarged UPI QR" onClick={() => setQrOpen(false)}><div className="qr-lightbox-card" onClick={event => event.stopPropagation()}><button className="qr-lightbox-close" onClick={() => setQrOpen(false)} aria-label="Close QR"><X size={18}/></button><img src={qrUrl} alt="Enlarged Trusted Circle UPI QR"/><strong>Scan to pay {money(total)}</strong><span>Use the UPI Apps option for app handoff.</span></div></div>}
  </main>
}
