const WALLET_API_URL =
  import.meta.env.VITE_WALLET_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbwQ11gxZCWCwT0_MGmBErUKmqdNVBUToVMo7IZ2nt2wtzUK2tyT4iHNf4Q2L8ZcLXwC/exec'

async function walletRequest(action,payload={}){
  const iframeId='wallet-api-frame-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  const requestId=iframeId;
  const iframe=document.createElement('iframe');
  iframe.name=iframeId;
  iframe.id=iframeId;
  iframe.style.cssText='position:fixed;width:1px;height:1px;left:-10000px;top:-10000px;border:0;opacity:0;pointer-events:none';
  document.body.appendChild(iframe);

  return new Promise((resolve,reject)=>{
    let settled=false;
    const timer=setTimeout(()=>finish(new Error('Wallet Services is taking too long to respond. Please try again.')),20000);

    const cleanup=()=>{
      clearTimeout(timer);
      window.removeEventListener('message',onMessage);
      try{iframe.remove()}catch(_){}
    };
    const finish=(value,isError=false)=>{
      if(settled)return;
      settled=true;
      cleanup();
      isError?reject(value):resolve(value);
    };
    const onMessage=(event)=>{
      if(event.source!==iframe.contentWindow)return;
      const msg=event.data;
      if(!msg||msg.source!=='trusted-circle-wallet'||msg.requestId!==requestId)return;
      if(!msg.ok)finish(new Error(msg.error||'Wallet Services request failed.'),true);
      else finish(msg.data);
    };
    window.addEventListener('message',onMessage);

    const form=document.createElement('form');
    form.method='POST';
    form.action=WALLET_API_URL;
    form.target=iframe.name;
    form.style.display='none';

    const fields={
      transport:'iframe',
      requestId,
      action,
      payload:JSON.stringify(payload)
    };
    Object.entries(fields).forEach(([name,value])=>{
      const input=document.createElement('input');
      input.type='hidden';
      input.name=name;
      input.value=value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    try{form.submit()}catch(e){finish(e,true)}
    setTimeout(()=>{try{form.remove()}catch(_){}},1000);
  });
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
