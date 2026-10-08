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
      const msg=event.data;
      if(!msg||msg.source!=='trusted-circle-wallet'||msg.requestId!==requestId)return;
      if(!msg.ok){
        finish(new Error(msg.error||'Wallet Services request failed.'),true);
        return;
      }
      // Wallet login responses use a flat v3 contract. Normalize it here,
      // while retaining compatibility with older nested responses.
      const data=(msg.data&&typeof msg.data==='object')?{...msg.data}:{};
      if(msg.token) data.session={token:String(msg.token),expiresAt:msg.expiresAt||''};
      else if(data.session&&data.session.token) data.session={token:String(data.session.token),expiresAt:data.session.expiresAt||''};
      if(msg.user) data.user=msg.user;
      // Login challenge fields are exposed top-level by the Wallet backend.
      // Normalize them so the login UI never loses the three options.
      if(Array.isArray(msg.options)) data.options=msg.options.map(String).filter(Boolean);
      const explicitNumbers=[msg.number1,msg.number2,msg.number3].map(v=>v===undefined||v===null?'':String(v)).filter(Boolean);
      if(!data.options.length&&explicitNumbers.length===3) data.options=explicitNumbers;
      if(msg.challengeId) data.challengeId=String(msg.challengeId);
      if(msg.email) data.email=String(msg.email);
      if(typeof msg.isNewUser==='boolean') data.isNewUser=msg.isNewUser;
      if(msg.expiresInSeconds) data.expiresInSeconds=Number(msg.expiresInSeconds);
      finish(data);
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
  requestLoginChallenge:email=>walletRequest('requestLoginChallenge',{email}),
  verifyLoginChallenge:(email,challengeId,selectedNumber)=>walletRequest('verifyLoginChallenge',{email,challengeId,selectedNumber}),
  me:token=>walletRequest('me',{token}),
  wallet:token=>walletRequest('wallet',{token}),
  orders:token=>walletRequest('walletOrders',{token}),
  transactionStatus:(token,transactionId)=>walletRequest('transactionStatus',{token,transactionId}),
  addMoney:(token,amount)=>walletRequest('addMoney',{token,amount}),
  retryAddMoney:(token,transactionId)=>walletRequest('retryAddMoney',{token,transactionId}),
  withdraw:(token,amount,upiId)=>walletRequest('withdrawMoney',{token,amount,upiId}),
  logout:token=>walletRequest('logout',{token})
}
