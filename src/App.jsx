import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Gift, Heart, Minus, PackageCheck, Plus, Search, ShieldCheck, ShoppingBag, Sparkles, Tag, UserRound, X, Zap } from 'lucide-react'
import { api } from './api'

const LOGO_URL = 'https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'
const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const toneFor = value => {
  const tones = ['dark', 'pink', 'blue', 'orange', 'red', 'green']
  const text = String(value || '')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) hash = (hash + text.charCodeAt(i)) % tones.length
  return tones[hash]
}

function App() {
  const [view, setView] = useState('home')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [brandFilter, setBrandFilter] = useState('')
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [cart, setCart] = useState([])
  const [orders, setOrders] = useState([])
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('tc_session') || '')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
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

  const notify = message => { setToast(message); window.clearTimeout(window.__tcToast); window.__tcToast = window.setTimeout(() => setToast(''), 2800) }

  const loadCatalog = async () => {
    try {
      const [brandData, productData] = await Promise.all([api.brands(), api.products(query.trim(), brandFilter)])
      setBrands(brandData?.items || [])
      setProducts(productData?.items || [])
    } catch (error) { notify(error.message) }
  }

  const loadCart = async activeToken => {
    if (!activeToken) return setCart([])
    try {
      const data = await api.cart(activeToken)
      setCart(data?.items || [])
    } catch { localStorage.removeItem('tc_session'); setToken(''); setUser(null); setCart([]) }
  }

  const loadOrders = async activeToken => {
    if (!activeToken) return setOrders([])
    try { const data = await api.orders(activeToken); setOrders(data?.items || []) } catch { setOrders([]) }
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
      } catch (error) { if (mounted) notify(error.message) }
      finally { if (mounted) setLoading(false) }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(loadCatalog, 260)
    return () => window.clearTimeout(timer)
  }, [query, brandFilter])

  const catalog = useMemo(() => products, [products])
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + Number(item.Quantity || 0), 0), [cart])
  const cartDetailed = useMemo(() => cart.map(item => ({ ...item, product: products.find(p => String(p.ProductID) === String(item.ProductID)) })).filter(item => item.product), [cart, products])
  const subtotal = useMemo(() => cartDetailed.reduce((sum, item) => sum + Number(item.product.FaceValue || 0) * Number(item.Quantity || 0), 0), [cartDetailed])
  const total = useMemo(() => cartDetailed.reduce((sum, item) => sum + Number(item.product.SellingPrice || 0) * Number(item.Quantity || 0), 0), [cartDetailed])
  const savings = Math.max(0, subtotal - total)

  const go = next => { setView(next); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const toggleLike = id => setLiked(current => { const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id]; localStorage.setItem('tc_liked', JSON.stringify(next)); return next })

  const openAuth = mode => { setAuthMode(mode); setAuthStep('email'); setOtp(''); setAuthMessage(''); setAuthOpen(true) }
  const requestOtp = async e => {
    e.preventDefault(); setBusy(true); setAuthMessage('')
    try { await api.requestOtp(email, authMode === 'register' ? 'SHOP_REGISTER' : 'SHOP_LOGIN'); setAuthStep('otp'); setAuthMessage(`Verification code sent to ${email}.`) }
    catch (error) { setAuthMessage(error.message) } finally { setBusy(false) }
  }
  const verifyOtp = async e => {
    e.preventDefault(); setBusy(true); setAuthMessage('')
    try {
      const data = await api.verifyOtp(email, otp, name, authMode === 'register' ? 'SHOP_REGISTER' : 'SHOP_LOGIN')
      localStorage.setItem('tc_session', data.session.token); setToken(data.session.token); setUser(data.user); setProfileName(data.user.name || '')
      setAuthOpen(false); await Promise.all([loadCart(data.session.token), loadOrders(data.session.token)]); notify('Welcome to Trusted Circle.')
    } catch (error) { setAuthMessage(error.message) } finally { setBusy(false) }
  }
  const logout = async () => { try { if (token) await api.logout(token) } catch {} localStorage.removeItem('tc_session'); setToken(''); setUser(null); setCart([]); setOrders([]); go('home'); notify('You have been logged out.') }

  const addToCart = async product => {
    if (!token) return openAuth('login')
    try { const data = await api.cartAdd(token, product.ProductID, 1); setCart(data?.items || []); notify(`${product.Title} added to cart.`) }
    catch (error) { notify(error.message) }
  }
  const changeQty = async (item, quantity) => {
    if (quantity < 1) return removeItem(item)
    try { const data = await api.cartUpdate(token, item.CartID, quantity); setCart(data?.items || []) } catch (error) { notify(error.message) }
  }
  const removeItem = async item => {
    try { const data = await api.cartRemove(token, item.CartID); setCart(data?.items || []); notify('Item removed from cart.') } catch (error) { notify(error.message) }
  }
  const saveProfile = async e => {
    e.preventDefault(); setBusy(true)
    try { const data = await api.profileUpdate(token, profileName); setUser(data); notify('Profile updated successfully.') } catch (error) { notify(error.message) } finally { setBusy(false) }
  }
  const placeOrder = async e => {
    e.preventDefault()
    if (!token) return openAuth('login')
    if (!cartDetailed.length) return notify('Your cart is empty.')
    setBusy(true)
    try { const data = await api.placeOrder(token); setLastOrder(data?.order || null); setCart([]); await loadOrders(token); go('success') }
    catch (error) { notify(error.message) } finally { setBusy(false) }
  }

  const ProductCard = ({ product }) => {
    const discount = Number(product.DiscountPercent || 0)
    return <article className="product-card reveal">
      <div className={`product-art ${toneFor(product.BrandID || product.Title)}`}>
        <span className="discount-ribbon">{discount}% OFF</span>
        <button className={`heart ${liked.includes(product.ProductID) ? 'active' : ''}`} onClick={() => toggleLike(product.ProductID)} aria-label="Wishlist"><Heart size={18} fill={liked.includes(product.ProductID) ? 'currentColor' : 'none'} /></button>
        <div className="voucher-logo"><img src={LOGO_URL} alt="Trusted Circle" /></div>
        <span className="product-brand">{brands.find(b => String(b.BrandID) === String(product.BrandID))?.Name || 'Trusted Circle'}</span>
        <strong>{product.Title}</strong>
        <small>Digital E-Gift Voucher</small>
      </div>
      <div className="product-info">
        <div className="product-meta"><span>{product.SKU || 'Gift Voucher'}</span><span className="instant"><Zap size={12}/> Instant</span></div>
        <h3>{product.Title}</h3>
        <p className="product-desc">{product.Description || 'Digital voucher delivered to your account after fulfilment.'}</p>
        <div className="price-row"><div><span className="value">{money(product.FaceValue)}</span><strong>{money(product.SellingPrice)}</strong></div><button className="add-btn" onClick={() => addToCart(product)}>Add <ShoppingBag size={16}/></button></div>
      </div>
    </article>
  }

  return <div className="app-shell">
    <div className="announcement"><Sparkles size={13}/> Exclusive voucher savings • Secure checkout • Digital delivery</div>
    <header className="header">
      <div className="header-inner">
        <button className="mobile-menu" onClick={() => document.body.classList.toggle('nav-open')}><span/><span/><span/></button>
        <a className="brand-logo" href="#home" onClick={() => go('home')}><span className="logo-frame"><img src={LOGO_URL} alt="Trusted Circle" className="brand-logo-image"/></span><span className="brand-name">Trusted <strong>Circle</strong></span></a>
        <nav className="main-nav"><button onClick={() => go('home')}>Home</button><button onClick={() => { go('home'); setTimeout(() => document.getElementById('vouchers')?.scrollIntoView({behavior:'smooth'}), 30) }}>Gift Vouchers</button><button onClick={() => { go('home'); setTimeout(() => document.getElementById('brands')?.scrollIntoView({behavior:'smooth'}), 30) }}>Brands</button><button onClick={() => { go('home'); setTimeout(() => document.getElementById('offers')?.scrollIntoView({behavior:'smooth'}), 30) }}>Offers</button><button onClick={() => { go('home'); setTimeout(() => document.getElementById('how-it-works')?.scrollIntoView({behavior:'smooth'}), 30) }}>How It Works</button><button onClick={() => { go('home'); setTimeout(() => document.getElementById('help')?.scrollIntoView({behavior:'smooth'}), 30) }}>Help</button></nav>
        <div className="header-actions"><button className="icon-btn" onClick={() => setSearchOpen(v => !v)} aria-label="Search"><Search size={20}/></button><button className="cart-icon" onClick={() => go('cart')} aria-label="Cart"><ShoppingBag size={20}/><b>{cartCount}</b></button>{user ? <button className="profile-mini" onClick={() => go('profile')}><UserRound size={17}/><span>{user.name || 'Account'}</span></button> : <button className="login-btn" onClick={() => openAuth('login')}><UserRound size={17}/> Login</button>}</div>
      </div>
      {searchOpen && <div className="search-panel"><Search size={18}/><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search vouchers, brands..."/><button onClick={() => {setQuery('');setSearchOpen(false)}}><X size={16}/></button></div>}
    </header>

    {view === 'home' && <main>
      <section className="hero" id="home"><div className="hero-copy"><div className="eyebrow"><Sparkles size={15}/> SMARTER WAY TO GIFT</div><h1>More value.<br/><em>More gifting.</em></h1><p>Discover branded gift vouchers at special prices. Pick your brand, checkout securely and keep everything organised in one account.</p><div className="hero-ctas"><button className="primary-btn" onClick={() => document.getElementById('vouchers')?.scrollIntoView({behavior:'smooth'})}>Explore Vouchers <ArrowRight size={18}/></button><button className="text-btn" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({behavior:'smooth'})}>How it works</button></div><div className="trust-row"><span><ShieldCheck size={17}/> Secure</span><span><Zap size={17}/> Fast delivery</span><span><Tag size={17}/> Better value</span></div></div><div className="hero-visual"><div className="orb orb-one"/><div className="orb orb-two"/><div className="hero-voucher"><span className="voucher-top"><img src={LOGO_URL} alt="Trusted Circle"/> TRUSTED CIRCLE</span><small>DIGITAL GIFT VOUCHER</small><strong>₹1,000</strong><span>GIFT BETTER • SAVE MORE</span></div><div className="floating-save">UP TO<br/><strong>16%</strong><small>OFF</small></div></div></section>
      <section className="section" id="brands"><div className="section-head"><div><span className="section-kicker">SHOP BY BRAND</span><h2>Your favourites, all in one place</h2></div><button onClick={() => document.getElementById('vouchers')?.scrollIntoView({behavior:'smooth'})}>View all <ArrowRight size={16}/></button></div><div className="brand-grid">{brands.map(b => <button className="brand-tile" key={b.BrandID} onClick={() => {setBrandFilter(String(b.BrandID));document.getElementById('vouchers')?.scrollIntoView({behavior:'smooth'})}}><span className={`brand-icon ${toneFor(b.Name)}`}>{String(b.Name || '?').charAt(0)}</span><strong>{b.Name}</strong><small>Gift vouchers</small></button>)}</div></section>
      <section className="section product-section" id="vouchers"><div className="section-head"><div><span className="section-kicker">POPULAR RIGHT NOW</span><h2>Gift vouchers worth buying</h2></div><div className="filter-wrap"><select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}><option value="">All brands</option>{brands.map(b => <option key={b.BrandID} value={b.BrandID}>{b.Name}</option>)}</select><ChevronDown size={15}/></div></div>{brandFilter && <div className="active-filter">Filtered by {brands.find(b => String(b.BrandID) === String(brandFilter))?.Name || 'brand'} <button onClick={() => setBrandFilter('')}><X size={13}/></button></div>}{loading ? <div className="loading-grid">{[1,2,3,4].map(x => <div className="skeleton" key={x}/>)}</div> : catalog.length ? <div className="product-grid">{catalog.map(p => <ProductCard key={p.ProductID} product={p}/>)}</div> : <div className="empty"><Gift size={28}/><h3>No vouchers found</h3><p>{query ? `Nothing matched “${query}”.` : 'No vouchers are published yet.'}</p></div>}</section>
      <section className="benefit-strip" id="offers"><div><span><Tag/></span><div><strong>Transparent savings</strong><p>Discount rate shown on every voucher.</p></div></div><div><span><Zap/></span><div><strong>Digital delivery</strong><p>Fast fulfilment for eligible vouchers.</p></div></div><div><span><ShieldCheck/></span><div><strong>Secure account</strong><p>Your orders and cart stay with you.</p></div></div></section>
      <section className="how" id="how-it-works"><span className="section-kicker">HOW IT WORKS</span><h2>From favourite brand to order in three steps.</h2><div className="steps"><div><span>01</span><Gift/><h3>Choose your voucher</h3><p>Browse brands and compare the live discount displayed on each card.</p></div><div><span>02</span><ShoppingBag/><h3>Build your cart</h3><p>Adjust quantities, review your savings and continue to checkout.</p></div><div><span>03</span><PackageCheck/><h3>Place your order</h3><p>Confirm your order and receive an order number for tracking and fulfilment.</p></div></div></section>
    </main>}

    {view === 'cart' && <main className="page"><div className="page-head"><button className="back-btn" onClick={() => go('home')}><ArrowLeft size={17}/> Continue shopping</button><span className="section-kicker">YOUR CART</span><h1>Review your vouchers.</h1><p>{cartCount} item{cartCount === 1 ? '' : 's'} in your cart</p></div>{cartDetailed.length ? <div className="cart-layout"><div className="cart-list">{cartDetailed.map(item => <div className="cart-item" key={item.CartID}><div className={`mini-art ${toneFor(item.product.BrandID)}`}><img src={LOGO_URL} alt=""/><span>{item.product.Title}</span></div><div className="cart-item-main"><span className="cart-brand">{brands.find(b => String(b.BrandID) === String(item.product.BrandID))?.Name}</span><h3>{item.product.Title}</h3><div className="cart-line"><span>{money(item.product.SellingPrice)} each</span><div className="qty"><button onClick={() => changeQty(item, Number(item.Quantity)-1)}><Minus size={14}/></button><b>{item.Quantity}</b><button onClick={() => changeQty(item, Number(item.Quantity)+1)}><Plus size={14}/></button></div><button className="remove" onClick={() => removeItem(item)}>Remove</button></div></div></div>)}</div><aside className="summary-card"><span className="section-kicker">ORDER SUMMARY</span><div><span>Voucher value</span><strong>{money(subtotal)}</strong></div><div><span>Discount</span><strong className="saving">− {money(savings)}</strong></div><hr/><div className="summary-total"><span>Total</span><strong>{money(total)}</strong></div><button className="primary-btn wide" onClick={() => token ? go('checkout') : openAuth('login')}>Proceed to Checkout <ArrowRight size={17}/></button><p className="secure-note"><ShieldCheck size={15}/> Secure checkout • No payment is taken on this screen</p></aside></div> : <div className="empty large"><ShoppingBag size={34}/><h2>Your cart is waiting.</h2><p>Add a voucher to get started.</p><button className="primary-btn" onClick={() => go('home')}>Browse Vouchers</button></div>}</main>}

    {view === 'checkout' && <main className="page"><div className="page-head compact"><button className="back-btn" onClick={() => go('cart')}><ArrowLeft size={17}/> Back to cart</button><span className="section-kicker">CHECKOUT</span><h1>Confirm your order.</h1><div className="checkout-steps"><span className="done"><CheckCircle2 size={16}/> Cart</span><span className="current">02 Checkout</span><span>03 Order placed</span></div></div><div className="checkout-layout"><form className="checkout-card" onSubmit={placeOrder}><div className="checkout-section"><div className="checkout-title"><span>1</span><div><h3>Account</h3><p>Order will be linked to your Trusted Circle account.</p></div></div><div className="account-readonly"><div className="avatar"><UserRound size={19}/></div><div><strong>{user?.name || 'Trusted Circle customer'}</strong><span>{user?.email}</span></div><button type="button" onClick={() => go('profile')}>Edit profile</button></div></div><div className="checkout-section"><div className="checkout-title"><span>2</span><div><h3>Payment</h3><p>Payment gateway will be connected here before production launch.</p></div></div><div className="payment-placeholder"><ShieldCheck size={24}/><div><strong>Secure online payment</strong><span>Gateway integration pending. Placing this test order creates a PENDING_PAYMENT order only.</span></div></div></div><label className="check-row"><input type="checkbox" required/> <span>I have reviewed my voucher quantities and order total.</span></label><button className="primary-btn wide" disabled={busy}>{busy ? 'Placing order…' : 'Place Order'} <ArrowRight size={17}/></button></form><aside className="summary-card"><span className="section-kicker">YOUR ORDER</span>{cartDetailed.map(item => <div className="summary-item" key={item.CartID}><span>{item.product.Title} × {item.Quantity}</span><strong>{money(Number(item.product.SellingPrice)*Number(item.Quantity))}</strong></div>)}<hr/><div><span>Savings</span><strong className="saving">{money(savings)}</strong></div><div className="summary-total"><span>Total</span><strong>{money(total)}</strong></div></aside></div></main>}

    {view === 'success' && <main className="success-page"><div className="success-card"><div className="success-icon"><CheckCircle2 size={38}/></div><span className="section-kicker">ORDER CREATED</span><h1>Your order is placed.</h1><p className="success-copy">Your order has been recorded successfully. Payment and voucher fulfilment are pending the production gateway/fulfilment connection.</p>{lastOrder?.order && <div className="order-number"><span>ORDER NUMBER</span><strong>{lastOrder.order.OrderNumber}</strong><small>{lastOrder.order.Status}</small></div>}<div className="success-actions"><button className="primary-btn" onClick={() => go('orders')}>View My Orders</button><button className="text-btn" onClick={() => go('home')}>Continue shopping</button></div></div></main>}

    {view === 'profile' && <main className="page"><div className="page-head"><button className="back-btn" onClick={() => go('home')}><ArrowLeft size={17}/> Home</button><span className="section-kicker">ACCOUNT</span><h1>Profile management.</h1><p>Keep your shopping account details up to date.</p></div><div className="profile-layout"><section className="profile-card"><div className="profile-avatar"><UserRound size={30}/></div><form onSubmit={saveProfile}><label>Full name<input value={profileName} onChange={e => setProfileName(e.target.value)} maxLength={120} required/></label><label>Email address<input value={user?.email || ''} readOnly/></label><div className="id-row"><span>Trusted Circle User ID</span><strong>{user?.userId}</strong></div><button className="primary-btn wide" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></form><button className="logout-btn" onClick={logout}>Logout</button></section><section className="orders-preview"><div className="section-head"><div><span className="section-kicker">ORDER HISTORY</span><h2>Your recent orders</h2></div><button onClick={() => go('orders')}>View all <ArrowRight size={16}/></button></div>{orders.length ? orders.slice(0,4).map(order => <button className="order-row" key={order.OrderID} onClick={() => go('orders')}><span><strong>{order.OrderNumber}</strong><small>{String(order.CreatedAt || '').replace('T',' ').slice(0,16)}</small></span><span><b>{money(order.Total)}</b><em>{String(order.Status).replaceAll('_',' ')}</em></span></button>) : <div className="empty"><PackageCheck size={26}/><p>No orders yet.</p></div>}</section></div></main>}

    {view === 'orders' && <main className="page"><div className="page-head"><button className="back-btn" onClick={() => go('profile')}><ArrowLeft size={17}/> Account</button><span className="section-kicker">MY ORDERS</span><h1>Order history.</h1><p>Every order associated with your account.</p></div><div className="orders-list">{orders.length ? orders.map(order => <article className="order-card" key={order.OrderID}><div><span className="order-status">{String(order.Status).replaceAll('_',' ')}</span><h3>{order.OrderNumber}</h3><small>{String(order.CreatedAt || '').replace('T',' ').slice(0,16)} • {order.Currency || 'INR'}</small></div><strong>{money(order.Total)}</strong></article>) : <div className="empty large"><PackageCheck size={34}/><h2>No orders yet.</h2><button className="primary-btn" onClick={() => go('home')}>Start Shopping</button></div>}</div></main>}

    <footer className="footer" id="help"><div className="footer-main"><div><a className="brand-logo footer-logo" href="#home" onClick={() => go('home')}><span className="logo-frame"><img src={LOGO_URL} alt="Trusted Circle" className="brand-logo-image"/></span><span className="brand-name">Trusted <strong>Circle</strong></span></a><p>Branded gift vouchers, better value, simpler gifting.</p></div><div><h4>Shop</h4><button onClick={() => go('home')}>Gift Vouchers</button><button onClick={() => go('home')}>Brands</button><button onClick={() => go('home')}>Offers</button></div><div><h4>Support</h4><button onClick={() => document.getElementById('help')?.scrollIntoView({behavior:'smooth'})}>Help Centre</button><button onClick={() => user ? go('orders') : openAuth('login')}>Orders</button><button onClick={() => notify('Contact support details will be added here.')}>Contact Us</button></div><div><h4>Account</h4><button onClick={() => user ? go('profile') : openAuth('login')}>{user ? 'My Profile' : 'Login / Register'}</button><button onClick={() => go('cart')}>My Cart</button></div></div><div className="footer-bottom"><span>© 2026 Trusted Circle. All rights reserved.</span><span><button>Privacy</button> · <button>Terms</button> · <a className="erp-link" href="#erp-login">ERP Login</a></span></div></footer>

    {toast && <div className="toast"><CheckCircle2 size={16}/>{toast}</div>}
    {authOpen && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setAuthOpen(false)}><div className="auth-modal"><button className="modal-close" onClick={() => setAuthOpen(false)}><X size={19}/></button><div className="modal-logo"><img src={LOGO_URL} alt="Trusted Circle"/></div><span className="section-kicker">TRUSTED CIRCLE ACCOUNT</span><h2>{authStep === 'email' ? (authMode === 'register' ? 'Create your account' : 'Welcome back') : 'Enter your OTP'}</h2><p>{authStep === 'email' ? 'Sign in securely with your email and a one-time verification code.' : `We sent a 6-digit code to ${email}.`}</p>{authStep === 'email' ? <form onSubmit={requestOtp}>{authMode === 'register' && <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required/>}<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoFocus required/><button className="modal-submit" disabled={busy}>{busy ? 'Sending…' : 'Send OTP'}</button></form> : <form onSubmit={verifyOtp}><input inputMode="numeric" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-digit OTP" autoFocus maxLength={6} required/><button className="modal-submit" disabled={busy || otp.length !== 6}>{busy ? 'Verifying…' : 'Verify & Continue'}</button><button type="button" className="modal-secondary" onClick={() => setAuthStep('email')}>Change email</button></form>}{authMessage && <div className="auth-message">{authMessage}</div>}<div className="auth-switch">{authMode === 'login' ? <>New to Trusted Circle? <button onClick={() => {setAuthMode('register');setAuthStep('email');setAuthMessage('')}}>Create account</button></> : <>Already have an account? <button onClick={() => {setAuthMode('login');setAuthStep('email');setAuthMessage('')}}>Login</button></>}</div></div></div>}
  </div>
}

export default App
