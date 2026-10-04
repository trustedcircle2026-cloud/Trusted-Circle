import {agentBusinessApi} from './agentBusinessApi.js'

const LOGO='https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'
const AMAZON='https://www.amazon.in/apay/interstitial/insurance/LICOB?ref_=apay_interstitial_biller_search_to_form_field_insurance'
const RECEIPT_EMAIL='info@trustedcircle.in'
const page=document.currentScript?.dataset?.page||'home'
const root=document.getElementById('admin-root')
const tokenKey='tc_agent_admin_session'
const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(n||0))
const title=s=>String(s||'').replace(/([a-z])([A-Z])/g,'$1 $2')
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))
const initials=s=>String(s||'?').trim().charAt(0).toUpperCase()||'?'
const getToken=()=>localStorage.getItem(tokenKey)||''
const setToken=t=>t?localStorage.setItem(tokenKey,t):localStorage.removeItem(tokenKey)

function nav(active){
 const items=[['index.html','⌂','Home','home'],['agents.html','♙','Agents','agents'],['requests.html','↗','Requests','requests'],['history.html','₹','History','history'],['more.html','☷','More','more']]
 return '<nav class="tc-bottom">'+items.map(x=>'<a class="'+(active===x[3]?'active':'')+'" href="'+x[0]+'"><b>'+x[1]+'</b><span>'+x[2]+'</span></a>').join('')+'</nav>'
}
function shell(active,body,counts={}){
 return '<div class="tc-page"><div class="tc-shell"><header class="tc-header"><a class="tc-brand" href="index.html" style="text-decoration:none"><img src="'+LOGO+'" alt="Trusted Circle"><div><strong>Trusted Circle</strong><small>Admin Portal</small></div></a><div class="tc-head-actions"><a class="tc-icon" href="requests.html" aria-label="Requests">↗'+(Number(counts.PaymentRequests||0)?'<b>'+esc(counts.PaymentRequests)+'</b>':'')+'</a><button class="tc-avatar" id="profileBtn" type="button">A</button></div></header>'+body+nav(active)+'</div></div>'
}
function login(){
 root.innerHTML='<div class="tc-login"><div class="tc-login-card"><div class="tc-brand"><img src="'+LOGO+'" alt="Trusted Circle"><div><strong>Trusted Circle</strong><small>Admin Portal</small></div></div><span class="tc-kicker">SECURE ADMIN ACCESS</span><h1>Admin Sign In</h1><p>Sign in to manage agents, payment requests and business operations.</p><label>Admin Password<input id="adminPassword" type="password" autocomplete="current-password" placeholder="Enter admin password"></label><div id="loginError"></div><button class="tc-btn primary" id="loginBtn">Sign In</button></div></div>'
 const input=document.getElementById('adminPassword'),btn=document.getElementById('loginBtn'),err=document.getElementById('loginError')
 const go=async()=>{if(!input.value)return;btn.disabled=true;btn.textContent='Signing in…';err.innerHTML='';try{const r=await agentBusinessApi.adminLogin(input.value);setToken(r.token);location.reload()}catch(e){err.innerHTML='<div class="tc-error">'+esc(e.message)+'</div>'}finally{btn.disabled=false;btn.textContent='Sign In'}}
 btn.onclick=go;input.onkeydown=e=>{if(e.key==='Enter')go()}
}
function profileModal(){
 const bg=document.createElement('div');bg.className='tc-modal-bg';bg.innerHTML='<div class="tc-modal"><button class="tc-close">×</button><span class="tc-kicker">ADMIN PROFILE</span><h2 style="margin:5px 0;font-size:23px">Admin</h2><p class="tc-subtitle">Trusted Circle Administrator</p><div class="tc-card" style="margin-top:14px"><div class="tc-field"><small>Access</small><span>Full Business Administration</span></div><div class="tc-field"><small>Email</small><span>trustedcircle2026@gmail.com</span></div></div><button class="tc-btn danger" id="signOut" style="width:100%;margin-top:12px">Sign Out</button></div>'
 document.body.appendChild(bg);bg.querySelector('.tc-close').onclick=()=>bg.remove();bg.onclick=e=>{if(e.target===bg)bg.remove()};bg.querySelector('#signOut').onclick=async()=>{try{await agentBusinessApi.adminLogout(getToken())}catch{}setToken('');location.reload()}
}
async function bootstrap(){
 if(!getToken()){login();return}
 try{await agentBusinessApi.adminMe(getToken())}catch(e){setToken('');login();return}
 try{if(page==='home')await home();else if(page==='agents')await agents();else if(page==='requests')await requests();else if(page==='history')await history();else await more()}catch(e){root.innerHTML='<div class="tc-page"><div class="tc-content"><div class="tc-error">'+esc(e.message)+'</div><button class="tc-btn primary" onclick="location.reload()">Reload</button></div></div>'}
 const p=document.getElementById('profileBtn');if(p)p.onclick=profileModal
}

async function home(){
 const d=await agentBusinessApi.dashboard(getToken()),m=d?.metrics||{},c=d?.counts||{}
 const recent=d?.recentAgents||[]
 const body='<main class="tc-content"><span class="tc-kicker">TRUSTED CIRCLE · ADMIN</span><h1 class="tc-title">Admin Dashboard</h1><p class="tc-subtitle">Manage agents, payment requests and business activity from separate pages.</p><div class="tc-stats"><button class="tc-stat" onclick="location.href=\'agents.html\'">♙<strong>'+esc(c.Agents||0)+'</strong><span>Agents</span></button><button class="tc-stat" onclick="location.href=\'requests.html\'">↗<strong>'+esc(c.PaymentRequests||0)+'</strong><span>Requests</span></button><button class="tc-stat" onclick="location.href=\'history.html\'">₹<strong>'+esc(c.Payments||0)+'</strong><span>Payments</span></button></div><div class="tc-section-title"><div><span class="tc-kicker">WORKSPACE</span><h2>Recent Agents</h2></div><a class="tc-link" href="agents.html">View all →</a></div><div class="tc-list">'+(recent.length?recent.slice(0,6).map(a=>'<div class="tc-card"><div class="tc-row"><span class="tc-record-avatar">'+initials(a.AgentName||a.Name)+'</span><div class="tc-row-main"><strong>'+esc(a.AgentName||a.Name||'Agent')+'</strong><small>'+esc(a.Mobile||a.Email||'Agent account')+'</small></div></div></div>').join(''):'<div class="tc-empty"><strong>Agent workspace</strong><span>No recent agents found.</span><a class="tc-btn primary" href="agents.html">Open Agents</a></div>')+'</div><div class="tc-section-title"><div><span class="tc-kicker">QUICK ACCESS</span><h2>Business</h2></div></div><div class="tc-more"><button class="tc-more-card" onclick="location.href=\'requests.html\'"><b>↗</b><div><strong>Payment Requests</strong><small>Process requests raised by agents.</small></div><span>›</span></button><button class="tc-more-card" onclick="location.href=\'history.html\'"><b>₹</b><div><strong>Payment History</strong><small>Review completed payment records.</small></div><span>›</span></button></div></main>'
 root.innerHTML=shell('home',body,c)
}

async function agents(){
 let search='',editing=null,schema=[]
 const render=async()=>{const [data,sch]=await Promise.all([agentBusinessApi.list('Agents',{search},getToken()),agentBusinessApi.schema('Agents',getToken())]);schema=sch?.fields||[];const rows=data?.items||[]
 const body='<main class="tc-content"><div class="tc-page-head"><div><span class="tc-kicker">AGENT MANAGEMENT</span><h1 class="tc-title">Agents</h1><p class="tc-subtitle">Manage agent profiles, access and passwords.</p></div><div class="tc-actions"><button class="tc-btn" id="refresh">↻</button><button class="tc-btn primary" id="add">＋ Add</button></div></div><div class="tc-search">⌕<input id="search" placeholder="Search agents" value="'+esc(search)+'"></div><div id="records" class="tc-list">'+(rows.length?rows.map((r,i)=>recordCard(r,i,'Agents')).join(''):'<div class="tc-empty"><strong>No agents found</strong><span>Add an agent or change your search.</span></div>')+'</div></main>'
 root.innerHTML=shell('agents',body)
 document.getElementById('profileBtn').onclick=profileModal
 document.getElementById('refresh').onclick=render
 document.getElementById('search').onkeydown=e=>{if(e.key==='Enter'){search=e.target.value;render()}}
 document.getElementById('add').onclick=()=>openForm('Agents',null,schema,render)
 rows.forEach((r,i)=>{const card=document.querySelectorAll('#records .tc-card')[i];if(!card)return;card.querySelector('[data-edit]').onclick=()=>openForm('Agents',r,schema,render);card.querySelector('[data-delete]').onclick=()=>deleteRow('Agents',r,schema,render);const pw=card.querySelector('[data-password]');if(pw)pw.onclick=()=>resetPassword(r)})
 }
 await render()
}
function recordCard(r,i,module){
 const preferred=r.AgentName||r.ClientName||r.Name||r.PolicyNumber||module
 const fields=Object.keys(r).slice(0,5)
 return '<article class="tc-card"><div class="tc-row"><span class="tc-record-avatar">'+initials(preferred)+'</span><div class="tc-row-main"><strong>'+esc(preferred)+'</strong><small>'+esc(r.Mobile||r.Phone||r.Email||r.PolicyNumber||r.Status||'Record')+'</small></div></div><div class="tc-fields">'+fields.map(f=>'<div class="tc-field"><small>'+esc(title(f))+'</small><span>'+esc(String(r[f]??'').slice(0,90))+'</span></div>').join('')+'</div><div class="tc-card-actions"><button class="tc-btn" data-edit>Edit</button><button class="tc-btn danger" data-delete>Delete</button>'+(module==='Agents'?'<button class="tc-btn" data-password>Password</button>':'')+'</div></article>'
}
async function deleteRow(module,r,schema,refresh){
 const idField=schema[0]||Object.keys(r)[0],id=r[idField];if(!id||!confirm('Delete this record?'))return
 try{await agentBusinessApi.remove(module,id,idField,getToken());await refresh()}catch(e){alert(e.message)}
}
async function resetPassword(r){
 const p=prompt('Enter new 4-digit password:');if(p===null)return;if(!/^\d{4}$/.test(p)){alert('Password must be exactly 4 digits.');return}
 try{await agentBusinessApi.setAgentPassword(r.AgentID,p,getToken());alert('Password updated successfully.')}catch(e){alert(e.message)}
}
function openForm(module,row,schema,refresh){
 const editing=!!row, data={...(row||{})}
 const bg=document.createElement('div');bg.className='tc-modal-bg'
 bg.innerHTML='<div class="tc-modal"><button class="tc-close">×</button><span class="tc-kicker">'+(editing?'EDIT':'NEW')+' '+esc(module)+'</span><h2 style="margin:5px 0;font-size:23px">'+(editing?'Edit ':'Add ')+esc(module)+'</h2><p class="tc-subtitle">Enter the record details below.</p><form class="tc-form" id="recordForm">'+schema.filter(f=>!['CreatedAt','UpdatedAt'].includes(f)).map((f,i)=>'<label>'+esc(title(f))+'<input name="'+esc(f)+'" value="'+esc(data[f]??'')+'" '+((editing&&i===0)?'disabled':'')+'></label>').join('')+(module==='Agents'&&!editing?'<label>4-Digit Password<input name="Password" inputmode="numeric" maxlength="4" type="password"></label>':'')+'<button class="tc-btn primary" type="submit">Save Record</button></form></div>'
 document.body.appendChild(bg);bg.querySelector('.tc-close').onclick=()=>bg.remove();bg.onclick=e=>{if(e.target===bg)bg.remove()}
 bg.querySelector('#recordForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);for(const [k,v] of fd.entries())data[k]=v
 try{if(module==='Agents'&&!editing){if(!/^\d{10}$/.test(data.Mobile||'')){alert('Mobile must be 10 digits.');return}if(!/^\d{4}$/.test(data.Password||'')){alert('Password must be 4 digits.');return}await agentBusinessApi.createAgent(data,getToken())}else await agentBusinessApi.save(module,data,getToken());bg.remove();await refresh()}catch(err){alert(err.message)}}
}

async function requests(){
 let search=''
 const render=async()=>{const data=await agentBusinessApi.list('PaymentRequests',{search},getToken());const rows=data?.items||[]
 const body='<main class="tc-content"><div class="tc-page-head"><div><span class="tc-kicker">PAYMENT WORKFLOW</span><h1 class="tc-title">Payment Requests</h1><p class="tc-subtitle">Process requests raised by agents. Policy Number and DOB are shown here.</p></div><div class="tc-actions"><button class="tc-btn" id="refresh">↻</button></div></div><div class="tc-search">⌕<input id="search" placeholder="Search requests" value="'+esc(search)+'"></div><div class="tc-list">'+(rows.length?rows.map((r,i)=>paymentCard(r,i)).join(''):'<div class="tc-empty"><strong>No payment requests</strong><span>Requests raised by agents will appear here.</span></div>')+'</div></main>'
 root.innerHTML=shell('requests',body,{PaymentRequests:rows.length})
 document.getElementById('profileBtn').onclick=profileModal;document.getElementById('refresh').onclick=render;document.getElementById('search').onkeydown=e=>{if(e.key==='Enter'){search=e.target.value;render()}}
 rows.forEach((r,i)=>{const card=document.querySelectorAll('.tc-payment-card')[i];if(!card)return;card.querySelector('[data-open]').onclick=()=>startPayment(r);const copyBtns=card.querySelectorAll('[data-copy]');copyBtns.forEach(b=>b.onclick=()=>copyValue(b.dataset.copy));const cancel=card.querySelector('[data-cancel]');if(cancel)cancel.onclick=async()=>{if(!confirm('Cancel this payment request?'))return;try{await agentBusinessApi.agentCancelPaymentRequest(getToken(),r.RequestID);await render()}catch(e){alert(e.message)}}})
 }
 await render()
}
function paymentCard(r,i){
 const status=String(r.Status||r.RequestStatus||'PENDING').toUpperCase(),policy=r.PolicyNumber||r.PolicyNo||'',dob=r.DateOfBirth||r.DOB||'',client=r.ClientName||r.Name||'Client'
 return '<article class="tc-card tc-payment-card"><div class="tc-row"><span class="tc-record-avatar">↗</span><div class="tc-row-main"><strong>'+esc(client)+'</strong><small>Payment Request</small></div><span class="tc-status '+status.toLowerCase()+'">'+esc(status)+'</span></div><div class="tc-payment-details"><div class="tc-payment-line"><small>Policy No</small><strong>'+esc(policy||'Not available')+'</strong><button data-copy="'+esc(policy)+'">Copy</button></div><div class="tc-payment-line"><small>Date of Birth</small><strong>'+esc(dob||'Not available')+'</strong><button data-copy="'+esc(dob)+'">Copy</button></div><div class="tc-payment-line"><small>Receipt Email</small><strong>'+RECEIPT_EMAIL+'</strong><button data-copy="'+RECEIPT_EMAIL+'">Copy</button></div></div><div class="tc-card-actions"><button class="tc-btn primary" data-open '+(!policy||!dob?'disabled':'')+'>Open Amazon Insurance</button>'+(['PENDING','SUBMITTED'].includes(status)?'<button class="tc-btn danger" data-cancel>Cancel</button>':'')+'</div><div class="tc-hint">Open Amazon copies the Policy Number, DOB and '+RECEIPT_EMAIL+' to your clipboard. Amazon&#39;s public page does not provide a documented query-string autofill API, so the Trusted Circle site cannot directly edit Amazon&#39;s cross-origin form.</div></article>'
}
async function copyValue(value){if(!value)return;try{await navigator.clipboard.writeText(value);alert('Copied to clipboard.')}catch{prompt('Copy this value:',value)}}
async function startPayment(r){const policy=r.PolicyNumber||r.PolicyNo||'',dob=r.DateOfBirth||r.DOB||'';try{await navigator.clipboard.writeText('Policy Number: '+policy+'\nDate of Birth: '+dob+'\nReceipt Email: '+RECEIPT_EMAIL)}catch{}window.open(AMAZON,'_blank','noopener,noreferrer')}

async function history(){
 let search=''
 const render=async()=>{const data=await agentBusinessApi.list('Payments',{search},getToken());const rows=data?.items||[]
 const body='<main class="tc-content"><div class="tc-page-head"><div><span class="tc-kicker">PAYMENT HISTORY</span><h1 class="tc-title">History</h1><p class="tc-subtitle">Completed payments, receipts and settlement records.</p></div><button class="tc-btn" id="refresh">↻</button></div><div class="tc-search">⌕<input id="search" placeholder="Search payment history" value="'+esc(search)+'"></div><div class="tc-list">'+(rows.length?rows.map(r=>recordCard(r,0,'Payments')).join(''):'<div class="tc-empty"><strong>No payment history</strong><span>Completed payment records will appear here.</span></div>')+'</div></main>'
 root.innerHTML=shell('history',body);document.getElementById('profileBtn').onclick=profileModal;document.getElementById('refresh').onclick=render;document.getElementById('search').onkeydown=e=>{if(e.key==='Enter'){search=e.target.value;render()}}
 rows.forEach((r,i)=>{const card=document.querySelectorAll('.tc-card')[i];if(!card)return;card.querySelector('[data-edit]').onclick=()=>alert('Payment history is read-only from this page.');card.querySelector('[data-delete]').onclick=()=>alert('Payment history is protected.')}
 }
 await render()
}

async function more(){
 const modules=[['Clients','Manage client records.'],['Policies','Track insurance policies.'],['PremiumBills','Track upcoming and paid premiums.'],['Payments','Record actual payments and receipts.'],['Cards','Manage credit and debit cards.'],['CardRules','Manage cashback eligibility and limits.'],['Cashback','Track expected and actual cashback.'],['MoneyLedger','Track all money movement.'],['AgentSettlements','Manage agent settlements.'],['Expenses','Track business expenses.']]
 const body='<main class="tc-content"><div style="text-align:center;padding:10px 0 18px"><span style="font-size:38px;color:#064f3b">☷</span><span class="tc-kicker">ADMIN TOOLS</span><h1 class="tc-title">More</h1><p class="tc-subtitle">Additional business modules and controls.</p></div><div class="tc-more">'+modules.map(([key,desc])=>'<button class="tc-more-card" data-module="'+key+'"><b>•</b><div><strong>'+title(key)+'</strong><small>'+desc+'</small></div><span>›</span></button>').join('')+'<button class="tc-more-card" id="logout" style="color:#a3443b"><b>×</b><div><strong>Sign Out</strong><small>End the current Admin session.</small></div></button></div></main>'
 root.innerHTML=shell('more',body);document.getElementById('profileBtn').onclick=profileModal;document.getElementById('logout').onclick=async()=>{try{await agentBusinessApi.adminLogout(getToken())}catch{}setToken('');location.href='index.html'}
 document.querySelectorAll('[data-module]').forEach(b=>b.onclick=()=>modulePage(b.dataset.module))
}
async function modulePage(module){
 try{const [data,sch]=await Promise.all([agentBusinessApi.list(module,{},getToken()),agentBusinessApi.schema(module,getToken())]);const rows=data?.items||[],fields=sch?.fields||[]
 const body='<main class="tc-content"><div class="tc-page-head"><div><span class="tc-kicker">ADMIN MODULE</span><h1 class="tc-title">'+esc(title(module))+'</h1><p class="tc-subtitle">Standalone module view for '+esc(title(module))+'.</p></div><button class="tc-btn" onclick="location.href=\'more.html\'">← More</button></div><div class="tc-list">'+(rows.length?rows.map(r=>recordCard(r,0,module)).join(''):'<div class="tc-empty"><strong>No records</strong><span>No '+esc(title(module))+' records were returned.</span></div>')+'</div></main>'
 root.innerHTML=shell('more',body);document.getElementById('profileBtn').onclick=profileModal
 }catch(e){alert(e.message)}
}
bootstrap()
