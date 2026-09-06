import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Gift, Heart, Search, ShoppingBag, Sparkles, ShieldCheck, Tag, UserRound, X, Zap } from 'lucide-react'
import { api } from './api'

const LOGO_URL = 'https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'

const toneFor = value => {
  const tones = ['dark', 'pink', 'blue', 'orange', 'red', 'green']
  const text = String(value || '')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) hash = (hash + text.charCodeAt(i)) % tones.length
  return tones[hash]
}

const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`

function App() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [cart, setCart] = useState([])
  const [liked, setLiked] = useState([])
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('tc_session') || '')
  const [loading, setLoading] = useState(true)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authStep, setAuthStep] = useState('email')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  const loadCatalog = async (q = '') => {
    try {
      const [brandData, productData] = await Promise.all([api.brands(), api.products(q)])
      setBrands(brandData?.items || [])
      setProducts(productData?.items || [])
    } catch (error) {
      setActionMessage(error.message)
    }
  }

  const loadCart = async activeToken => {
    if (!activeToken) {
      setCart([])
      return
    }
    try {
      const data = await api.cart(activeToken)
      setCart(data?.items || [])
    } catch {
      localStorage.removeItem('tc_session')
      setToken('')
      setUser(null)
      setCart([])
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        await api.health()
        await loadCatalog()
        if (token) {
          const me = await api.me(token)
          if (mounted) setUser(me)
          await loadCart(token)
        }
      } catch (error) {
        if (mounted) setActionMessage(error.message)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCatalog(query.trim())
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + Number(item.Quantity || 0), 0), [cart])

  const toggleLike = id => setLiked(value => value.includes(id) ? value.filter(x => x !== id) : [...value, id])

  const openAuth = mode => {
    setAuthMode(mode)
    setAuthStep('email')
    setOtp('')
    setAuthMessage('')
    setAuthOpen(true)
  }

  const requestOtp = async event => {
    event.preventDefault()
    setAuthBusy(true)
    setAuthMessage('')
    try {
      await api.requestOtp(email, authMode === 'register' ? 'SHOP_REGISTER' : 'SHOP_LOGIN')
      setAuthStep('otp')
      setAuthMessage(`Verification code sent to ${email}.`)
    } catch (error) {
      setAuthMessage(error.message)
    } finally {
      setAuthBusy(false)
    }
  }

  const verifyOtp = async event => {
    event.preventDefault()
    setAuthBusy(true)
    setAuthMessage('')
    try {
      const data = await api.verifyOtp(email, otp, name, authMode === 'register' ? 'SHOP_REGISTER' : 'SHOP_LOGIN')
      localStorage.setItem('tc_session', data.session.token)
      setToken(data.session.token)
      setUser(data.user)
      setAuthOpen(false)
      await loadCart(data.session.token)
    } catch (error) {
      setAuthMessage(error.message)
    } finally {
      setAuthBusy(false)
    }
  }

  const logout = async () => {
    try { if (token) await api.logout(token) } catch { /* local logout still succeeds */ }
    localStorage.removeItem('tc_session')
    setToken('')
    setUser(null)
    setCart([])
  }

  const addToCart = async product => {
    if (!token) {
      openAuth('login')
      return
    }
    try {
      const data = await api.cartAdd(token, product.ProductID, 1)
      setCart(data?.items || [])
      setActionMessage(`${product.Title} added to your cart.`)
      setTimeout(() => setActionMessage(''), 2500)
    } catch (error) {
      setActionMessage(error.message)
    }
  }

  return (
    <div className="app-shell">
      <div className="announcement">✨ Save more on every gift. Instant digital delivery on eligible vouchers.</div>

      <header className="header">
        <div className="header-inner">
          <a className="brand-logo" href="#home" aria-label="Trusted Circle home">
            <img src={LOGO_URL} alt="Trusted Circle" className="brand-logo-image" />
            <span className="brand-name">Trusted <strong>Circle</strong></span>
          </a>

          <div className="header-actions">
            <button className="icon-btn" onClick={() => setSearchOpen(!searchOpen)} aria-label="Search"><Search size={20} /></button>
            <a className="icon-btn cart-btn" href="#cart" aria-label="Cart"><ShoppingBag size={20} /><b>{cartCount}</b></a>
            {user ? <button className="account-btn" onClick={logout}><UserRound size={17} /> {user.name || user.email}</button> : <button className="login-btn" onClick={() => openAuth('login')}><UserRound size={17} /> Login / Register</button>}
          </div>
        </div>
        {searchOpen && <div className="search-panel"><Search size={19} /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search vouchers, brands..." /><button onClick={() => { setQuery(''); setSearchOpen(false) }}>Close</button></div>}
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15} /> SMARTER WAY TO GIFT</div>
            <h1>More value.<br /><em>More gifting.</em></h1>
            <p>Shop branded gift vouchers at great prices. Buy in seconds, pay securely, and get your voucher digitally.</p>
            <div className="hero-ctas"><a className="primary-btn" href="#vouchers">Explore Vouchers <ArrowRight size={18} /></a><a className="text-btn" href="#how-it-works">How it works</a></div>
            <div className="trust-row"><span><ShieldCheck size={17} /> Secure payments</span><span><Zap size={17} /> Fast delivery</span><span><Tag size={17} /> Better value</span></div>
          </div>
          <div className="hero-card-wrap" aria-hidden="true">
            <div className="floating-card card-back">GIFT<br />BETTER</div>
            <div className="floating-card card-main"><div className="card-top"><span>TRUSTED CIRCLE</span><Gift size={27} /></div><div className="card-value">₹1,000</div><div className="card-bottom"><span>Digital Gift Voucher</span><span>•••• 2026</span></div></div>
            <div className="save-badge">SAVE<br /><strong>₹35</strong></div>
          </div>
        </section>

        <section className="section" id="brands">
          <div className="section-head"><div><span className="section-kicker">SHOP BY BRAND</span><h2>Your favourites, all in one place</h2></div><a href="#vouchers">View all brands <ArrowRight size={17} /></a></div>
          {loading ? <div className="empty">Loading brands…</div> : brands.length ? <div className="brand-grid">{brands.map(b => <a className="brand-tile" href="#vouchers" key={b.BrandID || b.Name}><span className={`brand-icon ${toneFor(b.Name)}`}>{String(b.Name || '?').charAt(0).toUpperCase()}</span><strong>{b.Name}</strong><small>Gift vouchers</small></a>)}</div> : <div className="empty">No brands are available yet.</div>}
        </section>

        <section className="section product-section" id="vouchers">
          <div className="section-head"><div><span className="section-kicker">POPULAR RIGHT NOW</span><h2>Gift vouchers worth buying</h2></div><a href="#vouchers">View all <ArrowRight size={17} /></a></div>
          {loading ? <div className="empty">Loading vouchers…</div> : products.length ? <div className="product-grid">{products.map(p => { const tone = toneFor(p.BrandID || p.Title); return <article className="product-card" key={p.ProductID}><div className={`product-art ${tone}`}><span>{p.Title || 'Gift Voucher'}</span><Gift size={40} /><small>Digital Voucher</small><button className={`heart ${liked.includes(p.ProductID) ? 'active' : ''}`} onClick={() => toggleLike(p.ProductID)} aria-label="Wishlist"><Heart size={18} fill={liked.includes(p.ProductID) ? 'currentColor' : 'none'} /></button></div><div className="product-info"><div className="product-title"><div><small>{p.SKU || 'Trusted Circle'}</small><h3>{p.Title}</h3></div><span className="discount">{Number(p.DiscountPercent || 0)}% OFF</span></div><div className="price-row"><div><span className="value">{money(p.FaceValue)}</span><strong>{money(p.SellingPrice)}</strong></div><button className="add-btn" onClick={() => addToCart(p)}>Add <ShoppingBag size={16} /></button></div></div></article> })}</div> : <div className="empty">No vouchers found{query ? ` for “${query}”` : ''}. Add products in the Google Sheet to publish them here.</div>}
        </section>

        <section className="benefit-strip" id="offers"><div><span className="benefit-icon"><Tag /></span><div><strong>Real savings</strong><p>Pay less than the voucher value.</p></div></div><div><span className="benefit-icon"><Zap /></span><div><strong>Digital delivery</strong><p>Get eligible vouchers quickly.</p></div></div><div><span className="benefit-icon"><ShieldCheck /></span><div><strong>Secure checkout</strong><p>Your payment is protected.</p></div></div></section>

        <section className="how" id="how-it-works"><div className="section-kicker">HOW IT WORKS</div><h2>Gift smarter in three simple steps.</h2><div className="steps"><div><span>01</span><Gift /><h3>Choose a voucher</h3><p>Pick your favourite brand and voucher value.</p></div><div><span>02</span><ShoppingBag /><h3>Pay securely</h3><p>Complete checkout with your preferred payment method.</p></div><div><span>03</span><Zap /><h3>Receive & enjoy</h3><p>Your digital voucher is delivered to your account and email.</p></div></div></section>
      </main>

      <footer className="footer" id="help"><div className="footer-main"><div><a className="brand-logo footer-logo" href="#home"><img src={LOGO_URL} alt="Trusted Circle" className="brand-logo-image footer-logo-image" /><span className="brand-name">Trusted <strong>Circle</strong></span></a><p>Branded gift vouchers, better value, simpler gifting.</p></div><div><h4>Shop</h4><a href="#vouchers">Gift Vouchers</a><a href="#brands">Brands</a><a href="#offers">Offers</a></div><div><h4>Support</h4><a href="#help">Help Centre</a><a href="#orders">Orders</a><a href="#contact">Contact Us</a></div><div><h4>Account</h4><button className="footer-action" onClick={() => user ? logout() : openAuth('login')}>{user ? 'Logout' : 'Login / Register'}</button><a href="#cart">My Cart</a><a href="#profile">My Profile</a></div></div><div className="footer-bottom"><span>© 2026 Trusted Circle. All rights reserved.</span><span><a href="#privacy">Privacy</a> · <a href="#terms">Terms</a> · <a className="erp-link" href="#erp-login">ERP Login</a></span></div></footer>

      {actionMessage && <div className="toast">{actionMessage}</div>}

      {authOpen && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setAuthOpen(false)}><div className="auth-modal"><button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Close"><X size={20} /></button><span className="modal-icon"><Gift size={22} /></span><h2>{authStep === 'email' ? (authMode === 'register' ? 'Create your account' : 'Welcome back') : 'Enter your OTP'}</h2><p>{authStep === 'email' ? 'Use your email to receive a secure verification code.' : `We sent a 6-digit code to ${email}.`}</p>{authStep === 'email' ? <form onSubmit={requestOtp}>{authMode === 'register' && <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" maxLength={120} required />}<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoFocus required /><button className="modal-submit" disabled={authBusy}>{authBusy ? 'Sending…' : 'Send OTP'}</button></form> : <form onSubmit={verifyOtp}><input inputMode="numeric" autoFocus value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP" maxLength={6} required /><button className="modal-submit" disabled={authBusy || otp.length !== 6}>{authBusy ? 'Verifying…' : 'Verify & Continue'}</button><button type="button" className="modal-secondary" onClick={() => setAuthStep('email')}>Change email</button></form>}{authMessage && <div className="auth-message">{authMessage}</div>}<div className="auth-switch">{authMode === 'login' ? <>New to Trusted Circle? <button onClick={() => { setAuthMode('register'); setAuthStep('email'); setAuthMessage('') }}>Create account</button></> : <>Already have an account? <button onClick={() => { setAuthMode('login'); setAuthStep('email'); setAuthMessage('') }}>Login</button></>}</div></div></div>}
    </div>
  )
}

export default App
