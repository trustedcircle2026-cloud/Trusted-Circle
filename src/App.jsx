import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { api } from './api'
import GlobalLoading from './GlobalLoading'
import HomePage from './pages/HomePage'
import BrandsPage from './pages/BrandsPage'
import VouchersPage from './pages/VouchersPage'
import VoucherPage from './pages/VoucherPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import ProfilePage from './pages/ProfilePage'
import OrdersPage from './pages/OrdersPage'
import OrderPlacedPage from './pages/OrderPlacedPage'
import './app.css'

const LOGO_URL = 'https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'
const QR_URL = 'https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/UPIQR.jpg'

function readRoute() {
  const raw = window.location.hash.replace(/^#\/?/, '') || 'home'
  const [path, id] = raw.split('/')
  return { path, id: id || '' }
}

export default function App() {
  const [route, setRoute] = useState(readRoute)
  const [products, setProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [cart, setCart] = useState([])
  const [orders, setOrders] = useState([])
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('tc_session') || '')
  const [query, setQuery] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [liked, setLiked] = useState(() => { try { return JSON.parse(localStorage.getItem('tc_liked') || '[]') } catch { return [] } })
  const [authOpen, setAuthOpen] = useState(false)
  const [authStep, setAuthStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [lastOrder, setLastOrder] = useState(null)

  const navigate = useCallback((path, id = '') => {
    const target = id ? `#/${path}/${id}` : `#/${path}`
    if (window.location.hash !== target) window.location.hash = target
    else setRoute({ path, id })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const onHash = () => setRoute(readRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const brandName = useCallback(id => brands.find(b => String(b.BrandID) === String(id))?.Name || 'Gift Voucher', [brands])

  const loadCatalog = useCallback(async (q = query, brand = brandFilter) => {
    const data = await api.products(q.trim(), brand)
    setProducts(data?.items || [])
  }, [query, brandFilter])

  const loadAllProducts = useCallback(async () => {
    const data = await api.products('', '')
    const items = data?.items || []
    setAllProducts(items)
    return items
  }, [])

  const loadCart = useCallback(async currentToken => {
    if (!currentToken) { setCart([]); return }
    const data = await api.cart(currentToken)
    setCart(data?.items || [])
  }, [])

  const loadOrders = useCallback(async currentToken => {
    if (!currentToken) { setOrders([]); return }
    const data = await api.orders(currentToken)
    setOrders(data?.items || [])
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        await api.health()
        const [brandData, productData] = await Promise.all([api.brands(), api.products('', '')])
        if (!active) return
        setBrands(brandData?.items || [])
        setProducts(productData?.items || [])
        setAllProducts(productData?.items || [])
        if (token) {
          try {
            const me = await api.me(token)
            if (!active) return
            setUser(me); setProfileName(me.name || '')
            if (!me.name) setProfileOpen(true)
            await Promise.all([loadCart(token), loadOrders(token)])
          } catch (error) {
            localStorage.removeItem('tc_session'); setToken(''); setUser(null); setCart([])
            console.warn('Session restore:', error.message)
          }
        }
      } catch (error) {
        console.warn('Trusted Circle startup:', error.message)
      }
    })()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (route.path !== 'vouchers' && route.path !== 'home') return
    const timer = setTimeout(() => { loadCatalog(query, brandFilter).catch(() => {}) }, 250)
    return () => clearTimeout(timer)
  }, [query, brandFilter, route.path])

  const cartDetailed = useMemo(() => cart.map(item => ({ ...item, product: allProducts.find(p => String(p.ProductID) === String(item.ProductID)) })).filter(item => item.product), [cart, allProducts])
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + Number(item.Quantity || 0), 0), [cart])
  const subtotal = useMemo(() => cartDetailed.reduce((sum, item) => sum + Number(item.product.FaceValue || 0) * Number(item.Quantity || 0), 0), [cartDetailed])
  const total = useMemo(() => cartDetailed.reduce((sum, item) => sum + Number(item.product.SellingPrice || 0) * Number(item.Quantity || 0), 0), [cartDetailed])
  const savings = Math.max(0, subtotal - total)
  const currentProduct = useMemo(() => allProducts.find(p => String(p.ProductID) === String(route.id)), [allProducts, route.id])

  const toggleLike = id => setLiked(current => { const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id]; localStorage.setItem('tc_liked', JSON.stringify(next)); return next })

  const openAuth = () => { setAuthStep('email'); setOtp(''); setAuthMessage(''); setAuthOpen(true) }
  const requestOtp = async event => { event.preventDefault(); setAuthMessage(''); try { await api.requestOtp(email); setAuthStep('otp'); setAuthMessage(`Verification code sent to ${email}.`) } catch (error) { setAuthMessage(error.message) } }
  const verifyOtp = async event => {
    event.preventDefault(); setAuthMessage('')
    try {
      const data = await api.verifyOtp(email, otp, '')
      localStorage.setItem('tc_session', data.session.token)
      setToken(data.session.token); setUser(data.user); setProfileName(data.user.name || '')
      await Promise.all([loadCart(data.session.token), loadOrders(data.session.token), loadAllProducts()])
      setAuthOpen(false)
      if (!data.user.name) setProfileOpen(true)
      else navigate('home')
    } catch (error) { setAuthMessage(error.message) }
  }

  const saveProfile = async event => {
    event.preventDefault(); setAuthMessage('')
    try { const data = await api.profileUpdate(token, profileName); setUser(data); setProfileOpen(false); navigate('home') } catch (error) { setAuthMessage(error.message) }
  }

  const logout = async () => {
    try { if (token) await api.logout(token) } catch {}
    localStorage.removeItem('tc_session'); setToken(''); setUser(null); setCart([]); setOrders([]); setProfileOpen(false); navigate('home')
  }

  const addToCart = async product => {
    if (!token) { openAuth(); return }
    try { const data = await api.cartAdd(token, product.ProductID, 1); setCart(data?.items || []); await loadAllProducts() } catch (error) { setAuthMessage(error.message) }
  }
  const changeQty = async (item, quantity) => { if (quantity < 1) return removeItem(item); try { const data = await api.cartUpdate(token, item.CartID, quantity); setCart(data?.items || []) } catch (error) { setAuthMessage(error.message) } }
  const removeItem = async item => { try { const data = await api.cartRemove(token, item.CartID); setCart(data?.items || []) } catch (error) { setAuthMessage(error.message) } }
  const checkout = () => { if (!token) { openAuth(); return } if (cartDetailed.length) navigate('checkout') }
  const createPendingOrder = async () => {
    if (paymentMethod !== 'upi') return
    try { const data = await api.placeOrder(token); setLastOrder(data); await Promise.all([loadCart(token), loadOrders(token)]); navigate('order-placed') } catch (error) { setAuthMessage(error.message) }
  }
  const onBrandBrowse = id => { setBrandFilter(id || ''); navigate('vouchers') }

  return <div className="app-root">
    <GlobalLoading />
    <header className="new-header"><button className="header-brand" onClick={() => navigate('home')}><span className="header-logo-white"><img src={LOGO_URL} alt="Trusted Circle"/></span><span>Trusted<span>Circle</span></span></button><div className="header-actions"><button className="header-tool" onClick={() => navigate('vouchers')} aria-label="Search vouchers"><Search size={19}/></button><button className="header-tool cart-tool" onClick={() => navigate('cart')} aria-label="Cart"><ShoppingBag size={19}/><b>{cartCount}</b></button>{user ? <button className="account-tool" onClick={() => navigate('profile')}><UserRound size={16}/><span>{user.name || 'Complete profile'}</span></button> : <button className="login-tool" onClick={openAuth}>Login <ArrowRight size={15}/></button>}</div></header>

    {route.path === 'home' && <HomePage brands={brands} products={products} brandName={brandName} liked={liked} onLike={toggleLike} onAdd={addToCart} onOpen={id => navigate('voucher', id)} onBrowse={(page = 'vouchers', filter = '') => { if (filter) setBrandFilter(filter); navigate(page) }} />}
    {route.path === 'brands' && <BrandsPage brands={brands} onBrowse={onBrandBrowse} />}
    {route.path === 'vouchers' && <VouchersPage products={products} brands={brands} brandFilter={brandFilter} setBrandFilter={setBrandFilter} query={query} setQuery={setQuery} brandName={brandName} liked={liked} onLike={toggleLike} onAdd={addToCart} onOpen={id => navigate('voucher', id)} />}
    {route.path === 'voucher' && <VoucherPage product={currentProduct} brandName={currentProduct ? brandName(currentProduct.BrandID) : ''} onBack={() => navigate('vouchers')} onAdd={addToCart} />}
    {route.path === 'cart' && <CartPage items={cartDetailed} brandName={brandName} subtotal={subtotal} savings={savings} total={total} onQty={changeQty} onRemove={removeItem} onContinue={() => navigate('vouchers')} onCheckout={checkout} />}
    {route.path === 'checkout' && <CheckoutPage user={user} items={cartDetailed} total={total} savings={savings} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} qrUrl={QR_URL} onBack={() => navigate('cart')} onCreateOrder={createPendingOrder} />}
    {route.path === 'profile' && user && <ProfilePage user={user} name={profileName} setName={setProfileName} onSave={saveProfile} onLogout={logout} onOrders={() => navigate('orders')} />}
    {route.path === 'orders' && <OrdersPage orders={orders} onBack={() => navigate('vouchers')} />}
    {route.path === 'order-placed' && <OrderPlacedPage order={lastOrder} onOrders={() => navigate('orders')} onShop={() => navigate('vouchers')} />}

    <footer className="new-footer"><div><span className="footer-logo-white"><img src={LOGO_URL} alt="Trusted Circle"/></span><strong>TrustedCircle</strong><p>Gift vouchers with transparent savings and a simple digital shopping experience.</p></div><div className="footer-links"><button onClick={() => navigate('vouchers')}>Gift Vouchers</button><button onClick={() => navigate('brands')}>Brands</button>{user && <button onClick={() => navigate('orders')}>Orders</button>}<a href="#/erp">ERP Login</a></div></footer>

    {authOpen && <div className="modal-layer"><div className="auth-page-modal"><button className="modal-x" onClick={() => setAuthOpen(false)}><X size={17}/></button><span className="modal-logo-white"><img src={LOGO_URL} alt="Trusted Circle"/></span>{authStep === 'email' ? <><span className="eyebrow">ACCOUNT ACCESS</span><h2>Welcome to Trusted Circle</h2><p>Enter your email. Existing users sign in; new users are guided through profile creation after OTP verification.</p><form onSubmit={requestOtp}><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/><button className="btn-primary wide" type="submit">Continue <ArrowRight size={15}/></button></form></> : <><span className="eyebrow">VERIFY EMAIL</span><h2>Enter your OTP</h2><p>We sent a one-time code to <strong>{email}</strong>.</p><form onSubmit={verifyOtp}><input inputMode="numeric" maxLength="6" required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="6-digit OTP"/><button className="btn-primary wide" type="submit">Verify & continue <ArrowRight size={15}/></button><button className="btn-quiet wide" type="button" onClick={() => setAuthStep('email')}>Use another email</button></form></>}{authMessage && <div className="form-message">{authMessage}</div>}</div></div>}

    {profileOpen && user && <div className="modal-layer"><div className="profile-complete-modal"><span className="modal-logo-white"><img src={LOGO_URL} alt="Trusted Circle"/></span><span className="eyebrow">ONE LAST STEP</span><h2>Complete your account</h2><p>We couldn't find a name for this account. Add it now so your orders and profile are ready.</p><form onSubmit={saveProfile}><input required minLength={2} value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Your full name"/><button className="btn-primary wide" type="submit">Create my profile <ArrowRight size={15}/></button></form>{authMessage && <div className="form-message">{authMessage}</div>}</div></div>}
  </div>
}
