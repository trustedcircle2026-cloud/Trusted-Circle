import {useEffect} from 'react'

const MONEY=v=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const clean=v=>String(v??'').trim()
const upper=v=>clean(v).toUpperCase()
const num=v=>{const n=Number(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0}
const moneyFields=['Amount','Total','OrderValue','Value','Balance','AvailableBalance','CashbackBalance','RequestedAmount','RedeemedAmount','CashbackAmount','Denomination','FaceValue']
function rowsFromTable(table){
 const heads=[...table.querySelectorAll('thead th')].map(x=>clean(x.textContent))
 return [...table.querySelectorAll('tbody tr')].map(tr=>{const cells=[...tr.querySelectorAll('td')];const r={};heads.forEach((h,i)=>{if(h&&h!=='Action')r[h]=clean(cells[i]?.textContent)});return r})
}
function sum(rows,fields=moneyFields){return rows.reduce((total,r)=>{for(const f of fields){if(r[f]!==undefined&&clean(r[f])!=='')return total+num(r[f])}return total},0)}
function count(rows,p){return rows.filter(p).length}
function makeCard(label,value,sub,tone='neutral',icon='•'){
 const el=document.createElement('div');el.className=`tc-live-summary-card ${tone}`
 el.innerHTML=`<span class="tc-live-summary-icon">${icon}</span><div><small>${label}</small><strong>${value}</strong><em>${sub||''}</em></div>`
 return el
}
function buildCards(title,rows){
 const t=upper(title), status=r=>upper(r.Status)
 if(t==='LINK STOCK'||t==='PAYMENT LINK STOCK'){
  const available=rows.filter(r=>status(r)==='AVAILABLE'),reserved=rows.filter(r=>status(r)==='RESERVED'),used=rows.filter(r=>status(r)==='USED')
  return [makeCard('Available Stock',available.length,`${MONEY(sum(available,['Denomination']))} available value`,'good','↗'),makeCard('Available Value',MONEY(sum(available,['Denomination'])),'Ready for customer orders','money','₹'),makeCard('Reserved',reserved.length,`${MONEY(sum(reserved,['Denomination']))} reserved value`,'warn','◷'),makeCard('Used / Collected',used.length,`${MONEY(sum(used,['Denomination']))} face value`,'info','✓'),makeCard('Total Stock',rows.length,'All stocked payment links','neutral','▦')]
 }
 if(t==='ORDERS'){
  const paid=count(rows,r=>['PAID','PROCESSING','DELIVERED'].includes(status(r)))
  return [makeCard('Total Orders',rows.length,'Latest records loaded','neutral','▣'),makeCard('Paid Orders',paid,'Payment verified / fulfilled','good','✓'),makeCard('Pending Payment',count(rows,r=>status(r)==='PENDING_PAYMENT'),'Needs payment attention','warn','◷'),makeCard('Delivered',count(rows,r=>status(r)==='DELIVERED'),'Voucher delivery completed','info','✓'),makeCard('Order Value',MONEY(sum(rows,['Total','Amount','OrderValue'])),'Value represented by loaded records','money','₹')]
 }
 if(t==='PAYMENTS'){
  const verified=rows.filter(r=>status(r)==='VERIFIED')
  return [makeCard('Total Collected',MONEY(sum(verified,['Amount'])),'Verified payments only','money','₹'),makeCard('Verified',verified.length,'Payment records cleared','good','✓'),makeCard('Pending',count(rows,r=>['PENDING','INITIATED','PROCESSING'].includes(status(r))),'Awaiting verification','warn','◷'),makeCard('Failed / Rejected',count(rows,r=>['FAILED','REJECTED','CANCELLED'].includes(status(r))),'Requires review','danger','!'),makeCard('Payment Records',rows.length,'Loaded payment records','neutral','◌')]
 }
 if(t==='PAYMENT LINKS'){
  return [makeCard('Total Links',rows.length,'Assigned payment links','neutral','↗'),makeCard('Used',count(rows,r=>status(r)==='USED'),'Successfully consumed','good','✓'),makeCard('Active / Pending',count(rows,r=>!['USED','EXPIRED','CANCELLED'].includes(status(r))),'Currently in circulation','warn','◷'),makeCard('Face Value',MONEY(sum(rows,['Amount','Denomination','FaceValue'])),'Across loaded records','money','₹')]
 }
 if(t==='SHOPPERS'){
  const shoppers=rows.filter(r=>upper(r.Role)!=='ADMIN')
  return [makeCard('Shoppers',shoppers.length,'Customer accounts','neutral','◉'),makeCard('Active',count(shoppers,r=>upper(r.Status)==='ACTIVE'),'Accounts able to shop','good','✓'),makeCard('Removed / Blocked',count(shoppers,r=>['REMOVED','BLOCKED','DISABLED'].includes(upper(r.Status))),'Accounts needing attention','danger','!'),makeCard('Admin Accounts',count(rows,r=>upper(r.Role)==='ADMIN'),'Operations access','info','◆')]
 }
 if(t==='PRODUCTS'){
  const active=count(rows,r=>['TRUE','YES','ACTIVE'].includes(upper(r.Active||r.Status)))
  const discounts=rows.map(r=>num(r.DiscountPercent)).filter(x=>x>0),avg=discounts.length?discounts.reduce((a,b)=>a+b,0)/discounts.length:0
  return [makeCard('Products',rows.length,'Catalog records','neutral','▦'),makeCard('Active',active,'Available for sale','good','✓'),makeCard('Brands Covered',new Set(rows.map(r=>clean(r.BrandID)).filter(Boolean)).size,'Unique brand IDs','info','◆'),makeCard('Avg Cashback',`${avg.toFixed(2)}%`,'Across products with cashback','money','%')]
 }
 if(t==='BRANDS'){
  const active=count(rows,r=>['TRUE','YES','ACTIVE'].includes(upper(r.Active||r.Status)))
  return [makeCard('Total Brands',rows.length,'Configured brands','neutral','◆'),makeCard('Active Brands',active,'Visible in shopping','good','✓'),makeCard('Inactive Brands',Math.max(0,rows.length-active),'Not currently active','warn','◷')]
 }
 if(t==='VOUCHERS'){
  return [makeCard('Total Vouchers',rows.length,'Voucher records','neutral','▦'),makeCard('Delivered',count(rows,r=>status(r)==='DELIVERED'),'Successfully issued','good','✓'),makeCard('Pending',count(rows,r=>['PENDING','PROCESSING'].includes(status(r))),'Awaiting completion','warn','◷'),makeCard('Cancelled / Failed',count(rows,r=>['CANCELLED','FAILED','REJECTED'].includes(status(r))),'Requires review','danger','!')]
 }
 if(t==='CASHBACK PAYOUTS'){
  return [makeCard('Payout Requests',rows.length,'Wallet redemption records','neutral','₹'),makeCard('Pending',count(rows,r=>status(r)==='PENDING'),'Needs payout processing','warn','◷'),makeCard('Completed',count(rows,r=>['PAID','COMPLETED','SUCCESS'].includes(status(r))),'Payouts completed','good','✓'),makeCard('Payout Value',MONEY(sum(rows,['Amount','RequestedAmount','RedeemedAmount'])),'Loaded payout records','money','₹')]
 }
 if(t==='CASHBACK WALLET'){
  const bal=rows.map(r=>num(r.Balance||r.AvailableBalance||r.CashbackBalance))
  return [makeCard('Wallets',rows.length,'Customer wallet records','neutral','◉'),makeCard('Total Balance',MONEY(bal.reduce((a,b)=>a+b,0)),'Current wallet balances','money','₹'),makeCard('Positive Balance',bal.filter(x=>x>0).length,'Wallets holding cashback','good','✓'),makeCard('Zero Balance',bal.filter(x=>x<=0).length,'No current cashback','warn','◷')]
 }
 if(t==='CASHBACK HISTORY'){
  const credits=count(rows,r=>['CREDIT','CREDITED'].includes(upper(r.Type||r.TransactionType)))
  const debits=count(rows,r=>['DEBIT','DEBITED','REDEEMED'].includes(upper(r.Type||r.TransactionType)))
  return [makeCard('Transactions',rows.length,'Cashback ledger entries','neutral','◌'),makeCard('Total Value',MONEY(sum(rows,['Amount','CashbackAmount','Value'])),'Across loaded transactions','money','₹'),makeCard('Credits',credits,'Cashback credited','good','+'),makeCard('Debits / Payouts',debits,'Cashback consumed','warn','−')]
 }
 if(t==='CART'){
  return [makeCard('Cart Lines',rows.length,'Saved cart records','neutral','▣'),makeCard('Customers',new Set(rows.map(r=>clean(r.UserID)).filter(Boolean)).size,'Unique shoppers','info','◉'),makeCard('Total Quantity',sum(rows,['Quantity']),'Voucher units in carts','good','▦'),makeCard('Cart Value',MONEY(sum(rows,['Total','Amount','Value'])),'Loaded cart value','money','₹')]
 }
 if(t==='NOTIFICATIONS'){
  return [makeCard('Notifications',rows.length,'All notifications','neutral','◌'),makeCard('Unread',count(rows,r=>!clean(r.ReadAt)),'Awaiting customer view','warn','◷'),makeCard('Read',count(rows,r=>!!clean(r.ReadAt)),'Already viewed','good','✓')]
 }
 if(t==='OTP LOGS'){
  const successful=count(rows,r=>['TRUE','YES','SUCCESS','VERIFIED'].includes(upper(r.Success||r.Status)))
  return [makeCard('OTP Requests',rows.length,'Authentication events','neutral','⌁'),makeCard('Successful',successful,'Verified OTP attempts','good','✓'),makeCard('Failed',count(rows,r=>['FALSE','NO','FAILED','REJECTED'].includes(upper(r.Success||r.Status))),'Unsuccessful attempts','danger','!')]
 }
 if(t==='SESSIONS'){
  return [makeCard('Sessions',rows.length,'Session records','neutral','◉'),makeCard('Active',count(rows,r=>['ACTIVE','TRUE','YES'].includes(upper(r.Status||r.Active))),'Currently active','good','✓'),makeCard('Expired / Revoked',count(rows,r=>['EXPIRED','REVOKED','INACTIVE'].includes(status(r))),'No longer active','warn','◷')]
 }
 if(t==='WEB ACTIVITY'){
  return [makeCard('Total Activity',rows.length,'Audit records loaded','neutral','◌'),makeCard('Successful Actions',count(rows,r=>!['ERROR','FAILED'].includes(upper(r.Status||r.Result))),'Normal operations','good','✓'),makeCard('Errors',count(rows,r=>['ERROR','FAILED'].includes(upper(r.Status||r.Result))),'Requires investigation','danger','!')]
 }
 return [makeCard('Total Records',rows.length,'Loaded records','neutral','▦')]
}

function refreshSummary(){
 const main=document.querySelector('.tc-admin-main')
 if(!main)return
 const page=[...main.querySelectorAll('.tc-admin-page')].find(x=>x.querySelector('.tc-table-wrap'))
 if(!page)return
 const table=page.querySelector('.tc-table-wrap table')
 if(!table)return
 const heading=main.querySelector('.tc-admin-header h1')?.textContent||''
 const key=heading+table.querySelectorAll('tbody tr').length
 if(page.dataset.summaryKey===key)return
 page.dataset.summaryKey=key
 page.querySelector('.tc-live-summary-grid')?.remove()
 const grid=document.createElement('div');grid.className='tc-live-summary-grid'
 buildCards(heading,rowsFromTable(table)).forEach(card=>grid.appendChild(card))
 const tableWrap=page.querySelector('.tc-table-wrap')
 tableWrap.parentNode.insertBefore(grid,tableWrap)
}

export default function AdminSummaryEnhancer(){
 useEffect(()=>{
  let timer
  const run=()=>{clearTimeout(timer);timer=setTimeout(refreshSummary,80)}
  const observer=new MutationObserver(run)
  observer.observe(document.body,{subtree:true,childList:true,characterData:true})
  run()
  return()=>{clearTimeout(timer);observer.disconnect();document.querySelectorAll('.tc-live-summary-grid').forEach(x=>x.remove())}
 },[])
 return null
}
