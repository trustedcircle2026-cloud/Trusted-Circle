const WALLET_API_URL =
  import.meta.env.VITE_WALLET_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbwQ11gxZCWCwT0_MGmBErUKmqdNVBUToVMo7IZ2nt2wtzUK2tyT4iHNf4Q2L8ZcLXwC/exec'

async function walletRequest(action,payload={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch(WALLET_API_URL+'?v='+Date.now(),{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8','Cache-Control':'no-cache'},
      body:JSON.stringify({action,...payload}),
      cache:'no-store',
      signal:controller.signal
    });
    const raw=await response.text();
    let data=null;
    try{data=JSON.parse(raw)}catch{
      const match=raw.match(/\{[\s\S]*\}/);
      if(match){try{data=JSON.parse(match[0])}catch{}}
    }
    if(!data)throw new Error('Wallet Services backend returned an invalid response. Please refresh and try again.');
    if(!data?.ok)throw new Error(data?.error||'Wallet Services request failed.');
    return data.data??data;
  }catch(e){
    if(e?.name==='AbortError')throw new Error('Wallet Services is taking too long to respond. Please try again.');
    throw e;
  }finally{clearTimeout(timer)}
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
