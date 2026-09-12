import {useEffect} from 'react'
import './admin-kpi-all-pages.css'

const MONEY=v=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const clean=v=>String(v??'').trim()
const upper=v=>clean(v).toUpperCase()
const num=v=>{const n=Number(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0}

const PAGE_MAP={
 'ORDERS':{label:'Orders',icon:'▣'},'ORDER ITEMS':{label:'Order Items',icon:'≡'},
 'PAYMENTS':{label:'Payments',icon:'₹'},'PAYMENT LINKS':{label:'Payment Links',icon:'↗'},
 'LINK REQUESTS':{label:'Link Requests',icon:'⌁'},'LINK STOCK':{label:'Link Stock',icon:'↗'},
 'VOUCHERS':{label:'Vouchers',icon:'✓'},'PRODUCTS':{label:'Products',icon:'▦'},'BRANDS':{label:'Brands',icon:'◆'},
 'CART':{label:'Cart',icon:'🛒'},'NOTIFICATIONS':{label:'Notifications',icon:'●'},'OTP LOGS':{label:'OTP Logs',icon:'⌁'},
 'SESSIONS':{label:'Sessions',icon:'◉'},'WEB ACTIVITY':{label:'Web Activity',icon:'⌁'},
 'CASHBACK WALLET':{label:'Cashback Wallet',icon:'₹'},'CASHBACK HISTORY':{label:'Cashback History',icon:'↗'},
 'CASHBACK PAYOUTS':{label:'Cashback Payouts',icon:'₹'},'SHOPPERS':{label:'Shoppers',icon:'◉'}
}

function navigate(label){
 const wanted=String(label).toLowerCase()
 const button=[...document.querySelectorAll('.tc-admin-nav button')].find(b=>String(b.textContent||'').trim().toLowerCase().includes(wanted))
 if(button)button.click()
}
function rows(page){
 const table=page.querySelector('.tc-table-wrap table');if(!table)return[]
 const heads=[...table.querySelectorAll('thead th')].map(x=>clean(x.textContent))
 return [...table.querySelectorAll('tbody tr')].map(tr=>{const cells=[...tr.querySelectorAll('td')],r={};heads.forEach((h,i)=>{if(h&&h!=='Action')r[h]=clean(cells[i]?.textContent)});return r})
}
function card(label,value,sub,target,tone='neutral',icon='•'){
 const b=document.createElement('button');b.type='button';b.className=`tc-allpage-kpi ${tone}`
 b.innerHTML=`<span class="tc-allpage-kpi-icon">${icon}</span><div><small>${label}</small><strong>${value}</strong><em>${sub||'Open page'}</em></div><b>↗</b>`
 b.onclick=()=>navigate(target);return b
}
function addKpis(){
 const main=document.querySelector('.tc-admin-main');if(!main)return
 const page=[...main.querySelectorAll('.tc-admin-page')].find(p=>p.querySelector('.tc-table-wrap table'))
 if(!page)return
 if(page.dataset.allPageKpi==='1')return
 const heading=clean(main.querySelector('.tc-admin-header h1')?.textContent).toUpperCase()
 if(!PAGE_MAP[heading])return
 const existing=page.querySelector('.tc-live-summary-grid');if(existing){page.dataset.allPageKpi='1';return}
 const rs=rows(page),status=r=>upper(r.Status),active=rs.filter(r=>['ACTIVE','TRUE','YES'].includes(upper(r.Active||r.Status)))
 const pending=rs.filter(r=>['PENDING','PENDING_PAYMENT','REQUESTED','PROCESSING','INITIATED'].includes(status(r)))
 const completed=rs.filter(r=>['COMPLETED','PAID','DELIVERED','VERIFIED','SENT','SUCCESS'].includes(status(r)))
 const failed=rs.filter(r=>['FAILED','REJECTED','CANCELLED','ERROR','BLOCKED'].includes(status(r)))
 const amount=sum(rs,['Amount','Total','OrderValue','Balance','Denomination'])
 const items=[]
 if(heading==='PAYMENT LINKS')items.push(card('Total Links',rs.length,'All payment-link records','Payment Links'),card('Active / Ready',active.length,'Available records','Payment Links','good','✓'),card('Pending',pending.length,'Requests needing action','Link Requests','warn','◷'))
 else if(heading==='LINK REQUESTS')items.push(card('Total Requests',rs.length,'All requests','Link Requests'),card('Pending',pending.length,'Needs admin action','Link Requests','warn','◷'),card('Completed',completed.length,'Processed requests','Link Requests','good','✓'),card('Rejected / Failed',failed.length,'Requires review','Link Requests','danger','!'))
 else if(heading==='ORDER ITEMS')items.push(card('Line Items',rs.length,'All order lines','Order Items'),card('Unique Orders',new Set(rs.map(r=>r.OrderID).filter(Boolean)).size,'Orders represented','Orders','info','▣'),card('Quantity',sum(rs,['Quantity']),'Units across lines','Order Items','good','+'))
 else if(heading==='BRANDS')items.push(card('Brands',rs.length,'Configured brands','Brands','info','◆'),card('Active',active.length,'Available brands','Brands','good','✓'))
 else if(heading==='CART')items.push(card('Cart Items',rs.length,'Current cart records','Cart'),card('Quantity',sum(rs,['Quantity']),'Units in carts','Cart','info','+'),card('Cart Value',MONEY(amount),'Loaded value','Cart','money','₹'))
 else if(heading==='NOTIFICATIONS')items.push(card('Notifications',rs.length,'All notification records','Notifications'),card('Unread',rs.filter(r=>['UNREAD','FALSE','0'].includes(upper(r.Read||r.Status))).length,'Potentially unread','Notifications','warn','●'),card('Sent / Success',completed.length,'Delivered successfully','Notifications','good','✓'))
 else if(heading==='OTP LOGS')items.push(card('OTP Attempts',rs.length,'Security log records','OTP Logs'),card('Success',completed.length,'Successful verifications','OTP Logs','good','✓'),card('Failed',failed.length,'Failed attempts','OTP Logs','danger','!'))
 else if(heading==='SESSIONS')items.push(card('Sessions',rs.length,'Session records','Sessions'),card('Active',active.length,'Currently active','Sessions','good','✓'),card('Expired',rs.filter(r=>['EXPIRED','REVOKED','INACTIVE'].includes(status(r))).length,'No longer active','Sessions','warn','◷'))
 else if(heading==='WEB ACTIVITY')items.push(card('Activity',rs.length,'Audit records','Web Activity'),card('Errors',failed.length,'Errors / failures','Web Activity','danger','!'),card('Success',completed.length,'Successful actions','Web Activity','good','✓'))
 else if(heading==='CASHBACK PAYOUTS')items.push(card('Requests',rs.length,'All payout requests','Cashback Payouts'),card('Pending',pending.length,'Awaiting processing','Cashback Payouts','warn','◷'),card('Completed',completed.length,'Paid / completed','Cashback Payouts','good','✓'),card('Amount',MONEY(amount),'Loaded payout amount','Cashback Payouts','money','₹'))
 else if(heading==='CASHBACK HISTORY')items.push(card('Ledger Records',rs.length,'All cashback transactions','Cashback History'),card('Completed',completed.length,'Completed transactions','Cashback History','good','✓'),card('Pending',pending.length,'Pending transactions','Cashback History','warn','◷'),card('Value',MONEY(Math.abs(amount)),'Loaded transaction value','Cashback History','money','₹'))
 else if(heading==='CASHBACK WALLET')items.push(card('Wallets',rs.length,'Customer wallet records','Cashback Wallet'),card('Balance',MONEY(sum(rs,['Balance'])),'Current wallet balance','Cashback Wallet','money','₹'),card('Earned',MONEY(sum(rs,['TotalEarned'])),'Lifetime earned','Cashback Wallet','good','↗'),card('Redeemed',MONEY(sum(rs,['TotalRedeemed'])),'Lifetime redeemed','Cashback Wallet','info','✓'))
 else if(heading==='SHOPPERS')items.push(card('Shoppers',rs.length,'Customer records','Shoppers','info','◉'),card('Active',active.length,'Active accounts','Shoppers','good','✓'),card('Pending / Review',pending.length,'Needs attention','Shoppers','warn','◷'),card('Removed / Blocked',failed.length,'Restricted accounts','Shoppers','danger','!'))
 else if(heading==='VOUCHERS')items.push(card('Vouchers',rs.length,'Voucher records','Vouchers'),card('Delivered',completed.length,'Completed delivery','Vouchers','good','✓'),card('Pending',pending.length,'Awaiting delivery','Vouchers','warn','◷'),card('Failed',failed.length,'Delivery problems','Vouchers','danger','!'))
 else items.push(card('Total Records',rs.length,'Loaded records',PAGE_MAP[heading].label,PAGE_MAP[heading].icon),card('Completed / Active',completed.length||active.length,'Healthy records',PAGE_MAP[heading].label,'good','✓'),card('Pending',pending.length,'Needs attention',PAGE_MAP[heading].label,'warn','◷'),card('Failed / Issues',failed.length,'Requires review',PAGE_MAP[heading].label,'danger','!'),card('Value',MONEY(amount),'Loaded numeric value',PAGE_MAP[heading].label,'money','₹'))
 const grid=document.createElement('div');grid.className='tc-allpage-kpi-grid';items.forEach(x=>grid.appendChild(x))
 page.querySelector('.tc-table-wrap').parentNode.insertBefore(grid,page.querySelector('.tc-table-wrap'))
 page.dataset.allPageKpi='1'
}
function sum(rs,fields){return rs.reduce((t,r)=>{for(const f of fields)if(r[f]!==undefined&&clean(r[f])!=='')return t+num(r[f]);return t},0)}
export default function AdminKpiAllPages(){useEffect(()=>{let timer;const run=()=>{clearTimeout(timer);timer=setTimeout(addKpis,100)};const observer=new MutationObserver(run);observer.observe(document.body,{subtree:true,childList:true,characterData:true});run();return()=>{clearTimeout(timer);observer.disconnect()}},[]);return null}
