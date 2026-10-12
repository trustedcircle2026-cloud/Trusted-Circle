import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { ArrowRight, Search, ShoppingBag, UserRound, X, ReceiptText, History, WalletCards, CheckCircle2 } from 'lucide-react'
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
import InfoPage from './pages/InfoPage'
import WalletServicesPage from './pages/WalletServicesPage'
import WalletPaymentPage from './pages/WalletPaymentPage'
import AdminLinkAddPage from './pages/AdminLinkAddPage'
import './app.css'
import './mobile.css'
import './site-overrides.css'

const LOGO_URL = 'https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'
const QR_URL = 'https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/UPIQR.jpg'
const WHATSAPP_NUMBER = '919442456039'
function readRoute() { const raw = window.location.hash.replace(/^#\/?/, '') || 'home'; const [path, id] = raw.split('/'); return { path, id: id || '' } }
const friendlyApiError = error => { const message = String(error?.message || 'Request failed.'); if (/unknown api action/i.test(message)) return 'The backend is on an older deployment. Please deploy the latest Trusted Circle Backend version, then try again.'; return message }
export default function App() {
  const [route,setRoute]=useState(readRoute),[products,setProducts]=useState([]),[allProducts,setAllProducts]=useState([]),[brands,setBrands]=useState([]),[cart,setCart]=useState([]),[orders,setOrders]=useState([]),[user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('tc_user')||'null')}catch{return null}}),[token,setToken]=useState(()=>localStorage.getItem('tc_session')||''),[query,setQuery]=useState(''),[brandFilter,setBrandFilter]=useState(''),[liked,setLiked]=useState(()=>{try{return JSON.parse(localStorage.getItem('tc_liked')||'[]')}catch{return[]}}),[authOpen,setAuthOpen]=useState(false),[authStep,setAuthStep]=useState('email'),[email,setEmail]=useState(''),[otp,setOtp]=useState(''),[authMessage,setAuthMessage]=useState(''),[profileOpen,setProfileOpen]=useState(false),[profileName,setProfileName]=useState(''),[paymentMethod,setPaymentMethod]=useState('upi'),[lastOrder,setLastOrder]=useState(null),[pendingCartAdd,setPendingCartAdd]=useState(null),[sessionExpired,setSessionExpired]=useState(false),[pendingOrderPrompt,setPendingOrderPrompt]=useState(null),[paidNotice,setPaidNotice]=useState(null),[pendingDetails,setPendingDetails]=useState({}),[pendingCancelId,setPendingCancelId]=useState(''),previousOrdersRef=useRef([])
  const navigate=useCallback((path,id='')=>{const target=id?`#/${path}/${id}`:`#/${path}`;if(window.location.hash!==target)window.location.hash=target;else setRoute({path,id});window.scrollTo({top:0,behavior:'smooth'})},[])
  useEffect(()=>{const onHash=()=>setRoute(readRoute());window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash)},[])
  useEffect(()=>{const onSessionExpired=()=>setSessionExpired(true);window.addEventListener('tc:session-expired',onSessionExpired);return()=>window.removeEventListener('tc:session-expired',onSessionExpired)},[])
  useEffect(()=>{
    if(!pendingOrderPrompt||!token)return
    let active=true
    Promise.all(pendingOrderPrompt.orders.map(async order=>{
      try{return [String(order.OrderID),await api.orderDetailsSilent(token,order.OrderID)]}
      catch{return [String(order.OrderID),null]}
    })).then(results=>{if(active)setPendingDetails(previous=>({...previous,...Object.fromEntries(results.filter(([,detail])=>detail))}))})
    return()=>{active=false}
  },[pendingOrderPrompt,token])
  useEffect(()=>{
    if(!token||!user)return
    if(!previousOrdersRef.current.length){try{const cached=JSON.parse(localStorage.getItem('tc_orders_cache')||'null');if(Array.isArray(cached?.items))previousOrdersRef.current=cached.items}catch{}}
    const timer=window.setInterval(async()=>{
      if(document.visibilityState!=='visible')return
      try{
        const [cartData,orderData]=await Promise.all([api.cartSilent(token),api.ordersSilent(token,100,0)])
        const nextCart=cartData?.items||[],nextOrders=orderData?.items||[]
        setCart(nextCart);setOrders(nextOrders)
        try{localStorage.setItem('tc_cart_cache',JSON.stringify({time:Date.now(),items:nextCart}));localStorage.setItem('tc_orders_cache',JSON.stringify({time:Date.now(),items:nextOrders}))}catch{}
        const oldPending=new Map(previousOrdersRef.current.filter(o=>['PENDING','NOT_RECEIVED'].includes(String(o.PaymentStatus||'PENDING').toUpperCase())).map(o=>[String(o.OrderID),o]))
        const newlyPaid=nextOrders.find(o=>oldPending.has(String(o.OrderID))&&(['PAID','VERIFIED','SUCCESS','CAPTURED'].includes(String(o.PaymentStatus||'').toUpperCase())||['PAID','DELIVERED','COMPLETED'].includes(String(o.Status||'').toUpperCase())))
        if(newlyPaid){const detail=await api.orderDetailsSilent(token,newlyPaid.OrderID).catch(()=>null);setPaidNotice({order:newlyPaid,detail,message:'Your previous order was paid successfully.'})}
        previousOrdersRef.current=nextOrders
      }catch(error){if(/no active session|session (?:is )?(?:invalid|expired)|please sign in again|unauthorized/i.test(String(error?.message||'')))setSessionExpired(true)}
    },30000)
    return()=>window.clearInterval(timer)
  },[token,user])
  const brandName=useCallback(id=>brands.find(b=>String(b.BrandID)===String(id))?.Name||'Gift Voucher',[brands])
  const loadCatalog=useCallback(async(q=query,brand=brandFilter)=>{const data=await api.products(q.trim(),brand);setProducts(data?.items||[])},[query,brandFilter])
  const loadAllProducts=useCallback(async()=>{const data=await api.products('','');const items=data?.items||[];setAllProducts(items);return items},[])
  const loadCart=useCallback(async currentToken=>{if(!currentToken){setCart([]);return}const key='tc_cart_cache';try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(Array.isArray(saved?.items))setCart(saved.items)}catch{}try{const data=await api.cart(currentToken);const items=data?.items||[];setCart(items);localStorage.setItem(key,JSON.stringify({time:Date.now(),items}))}catch(error){console.warn('Trusted Circle cart refresh:',error.message)}},[])
  const loadOrders=useCallback(async currentToken=>{if(!currentToken){setOrders([]);return}const key='tc_orders_cache';try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(Array.isArray(saved?.items))setOrders(saved.items)}catch{}try{const data=await api.orders(currentToken,100,0);const items=data?.items||[];setOrders(items);if(!previousOrdersRef.current.length)previousOrdersRef.current=items;else{const known=new Set(previousOrdersRef.current.map(order=>String(order.OrderID)));const newlySeen=items.filter(order=>!known.has(String(order.OrderID)));if(newlySeen.length)previousOrdersRef.current=[...newlySeen,...previousOrdersRef.current]}localStorage.setItem(key,JSON.stringify({time:Date.now(),items}))}catch(error){console.warn('Trusted Circle orders refresh:',error.message)}},[])
  const pendingOrderCount=useMemo(()=>orders.filter(order=>{
    const payment=String(order.PaymentStatus||'PENDING').toUpperCase()
    const status=String(order.Status||'').toUpperCase()
    return ['PENDING','NOT_RECEIVED'].includes(payment) && !['PAID','DELIVERED','CANCELLED','REFUNDED'].includes(status)
  }).length,[orders])
  useEffect(()=>{let active=true;(async()=>{try{
    // Do not block first paint on a health check. Catalog requests already validate the API.
    // Brands and products are fetched in parallel, while cached responses return immediately.
    const [brandData,productData]=await Promise.all([api.brands(),api.products('','')]);
    if(!active)return;
    setBrands(brandData?.items||[]);
    const items=productData?.items||[];
    setProducts(items);setAllProducts(items);
    if(token){
      const savedUser=(()=>{try{return JSON.parse(localStorage.getItem('tc_user')||'null')}catch{return null}})();
      if(savedUser){
        setUser(savedUser);setProfileName(savedUser.name||'');if(!savedUser.name)setProfileOpen(true);
        // Restore local UI immediately; refresh private data during browser idle time.
        const refresh=()=>Promise.all([loadCart(token),loadOrders(token)]).catch(()=>{});
        if('requestIdleCallback' in window) window.requestIdleCallback(refresh,{timeout:1200}); else setTimeout(refresh,80);
      }
    }
  }catch(error){console.warn('Trusted Circle startup:',error.message)}})();return()=>{active=false}},[])
  useEffect(()=>{if(!['vouchers','home'].includes(route.path))return;if(!query&&!brandFilter&&products.length)return;const timer=setTimeout(()=>{loadCatalog(query,brandFilter).catch(()=>{})},180);return()=>clearTimeout(timer)},[query,brandFilter,route.path,products.length])
  const getCashbackRate=product=>{
    if(!product)return 0
    const candidates=[product.CashbackPercent,product.CashbackRate,product.Cashback,product.DiscountPercent,product.Discount]
    for(const value of candidates){
      if(value===undefined||value===null||value==='')continue
      const match=String(value).replace(/,/g,'').match(/-?\d+(?:\\.\d+)?/)
      if(match)return Number(match[0])
    }
    return 0
  }
  const cartDetailed=useMemo(()=>cart.map(item=>{const product=allProducts.find(p=>String(p.ProductID)===String(item.ProductID));if(!product)return null;const denomination=Number(item.Denomination||product.FaceValue||0);return {...item,product,denomination}}).filter(Boolean),[cart,allProducts])
  const cartCount=useMemo(()=>cart.reduce((sum,item)=>sum+Number(item.Quantity||0),0),[cart])
  const subtotal=useMemo(()=>cartDetailed.reduce((sum,item)=>sum+item.denomination*Number(item.Quantity||0),0),[cartDetailed])
  const cashback=useMemo(()=>cartDetailed.reduce((sum,item)=>{
    const quantity=Number(item.Quantity||0)
    const rate=getCashbackRate(item.product)
    return sum+(item.denomination*quantity*rate/100)
  },0),[cartDetailed])
  const total=subtotal
  const savings=cashback
  const currentProduct=useMemo(()=>allProducts.find(p=>String(p.ProductID)===String(route.id)),[allProducts,route.id])
  const toggleLike=id=>setLiked(current=>{const next=current.includes(id)?current.filter(x=>x!==id):[...current,id];localStorage.setItem('tc_liked',JSON.stringify(next));return next})
  const openAuth=()=>{setAuthStep('email');setOtp('');setAuthMessage('');setAuthOpen(true)}
  const requestOtp=async event=>{event.preventDefault();setAuthMessage('');try{await api.requestOtp(email);setAuthStep('otp');setAuthMessage(`Verification code sent to ${email}.`)}catch(error){setAuthMessage(friendlyApiError(error))}}
  const verifyOtp=async event=>{event.preventDefault();setAuthMessage('');try{const data=await api.verifyOtp(email,otp,'');const sessionToken=data.session.token;localStorage.setItem('tc_session',sessionToken);localStorage.setItem('tc_user',JSON.stringify(data.user));setToken(sessionToken);setUser(data.user);setProfileName(data.user.name||'');setAuthOpen(false);
    // Do not hold the login UI on cart/orders/catalog refreshes. Establish the session first,
    // navigate immediately, then refresh private data in the background.
    const refreshAfterLogin=()=>Promise.all([loadCart(sessionToken),loadOrders(sessionToken),loadAllProducts()]).catch(()=>{});
    if('requestIdleCallback' in window) window.requestIdleCallback(refreshAfterLogin,{timeout:800}); else setTimeout(refreshAfterLogin,0);
    if(pendingCartAdd){const pending=pendingCartAdd;setPendingCartAdd(null);try{const added=await api.cartAdd(sessionToken,pending.product.ProductID,pending.quantity,pending.denomination);setCart(added?.items||[]);try{localStorage.setItem('tc_cart_cache',JSON.stringify({time:Date.now(),items:added?.items||[]}))}catch{}navigate('cart')}catch(error){setAuthMessage(friendlyApiError(error));navigate('home')}}else if(!data.user.name)setProfileOpen(true);else navigate(route.path==='wallet-services'?'wallet-services':'home')}catch(error){setAuthMessage(friendlyApiError(error))}}
  const saveProfile=async event=>{event.preventDefault();setAuthMessage('');try{const data=await api.profileUpdate(token,profileName);localStorage.setItem('tc_user',JSON.stringify(data));setUser(data);setProfileOpen(false);navigate(route.path==='wallet-services'?'wallet-services':'home')}catch(error){setAuthMessage(friendlyApiError(error))}}
  const logout=async()=>{
    // Logout is intentionally non-blocking: clear the frontend session immediately
    // while the server-side revoke continues in the background.
    const currentToken=token;
    localStorage.removeItem('tc_session');
    localStorage.removeItem('tc_user');
    setToken('');setUser(null);setCart([]);setOrders([]);setProfileOpen(false);navigate('home');
    if(currentToken)api.logout(currentToken).catch(()=>{});
  }
  const addToCart=async(product,quantity=1,denomination=undefined)=>{if(!token){setPendingCartAdd({product,quantity,denomination});openAuth();return}try{const data=await api.cartAdd(token,product.ProductID,quantity,denomination);setCart(data?.items||[]);try{localStorage.setItem('tc_cart_cache',JSON.stringify({time:Date.now(),items:data?.items||[]}))}catch{}await loadAllProducts()}catch(error){setAuthMessage(friendlyApiError(error))}}
  const changeQty=async(item,quantity)=>{if(quantity<1)return removeItem(item);try{const data=await api.cartUpdate(token,item.CartID,quantity);setCart(data?.items||[]);try{localStorage.setItem('tc_cart_cache',JSON.stringify({time:Date.now(),items:data?.items||[]}))}catch{}}catch(error){setAuthMessage(friendlyApiError(error))}}
  const changeDenomination=async(item,denomination)=>{try{const data=await api.cartDenomination(token,item.CartID,denomination);setCart(data?.items||[]);try{localStorage.setItem('tc_cart_cache',JSON.stringify({time:Date.now(),items:data?.items||[]}))}catch{}}catch(error){setAuthMessage(friendlyApiError(error))}}
  const removeItem=async item=>{try{const data=await api.cartRemove(token,item.CartID);setCart(data?.items||[]);try{localStorage.setItem('tc_cart_cache',JSON.stringify({time:Date.now(),items:data?.items||[]}))}catch{}}catch(error){setAuthMessage(friendlyApiError(error))}}
  const checkout=()=>{if(!token){openAuth();return}const pending=orders.filter(order=>['PENDING','NOT_RECEIVED'].includes(String(order.PaymentStatus||'PENDING').toUpperCase())&&!['PAID','DELIVERED','CANCELLED','REFUNDED'].includes(String(order.Status||'').toUpperCase()));if(pending.length){setPendingOrderPrompt({orders:pending,blocked:pending.length>2});return}if(cartDetailed.length){setPaymentMethod('upi');navigate('checkout')}}
  const retryPendingOrder=order=>{setPendingOrderPrompt(null);navigate('orders',`retry-${order.OrderID}`)}
  const cancelPendingOrder=async order=>{
    setPendingCancelId(String(order.OrderID))
    try{
      await api.cancelOrder(token,order.OrderID)
      const remaining=pendingOrderPrompt.orders.filter(item=>String(item.OrderID)!==String(order.OrderID))
      await loadOrders(token)
      if(remaining.length)setPendingOrderPrompt({orders:remaining,blocked:remaining.length>2})
      else setPendingOrderPrompt(null)
    }catch(error){setAuthMessage(friendlyApiError(error))}
    finally{setPendingCancelId('')}
  }
  const createPendingOrder=async()=>{if(!paymentMethod||paymentMethod==='link')return;const snapshot={items:cartDetailed.map(i=>({title:i.product.Title,brand:brandName(i.product.BrandID),quantity:Number(i.Quantity||0),unitPrice:Number(i.denomination||0),faceValue:Number(i.denomination||0),total:Number(i.denomination||0)*Number(i.Quantity||0)})),subtotal,savings:cashback,total,user:{name:user?.name||'',email:user?.email||''}};try{const data=await api.placeOrder(token);setLastOrder({...data,snapshot});await Promise.all([loadCart(token),loadOrders(token)]);navigate('order-placed')}catch(error){setAuthMessage(friendlyApiError(error))}}
  const onBrandBrowse=id=>{setBrandFilter(id||'');navigate('vouchers')}
  const orderForContact=lastOrder?.order?.order||lastOrder?.order||{},contactItems=lastOrder?.snapshot?.items||[]
  const orderText=`Hello Trusted Circle,\n\nI would like to proceed with my gift voucher order.\n\nOrder Number: ${orderForContact.OrderNumber||'Pending'}\nCustomer: ${lastOrder?.snapshot?.user?.name||user?.name||''}\nEmail: ${lastOrder?.snapshot?.user?.email||user?.email||''}\n\nItems:\n${contactItems.map(i=>`• ${i.brand} — ${i.title} × ${i.quantity} — Denomination ₹${i.faceValue.toLocaleString('en-IN')} — Payable ₹${i.total.toLocaleString('en-IN')}`).join('\n')}\n\nSubtotal: ₹${Number(lastOrder?.snapshot?.subtotal||0).toLocaleString('en-IN')}\nSavings: ₹${Number(lastOrder?.snapshot?.savings||0).toLocaleString('en-IN')}\nTotal: ₹${Number(lastOrder?.snapshot?.total||orderForContact.Total||0).toLocaleString('en-IN')}\n\nPlease share the next payment/order instructions. Thank you.`
  const emailHref=`mailto:info@trustedcircle.in?subject=${encodeURIComponent(`Trusted Circle Order ${orderForContact.OrderNumber||''}`)}&body=${encodeURIComponent(orderText)}`
  const whatsappHref=`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderText)}`
  return <div className="app-root"><GlobalLoading/><header className="new-header"><div className="header-brand-group"><button className="header-brand" onClick={()=>navigate('home')}><span className="header-logo-white"><img src={LOGO_URL} alt="Trusted Circle"/></span><span>Trusted<span>Circle</span></span></button><button className="wallet-badge" onClick={()=>user?navigate('wallet-services'):openAuth()} aria-label="Wallet Services" title="Wallet Services"><WalletCards size={18}/><span>Wallet</span></button></div><nav className="desktop-nav"><button onClick={()=>navigate('home')}>Home</button><button onClick={()=>navigate('vouchers')}>Gift Vouchers</button><button onClick={()=>navigate('brands')}>Brands</button><button onClick={()=>navigate('info','how-it-works')}>How It Works</button><button onClick={()=>navigate('info','help')}>Help</button></nav><div className="header-actions"><button className="header-tool" onClick={()=>navigate('vouchers')} aria-label="Search vouchers"><Search size={19}/></button>{user&&<><button className="header-tool history-tool" onClick={()=>navigate('orders')} aria-label="Order history" style={{position:'relative'}}><History size={19}/>{pendingOrderCount>0&&<span style={{position:'absolute',top:-5,right:-4,minWidth:18,height:18,padding:'0 4px',borderRadius:999,background:'#e7f5ed',color:'#155f42',border:'1px solid #d2eadc',fontSize:11,fontWeight:800,lineHeight:'16px',textAlign:'center',boxShadow:'0 2px 8px rgba(21,95,66,.12)'}}>{pendingOrderCount}</span>}</button><button className="header-tool cart-tool" onClick={()=>navigate('cart')} aria-label="Cart"><ShoppingBag size={19}/><b>{cartCount}</b></button></>}{user?<button className="account-tool" onClick={()=>navigate('profile')}><UserRound size={16}/><span>{user.name||'Complete profile'}</span></button>:token?<button className="login-tool login-restoring" disabled aria-label="Login session active"><span className="login-status-dot"/>Logged in…</button>:<button className="login-tool" onClick={openAuth}>Login <ArrowRight size={15}/></button>}</div></header>
    {route.path==='home'&&<HomePage brands={brands} products={products} brandName={brandName} liked={liked} onLike={toggleLike} onAdd={addToCart} onOpen={id=>navigate('voucher',id)} onBrowse={(page='vouchers',filter='')=>{if(filter)setBrandFilter(filter);navigate(page)}}/>}
    {route.path==='brands'&&<BrandsPage brands={brands} onBrowse={onBrandBrowse}/>}
    {route.path==='vouchers'&&<VouchersPage products={products} brands={brands} brandFilter={brandFilter} setBrandFilter={setBrandFilter} query={query} setQuery={setQuery} brandName={brandName} liked={liked} onLike={toggleLike} onAdd={addToCart} onOpen={id=>navigate('voucher',id)}/>}
    {route.path==='voucher'&&<VoucherPage product={currentProduct} brandName={currentProduct?brandName(currentProduct.BrandID):''} onBack={()=>navigate('vouchers')} onAdd={addToCart}/>}
    {route.path==='cart'&&<CartPage items={cartDetailed} brandName={brandName} subtotal={subtotal} cashback={cashback} total={total} onQty={changeQty} onDenomination={changeDenomination} onRemove={removeItem} onContinue={()=>navigate('vouchers')} onCheckout={checkout}/>}
    {route.path==='checkout'&&<CheckoutPage user={user} items={cartDetailed} total={total} savings={savings} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} qrUrl={QR_URL} logoUrl={LOGO_URL} onBack={()=>navigate('cart')} onCreateOrder={createPendingOrder}/>}
    {route.path==='profile'&&user&&<ProfilePage user={user} name={profileName} setName={setProfileName} onSave={saveProfile} onLogout={logout} onOrders={()=>navigate('orders')}/>}
    {route.path==='orders'&&<OrdersPage orders={orders} onBack={()=>navigate('vouchers')} autoRetry={route.id==='retry'||route.id.startsWith('retry-')} retryOrderId={route.id.startsWith('retry-')?route.id.slice(6):''}/>}
    {route.path==='order-placed'&&<OrderPlacedPage order={lastOrder} onOrders={()=>navigate('orders')} onShop={()=>navigate('vouchers')} emailHref={emailHref} whatsappHref={whatsappHref}/>} {route.path==='wallet'&&user&&<WalletServicesPage shoppingToken={token} shoppingUser={user} onShoppingLogout={logout}/>} {route.path==='wallet-payment'&&route.id&&<WalletPaymentPage transactionId={decodeURIComponent(route.id)}/>} {route.path==='wallet-services'&&<WalletServicesPage shoppingToken={token} shoppingUser={user} onShoppingLogout={logout}/>} 
    {route.path.toLowerCase()==='adminlinkadd'&&<AdminLinkAddPage logoUrl={LOGO_URL}/>} 
    {route.path==='info'&&<InfoPage type={route.id||'about'} onNavigate={navigate}/>} 
    <footer className="site-footer"><div className="footer-main"><div className="footer-brand-block"><button className="footer-brand" onClick={()=>navigate('home')}><span className="footer-logo-white"><img src={LOGO_URL} alt="Trusted Circle"/></span><strong>TrustedCircle</strong></button><p>Gift vouchers with transparent savings, secure checkout and simple digital delivery.</p><div className="footer-contact"><span>info@trustedcircle.in</span><span>+91 94424 56039</span></div></div><div className="footer-col"><h4>Shop</h4><button onClick={()=>navigate('vouchers')}>Gift Vouchers</button><button onClick={()=>navigate('brands')}>Brands</button><button onClick={()=>navigate('info','offers')}>Offers</button><button onClick={()=>navigate('info','how-it-works')}>How It Works</button></div><div className="footer-col"><h4>Trusted Circle</h4><button onClick={()=>navigate('info','about')}>About Us</button><button onClick={()=>navigate('info','help')}>Help Centre</button><button onClick={()=>navigate('info','contact')}>Contact</button><button onClick={()=>navigate('info','faq')}>FAQs</button></div><div className="footer-col"><h4>Policies</h4><button onClick={()=>navigate('info','terms')}>Terms & Conditions</button><button onClick={()=>navigate('info','privacy')}>Privacy Policy</button><button onClick={()=>navigate('info','refund')}>Refund & Cancellation</button>{user&&<button onClick={()=>navigate('orders')}>My Orders</button>}</div></div><div className="footer-bottom"><span>© 2026 Trusted Circle. All rights reserved.</span><a href="/apps/">View All Apps</a></div></footer>
    {authOpen&&<div className="modal-layer"><div className="auth-page-modal"><button className="modal-x" onClick={()=>setAuthOpen(false)} aria-label="Close login"><X size={17}/></button><span className="modal-logo-white"><img src={LOGO_URL} alt="Trusted Circle"/></span>{authStep==='email'?<><span className="eyebrow">ACCOUNT ACCESS</span><h2>Welcome to Trusted Circle</h2><p>Enter your email. Existing users sign in; new users are guided through profile creation after OTP verification.</p><form onSubmit={requestOtp}><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/><button className="btn-primary wide" type="submit">Continue <ArrowRight size={15}/></button></form></>:<><span className="eyebrow">VERIFY EMAIL</span><h2>Enter your OTP</h2><p>We sent a one-time code to <strong>{email}</strong>.</p><form onSubmit={verifyOtp}><input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" required value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))} placeholder="6-digit OTP"/><button className="btn-primary wide" type="submit">Verify & continue <ArrowRight size={15}/></button><button className="btn-quiet wide" type="button" onClick={()=>setAuthStep('email')}>Use another email</button></form></>}{authMessage&&<div className="form-message" role="alert">{authMessage}</div>}</div></div>}
    {sessionExpired&&<div className="modal-layer" role="dialog" aria-modal="true"><div className="auth-page-modal"><span className="modal-logo-white"><img src={LOGO_URL} alt="Trusted Circle"/></span><span className="eyebrow">SESSION EXPIRED</span><h2>Please Login Again</h2><p>Your session is no longer active. Sign in again to safely continue shopping and manage your orders.</p><button className="btn-primary wide" onClick={()=>{setSessionExpired(false);logout();openAuth()}}>Login <ArrowRight size={15}/></button></div></div>}
    {pendingOrderPrompt&&<div className="modal-layer pending-orders-layer" role="dialog" aria-modal="true"><div className="auth-page-modal pending-orders-modal"><button className="modal-x" onClick={()=>setPendingOrderPrompt(null)} aria-label="Close"><X size={17}/></button><span className="eyebrow">PENDING PAYMENT</span><h2>{pendingOrderPrompt.blocked?'Resolve your pending orders':'You have a pending order'}</h2><p>{pendingOrderPrompt.blocked?'You have more than 2 pending orders. Retry or cancel each order before starting another checkout.':'Please review your previous order before continuing.'}</p><div className="pending-order-list">{pendingOrderPrompt.orders.map(order=>{const detail=pendingDetails[String(order.OrderID)];const items=detail?.items||[];const names=items.map(item=>item.ProductTitle||item.ProductName||item.Title||item.VoucherName||item.BrandName||item.Brand||'Gift voucher');return <div className="pending-order-row" key={order.OrderID}><div className="pending-order-summary"><strong>{names.length?names.join(', '):order.OrderNumber||'Gift voucher order'}</strong><span>{order.OrderNumber||order.OrderID}</span><b>₹{Number(order.Total||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</b></div><div className="pending-order-actions"><button className="btn-primary" onClick={()=>retryPendingOrder(order)}>Retry <ArrowRight size={14}/></button><button className="btn-quiet" disabled={pendingCancelId===String(order.OrderID)} onClick={()=>cancelPendingOrder(order)}>{pendingCancelId===String(order.OrderID)?'Cancelling…':'Cancel'}</button></div></div>})}</div>{pendingOrderPrompt.orders.length===1&&<button className="btn-quiet wide pending-do-later" onClick={()=>{setPendingOrderPrompt(null);if(cartDetailed.length){setPaymentMethod('upi');navigate('checkout')}}}>Do Later</button>}</div></div>}
    {paidNotice&&<div className="modal-layer payment-success-layer" role="dialog" aria-modal="true"><div className="auth-page-modal payment-success-modal"><div className="payment-success-check"><CheckCircle2 size={70}/></div><span className="eyebrow">PAYMENT SUCCESSFUL</span><h2>{paidNotice.message}</h2><div className="payment-success-order"><span>ORDER ID</span><strong>{paidNotice.order?.OrderNumber||paidNotice.order?.OrderID||'—'}</strong></div><div className="payment-success-vouchers"><span>VOUCHER{(paidNotice.detail?.items||[]).length===1?'':'S'}</span>{(paidNotice.detail?.items||[]).length?(paidNotice.detail.items.map((item,index)=><div key={item.OrderItemID||index}><strong>{item.ProductName||item.Title||item.VoucherName||item.BrandName||item.Brand||'Gift voucher'}</strong><span>₹{Number(item.Total||item.Denomination||item.FaceValue||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</span></div>)):<p>Voucher details are being updated.</p>}</div><div className="payment-success-paid"><span>PAID AMOUNT</span><strong>₹{Number(paidNotice.order?.Total||paidNotice.detail?.order?.Total||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</strong></div><button className="btn-primary wide" onClick={()=>{setPaidNotice(null);navigate('orders')}}>View Orders <ArrowRight size={15}/></button><button className="btn-quiet wide" onClick={()=>setPaidNotice(null)}>Close</button></div></div>}
    {profileOpen&&user&&<div className="modal-layer"><div className="profile-complete-modal"><span className="modal-logo-white"><img src={LOGO_URL} alt="Trusted Circle"/></span><span className="eyebrow">ONE LAST STEP</span><h2>Complete your account</h2><p>We couldn't find a name for this account. Add it now so your orders and profile are ready.</p><form onSubmit={saveProfile}><input required minLength={2} value={profileName} onChange={e=>setProfileName(e.target.value)} placeholder="Your full name" autoComplete="name"/><button className="btn-primary wide" type="submit">Create my profile <ArrowRight size={15}/></button></form>{authMessage&&<div className="form-message" role="alert">{authMessage}</div>}</div></div>}
  </div>
}
