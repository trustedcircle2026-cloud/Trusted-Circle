import { useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, ChevronRight, CreditCard, Landmark, Link2, LockKeyhole, Smartphone, WalletCards, ShieldCheck, X } from 'lucide-react'
import './checkout-gateway.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const methods = [
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'cards', label: 'Cards', icon: CreditCard },
  { id: 'netbanking', label: 'Netbanking', icon: Landmark },
  { id: 'wallet', label: 'Wallet', icon: WalletCards },
  { id: 'link', label: 'Payment Link', icon: Link2 },
]

export default function CheckoutPage({ user, items, total, savings, paymentMethod, setPaymentMethod, qrUrl, onBack, onCreateOrder }) {
  const [selected, setSelected] = useState(paymentMethod || 'upi')
  const [showMobileMethods, setShowMobileMethods] = useState(false)
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + Number(item.Quantity || 0), 0), [items])
  const active = methods.find(method => method.id === selected) || methods[0]
  const ActiveIcon = active.icon
  const chooseMethod = id => { setSelected(id); setPaymentMethod(id); setShowMobileMethods(false) }

  return <main className="checkout-gateway-page">
    <header className="gateway-topbar">
      <button className="gateway-back" onClick={onBack}><ArrowLeft size={17} /> Back</button>
      <div className="gateway-title"><LockKeyhole size={15} /> Secure Checkout</div>
      <div className="gateway-secure"><ShieldCheck size={15} /> Trusted Circle</div>
    </header>

    <div className="gateway-shell">
      <aside className="gateway-summary">
        <div className="gateway-summary-brand"><div className="gateway-brand-mark"><span>TC</span></div><div><strong>Trusted Circle</strong><small>Gift Vouchers</small></div></div>
        <div className="gateway-price-label">PRICE SUMMARY</div>
        <div className="gateway-total">{money(total)}</div>
        <div className="gateway-account-pill"><CheckCircle2 size={15} /><span>{user?.email || 'Signed-in account'}</span></div>
        <div className="gateway-order-lines"><div><span>Items</span><b>{itemCount}</b></div><div><span>Savings</span><b className="gateway-green">− {money(savings)}</b></div><div><span>Subtotal</span><b>{money(total + Number(savings || 0))}</b></div></div>
        <div className="gateway-summary-footer"><ShieldCheck size={16} /><span>Payments are verified securely before an order is marked paid.</span></div>
      </aside>

      <section className="gateway-payment">
        <div className="gateway-payment-head"><div><span className="gateway-kicker">PAYMENT OPTIONS</span><h1>Complete your payment</h1></div><button className="gateway-close" onClick={onBack} aria-label="Close checkout"><X size={16} /></button></div>
        <button className="gateway-mobile-method-trigger" onClick={() => setShowMobileMethods(value => !value)}><ActiveIcon size={18} /><div><small>Payment method</small><strong>{active.label}</strong></div><ChevronRight size={17} /></button>

        <div className={`gateway-body ${showMobileMethods ? 'methods-open' : ''}`}>
          <nav className="gateway-methods" aria-label="Payment methods"><div className="gateway-method-heading">Recommended</div>{methods.map(method => { const Icon = method.icon; return <button key={method.id} className={`gateway-method ${selected === method.id ? 'selected' : ''}`} onClick={() => chooseMethod(method.id)}><Icon size={18} /><span>{method.label}</span>{selected === method.id && <ChevronRight size={14} className="method-arrow" />}</button> })}</nav>

          <div className="gateway-content">
            <div className="gateway-content-title"><div><ActiveIcon size={17} /><strong>{active.label}</strong></div><span className="gateway-session">Secure payment</span></div>

            {selected === 'upi' && <div className="gateway-upi-panel"><div className="gateway-qr-card"><img src={qrUrl} alt="Trusted Circle UPI QR" /></div><div className="gateway-upi-copy"><span className="gateway-mini-label">SCAN & PAY</span><h2>{money(total)}</h2><p>Scan this QR using any supported UPI app. Pay the exact amount shown above.</p><div className="gateway-apps"><span>G</span><span>पे</span><span>P</span><span>BHIM</span></div><div className="gateway-note"><ShieldCheck size={14} /> Payment confirmation is verified server-side.</div></div></div>}
            {selected === 'cards' && <div className="gateway-form-panel"><label>Card number<input inputMode="numeric" placeholder="1234  5678  9012  3456" /></label><div className="gateway-form-grid"><label>Expiry<input placeholder="MM / YY" /></label><label>CVV<input inputMode="numeric" placeholder="•••" /></label></div><label>Name on card<input placeholder="Enter cardholder name" /></label><div className="gateway-note"><ShieldCheck size={14} /> Your card details are handled by the payment gateway.</div></div>}
            {selected === 'netbanking' && <div className="gateway-choice-panel"><span className="gateway-mini-label">SELECT YOUR BANK</span><button className="gateway-bank-choice">Choose a bank <ChevronRight size={17} /></button><div className="gateway-bank-grid"><span>HDFC Bank</span><span>ICICI Bank</span><span>Axis Bank</span><span>SBI</span></div></div>}
            {selected === 'wallet' && <div className="gateway-choice-panel"><span className="gateway-mini-label">SELECT WALLET</span><div className="gateway-wallet-grid"><button>Paytm</button><button>Mobikwik</button><button>Amazon Pay</button><button>Other Wallet</button></div></div>}
            {selected === 'link' && <div className="gateway-link-panel"><Link2 size={28} /><div><strong>Secure payment link</strong><p>The payment-link option will be enabled when the gateway/ERP integration is connected.</p></div></div>}

            <div className="gateway-amount-bar"><div><small>PAYABLE AMOUNT</small><strong>{money(total)}</strong></div><button className="gateway-pay-button" disabled={selected === 'link'} onClick={onCreateOrder}>{selected === 'link' ? 'Coming soon' : `Pay ${money(total)}`} <ChevronRight size={17} /></button></div>
            <p className="gateway-disclaimer"><LockKeyhole size={12} /> Trusted Circle creates a pending order first. Successful payment status is confirmed only after verified gateway data.</p>
          </div>
        </div>
      </section>
    </div>
  </main>
}
