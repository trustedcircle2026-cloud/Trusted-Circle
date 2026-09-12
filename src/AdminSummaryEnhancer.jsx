import {useEffect} from 'react'
import {api} from './api'

const MONEY=v=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const clean=v=>String(v??'').trim()
const upper=v=>clean(v).toUpperCase()
const num=v=>{const n=Number(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0}
const rowsOf=(tables,name)=>tables?.[name]?.rows||[]
const count=(rows,p)=>rows.filter(p).length
const sum=(rows,fields)=>rows.reduce((total,row)=>{for(const field of fields){if(row[field]!==undefined&&clean(row[field])!=='')return total+num(row[field])}return total},0)

function navigateAdmin(label){
 const wanted=String(label).toLowerCase()
 const button=[...document.querySelectorAll('.tc-admin-nav button')].find(el=>String(el.textContent||'').trim().toLowerCase().includes(wanted))
 if(button)button.click()
}

function makeKpi(label,value,sub,target,tone='neutral',icon='•'){
 const el=document.createElement('button')
 el.type='button'
 el.className=`tc-dash-kpi ${tone}`
 el.onclick=()=>navigateAdmin(target)
 el.innerHTML=`<span class="tc-dash-kpi-icon">${icon}</span><div><small>${label}</small><strong>${value}</strong><em>${sub||''}</em></div><b class="tc-dash-kpi-link">↗</b>`
 return el
}

function makeAction(label,target,icon,sub){
 const el=document.createElement('button')
 el.type='button'
 el.className='tc-dash-action'
 el.onclick=()=>navigateAdmin(target)
 el.innerHTML=`<span>${icon}</span><div><b>${label}</b><small>${sub||''}</small></div><i>›</i>`
 return el
}

function sectionTitle(title,sub){
 return `<div class="tc-dash-section-head"><div><small>${title}</small><span>${sub||''}</span></div></div>`
}

function buildDashboard(data){
 const tables=data?.tables||{}
 const orders=rowsOf(tables,'Orders')
 const payments=rowsOf(tables,'Payments')
 const users=rowsOf(tables,'Users')
 const products=rowsOf(tables,'Products')
 const brands=rowsOf(tables,'Brands')
 const vouchers=rowsOf(tables,'Vouchers')
 const stock=rowsOf(tables,'PaymentLinkStock')
 const wallets=rowsOf(tables,'CashbackWallet')
 const payouts=rowsOf(tables,'WalletRedemptions')
 const cashback=rowsOf(tables,'CashbackTransactions')
 const audit=rowsOf(tables,'AuditLogs')
 const status=r=>upper(r.Status)
 const verifiedPayments=payments.filter(r=>status(r)==='VERIFIED')
 const paidOrders=orders.filter(r=>['PAID','PROCESSING','DELIVERED'].includes(status(r)))
 const pendingOrders=orders.filter(r=>status(r)==='PENDING_PAYMENT')
 const delivered=vouchers.filter(r=>status(r)==='DELIVERED')
 const available=stock.filter(r=>status(r)==='AVAILABLE')
 const reserved=stock.filter(r=>status(r)==='RESERVED')
 const earned=cashback.filter(r=>status(r)==='COMPLETED'&&upper(r.Type)==='CASHBACK_EARNED')
 const redemptions=cashback.filter(r=>status(r)==='COMPLETED'&&upper(r.Type)==='REDEMPTION_REQUEST')
 const pendingPayouts=payouts.filter(r=>['REQUESTED','PROCESSING'].includes(status(r)))
 const activeUsers=users.filter(r=>upper(r.Role)!=='ADMIN'&&upper(r.Status)!=='REMOVED')
 const discounts=products.map(r=>num(r.DiscountPercent)).filter(v=>v>0)
 const avgDiscount=discounts.length?discounts.reduce((a,b)=>a+b,0)/discounts.length:0
 const sales=verifiedPayments.length?sum(verifiedPayments,['Amount']):num(data?.metrics?.revenue)
 const cashbackEarned=sum(earned,['Amount'])
 const walletValue=sum(wallets,['Balance'])
 const pendingPayoutValue=sum(pendingPayouts,['Amount'])
 const orderValue=sum(orders,['Total','Amount','OrderValue'])
 const avgOrder=paidOrders.length?sales/paidOrders.length:0
 const auditErrors=count(audit,r=>['ERROR','FAILED'].includes(status(r)))
 const openWork=pendingOrders.length+count(vouchers,r=>['PENDING','PROCESSING'].includes(status(r)))+pendingPayouts.length

 const root=document.createElement('section')
 root.className='tc-admin-page tc-command-dashboard'
 root.innerHTML=`<div class="tc-dash-top"><div><small>COMMAND CENTER</small><h2>Management dashboard</h2><p>Sales, cash flow, cashback, customers and operations in one view.</p></div><div class="tc-dash-top-actions"><button data-refresh>↻ Refresh</button><button data-work>Open Work Queue <b>${openWork}</b></button></div></div><div class="tc-dash-kpi-grid"></div><div class="tc-dash-section">${sectionTitle('QUICK ACTIONS','One click to the operational screens')}</div><div class="tc-dash-actions"></div><div class="tc-dash-lower"><div class="tc-dash-panel"><div class="tc-dash-panel-head"><div><small>SALES & CASH FLOW</small><h3>Financial snapshot</h3></div><button data-sales>View payments ↗</button></div><div class="tc-dash-finance"></div></div><div class="tc-dash-panel"><div class="tc-dash-panel-head"><div><small>OPERATIONS</small><h3>Today’s control points</h3></div><button data-ops>Open work ↗</button></div><div class="tc-dash-ops"></div></div></div><div class="tc-dash-panel tc-dash-bottom"><div class="tc-dash-panel-head"><div><small>MANAGEMENT CONTROL</small><h3>System coverage</h3></div><button data-all>All data ↗</button></div><div class="tc-dash-system"></div></div>`

 const kpis=root.querySelector('.tc-dash-kpi-grid')
 ;[
  ['Verified Sales',MONEY(sales),`${verifiedPayments.length} verified payments`,'Payments','money','₹'],
  ['Orders',orders.length,`${paidOrders.length} paid / fulfilled`,'Orders','neutral','▣'],
  ['Avg Order',MONEY(avgOrder),'Verified sales ÷ paid orders','Orders','info','◌'],
  ['Cashback Earned',MONEY(cashbackEarned),`${earned.length} completed credits`,'Cashback History','money','↗'],
  ['Avg Cashback',`${avgDiscount.toFixed(2)}%`,'Current product discount rate','Products','good','%'],
  ['Customers',activeUsers.length,`${count(users,r=>upper(r.Status)==='ACTIVE')} active accounts`,'Shoppers','info','◉'],
  ['Vouchers Delivered',delivered.length,`${vouchers.length} voucher records`,'Vouchers','good','✓'],
  ['Payment Links Ready',available.length,`${MONEY(sum(available,['Denomination']))} stock value`,'Link Stock','good','↗'],
  ['Links Reserved',reserved.length,`${MONEY(sum(reserved,['Denomination']))} reserved`,'Link Stock','warn','◷'],
  ['Pending Payments',pendingOrders.length,'Orders awaiting payment','Orders','warn','!'],
  ['Cashback Wallet',MONEY(walletValue),`${wallets.length} customer wallets`,'Cashback Wallet','money','₹'],
  ['Pending Payouts',MONEY(pendingPayoutValue),`${pendingPayouts.length} requests`,'Cashback Payouts','warn','◷']
 ].forEach(item=>kpis.appendChild(makeKpi(...item)))

 const actions=root.querySelector('.tc-dash-actions')
 ;[
  ['Verify Payments','Payments','◉','Review payment status'],
  ['Send Vouchers','Vouchers','✓','Deliver verified orders'],
  ['Payment Link Stock','Link Stock','↗','Add / monitor link inventory'],
  ['Process Payouts','Cashback Payouts','₹','Review wallet redemptions'],
  ['Orders','Orders','▣','Search and update orders'],
  ['Shoppers','Shoppers','◉','Customer accounts'],
  ['Products','Products','▦','Catalog and discounts'],
  ['Activity','Web Activity','⌁','Audit trail and actions']
 ].forEach(item=>actions.appendChild(makeAction(...item)))

 const finance=root.querySelector('.tc-dash-finance')
 finance.innerHTML=`<div><small>VERIFIED SALES</small><strong>${MONEY(sales)}</strong><span>${verifiedPayments.length} verified payment records</span></div><div><small>ORDER VALUE</small><strong>${MONEY(orderValue)}</strong><span>${orders.length} loaded order records</span></div><div><small>CASHBACK EARNED</small><strong>${MONEY(cashbackEarned)}</strong><span>${earned.length} completed cashback credits</span></div><div><small>NET AFTER CASHBACK</small><strong>${MONEY(Math.max(0,sales-cashbackEarned))}</strong><span>Verified sales less earned cashback</span></div>`

 const ops=root.querySelector('.tc-dash-ops')
 ops.innerHTML=`<button data-go="Orders"><span class="warn">${pendingOrders.length}</span><div><b>Payment pending</b><small>Orders waiting for customer payment</small></div><i>›</i></button><button data-go="Vouchers"><span class="good">${delivered.length}</span><div><b>Voucher delivered</b><small>Completed voucher fulfilment records</small></div><i>›</i></button><button data-go="Link Stock"><span class="good">${available.length}</span><div><b>Links available</b><small>Ready for new orders</small></div><i>›</i></button><button data-go="Cashback Payouts"><span class="warn">${pendingPayouts.length}</span><div><b>Payouts pending</b><small>${MONEY(pendingPayoutValue)} awaiting admin action</small></div><i>›</i></button><button data-go="Web Activity"><span class="${auditErrors?'danger':'ok'}">${auditErrors}</span><div><b>Activity errors</b><small>${auditErrors?'Investigate audit errors':'No recorded audit errors in loaded activity'}</small></div><i>›</i></button>`
 ops.querySelectorAll('[data-go]').forEach(button=>button.onclick=()=>navigateAdmin(button.dataset.go))

 const system=root.querySelector('.tc-dash-system')
 system.innerHTML=`<button data-go="Products"><b>${products.length}</b><span>Products</span><small>Catalog</small></button><button data-go="Brands"><b>${brands.length}</b><span>Brands</span><small>Configured</small></button><button data-go="Shoppers"><b>${activeUsers.length}</b><span>Customers</span><small>Active shoppers</small></button><button data-go="Link Stock"><b>${stock.length}</b><span>Payment links</span><small>Stocked</small></button><button data-go="Cashback Wallet"><b>${wallets.length}</b><span>Wallets</span><small>Customer wallets</small></button><button data-go="Cashback History"><b>${cashback.length}</b><span>Cashback ledger</span><small>${earned.length} earned / ${redemptions.length} redemptions</small></button>`
 system.querySelectorAll('[data-go]').forEach(button=>button.onclick=()=>navigateAdmin(button.dataset.go))

 root.querySelector('[data-work]').onclick=()=>navigateAdmin('Work Queue')
 root.querySelector('[data-sales]').onclick=()=>navigateAdmin('Payments')
 root.querySelector('[data-ops]').onclick=()=>navigateAdmin('Work Queue')
 root.querySelector('[data-all]').onclick=()=>navigateAdmin('All Data')
 root.querySelector('[data-refresh]').onclick=()=>{dashboardPromise=null;navigateAdmin('Command Center')}
 return root
}

function extractRows(page){
 const table=page.querySelector('.tc-table-wrap table')
 if(!table)return[]
 const heads=[...table.querySelectorAll('thead th')].map(x=>clean(x.textContent))
 return [...table.querySelectorAll('tbody tr')].map(tr=>{
  const cells=[...tr.querySelectorAll('td')]
  const row={}
  heads.forEach((head,i)=>{if(head&&head!=='Action')row[head]=clean(cells[i]?.textContent)})
  return row
 })
}

function summaryCard(label,value,sub,tone='neutral',icon='•'){
 const el=document.createElement('div')
 el.className=`tc-live-summary-card ${tone}`
 el.innerHTML=`<span class="tc-live-summary-icon">${icon}</span><div><small>${label}</small><strong>${value}</strong><em>${sub||''}</em></div>`
 return el
}

function refreshSummary(){
 const main=document.querySelector('.tc-admin-main')
 if(!main)return
 const page=[...main.querySelectorAll('.tc-admin-page')].find(el=>el.querySelector('.tc-table-wrap'))
 if(!page)return
 const table=page.querySelector('.tc-table-wrap table')
 if(!table)return
 const heading=clean(main.querySelector('.tc-admin-header h1')?.textContent)
 const rows=extractRows(page)
 const key=`${heading}:${rows.length}:${rows[0]?.[Object.keys(rows[0]||{})[0]]||''}`
 if(page.dataset.summaryKey===key)return
 page.dataset.summaryKey=key
 page.querySelector('.tc-live-summary-grid')?.remove()
 const grid=document.createElement('div')
 grid.className='tc-live-summary-grid'
 const status=row=>upper(row.Status)
 const t=upper(heading)
 if(t==='ORDERS'){
  const paid=count(rows,row=>['PAID','PROCESSING','DELIVERED'].includes(status(row)))
  ;[summaryCard('Total Orders',rows.length,'Loaded records'),summaryCard('Paid Orders',paid,'Verified / fulfilled','good','✓'),summaryCard('Pending Payment',count(rows,row=>status(row)==='PENDING_PAYMENT'),'Needs attention','warn','◷'),summaryCard('Delivered',count(rows,row=>status(row)==='DELIVERED'),'Voucher completed','info','✓'),summaryCard('Order Value',MONEY(sum(rows,['Total','Amount','OrderValue'])),'Loaded value','money','₹')].forEach(x=>grid.appendChild(x))
 }else if(t==='PAYMENTS'){
  const verified=rows.filter(row=>status(row)==='VERIFIED')
  ;[summaryCard('Total Collected',MONEY(sum(verified,['Amount'])),'Verified payments','money','₹'),summaryCard('Verified',verified.length,'Cleared','good','✓'),summaryCard('Pending',count(rows,row=>['PENDING','INITIATED','PROCESSING'].includes(status(row))),'Awaiting verification','warn','◷'),summaryCard('Failed / Rejected',count(rows,row=>['FAILED','REJECTED','CANCELLED'].includes(status(row))),'Review required','danger','!'),summaryCard('Payment Records',rows.length,'Loaded records')].forEach(x=>grid.appendChild(x))
 }else if(t==='PAYMENT LINK STOCK'||t==='LINK STOCK'){
  const available=rows.filter(row=>status(row)==='AVAILABLE'),reserved=rows.filter(row=>status(row)==='RESERVED'),used=rows.filter(row=>status(row)==='USED')
  ;[summaryCard('Available',available.length,`${MONEY(sum(available,['Denomination']))} value`,'good','↗'),summaryCard('Reserved',reserved.length,`${MONEY(sum(reserved,['Denomination']))} value`,'warn','◷'),summaryCard('Used',used.length,'Consumed links','info','✓'),summaryCard('Total Stock',rows.length,'All records')].forEach(x=>grid.appendChild(x))
 }else if(t==='SHOPPERS'){
  const shoppers=rows.filter(row=>upper(row.Role)!=='ADMIN')
  ;[summaryCard('Shoppers',shoppers.length,'Customer accounts'),summaryCard('Active',count(shoppers,row=>upper(row.Status)==='ACTIVE'),'Can shop','good','✓'),summaryCard('Removed / Blocked',count(shoppers,row=>['REMOVED','BLOCKED','DISABLED'].includes(status(row))),'Needs attention','danger','!')].forEach(x=>grid.appendChild(x))
 }else if(t==='PRODUCTS'){
  const discounts=rows.map(row=>num(row.DiscountPercent)).filter(v=>v>0),avg=discounts.length?discounts.reduce((a,b)=>a+b,0)/discounts.length:0
  ;[summaryCard('Products',rows.length,'Catalog records'),summaryCard('Active',count(rows,row=>['TRUE','YES','ACTIVE'].includes(upper(row.Active||row.Status))),'Available','good','✓'),summaryCard('Brands',new Set(rows.map(row=>clean(row.BrandID)).filter(Boolean)).size,'Unique brand IDs','info','◆'),summaryCard('Avg Cashback',`${avg.toFixed(2)}%`,'Current product discounts','money','%')].forEach(x=>grid.appendChild(x))
 }else if(t==='VOUCHERS'){
  ;[summaryCard('Vouchers',rows.length,'Voucher records'),summaryCard('Delivered',count(rows,row=>status(row)==='DELIVERED'),'Issued','good','✓'),summaryCard('Pending',count(rows,row=>['PENDING','PROCESSING'].includes(status(row))),'Awaiting completion','warn','◷'),summaryCard('Failed / Cancelled',count(rows,row=>['FAILED','CANCELLED','REJECTED'].includes(status(row))),'Review','danger','!')].forEach(x=>grid.appendChild(x))
 }else if(t==='CASHBACK WALLET'){
  const balance=sum(rows,['Balance']),earned=sum(rows,['TotalEarned']),redeemed=sum(rows,['TotalRedeemed'])
  ;[summaryCard('Wallet Balance',MONEY(balance),'Current customer balances','money','₹'),summaryCard('Total Earned',MONEY(earned),'Lifetime cashback credited','good','↗'),summaryCard('Total Redeemed',MONEY(redeemed),'Lifetime payouts','info','✓'),summaryCard('Customer Wallets',rows.length,'Wallet records')].forEach(x=>grid.appendChild(x))
 }else if(t==='CASHBACK HISTORY'){
  const earned=rows.filter(row=>upper(row.Type)==='CASHBACK_EARNED'&&status(row)==='COMPLETED'),redeemed=rows.filter(row=>upper(row.Type)==='REDEMPTION_REQUEST'&&status(row)==='COMPLETED')
  const earnedValue=sum(earned,['Amount']),redeemedValue=Math.abs(sum(redeemed,['Amount']))
  ;[summaryCard('Cashback Earned',MONEY(earnedValue),`${earned.length} completed credits`,'money','↗'),summaryCard('Redemptions',MONEY(redeemedValue),`${redeemed.length} completed debits`,'info','↓'),summaryCard('Net Cashback',MONEY(earnedValue-redeemedValue),'Earned less redeemed','good','₹'),summaryCard('Ledger Records',rows.length,'All transaction records')].forEach(x=>grid.appendChild(x))
 }else if(t==='CASHBACK PAYOUTS'){
  const requested=rows.filter(row=>['REQUESTED','PROCESSING'].includes(status(row))),completed=rows.filter(row=>status(row)==='COMPLETED'),rejected=rows.filter(row=>['REJECTED','FAILED','CANCELLED'].includes(status(row)))
  ;[summaryCard('Pending Amount',MONEY(sum(requested,['Amount'])),'Awaiting admin processing','warn','◷'),summaryCard('Pending Requests',requested.length,'Needs action','warn','!'),summaryCard('Completed',MONEY(sum(completed,['Amount'])),'Paid / completed','good','✓'),summaryCard('Rejected / Failed',rejected.length,'Review if required','danger','!'),summaryCard('Total Requests',rows.length,'All redemption requests')].forEach(x=>grid.appendChild(x))
 }else{
  grid.appendChild(summaryCard('Total Records',rows.length,'Loaded records'))
 }
 page.querySelector('.tc-table-wrap').parentNode.insertBefore(grid,page.querySelector('.tc-table-wrap'))
}

let dashboardPromise=null
async function refreshDashboard(){
 const main=document.querySelector('.tc-admin-main')
 if(!main)return
 const page=[...main.querySelectorAll('.tc-admin-page')].find(el=>clean(el.querySelector('h2')?.textContent)==='Operations at a glance.')
 if(!page||page.querySelector('.tc-command-dashboard'))return
 const token=localStorage.getItem('tc_erp_session')
 if(!token)return
 try{
  dashboardPromise=dashboardPromise||api.adminDashboard(token)
  const data=await dashboardPromise
  if(document.body.contains(page))page.replaceWith(buildDashboard(data))
 }catch(error){dashboardPromise=null;console.warn('Dashboard enhancement:',error?.message||error)}
}

export default function AdminSummaryEnhancer(){
 useEffect(()=>{
  let timer
  const run=()=>{
   clearTimeout(timer)
   timer=setTimeout(()=>{refreshDashboard();refreshSummary()},120)
  }
  const observer=new MutationObserver(run)
  observer.observe(document.body,{subtree:true,childList:true,characterData:true})
  run()
  return()=>{clearTimeout(timer);observer.disconnect()}
 },[])
 return null
}
