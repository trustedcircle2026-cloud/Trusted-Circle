const API_BASE='https://script.google.com/macros/s/AKfycbxkIICfsVN783oq04KPBTN73ATEYaBuMXPaPCDsbnvP4uTHFDKH2wglKNAj2nWo5He9/exec'
const LOADING_MESSAGES={health:'Connecting…',catalog:'Loading catalog…',brands:'Loading…',products:'Loading…',product:'Loading…',cart:'Loading…',cartAdd:'Adding…',cartUpdate:'Updating…',cartDenomination:'Updating…',cartRemove:'Removing…',requestOtp:'Sending OTP…',verifyOtp:'Verifying…',profileUpdate:'Saving…',orders:'Loading orders…',orderDetails:'Loading order…',wallet:'Loading…',redeemWallet:'Processing…',placeOrder:'Preparing…',createInvoicePdf:'Preparing…',requestPaymentLink:'Preparing…',cancelOrder:'Cancelling…',logout:'Signing out…',adminLogin:'Authenticating…',adminDashboard:'Loading dashboard…',adminTable:'Loading page…',adminUpdateRow:'Saving…',adminEditAnyRow:'Updating record…',adminWorklist:'Loading work queue…',adminWorklistAction:'Applying action…',adminAddPaymentLinkStock:'Stocking link…',adminAddPaymentLinkStockBulk:'Adding stock…',adminCreatePaymentLink:'Creating…',adminPaymentLinkRequest:'Updating…',adminConfirmPayment:'Confirming…',adminVerifyPayment:'Verifying payment…',adminSendVoucher:'Sending voucher…',adminUpdateOrder:'Updating…',adminFindUserForRemoval:'Finding shopper…',adminRemoveUser:'Removing shopper…'}
const GET_CACHE_TTL=5*60*1000
const CACHEABLE_GETS=new Set(['catalog','brands','products','product'])
const SHOW_LOADING_ACTIONS=new Set(Object.keys(LOADING_MESSAGES))
const IMMEDIATE_LOADING_ACTIONS=new Set(['adminLogin','placeOrder','requestPaymentLink'])
const PERSISTENT_CACHE_TTL=2*60*1000
const getCache=new Map(),pendingGets=new Map()
const persistentCachePrefix='tc_catalog_cache:'
function emitLoading(active,action){window.dispatchEvent(new CustomEvent('tc:loading',{detail:{active,action,message:LOADING_MESSAGES[action]||'Please wait…'}}))}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))
function cacheKey(action,params){return `${action}:${JSON.stringify(params||{})}`}
function readCached(key){
  const memory=getCache.get(key)
  if(memory&&Date.now()-memory.time<=GET_CACHE_TTL)return memory.data
  if(memory)getCache.delete(key)
  if(typeof localStorage==='undefined')return null
  try{
    const raw=localStorage.getItem(persistentCachePrefix+key)
    if(!raw)return null
    const entry=JSON.parse(raw)
    if(!entry||Date.now()-Number(entry.time||0)>PERSISTENT_CACHE_TTL){localStorage.removeItem(persistentCachePrefix+key);return null}
    getCache.set(key,entry)
    return entry.data
  }catch{return null}
}
function writeCached(key,data){
  const entry={time:Date.now(),data}
  getCache.set(key,entry)
  if(typeof localStorage!=='undefined'){
    try{localStorage.setItem(persistentCachePrefix+key,JSON.stringify(entry))}catch{}
  }
}
async function request(action,params={},method='GET'){const payload={action,...params},isGet=method==='GET',canCache=isGet&&CACHEABLE_GETS.has(action),key=canCache?cacheKey(action,params):'';if(canCache){const cached=readCached(key);if(cached!==null)return cached;if(pendingGets.has(key))return pendingGets.get(key)}const run=async()=>{let response,loadingTimer,loadingShown=false;try{if(SHOW_LOADING_ACTIONS.has(action)){if(IMMEDIATE_LOADING_ACTIONS.has(action)){loadingShown=true;emitLoading(true,action)}else{loadingTimer=setTimeout(()=>{loadingShown=true;emitLoading(true,action)},120)}};if(isGet){const url=new URL(API_BASE);Object.entries(payload).forEach(([key,value])=>{if(value!==undefined&&value!==null)url.searchParams.set(key,String(value))});response=await fetch(url.toString(),{method:'GET',credentials:'omit',cache:canCache?'default':'no-store'})}else{response=await fetch(API_BASE,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(payload),credentials:'omit',cache:'no-store'})}if(!response.ok)throw new Error(`API request failed (${response.status}).`);const json=await response.json();if(!json.ok)throw new Error(json.error?.message||'Request failed.');if(canCache)writeCached(key,json.data);return json.data}finally{clearTimeout(loadingTimer);if(loadingShown)emitLoading(false,action)}};const promise=run();if(canCache){pendingGets.set(key,promise);try{return await promise}finally{pendingGets.delete(key)}}return promise}
async function requestWithRetry(action,params={},method='GET',attempts=2){
  // GETs are safe to retry. Mutating POSTs are intentionally single-attempt
  // so a lost response can never create a duplicate order/cart mutation.
  const maxAttempts=method==='GET'?attempts:1
  let lastError
  for(let attempt=1;attempt<=maxAttempts;attempt+=1){
    try{return await request(action,params,method)}
    catch(error){lastError=error;if(attempt<maxAttempts)await wait(180)}
  }
  throw lastError
}
const fastAdmin=(action,params={},method='GET')=>request(action,params,method)
const adminFallback=(fallback,fn)=>fn().catch(error=>{if(/API request failed \(404\)/i.test(String(error?.message||'')))return fallback;throw error})
export const api={health:()=>Promise.resolve({status:'ok'}),requestOtp:(email,purpose='SHOP_LOGIN')=>requestWithRetry('requestOtp',{email,purpose},'POST'),verifyOtp:(email,otp,name='',purpose='SHOP_LOGIN')=>requestWithRetry('verifyOtp',{email,otp,name,purpose},'POST'),me:token=>requestWithRetry('me',{token}),profileUpdate:(token,name)=>requestWithRetry('profileUpdate',{token,name},'POST'),catalog:()=>requestWithRetry('catalog'),brands:()=>requestWithRetry('brands'),products:(q='',brand='')=>requestWithRetry('products',{q,brand}),product:productId=>requestWithRetry('product',{productId}),cart:token=>requestWithRetry('cart',{token}),cartAdd:(token,productId,quantity=1,denomination=undefined)=>requestWithRetry('cartAdd',{token,productId,quantity,denomination},'POST'),cartUpdate:(token,cartItemId,quantity)=>requestWithRetry('cartUpdate',{token,cartItemId,quantity},'POST'),cartDenomination:(token,cartItemId,denomination)=>requestWithRetry('cartDenomination',{token,cartItemId,denomination},'POST'),cartRemove:(token,cartItemId)=>requestWithRetry('cartRemove',{token,cartItemId},'POST'),placeOrder:(token,paymentMethod='upiapps')=>requestWithRetry('placeOrder',{token,paymentMethod},'POST'),createInvoicePdf:(token,orderId)=>requestWithRetry('createInvoicePdf',{token,orderId},'POST'),requestPaymentLink:async(token,orderId)=>{
  try{
    return await requestWithRetry('requestPaymentLink',{token,orderId},'POST')
  }catch(error){
    const message=String(error?.message||'')
    if(/payment link.*(not available|unavailable|out of stock)|stock.*(not available|unavailable|out of stock)|no payment link/i.test(message)){
      try{
        const order=await requestWithRetry('orderDetails',{token,orderId})
        const amount=Number(order?.TotalAmount??order?.totalAmount??order?.Amount??order?.total??0)||0
        await fastAdmin('adminNotifyPaymentLinkStock',{denomination:amount,requestedAmount:amount,orderId,userEmail:order?.Email||order?.email||'',userName:order?.Name||order?.name||''},'POST')
      }catch(_){}
    }
    throw error
  }
},paymentLinkOpened:(token,orderId)=>requestWithRetry('paymentLinkOpened',{token,orderId},'POST'),paymentCheckRequested:(token,orderId)=>requestWithRetry('paymentCheckRequested',{token,orderId},'POST'),cancelOrder:(token,orderId)=>requestWithRetry('cancelOrder',{token,orderId},'POST'),orders:token=>requestWithRetry('orders',{token}),orderDetails:(token,orderId)=>requestWithRetry('orderDetails',{token,orderId}),wallet:token=>requestWithRetry('wallet',{token}),redeemWallet:(token,amount,method,details)=>requestWithRetry('redeemWallet',{token,amount,method,...details},'POST'),logout:token=>requestWithRetry('logout',{token},'POST'),adminLogin:(email,password)=>fastAdmin('adminLogin',{email,password},'POST'),adminDashboard:token=>adminFallback({metrics:{},tables:{},admin:JSON.parse(localStorage.getItem('tc_erp_admin_user')||'null')},()=>fastAdmin('adminDashboard',{token})),adminTable:(token,sheet)=>fastAdmin('adminTable',{token,sheet}),adminWorklist:token=>adminFallback({items:[]},()=>fastAdmin('adminWorklist',{token})),adminWorklistAction:(token,actionName,sheet,recordId,reason='')=>fastAdmin('adminWorklistAction',{token,actionName,sheet,recordId,reason},'POST'),adminUpdateRow:(token,sheet,id,patch)=>fastAdmin('adminEditAnyRow',{token,sheet,id,patch},'POST'),adminEditAnyRow:(token,sheet,id,patch)=>fastAdmin('adminEditAnyRow',{token,sheet,id,patch},'POST'),adminAddPaymentLinkStock:(token,denomination,link,label='Pay securely')=>fastAdmin('adminAddPaymentLinkStock',{token,denomination,link,label},'POST'),adminAddPaymentLinkStockBulk:(token,rows)=>fastAdmin('adminAddPaymentLinkStockBulk',{token,rows},'POST'),adminNotifyPaymentLinkStock:(denomination,requestedAmount,orderId='',userEmail='',userName='')=>fastAdmin('adminNotifyPaymentLinkStock',{denomination,requestedAmount,orderId,userEmail,userName},'POST'),adminCreatePaymentLink:(token,orderId,link,label,requestId='',adminNote='')=>fastAdmin('adminCreatePaymentLink',{token,orderId,link,label,requestId,adminNote},'POST'),adminPaymentLinkRequest:(token,requestId,status,adminNote='')=>fastAdmin('adminPaymentLinkRequest',{token,requestId,status,adminNote},'POST'),adminConfirmPayment:(token,orderId,provider,providerPaymentId)=>fastAdmin('adminConfirmPayment',{token,orderId,provider,providerPaymentId},'POST'),adminVerifyPayment:(token,orderId,provider='PAYTM_MANUAL',providerPaymentId='')=>fastAdmin('adminVerifyPayment',{token,orderId,provider,providerPaymentId},'POST'),adminSendVoucher:(token,orderId,code,pin,productId,sendEmail=true)=>fastAdmin('adminSendVoucher',{token,orderId,code,pin,productId,sendEmail},'POST'),adminUpdateOrder:(token,orderId,status)=>fastAdmin('adminUpdateOrder',{token,orderId,status}),adminFindUserForRemoval:(token,query)=>fastAdmin('adminFindUserForRemoval',{token,query},'POST'),adminRemoveUser:(token,query,reason)=>fastAdmin('adminRemoveUser',{token,query,reason},'POST')}
export {API_BASE}
