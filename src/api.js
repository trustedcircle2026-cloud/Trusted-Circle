const API_BASE = 'https://script.google.com/macros/s/AKfycbxkIICfsVN783oq04KPBTN73ATEYaBuMXPaPCDsbnvP4uTHFDKH2wglKNAj2nWo5He9/exec'

const LOADING_MESSAGES = {
  health: 'Connecting securely…', brands: 'Loading brands…', products: 'Loading vouchers…', product: 'Loading voucher…', cart: 'Restoring your cart…', cartAdd: 'Adding to cart…', cartUpdate: 'Updating cart…', cartDenomination: 'Updating denomination…', cartRemove: 'Removing item…', requestOtp: 'Sending verification code…', verifyOtp: 'Signing you in…', profileUpdate: 'Saving your profile…', orders: 'Loading your orders…', placeOrder: 'Preparing your order…', logout: 'Signing you out…',
}

function emitLoading(active, action) {
  window.dispatchEvent(new CustomEvent('tc:loading', { detail: { active, action, message: LOADING_MESSAGES[action] || 'Please wait…' } }))
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

async function request(action, params = {}, method = 'GET') {
  const payload = { action, ...params }
  let response
  emitLoading(true, action)
  try {
    if (method === 'GET') {
      const url = new URL(API_BASE)
      Object.entries(payload).forEach(([key, value]) => { if (value !== undefined && value !== null) url.searchParams.set(key, String(value)) })
      response = await fetch(url.toString(), { method: 'GET', credentials: 'omit', cache: 'no-store' })
    } else {
      response = await fetch(API_BASE, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(payload), credentials: 'omit', cache: 'no-store' })
    }
    if (!response.ok) throw new Error(`API request failed (${response.status}).`)
    const json = await response.json()
    if (!json.ok) throw new Error(json.error?.message || 'Request failed.')
    return json.data
  } finally {
    emitLoading(false, action)
  }
}

async function requestWithRetry(action, params = {}, method = 'GET', attempts = 2) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await request(action, params, method) }
    catch (error) { lastError = error; if (attempt < attempts) await wait(350) }
  }
  throw lastError
}

export const api = {
  health: () => request('health'),
  requestOtp: (email, purpose = 'SHOP_LOGIN') => requestWithRetry('requestOtp', { email, purpose }, 'POST'),
  verifyOtp: (email, otp, name = '', purpose = 'SHOP_LOGIN') => requestWithRetry('verifyOtp', { email, otp, name, purpose }, 'POST'),
  me: token => requestWithRetry('me', { token }),
  profileUpdate: (token, name) => requestWithRetry('profileUpdate', { token, name }, 'POST'),
  brands: () => requestWithRetry('brands'),
  products: (q = '', brand = '') => requestWithRetry('products', { q, brand }),
  product: productId => requestWithRetry('product', { productId }),
  cart: token => requestWithRetry('cart', { token }),
  cartAdd: (token, productId, quantity = 1, denomination = undefined) => requestWithRetry('cartAdd', { token, productId, quantity, denomination }, 'POST'),
  cartUpdate: (token, cartItemId, quantity) => requestWithRetry('cartUpdate', { token, cartItemId, quantity }, 'POST'),
  cartDenomination: (token, cartItemId, denomination) => requestWithRetry('cartDenomination', { token, cartItemId, denomination }, 'POST'),
  cartRemove: (token, cartItemId) => requestWithRetry('cartRemove', { token, cartItemId }, 'POST'),
  placeOrder: token => requestWithRetry('placeOrder', { token }, 'POST'),
  orders: token => requestWithRetry('orders', { token }),
  logout: token => requestWithRetry('logout', { token }, 'POST'),
}

export { API_BASE }
