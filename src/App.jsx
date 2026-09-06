import { useMemo, useState } from 'react'
import { ArrowRight, ChevronDown, Gift, Heart, Menu, Search, ShoppingBag, Sparkles, ShieldCheck, Tag, UserRound, X, Zap } from 'lucide-react'

const brands = [
  { name: 'Amazon', icon: 'A', tone: 'dark' },
  { name: 'Myntra', icon: 'M', tone: 'pink' },
  { name: 'Flipkart', icon: 'F', tone: 'blue' },
  { name: 'Swiggy', icon: 'S', tone: 'orange' },
  { name: 'BookMyShow', icon: 'B', tone: 'red' },
  { name: 'Croma', icon: 'C', tone: 'green' },
]

const products = [
  { id: 1, brand: 'Amazon', title: 'Amazon Gift Card', value: 1000, price: 965, discount: 3.5, tone: 'dark' },
  { id: 2, brand: 'Myntra', title: 'Myntra E-Gift Card', value: 2000, price: 1900, discount: 5, tone: 'pink' },
  { id: 3, brand: 'Flipkart', title: 'Flipkart Gift Voucher', value: 1000, price: 960, discount: 4, tone: 'blue' },
  { id: 4, brand: 'Swiggy', title: 'Swiggy Money Voucher', value: 500, price: 465, discount: 7, tone: 'orange' },
]

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cartCount, setCartCount] = useState(0)
  const [liked, setLiked] = useState([])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? products.filter(p => `${p.brand} ${p.title}`.toLowerCase().includes(q)) : products
  }, [query])

  const toggleLike = id => setLiked(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id])

  return (
    <div className="app-shell">
      <div className="announcement">✨ Save more on every gift. Instant digital delivery on eligible vouchers.</div>

      <header className="header">
        <div className="header-inner">
          <button className="icon-btn mobile-only" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <a className="brand-logo" href="#home" aria-label="Trusted Circle home">
            <span className="logo-mark"><Gift size={21} /></span>
            <span>Trusted<span>Circle</span></span>
          </a>

          <nav className={`main-nav ${menuOpen ? 'open' : ''}`}>
            <a href="#home">Home</a>
            <a href="#vouchers">Gift Vouchers</a>
            <a href="#brands">Brands</a>
            <a href="#offers">Offers</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#help">Help</a>
          </nav>

          <div className="header-actions">
            <button className="icon-btn" onClick={() => setSearchOpen(!searchOpen)} aria-label="Search"><Search size={20} /></button>
            <a className="icon-btn cart-btn" href="#cart" aria-label="Cart"><ShoppingBag size={20} /><b>{cartCount}</b></a>
            <a className="login-btn" href="#login"><UserRound size={17} /> Login / Register</a>
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
          <div className="brand-grid">{brands.map(b => <a className="brand-tile" href="#vouchers" key={b.name}><span className={`brand-icon ${b.tone}`}>{b.icon}</span><strong>{b.name}</strong><small>Gift vouchers</small></a>)}</div>
        </section>

        <section className="section product-section" id="vouchers">
          <div className="section-head"><div><span className="section-kicker">POPULAR RIGHT NOW</span><h2>Gift vouchers worth buying</h2></div><a href="#all-vouchers">View all <ArrowRight size={17} /></a></div>
          <div className="product-grid">{filtered.map(p => <article className="product-card" key={p.id}><div className={`product-art ${p.tone}`}><span>{p.brand}</span><Gift size={40} /><small>Digital Voucher</small><button className={`heart ${liked.includes(p.id) ? 'active' : ''}`} onClick={() => toggleLike(p.id)} aria-label="Wishlist"><Heart size={18} fill={liked.includes(p.id) ? 'currentColor' : 'none'} /></button></div><div className="product-info"><div className="product-title"><div><small>{p.brand}</small><h3>{p.title}</h3></div><span className="discount">{p.discount}% OFF</span></div><div className="price-row"><div><span className="value">₹{p.value.toLocaleString('en-IN')}</span><strong>₹{p.price.toLocaleString('en-IN')}</strong></div><button className="add-btn" onClick={() => setCartCount(v => v + 1)}>Add <ShoppingBag size={16} /></button></div></div></article>)}</div>
          {!filtered.length && <div className="empty">No vouchers found for “{query}”.</div>}
        </section>

        <section className="benefit-strip" id="offers"><div><span className="benefit-icon"><Tag /></span><div><strong>Real savings</strong><p>Pay less than the voucher value.</p></div></div><div><span className="benefit-icon"><Zap /></span><div><strong>Digital delivery</strong><p>Get eligible vouchers quickly.</p></div></div><div><span className="benefit-icon"><ShieldCheck /></span><div><strong>Secure checkout</strong><p>Your payment is protected.</p></div></div></section>

        <section className="how" id="how-it-works"><div className="section-kicker">HOW IT WORKS</div><h2>Gift smarter in three simple steps.</h2><div className="steps"><div><span>01</span><Gift /><h3>Choose a voucher</h3><p>Pick your favourite brand and voucher value.</p></div><div><span>02</span><ShoppingBag /><h3>Pay securely</h3><p>Complete checkout with your preferred payment method.</p></div><div><span>03</span><Zap /><h3>Receive & enjoy</h3><p>Your digital voucher is delivered to your account and email.</p></div></div></section>
      </main>

      <footer className="footer" id="help"><div className="footer-main"><div><a className="brand-logo footer-logo" href="#home"><span className="logo-mark"><Gift size={21} /></span><span>Trusted<span>Circle</span></span></a><p>Branded gift vouchers, better value, simpler gifting.</p></div><div><h4>Shop</h4><a href="#vouchers">Gift Vouchers</a><a href="#brands">Brands</a><a href="#offers">Offers</a></div><div><h4>Support</h4><a href="#help">Help Centre</a><a href="#orders">Orders</a><a href="#contact">Contact Us</a></div><div><h4>Account</h4><a href="#login">Login / Register</a><a href="#cart">My Cart</a><a href="#profile">My Profile</a></div></div><div className="footer-bottom"><span>© 2026 Trusted Circle. All rights reserved.</span><span><a href="#privacy">Privacy</a> · <a href="#terms">Terms</a> · <a className="erp-link" href="#erp-login">ERP Login</a></span></div></footer>
    </div>
  )
}

export default App
