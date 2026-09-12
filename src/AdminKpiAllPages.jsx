import {useEffect} from 'react'
import './admin-kpi-all-pages.css'

const clean=v=>String(v??'').trim()
const upper=v=>clean(v).toUpperCase()
const num=v=>{const n=Number(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0}
const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`

const PAGES={
 'ORDERS':'Orders','PAYMENTS':'Payments','PAYMENT LINKS':'Payment Links','LINK REQUESTS':'Link Requests','LINK STOCK':'Link Stock',
 'VOUCHERS':'Vouchers','PRODUCTS':'Products','BRANDS':'Brands','CART':'Cart','NOTIFICATIONS':'Notifications','OTP LOGS':'OTP Logs',
 'SESSIONS':'Sessions','WEB ACTIVITY':'Web Activity','CASHBACK WALLET':'Cashback Wallet','CASHBACK HISTORY':'Cashback History',
 'CASHBACK PAYOUTS':'Cashback Payouts','SHOPPERS':'Shoppers','ORDER ITEMS':'Order Items'
}
function go(label){const w=String(label).toLowerCase();const b=[...document.querySelectorAll('.tc-admin-nav button')].find(x=>String(x.textContent||'').trim().toLowerCase().includes(w));if(b)b.click()}
function readTable(page){const t=page.querySelector('.tc-table-wrap table');if(!t)return[];const h=[...t.querySelectorAll('thead th')].map(x=>clean(x.textContent));return [...t.querySelectorAll('tbody tr')].map(tr=>{const c=[...tr.querySelectorAll('td')],r={};h.forEach((x,i)=>{if(x&&x!=='Action')r[x]=clean(c[i]?.textContent)});return r})}
function card(label,value,detail,target,tone='neutral',icon='•'){const b=document.createElement('button');b.type='button';b.className=`tc-new-kpi ${tone}`;b.innerHTML=`<span class="tc-new-kpi-icon">${icon}</span><div><small>${label}</small><strong>${value}</strong><em>${detail}</em></div><b class="tc-new-kpi-arrow">↗</b>`;b.onclick=()=>go(target);return b}
function addGrid(page,heading){
 const old=page.querySelector('.tc-allpage-kpi-grid');if(old)old.remove()
 const rs=readTable(page),status=r=>upper(r.Status),active=rs.filter(r=>['ACTIVE','TRUE','YES'].includes(upper(r.Active||r.Status))),pending=rs.filter(r=>['PENDING','PENDING_PAYMENT','REQUESTED','PROCESSING','INITIATED'].includes(status(r))),done=rs.filter(r=>['COMPLETED','PAID','DELIVERED','VERIFIED','SENT','SUCCESS'].includes(status(r))),bad=rs.filter(r=>['FAILED','REJECTED','CANCELLED','ERROR','BLOCKED'].includes(status(r)))
 const amount=rs.reduce((s,r)=>{for(const f of ['Amount','Total','OrderValue','Balance','Denomination'])if(r[f]!==undefined&&clean(r[f])!=='')return s+num(r[f]);return s},0)
 const items=[]
 const add=(l,v,d,t,ton='neutral',i='•')=>items.push(card(l,v,d,t,ton,i))
 if(heading==='ORDERS'){add('Orders',rs.length,'All order records','Orders');add('Paid / Fulfilled',done.length,'Completed sales flow','Orders','good','✓');add('Payment Pending',pending.length,'Needs payment','Orders','warn','◷');add('Delivered',rs.filter(r=>status(r)==='DELIVERED').length,'Completed delivery','Vouchers','info','✓');add('Order Value',money(amount),'Loaded order value','Orders','money','₹')}
 else if(heading==='PAYMENTS'){add('Collected',money(rs.filter(r=>status(r)==='VERIFIED').reduce((s,r)=>s+num(r.Amount),0)),'Verified payments','Payments','money','₹');add('Verified',done.length,'Cleared','Payments','good','✓');add('Pending',pending.length,'Awaiting verification','Payments','warn','◷');add('Failed',bad.length,'Requires review','Payments','danger','!')}
 else if(heading==='PAYMENT LINKS'){add('Total Links',rs.length,'Payment-link records','Payment Links');add('Ready',active.length,'Available to use','Link Stock','good','✓');add('Reserved',rs.filter(r=>status(r)==='RESERVED').length,'Held for orders','Link Stock','warn','◷');add('Used',rs.filter(r=>status(r)==='USED').length,'Consumed links','Link Stock','info','✓')}
 else if(heading==='LINK REQUESTS'){add('Requests',rs.length,'All link requests','Link Requests');add('Pending',pending.length,'Needs action','Link Requests','warn','◷');add('Completed',done.length,'Processed','Link Requests','good','✓');add('Rejected',bad.length,'Review required','Link Requests','danger','!')}
 else if(heading==='LINK STOCK'){add('Available',active.length,'Ready inventory','Link Stock','good','✓');add('Reserved',rs.filter(r=>status(r)==='RESERVED').length,'Held inventory','Link Stock','warn','◷');add('Used',rs.filter(r=>status(r)==='USED').length,'Consumed inventory','Link Stock','info','✓');add('Stock Value',money(amount),'Loaded denomination value','Link Stock','money','₹')}
 else if(heading==='VOUCHERS'){add('Vouchers',rs.length,'All voucher records','Vouchers');add('Delivered',done.length,'Completed delivery','Vouchers','good','✓');add('Pending',pending.length,'Awaiting delivery','Vouchers','warn','◷');add('Failed',bad.length,'Delivery issues','Vouchers','danger','!')}
 else if(heading==='PRODUCTS'){const discounts=rs.map(r=>num(r.DiscountPercent)).filter(Boolean);const avg=discounts.length?discounts.reduce((a,b)=>a+b,0)/discounts.length:0;add('Products',rs.length,'Catalog records','Products');add('Active',active.length,'Available products','Products','good','✓');add('Discounted',discounts.length,'Products with cashback','Products','info','%');add('Avg Discount',`${avg.toFixed(2)}%`,'Across loaded products','Products','money','%')}
 else if(heading==='BRANDS'){add('Brands',rs.length,'Configured brands','Brands','info','◆');add('Active',active.length,'Available brands','Brands','good','✓')}
 else if(heading==='CART'){add('Cart Items',rs.length,'Current cart lines','Cart');add('Quantity',rs.reduce((s,r)=>s+num(r.Quantity),0),'Units in carts','Cart','info','+');add('Cart Value',money(amount),'Loaded cart value','Cart','money','₹')}
 else if(heading==='NOTIFICATIONS'){add('Notifications',rs.length,'Notification records','Notifications');add('Unread',rs.filter(r=>['UNREAD','FALSE','0'].includes(upper(r.Read||r.Status))).length,'Potentially unread','Notifications','warn','●');add('Successful',done.length,'Sent / delivered','Notifications','good','✓')}
 else if(heading==='OTP LOGS'){add('Attempts',rs.length,'OTP security records','OTP Logs');add('Successful',done.length,'Verified attempts','OTP Logs','good','✓');add('Failed',bad.length,'Failed attempts','OTP Logs','danger','!')}
 else if(heading==='SESSIONS'){add('Sessions',rs.length,'Session records','Sessions');add('Active',active.length,'Current sessions','Sessions','good','✓');add('Expired',rs.filter(r=>['EXPIRED','REVOKED','INACTIVE'].includes(status(r))).length,'Closed sessions','Sessions','warn','◷')}
 else if(heading==='WEB ACTIVITY'){add('Activity',rs.length,'Audit records','Web Activity');add('Successful',done.length,'Successful actions','Web Activity','good','✓');add('Errors',bad.length,'Requires investigation','Web Activity','danger','!')}
 else if(heading==='CASHBACK WALLET'){add('Wallets',rs.length,'Customer wallets','Cashback Wallet');add('Balance',money(rs.reduce((s,r)=>s+num(r.Balance),0)),'Current balance','Cashback Wallet','money','₹');add('Earned',money(rs.reduce((s,r)=>s+num(r.TotalEarned),0)),'Lifetime earned','Cashback History','good','↗');add('Redeemed',money(rs.reduce((s,r)=>s+num(r.TotalRedeemed),0)),'Lifetime redeemed','Cashback History','info','✓')}
 else if(heading==='CASHBACK HISTORY'){add('Transactions',rs.length,'Cashback ledger','Cashback History');add('Completed',done.length,'Completed entries','Cashback History','good','✓');add('Pending',pending.length,'Awaiting completion','Cashback History','warn','◷');add('Value',money(Math.abs(amount)),'Loaded transaction value','Cashback History','money','₹')}
 else if(heading==='CASHBACK PAYOUTS'){add('Requests',rs.length,'Payout requests','Cashback Payouts');add('Pending',pending.length,'Awaiting processing','Cashback Payouts','warn','◷');add('Completed',done.length,'Completed payouts','Cashback Payouts','good','✓');add('Amount',money(amount),'Loaded payout value','Cashback Payouts','money','₹')}
 else if(heading==='SHOPPERS'){add('Shoppers',rs.length,'Customer accounts','Shoppers','info','◉');add('Active',active.length,'Active customers','Shoppers','good','✓');add('Pending',pending.length,'Review required','Shoppers','warn','◷');add('Restricted',bad.length,'Removed / blocked','Shoppers','danger','!')}
 else if(heading==='ORDER ITEMS'){add('Line Items',rs.length,'Order lines','Order Items');add('Orders',new Set(rs.map(r=>r.OrderID).filter(Boolean)).size,'Unique orders','Orders','info','▣');add('Quantity',rs.reduce((s,r)=>s+num(r.Quantity),0),'Units','Order Items','good','+')}
 else {add('Records',rs.length,'Loaded records',PAGES[heading]||heading);add('Active / Done',active.length||done.length,'Healthy records',PAGES[heading]||heading,'good','✓');add('Pending',pending.length,'Needs attention',PAGES[heading]||heading,'warn','◷');add('Issues',bad.length,'Requires review',PAGES[heading]||heading,'danger','!')}
 const grid=document.createElement('div');grid.className='tc-new-kpi-grid';items.forEach(x=>grid.appendChild(x))
 const anchor=page.querySelector('.tc-data-head')||page.querySelector('.tc-admin-hero');if(anchor)anchor.insertAdjacentElement('afterend',grid)
}
function addDashboard(page){
 page.querySelector('.tc-kpis')?.classList.add('tc-legacy-kpi-hidden')
 if(page.dataset.newDashboard==='1')return
 const old=[...page.querySelectorAll('.tc-kpi')],get=(name)=>{const k=old.find(x=>clean(x.querySelector('small')?.textContent).toUpperCase()===name);return clean(k?.querySelector('strong')?.textContent)||'0'}
 const work=clean(page.querySelector('.tc-priority .priority-number')?.textContent)||clean(page.querySelector('.tc-priority>b')?.textContent)||get('OPEN WORK')
 const grid=document.createElement('div');grid.className='tc-new-dashboard-grid'
 ;[['Sales',get('VERIFIED SALES'),'Verified payments','Payments','money','₹'],['Orders',get('ORDERS'),'All customer orders','Orders','neutral','▣'],['Cashback',get('CASHBACK'),'Cashback ledger','Cashback History','money','↗'],['Link Stock',get('AVAILABLE LINKS'),'Ready payment links','Link Stock','good','↗'],['Open Work',work,'Items requiring action','Work Queue','warn','!']].forEach(x=>grid.appendChild(card(...x)))
 const hero=page.querySelector('.tc-admin-hero');if(hero)hero.insertAdjacentElement('afterend',grid);page.dataset.newDashboard='1'
}
function run(){const main=document.querySelector('.tc-admin-main');if(!main)return;const pages=[...main.querySelectorAll('.tc-admin-page')];const heading=clean(main.querySelector('.tc-admin-header h1')?.textContent).toUpperCase();const page=pages.find(p=>p.querySelector('.tc-table-wrap')||p.querySelector('.tc-admin-hero'));if(!page)return;if(heading==='DASHBOARD'){addDashboard(page);return}if(PAGES[heading]&&page.querySelector('.tc-table-wrap')){page.dataset.newPageKpi='1';addGrid(page,heading)}}
export default function AdminKpiAllPages(){useEffect(()=>{let timer;const runNow=()=>{clearTimeout(timer);timer=setTimeout(run,80)};const observer=new MutationObserver(runNow);observer.observe(document.body,{subtree:true,childList:true,characterData:true});runNow();return()=>{clearTimeout(timer);observer.disconnect()}},[]);return null}
