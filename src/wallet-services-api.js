const WALLET_API_URL =
  import.meta.env.VITE_WALLET_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbwQ11gxZCWCwT0_MGmBErUKmqdNVBUToVMo7IZ2nt2wtzUK2tyT4iHNf4Q2L8ZcLXwC/exec'

async function walletRequest(action,payload={}){
  const response=await fetch(WALLET_API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...payload})})
  let data
  try{data=await response.json()}catch{throw new Error('Wallet Services backend returned an invalid response.')}
  if(!data?.ok)throw new Error(data?.error||'Wallet Services request failed.')
  return data.data??data
}
export const walletApi={
  requestOtp:email=>walletRequest('requestOtp',{email}),
  verifyOtp:(email,otp,name)=>walletRequest('verifyOtp',{email,otp,name}),
  me:token=>walletRequest('me',{token}),
  wallet:token=>walletRequest('wallet',{token}),
  orders:token=>walletRequest('walletOrders',{token}),
  transactionStatus:(token,transactionId)=>walletRequest('transactionStatus',{token,transactionId}),
  addMoney:(token,amount)=>walletRequest('addMoney',{token,amount}),
  retryAddMoney:(token,transactionId)=>walletRequest('retryAddMoney',{token,transactionId}),
  withdraw:(token,amount,upiId)=>walletRequest('withdrawMoney',{token,amount,upiId}),
  logout:token=>walletRequest('logout',{token})
}
