import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, ChevronDown, Gift, Heart, Minus, PackageCheck, Search, ShieldCheck, ShoppingBag, Sparkles, UserRound, X, Zap } from 'lucide-react'
import { api } from './api'

const LOGO_URL = 'https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'
const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const toneFor = value => ['tone-slate', 'tone-lilac', 'tone-blue', 'tone-peach', 'tone-rose', 'tone-mint'][String(value || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 6]

function App() {
  const [view, setView] = useState('home')
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [cart, setCart] = useState([])
  const [orders, setOrders] = useState([])
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('tc_session') || '')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [liked, setLiked] = useState(() => JSON.parse(localStorage.getItem('tc_liked') || '[]'))
  const [toast, setToast] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authStep, setAuthStep] = useState('email')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [profileName, setProfileName] = useState('')
  const [lastOrder, setLastOrder] = useState(null)

  const notify = message => {
    setToast(message)
    window.clearTimeout(window.__tcToast)
    window.__tcToast = window.setTimeout(() => setToast(''), 2800)
  }
  const go = next => { setView(next); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const brandName = id => brands.find(b => String(b.BrandID) === String(id))?.Name || 'Gift Voucher'

  const loadCatalog = async () => {
    try {
      const [b, p] = await Promise.all([api.brands(), api.products(query.trim(), brandFilter)])
      setBrands(b?.items || [])
      setProducts(p?.items || [])
    } catch (e) { notify(e.message) }
  }
  const loadCart = async t => {
    if (!t) return setCart([])
    try { const d = await api.cart(t); setCart(d?.items || []) }
    catch { localStorage.removeItem('tc_session'); setToken(''); setUser(null); setCart([]) }
  }
  const loadOrders = async t => {
    if (!t) return setOrders([])
    try { const d = await api.orders(t); setOrders(d?.items || []) } catch { setOrders([]) }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        await api.health()
        await loadCatalog()
        if (token) {
          const me = await api.me(token)
          if (mounted) { setUser(me); setProfileName(me.name || '') }
          await Promise.all([loadCart(token), loadOrders(token)])
        }
      } catch (e) { if (mounted) notify(e.message) }
      finally { if (mounted) setLoading(false) }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const timer = setTimeout(loadCatalog, 280)
    return () => clearTimeout(timer)
  }, [query, brandFilter])

  const cartDetailed = useMemo(() => cart.map(i => ({ ...i, product: products.find(p => String(p.ProductID) === String(i.ProductID)) })).filter(i => i.product), [cart, products])
  const cartCount = useMemo(() => cart.reduce((sum, i) => sum + Number(i.Quantity || 0), 0), [cart])
  const subtotal = useMemo(() => cartDetailed.reduce((sum, i) => sum + Number(i.product.FaceValue || 0) * Number(i.Quantity || 0), 0), [cartDetailed])
  const total = useMemo(() => cartDetailed.reduce((sum, i) => sum + Number(i.product.SellingPrice || 0) * Number(i.Quantity || 0), 0), [cartDetailed])
  const savings = Math.max(0, subtotal - total)

  const openAuth = mode => { setAuthMode(mode); setAuthStep('email'); setOtp(''); setAuthMessage(''); setAuthOpen(true) }
  const requestOtp = async e => {
    e.preventDefault(); setBusy(true); setAuthMessage('')
    try { await api.requestOtp(email, authMode === 'register' ? 'SHOP_REGISTER' : 'SHOP_LOGIN'); setAuthStep('otp'); setAuthMessage(`Verification code sent to ${email}.`) }
    catch (x) { setAuthMessage(x.message) } finally { setBusy(false) }
  }
  const verifyOtp = async e => {
    e.preventDefault(); setBusy(true); setAuthMessage('')
    try {
      const d = await api.verifyOtp(email, otp, name, authMode === 'register' ? 'SHOP_REGISTER' : 'SHOP_LOGIN')
      localStorage.setItem('tc_session', d.session.token); setToken(d.session.token); setUser(d.user); setProfileName(d.user.name || ''); setAuthOpen(false)
      await Promise.all([loadCart(d.session.token), loadOrders(d.session.token)])
      notify('Welcome to Trusted Circle.')
    } catch (x) { setAuthMessage(x.message) } finally { setBusy(false) }
  }
  const logout = async () => { try { if (token) await api.logout(token) } catch {} localStorage.removeItem('tc_session'); setToken(''); setUser(null); setCart([]); setOrders([]); go('home'); notify('Signed out successfully.') }
  const addToCart = async product => {
    if (!token) return openAuth('login')
    try { const d = await api.cartAdd(token, product.ProductID, 1); setCart(d?.items || []); notify(`${product.Title} added to cart.`); }
    catch (e) { notify(e.message) }
  }
  const changeQty = async (item, quantity) => {
    if (quantity < 1) return removeItem(item)
    try { const d = await api.cartUpdate(token, item.CartID, quantity); setCart(d?.items || []) } catch (e) { notify(e.message) }
  }
  const removeItem = async item => { try { const d = await api.cartRemove(token, item.CartID); setCart(d?.items || []); notify('Item removed.') } catch (e) { notify(e.message) } }
  const toggleLike = id => setLiked(current => { const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id]; localStorage.setItem('tc_liked', JSON.stringify(next)); return next })
  const saveProfile = async e => { e.preventDefault(); setBusy(true); try { const d = await api.profileUpdate(token, profileName); setUser(d); notify('Profile updated.') } catch (x) { notify(x.message) } finally { setBusy(false) } }
  const placeOrder = async e => {
    e.preventDefault(); if (!token) return openAuth('login'); if (!cartDetailed.length) return notify('Your cart is empty.')
    setBusy(true)
    try { const d = await api.placeOrder(token); setLastOrder(d?.order || null); setCart([]); await loadOrders(token); go('success') }
    catch (x) { notify(x.message) } finally { setBusy(false) }
  }

  const ProductCard = ({ product }) => {
    const discount = Number(product.DiscountPercent || 0)
    return <article className="product-card">
      <div className={`product-visual ${toneFor(product.BrandID || product.Title)}`}>
        <span className="discount-badge">{discount}% OFF</span>
        <button className={`like-btn ${liked.includes(product.ProductID) ? 'liked' : ''}`} onClick={() => toggleLike(product.ProductID)} aria-label="Save voucher"><Heart size={17} fill={liked.includes(product.ProductID) ? 'currentColor' : 'none'} /></button>
        <div className="voucher-mark"><img src={LOGO_URL} alt="Trusted Circle" /></div>
        <span className="product-brand">{brandName(product.BrandID)}</span>
        <h3>{product.Title}</h3>
        <span className="digital-label"><Zap size={12} /> Digital delivery</span>
      </div>
      <div className="product-body">
        <div className="product-topline"><span>{product.SKU || 'GIFT VOUCHER'}</span><span className="instant"><Check size={12} /> Instant</span></div>
        <p>{product.Description || 'A digital gift voucher delivered after successful fulfilment.'}</p>
        <div className="product-buy"><div><small>VALUE</small><del>{money(product.FaceValue)}</del><strong>{money(product.SellingPrice)}</strong></div><button onClick={() => addToCart(product)}>Add <ShoppingBag size={15} /></button></div>
      </div>
    </article>
  }

  const Header = () => <>
    <div className="announcement"><Sparkles size={14} /> Better brands. Better value. <span>Digital gift vouchers</span></div>
    <header className="site-header">
      <div className="header-inner">
        <button className="mobile-trigger" onClick={() => setSearchOpen(v => !v)} aria-label="Search"><Search size={19} /></button>
        <button className="brand-logo" onClick={() => go('home')}><span className="logo-frame"><img src={LOGO_URL} alt="Trusted Circle" /></span><span className="brand-word">Trusted<span>Circle</span></span></button>
        <nav className="main-nav"><button onClick={() => go('home')}>Home</button><button onClick={() => { go('home'); setTimeout(() => document.getElementById('vouchers')?.scrollIntoView({ behavior: 'smooth' }), 40) }}>Gift Vouchers</button><button onClick={() => { go('home'); setTimeout(() => document.getElementById('brands')?.scrollIntoView({ behavior: 'smooth' }), 40) }}>Brands</button><button onClick={() => { go('home'); setTimeout(() => document.getElementById('offers')?.scrollIntoView({ behavior: 'smooth' }), 40) }}>Offers</button><button onClick={() => { go('home'); setTimeout(() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' }), 40) }}>How It Works</button><button onClick={() => document.getElementById('help')?.scrollIntoView({ behavior: 'smooth' })}>Help</button></nav>
        <div className="header-actions"><button className="header-icon" onClick={() => setSearchOpen(v => !v)} aria-label="Search"><Search size={19} /></button><button className="header-icon cart-action" onClick={() => go('cart')} aria-label="Cart"><ShoppingBag size={19} /><b>{cartCount}</b></button>{user ? <button className="account-chip" onClick={() => go('profile')}><UserRound size={16} /><span>{user.name || 'Account'}</span></button> : <button className="login-action" onClick={() => openAuth('login')}>Login <ArrowRight size={15} /></button>}</div>
      </div>
      {searchOpen && <div className="search-panel"><Search size={18} /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search vouchers or brands" /><button onClick={() => { setQuery(''); setSearchOpen(false) }}><X size={16} /></button></div>}
    </header>
  </>

  return <div className="app-shell"><Header />
    {view === 'home' && <main>
      <section className="hero" id="home"><div className="hero-copy"><div className="eyebrow"><Sparkles size={15} /> SMARTER WAY TO GIFT</div><h1>Give more.<br /><em>Spend less.</em></h1><p>Shop trusted brands at special prices. Compare your savings, add your favourites to cart and manage every voucher from one simple account.</p><div className="hero-actions"><button className="primary-btn" onClick={() => document.getElementById('vouchers')?.scrollIntoView({ behavior: 'smooth' })}>Explore vouchers <ArrowRight size={17} /></button><button className="link-btn" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>How it works</button></div><div className="hero-trust"><span><ShieldCheck size={16} /> Secure checkout</span><span><Zap size={16} /> Digital delivery</span><span><TagIcon /> Clear savings</span></div></div><div className="hero-stage"><div className="hero-glow glow-one" /><div className="hero-glow glow-two" /><div className="hero-card"><div className="hero-card-head"><span><span className="mini-logo"><img src={LOGO_URL} alt="" /></span> TRUSTED CIRCLE</span><small>DIGITAL GIFT CARD</small></div><div className="hero-card-value">₹1,000</div><div className="hero-card-foot"><span>CHOOSE • SAVE • GIFT</span><strong>UP TO 16% OFF</strong></div></div><div className="hero-pill"><small>TOP SAVING</small><strong>16%</strong><span>OFF</span></div></div></section>
      <section className="section" id="brands"><div className="section-head"><div><span className="section-kicker">SHOP BY BRAND</span><h2>Brands people love</h2></div><button className="section-link" onClick={() => document.getElementById('vouchers')?.scrollIntoView({ behavior: 'smooth' })}>View vouchers <ArrowRight size={15} /></button></div><div className="brand-grid">{brands.map(b => <button className="brand-tile" key={b.BrandID} onClick={() => { setBrandFilter(String(b.BrandID)); document.getElementById('vouchers')?.scrollIntoView({ behavior: 'smooth' }) }}><span className={`brand-letter ${toneFor(b.Name)}`}>{String(b.Name || '?').charAt(0)}</span><strong>{b.Name}</strong><small>Gift vouchers</small></button>)}</div></section>
      <section className="section voucher-section" id="vouchers"><div className="section-head"><div><span className="section-kicker">VOUCHERS</span><h2>Save on every purchase</h2></div><div className="select-wrap"><select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}><option value="">All brands</option>{brands.map(b => <option key={b.BrandID} value={b.BrandID}>{b.Name}</option>)}</select><ChevronDown size={15} /></div></div>{brandFilter && <div className="filter-chip">{brandName(brandFilter)}<button onClick={() => setBrandFilter('')}><X size={13} /></button></div>}{loading ? <div className="product-grid">{[1,2,3,4].map(i => <div className="skeleton" key={i} />)}</div> : products.length ? <div className="product-grid">{products.map(p => <ProductCard key={p.ProductID} product={p} />)}</div> : <div className="empty-state"><Gift size={28} /><h3>No vouchers published yet</h3><p>Once the catalogue is enabled in the backend, your live brand vouchers will appear here.</p></div>}</section>
      <section className="benefit-strip" id="offers"><div><span><TagIcon /></span><strong>Visible savings<small>Discount shown on every voucher</small></strong></div><div><span><Zap /></span><strong>Fast fulfilment<small>Digital delivery for eligible vouchers</small></strong></div><div><span><ShieldCheck /></span><strong>Secure account<small>Cart, orders and profile in one place</small></strong></div></section>
      <section className="how-section" id="how"><span className="section-kicker">HOW IT WORKS</span><h2>Simple from browse to order.</h2><div className="steps"><div><b>01</b><Gift /><h3>Choose</h3><p>Pick your favourite brand and see the exact discount before buying.</p></div><div><b>02</b><ShoppingBag /><h3>Cart</h3><p>Adjust quantities and review your total savings in one clean cart.</p></div><div><b>03</b><PackageCheck /><h3>Order</h3><p>Confirm checkout and receive a unique order number for fulfilment.</p></div></div></section>
    </main>}

    {view === 'cart' && <main className="page"><button className="back-link" onClick={() => go('home')}>← Continue shopping</button><div className="page-title"><span className="section-kicker">YOUR CART</span><h1>Your saved vouchers.</h1><p>{cartCount} item{cartCount === 1 ? '' : 's'} ready for checkout.</p></div>{cartDetailed.length ? <div className="cart-layout"><div className="cart-panel">{cartDetailed.map(i => <div className="cart-item" key={i.CartID}><div className={`cart-art ${toneFor(i.product.BrandID)}`}><img src={LOGO_URL} alt="" /><span>{brandName(i.product.BrandID)}</span></div><div className="cart-info"><span>{brandName(i.product.BrandID)}</span><h3>{i.product.Title}</h3><div className="cart-controls"><div className="quantity"><button onClick={() => changeQty(i, Number(i.Quantity) - 1)}><Minus size={13} /></button><b>{i.Quantity}</b><button onClick={() => changeQty(i, Number(i.Quantity) + 1)}><PlusIcon /></button></div><span>{money(i.product.SellingPrice)} each</span><button className="remove-link" onClick={() => removeItem(i)}>Remove</button></div></div></div>)}</div><aside className="summary"><span className="section-kicker">ORDER SUMMARY</span><div><span>Voucher value</span><b>{money(subtotal)}</b></div><div><span>Your savings</span><b className="saving">− {money(savings)}</b></div><hr /><div className="total-line"><span>Total to pay</span><strong>{money(total)}</strong></div><button className="primary-btn full" onClick={() => go('checkout')}>Continue to checkout <ArrowRight size={16} /></button><small className="secure-line"><ShieldCheck size={13} /> Secure checkout</small></aside></div> : <div className="empty-state large"><ShoppingBag size={32} /><h2>Your cart is empty</h2><p>Choose a voucher to start saving.</p><button className="primary-btn" onClick={() => go('home')}>Browse vouchers</button></div>}</main>}

    {view === 'checkout' && <main className="page"><button className="back-link" onClick={() => go('cart')}>← Back to cart</button><div className="page-title"><span className="section-kicker">CHECKOUT</span><h1>Almost there.</h1><p>Review your account and order before confirmation.</p><div className="checkout-progress"><span className="done"><Check size={13} /> Cart</span><span className="current">02 Checkout</span><span>03 Order placed</span></div></div><div className="checkout-layout"><div className="checkout-panel"><section><div className="step-heading"><b>1</b><div><h3>Your account</h3><p>Orders are linked to your Trusted Circle User ID.</p></div></div><div className="account-box"><div className="avatar"><UserRound size={19} /></div><div><strong>{user?.name || 'Trusted Circle member'}</strong><span>{user?.email || email}</span></div><button onClick={() => go('profile')}>Manage</button></div></section><section><div className="step-heading"><b>2</b><div><h3>Order review</h3><p>Confirm the vouchers and quantity.</p></div></div>{cartDetailed.map(i => <div className="review-row" key={i.CartID}><span>{i.product.Title}<small>{brandName(i.product.BrandID)} × {i.Quantity}</small></span><strong>{money(Number(i.product.SellingPrice) * Number(i.Quantity))}</strong></div>)}</section><section className="payment-note"><ShieldCheck size={20} /><div><strong>Secure payment</strong><p>Payment gateway integration will verify payment server-side before fulfilment. This checkout does not mark an order as paid by itself.</p></div></section><label className="consent"><input type="checkbox" defaultChecked /> I confirm the order details shown above.</label><button className="primary-btn full confirm-btn" disabled={busy} onClick={placeOrder}>{busy ? 'Creating order…' : 'Confirm & place order'} <ArrowRight size={17} /></button></div><aside className="summary"><span className="section-kicker">TOTAL</span><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Savings</span><b className="saving">− {money(savings)}</b></div><hr /><div className="total-line"><span>Total</span><strong>{money(total)}</strong></div></aside></div></main>}

    {view === 'profile' && <main className="page"><div className="page-title"><span className="section-kicker">MY ACCOUNT</span><h1>Profile & orders.</h1><p>Manage your details and keep track of your shopping.</p></div><div className="profile-layout"><section className="profile-panel"><div className="profile-hero"><div className="profile-avatar"><UserRound size={26} /></div><div><span>USER ID</span><strong>{user?.userId || user?.UserID || 'TCUSR'}</strong></div></div><form onSubmit={saveProfile}><label>Name<input value={profileName} onChange={e => setProfileName(e.target.value)} /></label><label>Email<input value={user?.email || ''} readOnly /></label><button className="primary-btn full" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></form><button className="logout" onClick={logout}>Sign out</button></section><section className="orders-panel"><div className="section-head"><div><span className="section-kicker">ORDER HISTORY</span><h2>Your orders</h2></div><button className="section-link" onClick={() => go('cart')}>Cart ({cartCount}) <ArrowRight size={15} /></button></div>{orders.length ? orders.map(o => <button className="order-row" key={o.OrderID || o.OrderNumber} onClick={() => {}}><span><strong>{o.OrderNumber || o.OrderID}</strong><small>{o.Status || 'PENDING PAYMENT'}</small></span><b>{money(o.Total)}</b></button>) : <div className="empty-state compact"><PackageCheck size={25} /><h3>No orders yet</h3><p>Your completed checkout orders will appear here.</p></div>}</section></div></main>}

    {view === 'success' && <main className="success-page"><div className="success-card"><div className="success-check"><Check size={32} /></div><span className="section-kicker">ORDER PLACED</span><h1>You're all set.</h1><p>Your order has been created successfully. Keep the order number below for future reference.</p><div className="order-number"><span>ORDER NUMBER</span><strong>{lastOrder?.OrderNumber || lastOrder?.OrderID || 'Pending'}</strong><small>Status: {lastOrder?.Status || 'PENDING PAYMENT'}</small></div><div className="success-actions"><button className="primary-btn" onClick={() => go('profile')}>View my orders <ArrowRight size={16} /></button><button className="link-btn" onClick={() => go('home')}>Continue shopping</button></div></div></main>}

    <footer className="footer" id="help"><div className="footer-main"><div><button className="brand-logo footer-logo" onClick={() => go('home')}><span className="logo-frame"><img src={LOGO_URL} alt="Trusted Circle" /></span><span className="brand-word">Trusted<span>Circle</span></span></button><p>Branded gift vouchers at special prices, with simple account management and secure checkout.</p></div><div><h4>Shop</h4><button onClick={() => go('home')}>Gift vouchers</button><button onClick={() => document.getElementById('brands')?.scrollIntoView({ behavior: 'smooth' })}>Brands</button><button onClick={() => document.getElementById('offers')?.scrollIntoView({ behavior: 'smooth' })}>Offers</button></div><div><h4>Account</h4><button onClick={() => user ? go('profile') : openAuth('login')}>My profile</button><button onClick={() => go('cart')}>My cart</button><button onClick={() => user ? go('profile') : openAuth('login')}>My orders</button></div><div><h4>Support</h4><button>Help centre</button><button>Terms & conditions</button><button>Privacy</button></div></div><div className="footer-bottom"><span>© 2026 Trusted Circle. All rights reserved.</span><button className="erp-link">ERP Login</button></div></footer>

    {toast && <div className="toast"><Check size={15} /> {toast}</div>}
    {authOpen && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setAuthOpen(false)}><div className="auth-modal"><button className="modal-close" onClick={() => setAuthOpen(false)}><X size={17} /></button><div className="modal-logo"><img src={LOGO_URL} alt="Trusted Circle" /></div><span className="section-kicker">TRUSTED CIRCLE ACCOUNT</span><h2>{authMode === 'login' ? 'Welcome back.' : 'Create your account.'}</h2><p>{authStep === 'email' ? 'Use your email to receive a one-time verification code.' : `Enter the code sent to ${email}.`}</p>{authStep === 'email' ? <form onSubmit={requestOtp}>{authMode === 'register' && <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required />}<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required /><button className="modal-submit" disabled={busy}>{busy ? 'Sending…' : 'Send verification code'}</button></form> : <form onSubmit={verifyOtp}><input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP" inputMode="numeric" autoFocus required /><button className="modal-submit" disabled={busy}>{busy ? 'Verifying…' : 'Verify & continue'}</button><button type="button" className="modal-secondary" onClick={() => setAuthStep('email')}>Use a different email</button></form>}{authMessage && <div className="auth-message">{authMessage}</div>}<div className="auth-switch">{authMode === 'login' ? <>New here? <button onClick={() => openAuth('register')}>Create account</button></> : <>Already have an account? <button onClick={() => openAuth('login')}>Sign in</button></>}</div></div></div>}
  </div>
}

function TagIcon() { return <span className="tag-icon">%</span> }
function PlusIcon() { return <span className="plus-icon">+</span> }

export default App
