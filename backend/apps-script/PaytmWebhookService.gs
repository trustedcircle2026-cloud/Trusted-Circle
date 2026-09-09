/** Paytm Payment Link S2S webhook adapter.
 *
 * Paytm Link Payment Status sends key/value fields including ORDERID, TXNAMOUNT,
 * STATUS, TXNID, MERC_UNQ_REF and CHECKSUMHASH. The merchant key remains in
 * Apps Script Script Properties as PAYTM_MERCHANT_KEY; never commit it.
 */
function paytmLinkPaymentWebhook_(data){
  var key=String(getScriptProperties_().getProperty('PAYTM_MERCHANT_KEY')||'').trim();
  require_(key,'PAYTM_MERCHANT_KEY is not configured.');
  require_(key.length===16,'PAYTM_MERCHANT_KEY must be 16 characters for AES-128.');
  var checksum=cleanText_(data.CHECKSUMHASH||data.checksumhash||'',300);
  require_(checksum,'Paytm checksum is required.');
  require_(paytmVerifyChecksum_(data,key,checksum),'Invalid Paytm checksum.');
  var mid=cleanText_(data.MID||data.mid||'',100);
  var configuredMid=String(getScriptProperties_().getProperty('PAYTM_MID')||'').trim();
  if(configuredMid)require_(constantTimeEquals_(mid,configuredMid),'Paytm MID mismatch.');
  var status=String(data.STATUS||'').toUpperCase().trim();
  var amount=Number(data.TXNAMOUNT||data.TXN_AMOUNT||0);
  var txnId=cleanText_(data.TXNID||data.txnId||'',200);
  var orderRef=cleanText_(data.ORDERID||data.orderId||'',100);
  var providerLinkId=cleanText_(data.MERC_UNQ_REF||data.mercUnqRef||'',200);
  require_(txnId,'Paytm transaction ID is required.');
  require_(amount>0,'Paytm transaction amount is invalid.');
  var existingPayment=findOne_(TC_CONFIG.SHEETS.PAYMENTS,'ProviderPaymentID',txnId);
  if(existingPayment)return{ok:true,idempotent:true,orderId:existingPayment.OrderID,status:String(existingPayment.Status||'').toUpperCase()};
  var order=paytmFindOrderForWebhook_(orderRef,providerLinkId);
  require_(order,'Unable to map this Paytm payment to a Trusted Circle order.');
  require_(Math.abs(Number(order.Total||0)-amount)<0.01,'Paytm payment amount does not match the order.');
  var lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    existingPayment=findOne_(TC_CONFIG.SHEETS.PAYMENTS,'ProviderPaymentID',txnId);
    if(existingPayment)return{ok:true,idempotent:true,orderId:existingPayment.OrderID,status:String(existingPayment.Status||'').toUpperCase()};
    var now=isoNow();
    var payments=getRows_(TC_CONFIG.SHEETS.PAYMENTS).filter(function(r){return String(r.OrderID)===String(order.OrderID);});
    var payment=payments.length?payments[payments.length-1]:null;
    if(status==='TXN_SUCCESS'){
      if(payment){
        updateRowById_(TC_CONFIG.SHEETS.PAYMENTS,'PaymentID',payment.PaymentID,{Provider:'PAYTM_PAYMENT_LINK',ProviderOrderID:order.OrderNumber,ProviderPaymentID:txnId,Amount:amount,Currency:String(data.CURRENCY||'INR'),Status:'VERIFIED',VerifiedAt:now,UpdatedAt:now});
      }else{
        appendRowObject_(TC_CONFIG.SHEETS.PAYMENTS,{PaymentID:newId_('TCPAY'),OrderID:order.OrderID,Provider:'PAYTM_PAYMENT_LINK',ProviderOrderID:order.OrderNumber,ProviderPaymentID:txnId,Amount:amount,Currency:String(data.CURRENCY||'INR'),Status:'VERIFIED',VerifiedAt:now,CreatedAt:now,UpdatedAt:now});
      }
      updateRowById_(TC_CONFIG.SHEETS.ORDERS,'OrderID',order.OrderID,{Status:'PAID',UpdatedAt:now});
      creditCashbackForOrder_(findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderID',order.OrderID));
      if(typeof markPaymentLinkStockUsedForOrder_==='function')markPaymentLinkStockUsedForOrder_(order.OrderID,now);
      appendAudit_('', 'PAYTM_PAYMENT_LINK_PAID','Orders',order.OrderID,{txnId:txnId,amount:amount,providerLinkId:providerLinkId});
      return{ok:true,status:'PAID',orderNumber:order.OrderNumber,transactionId:txnId};
    }
    if(payment&&String(payment.Status||'').toUpperCase()==='PENDING'){
      updateRowById_(TC_CONFIG.SHEETS.PAYMENTS,'PaymentID',payment.PaymentID,{Provider:'PAYTM_PAYMENT_LINK',ProviderOrderID:order.OrderNumber,ProviderPaymentID:txnId,Amount:amount,Currency:String(data.CURRENCY||'INR'),Status:'FAILED',UpdatedAt:now});
    }
    appendAudit_('', 'PAYTM_PAYMENT_LINK_NOT_SUCCESS','Orders',order.OrderID,{txnId:txnId,status:status,amount:amount,providerLinkId:providerLinkId});
    return{ok:true,status:status||'NOT_SUCCESS',orderNumber:order.OrderNumber,transactionId:txnId};
  }finally{lock.releaseLock();}
}
function paytmFindOrderForWebhook_(orderRef,providerLinkId){
  var order=null;
  if(orderRef)order=findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderNumber',orderRef)||findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderID',orderRef);
  if(order)return order;
  if(providerLinkId){
    var links=[];try{links=getRows_(TC_CONFIG.SHEETS.PAYMENT_LINKS);}catch(ignore){links=[];}
    var match=null;links.forEach(function(l){if(!match&&(String(l.ProviderLinkID||'')===providerLinkId||String(l.PaymentLinkID||'')===providerLinkId||String(l.LinkID||'')===providerLinkId))match=l;});
    if(match)return findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderID',match.OrderID);
    var stock=[];try{stock=getRows_(TC_CONFIG.SHEETS.PAYMENT_LINK_STOCK);}catch(ignore2){stock=[];}
    var stockMatch=null;stock.forEach(function(s){if(!stockMatch&&(String(s.ProviderLinkID||'')===providerLinkId||String(s.PaymentLinkStockID||'')===providerLinkId))stockMatch=s;});
    if(stockMatch&&stockMatch.OrderID)return findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderID',stockMatch.OrderID);
  }
  return null;
}
function paytmVerifyChecksum_(data,key,checksum){
  var params={};Object.keys(data||{}).forEach(function(k){if(String(k).toUpperCase()!=='CHECKSUMHASH')params[k]=data[k];});
  var keys=Object.keys(params).sort();var values=keys.map(function(k){var v=params[k];return(v===null||v===undefined)?'':String(v);});
  var paramString=values.join('|');var decrypted=paytmAes128CbcDecrypt_(checksum,key,'@@@@&&&&####$$$$');
  if(!decrypted||decrypted.length<5)return false;
  var salt=decrypted.substring(decrypted.length-4);var expected=paytmSha256Hex_(paramString+'|'+salt)+salt;
  return constantTimeEquals_(decrypted,expected);
}
function paytmSha256Hex_(text){var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(text),Utilities.Charset.UTF_8);return bytes.map(function(b){var n=b<0?b+256:b;return('0'+n.toString(16)).slice(-2);}).join('');}
function paytmAes128CbcDecrypt_(ciphertextBase64,keyText,ivText){
  var cipher=Utilities.base64Decode(String(ciphertextBase64));var key=paytmUtf8Bytes_(keyText),iv=paytmUtf8Bytes_(ivText);
  if(key.length!==16||iv.length!==16||cipher.length===0||cipher.length%16!==0)return '';
  var sbox=paytmSbox_(),inv=paytmInvSbox_(sbox),words=paytmExpandKey_(key,sbox),out=[],prev=iv.slice();
  for(var off=0;off<cipher.length;off+=16){var block=cipher.slice(off,off+16),plain=paytmDecryptBlock_(block,words,inv).map(function(v,i){return v^prev[i];});out=out.concat(plain);prev=block;}
  var pad=out[out.length-1];if(pad<1||pad>16)return '';for(var i=out.length-pad;i<out.length;i++)if(out[i]!==pad)return '';out.length-=pad;return String.fromCharCode.apply(null,out);
}
function paytmUtf8Bytes_(s){return Utilities.newBlob(String(s)).getBytes().map(function(b){return b<0?b+256:b;});}
function paytmGmul_(a,b){var p=0;for(var i=0;i<8;i++){if(b&1)p^=a;var hi=a&128;a=(a<<1)&255;if(hi)a^=27;b>>=1;}return p;}
function paytmGpow_(a,n){var r=1;while(n){if(n&1)r=paytmGmul_(r,a);a=paytmGmul_(a,a);n=Math.floor(n/2);}return r;}
function paytmRotl8_(x,n){return((x<<n)|(x>>(8-n)))&255;}
function paytmSboxValue_(x){if(x===0)return 99;var y=paytmGpow_(x,254);return(y^paytmRotl8_(y,1)^paytmRotl8_(y,2)^paytmRotl8_(y,3)^paytmRotl8_(y,4)^99)&255;}
function paytmSbox_(){var a=[];for(var i=0;i<256;i++)a[i]=paytmSboxValue_(i);return a;}
function paytmInvSbox_(s){var a=new Array(256);for(var i=0;i<256;i++)a[s[i]]=i;return a;}
function paytmExpandKey_(key,s){var w=new Array(44),rcon=1,i,j,t;for(i=0;i<4;i++)w[i]=[key[4*i],key[4*i+1],key[4*i+2],key[4*i+3]];for(i=4;i<44;i++){t=w[i-1].slice();if(i%4===0){t=[s[t[1]]^rcon,s[t[2]],s[t[3]],s[t[0]]];rcon=paytmGmul_(rcon,2);}w[i]=[];for(j=0;j<4;j++)w[i][j]=w[i-4][j]^t[j];}return w;}
function paytmAddKey_(state,w,round){for(var c=0;c<4;c++)for(var r=0;r<4;r++)state[4*c+r]^=w[4*round+c][r];}
function paytmInvShiftRows_(s){var t=s.slice();for(var r=0;r<4;r++)for(var c=0;c<4;c++)s[4*c+r]=t[4*((c-r+4)%4)+r];}
function paytmInvSub_(s,inv){for(var i=0;i<16;i++)s[i]=inv[s[i]];}
function paytmInvMix_(s){for(var c=0;c<4;c++){var i=4*c,a=s.slice(i,i+4);s[i]=paytmGmul_(a[0],14)^paytmGmul_(a[1],11)^paytmGmul_(a[2],13)^paytmGmul_(a[3],9);s[i+1]=paytmGmul_(a[0],9)^paytmGmul_(a[1],14)^paytmGmul_(a[2],11)^paytmGmul_(a[3],13);s[i+2]=paytmGmul_(a[0],13)^paytmGmul_(a[1],9)^paytmGmul_(a[2],14)^paytmGmul_(a[3],11);s[i+3]=paytmGmul_(a[0],11)^paytmGmul_(a[1],13)^paytmGmul_(a[2],9)^paytmGmul_(a[3],14);}}
function paytmDecryptBlock_(block,w,inv){var s=block.slice();paytmAddKey_(s,w,10);for(var r=9;r>=1;r--){paytmInvShiftRows_(s);paytmInvSub_(s,inv);paytmAddKey_(s,w,r);paytmInvMix_(s);}paytmInvShiftRows_(s);paytmInvSub_(s,inv);paytmAddKey_(s,w,0);return s;}
function paytmWebhookTestChecksum_(data){var key=String(getScriptProperties_().getProperty('PAYTM_MERCHANT_KEY')||'').trim();require_(key.length===16,'Configure a 16-character PAYTM_MERCHANT_KEY first.');return{valid:paytmVerifyChecksum_(data,key,String(data.CHECKSUMHASH||''))};}
