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
  const [selected, setSelected] = useState(paymentMethod === 'upi' ? 'qr' : (paymentMethod || 'qr'))
  const [showMobileMethods, setShowMobileMethods] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [linkRequest, setLinkRequest] = useState(null)
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + Number(item.Quantity || 0), 0), [items])
  const active = methods.find(method => method.id === selected) || methods[0]
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
  return <main className="checkout-gateway-page">
    <header className="gateway-topbar"><button className="gateway-back" onClick={onBack}><ArrowLeft size={17}/> Back</button><div className="gateway-title"><LockKeyhole size={15}/> Secure Checkout</div><div className="gateway-secure"><ShieldCheck size={15}/> Trusted Circle</div></header>
    <div className="gateway-shell"><aside className="gateway-summary"><div className="gateway-summary-brand"><div className="gateway-logo"><img src={logoUrl} alt="Trusted Circle"/></div><div><strong>Trusted Circle</strong><small>Gift Vouchers</small></div></div><div className="gateway-price-label">PRICE SUMMARY</div><div className="gateway-total">{money(total)}</div><div className="gateway-account-pill"><CheckCircle2 size={15}/><span>{user?.email || 'Signed-in account'}</span></div><div className="gateway-order-lines"><div><span>Items</span><b>{itemCount}</b></div><div><span>Savings</span><b className="gateway-green">− {money(savings)}</b></div><div><span>Subtotal</span><b>{money(Number(total || 0) + Number(savings || 0))}</b></div></div><div className="gateway-summary-footer"><ShieldCheck size={16}/><span>Payments are verified securely before an order is marked paid.</span></div></aside>
      <section className="gateway-payment"><div className="gateway-payment-head"><div><span className="gateway-kicker">PAYMENT OPTIONS</span><h1>Complete your payment</h1></div><button className="gateway-close" onClick={onBack} aria-label="Close checkout"><X size={16}/></button></div><button className="gateway-mobile-method-trigger" onClick={() => setShowMobileMethods(value => !value)}><ActiveIcon size={18}/><div><small>Payment method</small><strong>{active.label}</strong></div><ChevronRight size={17}/></button>
        <div className={`gateway-body ${showMobileMethods ? 'methods-open' : ''}`}><nav className="gateway-methods" aria-label="Payment methods"><div className="gateway-method-heading">Recommended</div>{methods.map(method => { const Icon = method.icon; return <button key={method.id} className={`gateway-method ${selected === method.id ? 'selected' : ''}`} onClick={() => chooseMethod(method.id)}><Icon size={18}/><span>{method.label}</span>{selected === method.id && <ChevronRight size={14} className="method-arrow"/>}</button> })}</nav>
          <div className="gateway-content"><div className="gateway-content-title"><div><ActiveIcon size={17}/><strong>{active.label}</strong></div><span className="gateway-session">Secure payment</span></div>
            {selected === 'qr' && <div className="gateway-upi-panel"><button className="gateway-qr-card" onClick={() => setQrOpen(true)} aria-label="Enlarge UPI QR"><img src={qrUrl} alt="Trusted Circle UPI QR"/><span className="qr-expand-hint"><Maximize2 size={13}/> Tap to enlarge</span></button><div className="gateway-upi-copy"><span className="gateway-mini-label">SCAN & PAY</span><h2>{money(total)}</h2><p>Scan this QR using any supported UPI app. Pay the exact amount shown above.</p><div className="gateway-apps"><span>G</span><span>पे</span><span>P</span><span>BHIM</span></div><div className="gateway-note"><ShieldCheck size={14}/> Payment confirmation is verified server-side.</div></div></div>}
            {selected === 'upiapps' && <div className="gateway-upi-apps-panel"><div className="gateway-upi-apps-intro"><span className="gateway-mini-label">PAY USING UPI APP</span><h2>{money(total)}</h2><p>Tap an app below to open an installed UPI app on your phone. The payment address is pre-filled for the verified Paytm account.</p></div><div className="gateway-upi-app-grid"><a className="gateway-upi-app" href={UPI_APPS_URL}><span className="upi-app-icon upi-gpay">G</span><strong>Google Pay</strong><small>Open app</small></a><a className="gateway-upi-app" href={UPI_APPS_URL}><span className="upi-app-icon upi-phonepe">पे</span><strong>PhonePe</strong><small>Open app</small></a><a className="gateway-upi-app" href={UPI_APPS_URL}><span className="upi-app-icon upi-paytm">P</span><strong>Paytm</strong><small>Open app</small></a><a className="gateway-upi-app" href={UPI_APPS_URL}><span className="upi-app-icon upi-bhim">BHIM</span><strong>BHIM</strong><small>Open app</small></a></div><div className="gateway-upi-address"><span>UPI ID</span><strong>paytm.s2eunub@pty</strong></div><div className="gateway-note"><ShieldCheck size={14}/> After payment, Trusted Circle verifies the gateway/payment status before marking the order paid.</div></div>}
            {selected === 'cards' && <div className="gateway-form-panel"><label>Card number<input inputMode="numeric" autoComplete="cc-number" placeholder="1234  5678  9012  3456"/></label><div className="gateway-form-grid"><label>Expiry<input autoComplete="cc-exp" placeholder="MM / YY"/></label><label>CVV<input inputMode="numeric" autoComplete="cc-csc" placeholder="•••"/></label></div><label>Name on card<input autoComplete="cc-name" placeholder="Enter cardholder name"/></label><div className="gateway-note"><ShieldCheck size={14}/> Your card details are handled by the payment gateway.</div></div>}
            {selected === 'netbanking' && <div className="gateway-choice-panel"><span className="gateway-mini-label">SELECT YOUR BANK</span><button className="gateway-bank-choice">Choose a bank <ChevronRight size={17}/></button><div className="gateway-bank-grid"><span>HDFC Bank</span><span>ICICI Bank</span><span>Axis Bank</span><span>SBI</span></div></div>}
            {selected === 'wallet' && <div className="gateway-choice-panel"><span className="gateway-mini-label">SELECT WALLET</span><div className="gateway-wallet-grid"><button>Paytm</button><button>Mobikwik</button><button>Amazon Pay</button><button>Other Wallet</button></div></div>}
            {selected === 'link' && <div className="gateway-link-panel"><Link2 size={28}/><div><strong>Request a secure payment link</strong><p>Trusted Circle will create a pending order and send the request to the ERP team. Once the admin adds the payment link, it will be emailed to you and shown in your order.</p></div></div>}
            {linkRequest && <div className="gateway-note" style={{marginTop:16}}>{linkRequest.error ? linkRequest.error : <>Payment-link request submitted. <b>Request ID: {linkRequest.RequestID}</b></>}</div>}
            <div className="gateway-amount-bar"><div><small>PAYABLE AMOUNT</small><strong>{money(total)}</strong></div><div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'flex-end'}}>{selected === 'link' && <button className="gateway-pay-button" type="button" onClick={requestPaymentLink} disabled={Boolean(linkRequest && !linkRequest.error)}><Link2 size={17}/> {linkRequest && !linkRequest.error ? 'Payment Link Requested' : 'Request Payment Link'}</button>}<button className="gateway-pay-button" disabled={selected !== 'qr' && selected !== 'upiapps' || Boolean(linkRequest && !linkRequest.error)} onClick={onCreateOrder}>{selected === 'qr' || selected === 'upiapps' ? `Place Order · ${money(total)}` : 'Select a payment method'} <ChevronRight size={17}/></button></div></div><p className="gateway-disclaimer"><LockKeyhole size={12}/> Trusted Circle creates a pending order first. Successful payment status is confirmed only after verified gateway data.</p>
          </div>
        </div>
      </section>
    </div>
    {qrOpen && <div className="qr-lightbox" role="dialog" aria-modal="true" aria-label="Enlarged UPI QR" onClick={() => setQrOpen(false)}><div className="qr-lightbox-card" onClick={event => event.stopPropagation()}><button className="qr-lightbox-close" onClick={() => setQrOpen(false)} aria-label="Close QR"><X size={18}/></button><img src={qrUrl} alt="Enlarged Trusted Circle UPI QR"/><strong>Scan to pay {money(total)}</strong><span>Tap outside to close</span></div></div>}
  </main>
}
