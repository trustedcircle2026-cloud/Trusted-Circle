const WALLET_API_URL =
  import.meta.env.VITE_WALLET_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbwQ11gxZCWCwT0_MGmBErUKmqdNVBUToVMo7IZ2nt2wtzUK2tyT4iHNf4Q2L8ZcLXwC/exec'

async function walletRequest(action, payload = {}) {
  if (WALLET_API_URL.includes('PASTE_WALLET')) {
    throw new Error('Wallet Services backend URL is not configured yet.')
  }

  const response = await fetch(WALLET_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload })
  })

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('Wallet Services backend returned an invalid response.')
  }

  if (!data?.ok) throw new Error(data?.error || 'Wallet Services request failed.')
  return data.data ?? data
}

export const walletApi = {
  requestOtp: email => walletRequest('requestOtp', { email }),
  verifyOtp: (email, otp) => walletRequest('verifyOtp', { email, otp }),
  me: token => walletRequest('me', { token })
}
