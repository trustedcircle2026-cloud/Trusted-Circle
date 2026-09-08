function now_(){return new Date();}
function isoNow_(){return Utilities.formatDate(now_(),TC_CONFIG.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX");}
function normalizeEmail_(email){return String(email||'').trim().toLowerCase();}
function isValidEmail_(email){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);}
function newId_(prefix){return prefix+Utilities.getUuid().replace(/-/g,'').substring(0,20).toUpperCase();}
function randomOtp_(){return String(Math.floor(100000+Math.random()*900000));}
function hash_(value){const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value),Utilities.Charset.UTF_8);return bytes.map(function(b){const n=b<0?b+256:b;return('0'+n.toString(16)).slice(-2);}).join('');}
function constantTimeEquals_(a,b){a=String(a||'');b=String(b||'');if(a.length!==b.length)return false;let result=0;for(let i=0;i<a.length;i++)result|=a.charCodeAt(i)^b.charCodeAt(i);return result===0;}
function safeJsonParse_(value){try{return JSON.parse(value);}catch(e){return null;}}
function cleanText_(value,maxLength){return String(value==null?'':value).trim().substring(0,maxLength||500);}
function require_(condition,message){if(!condition)throw new Error(message);}
function escapeHtml_(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
