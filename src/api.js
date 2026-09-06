const API_BASE = 'https://script.google.com/macros/s/AKfycbxkIICfsVN783oq04KPBTN73ATEYaBuMXPaPCDsbnvP4uTHFDKH2wglKNAj2nWo5He9/exec'

async function request(action, params = {}, method = 'GET') {
  const payload = { action, ...params }
  let response

  if (method === 'GET') {
    const url = new URL(API_BASE)
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
    })
    response = await fetch(url.toString(), { method: 'GET', credentials: 'omit' })
  } else {
    // Use text/plain so the browser makes a simple cross-origin POST without
    // an OPTIONS preflight. Apps Script parses the JSON body explicitly.
    response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload),
      credentials: 'omit',
    })
  }

  if (!response.ok) throw new Error(`API request failed (${response.status}).`)

  const json = await response.json()
  if (!json.ok) throw new Error(json.error?.message || 'Request failed.')
  return json.data
}

export const api = {
  health: () => request('health'),
  requestOtp: (email, purpose = 'SHOP_LOGIN') => request('requestOtp', { email, purpose }, 'POST'),
  verifyOtp: (email, otp, name = '', purpose = 'SHOP_LOGIN') => request('verifyOtp', { email, otp, name, purpose }, 'POST'),
  me: token => request('me', { token }),
  brands: () => request('brands'),
  products: (q = '', brand = '') => request('products', { q, brand }),
  product: productId => request('product', { productId }),
  cart: token => request('cart', { token }),
  cartAdd: (token, productId, quantity = 1) => request('cartAdd', { token, productId, quantity }, 'POST'),
  cartUpdate: (token, cartItemId, quantity) => request('cartUpdate', { token, cartItemId, quantity }, 'POST'),
  cartRemove: (token, cartItemId) => request('cartRemove', { token, cartItemId }, 'POST'),
  logout: token => request('logout', { token }, 'POST'),
}

export { API_BASE }
