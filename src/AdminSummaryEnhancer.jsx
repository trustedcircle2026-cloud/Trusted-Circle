import {useEffect} from 'react'
import {api} from './api'

const MONEY=v=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const clean=v=>String(v??'').trim()
const upper=v=>clean(v).toUpperCase()
const num=v=>{const n=Number(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0}
const moneyFields=['Amount','Total','OrderValue','Value','Balance','AvailableBalance','CashbackBalance','RequestedAmount','RedeemedAmount','CashbackAmount','Denomination','FaceValue']
function sum(rows,fields=moneyFields){return rows.reduce((total,r)=>{for(const f of fields){if(r[f]!==undefined&&clean(r[f])!=='')return total+num(r[f])}return total},0)}
function count(rows,p){return rows.filter(p).length}
function tableRows(tables,name){return tables?.[name]?.rows||[]}
function go(label){
 const wanted=String(label).toLowerCase()
 const buttons=[...document.querySelectorAll('.tc-admin-nav button')]
 const b=buttons.find(x=>String(x.textContent||'').trim().toLowerCase().includes(wanted))
 if(b)b.click()
}
function card(label,value,sub,target,tone='neutral',icon='•'){
 const el=document.createElement('button');el.type='button';el.className=`tc-dash-kpi ${tone}`;el.onclick=()=>go(target)
 el.innerHTML=`<span class="tc-dash-kpi-icon">${icon}</span><div><small>${label}</small><strong>${value}</strong><em>${sub||''}</em></div><b class="tc-dash-kpi-link">↗</b>`
 return el
}
function action(label,target,icon,sub){
 const el=document.createElement('button');el.type='button';el.className='tc-dash-action';el.onclick=()=>go(target)
 el.innerHTML=`<span>${icon}</span><div><b>${label}</b><small>${sub||''}</small></div><i>›</i>`
 return el
}
function sectionTitle(title,sub){return `<div class="tc-dash-section-head"><div><small>${title}</small><span>${sub||''}</span></div></div>`}

function buildDashboard(d){
 const tables=d?.tables||{}
 const orders=tableRows(tables,'Orders'),payments=tableRows(tables,'Payments'),users=tableRows(tables,'Users'),products=tableRows(tables,'Products'),brands=tableRows(tables,'Brands'),vouchers=tableRows(tables,'Vouchers'),stock=tableRows(tables,'PaymentLinkStock'),wallets=tableRows(tables,'CashbackWallet'),payouts=tableRows(tables,'WalletRedemptions'),cashback=tableRows(tables,'CashbackTransactions'),audit=tableRows(tables,'AuditLogs')
 const orderStatus=r=>upper(r.Status),paymentStatus=r=>upper(r.Status)
 const verifiedPayments=payments.filter(r=>paymentStatus(r)==='VERIFIED')
 const paidOrders=orders.filter(r=>['PAID','PROCESSING','DELIVERED'].includes(orderStatus(r)))
 const pendingOrders=orders.filter(r=>orderStatus(r)==='PENDING_PAYMENT')
 const delivered=vouchers.filter(r=>orderStatus(r)==='DELIVERED')
 const available=stock.filter(r=>upper(r.Status)==='AVAILABLE')
 const reserved=stock.filter(r=>upper(r.Status)==='RESERVED')
 const creditRows=cashback.filter(r=>['CREDIT','CREDITED'].includes(upper(r.Type||r.TransactionType)))
 const pendingPayouts=payouts.filter(r=>upper(r.Status)==='PENDING')
 const activeUsers=users.filter(r=>upper(r.Role)!=='ADMIN'&&upper(r.Status)!=='REMOVED')
 const discountRows=products.map(r=>num(r.DiscountPercent)).filter(x=>x>0)
 const avgDiscount=discountRows.length?discountRows.reduce((a,b)=>a+b,0)/discountRows.length:0
 const sales=verifiedPayments.length?sum(verifiedPayments,['Amount']):Number(d?.metrics?.revenue||0)
 const cashbackValue=sum(creditRows,['Amount','CashbackAmount','Value'])
 const walletValue=sum(wallets,['Balance','AvailableBalance','CashbackBalance'])
 const payoutValue=sum(pendingPayouts,['Amount','RequestedAmount','RedeemedAmount'])
 const orderValue=sum(orders,['Total','Amount','OrderValue'])
 const avgOrder=paidOrders.length?(sales/paidOrders.length):0
 const errorCount=count(audit,r=>['ERROR','FAILED'].includes(upper(r.Status||r.Result)))
 const openWork=Number(d?.metrics?.pendingOrders||pendingOrders.length)+count(vouchers,r=>['PENDING','PROCESSING'].includes(orderStatus(r)))+pendingPayouts.length
 const root=document.createElement('section');root.className='tc-admin-page tc-command-dashboard'
 root.innerHTML=`
  <div class="tc-dash-top">
   <div><small>COMMAND CENTER</small><h2>Management dashboard</h2><p>Sales, cash flow, cashback, customers and operations in one view.</p></div>
   <div class="tc-dash-top-actions"><button data-refresh>↻ Refresh</button><button data-work>Open Work Queue <b>${openWork}</b></button></div>
  </div>
  <div class="tc-dash-kpi-grid"></div>
  <div class="tc-dash-section">${sectionTitle('QUICK ACTIONS','One click to the operational screens')}</div>
  <div class="tc-dash-actions"></div>
  <div class="tc-dash-lower">
   <div class="tc-dash-panel"><div class="tc-dash-panel-head"><div><small>SALES & CASH FLOW</small><h3>Financial snapshot</h3></div><button data-sales>View payments ↗</button></div><div class="tc-dash-finance"></div></div>
   <div class="tc-dash-panel"><div class="tc-dash-panel-head"><div><small>OPERATIONS</small><h3>Today’s control points</h3></div><button data-ops>Open work ↗</button></div><div class="tc-dash-ops"></div></div>
  </div>
  <div class="tc-dash-panel tc-dash-bottom"><div class="tc-dash-panel-head"><div><small>MANAGEMENT CONTROL</small><h3>System coverage</h3></div><button data-all>All data ↗</button></div><div class="tc-dash-system"></div></div>`
 const kpis=root.querySelector('.tc-dash-kpi-grid')
 ;[
  ['Verified Sales',MONEY(sales),`${verifiedPayments.length} verified payments`,'Payments','money','₹'],
  ['Orders',orders.length,`${paidOrders.length} paid / fulfilled`,'Orders','neutral','▣'],
  ['Avg Order',MONEY(avgOrder),'Verified sales ÷ paid orders','Orders','info','◌'],
  ['Cashback Credited',MONEY(cashbackValue),`${creditRows.length} credit entries`,'Cashback History','money','↗'],
  ['Avg Cashback',`${avgDiscount.toFixed(2)}%`,'Current product discount rate','Products','good','%'],
  ['Customers',activeUsers.length,`${count(users,r=>upper(r.Status)==='ACTIVE')} active accounts`,'Shoppers','info','◉'],
  ['Vouchers Delivered',delivered.length,`${vouchers.length} voucher records`,'Vouchers','good','✓'],
  ['Payment Links Ready',available.length,`${MONEY(sum(available,['Denomination']))} stock value`,'Link Stock','good','↗'],
  ['Links Reserved',reserved.length,`${MONEY(sum(reserved,['Denomination']))} reserved`,'Link Stock','warn','◷'],
  ['Pending Payments',pendingOrders.length,'Orders awaiting payment','Orders','warn','!'],
  ['Cashback Wallet',MONEY(walletValue),'Current customer wallet value','Cashback Wallet','money','₹'],
  ['Pending Payouts',MONEY(payoutValue),`${pendingPayouts.length} requests`,'Cashback Payouts','warn','◷']
 ].forEach(x=>kpis.appendChild(card(...x)))
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
 ].forEach(x=>actions.appendChild(action(...x)))
 const finance=root.querySelector('.tc-dash-finance')
 finance.innerHTML=`<div><small>VERIFIED SALES</small><strong>${MONEY(sales)}</strong><span>${verifiedPayments.length} verified payment records</span></div><div><small>ORDER VALUE</small><strong>${MONEY(orderValue)}</strong><span>${orders.length} loaded order records</span></div><div><small>CASHBACK / DISCOUNT</small><strong>${MONEY(cashbackValue)}</strong><span>Average product cashback ${avgDiscount.toFixed(2)}%</span></div><div><small>NET AFTER CASHBACK</small><strong>${MONEY(Math.max(0,sales-cashbackValue))}</strong><span>Management view of collected sales</span></div>`
 const ops=root.querySelector('.tc-dash-ops')
 ops.innerHTML=`<button data-go="Orders"><span class="ok">${pendingOrders.length}</span><div><b>Payment pending</b><small>Orders waiting for customer payment</small></div><i>›</i></button><button data-go="Vouchers"><span class="good">${delivered.length}</span><div><b>Voucher delivered</b><small>Completed voucher fulfilment records</small></div><i>›</i></button><button data-go="Link Stock"><span class="warn">${available.length}</span><div><b>Links available</b><small>Ready for new orders</small></div><i>›</i></button><button data-go="Cashback Payouts"><span class="warn">${pendingPayouts.length}</span><div><b>Payouts pending</b><small>Wallet redemptions awaiting action</small></div><i>›</i></button><button data-go="Web Activity"><span class="${errorCount?'danger':'ok'}">${errorCount}</span><div><b>Activity errors</b><small>${errorCount?'Investigate audit errors':'No recorded audit errors in loaded activity'}</small></div><i>›</i></button>`
 ops.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go))
 const system=root.querySelector('.tc-dash-system')
 system.innerHTML=`<button data-go="Products"><b>${products.length}</b><span>Products</span><small>Catalog</small></button><button data-go="Brands"><b>${brands.length}</b><span>Brands</span><small>Configured</small></button><button data-go="Shoppers"><b>${activeUsers.length}</b><span>Customers</span><small>Active shoppers</small></button><button data-go="Link Stock"><b>${stock.length}</b><span>Payment links</span><small>Stocked</small></button><button data-go="Cashback Wallet"><b>${wallets.length}</b><span>Wallets</span><small>Customer wallets</small></button><button data-go="Cashback History"><b>${cashback.length}</b><span>Cashback ledger</span><small>Transactions</small></button>`
 system.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go))
 root.querySelector('[data-work]').onclick=()=>go('Work Queue')
 root.querySelector('[data-sales]').onclick=()=>go('Payments')
 root.querySelector('[data-ops]').onclick=()=>go('Work Queue')
 root.querySelector('[data-all]').onclick=()=>go('All Data')
 root.querySelector('[data-refresh]').onclick=()=>{const b=[...document.querySelectorAll('.tc-admin-nav button')].find(x=>x.textContent.toLowerCase().includes('command center'));if(b)b.click()}
 return root
}

function refreshSummary(){
 const main=document.querySelector('.tc-admin-main');if(!main)return
 const page=[...main.querySelectorAll('.tc-admin-page')].find(x=>x.querySelector('.tc-table-wrap'));if(!page)return
 const table=page.querySelector('.tc-table-wrap table');if(!table)return
 const heading=main.querySelector('.tc-admin-header h1')?.textContent||''
 const rows=[...table.querySelectorAll('tbody tr')].map(tr=>{const heads=[...table.querySelectorAll('thead th')].map(x=>clean(x.textContent));const cells=[...tr.querySelectorAll('td')];const r={};heads.forEach((h,i)=>{if(h&&h!=='Action')r[h]=clean(cells[i]?.textContent)});return r})
 const key=heading+rows.length
 if(page.dataset.summaryKey===key)return
 page.dataset.summaryKey=key
 page.querySelector('.tc-live-summary-grid')?.remove()
 const grid=document.createElement('div');grid.className='tc-live-summary-grid'
 const t=upper(heading),status=r=>upper(r.Status)
 const make=(label,value,sub,tone='neutral',icon='•')=>{const el=document.createElement('div');el.className=`tc-live-summary-card ${tone}`;el.innerHTML=`<span class="tc-live-summary-icon">${icon}</span><div><small>${label}</small><strong>${value}</strong><em>${sub||''}</em></div>`;return el}
 if(t==='ORDERS'){const paid=count(rows,r=>['PAID','PROCESSING','DELIVERED'].includes(status(r)));[make('Total Orders',rows.length,'Loaded records'),make('Paid Orders',paid,'Verified / fulfilled','good','✓'),make('Pending Payment',count(rows,r=>status(r)==='PENDING_PAYMENT'),'Needs attention','warn','◷'),make('Delivered',count(rows,r=>status(r)==='DELIVERED'),'Voucher completed','info','✓'),make('Order Value',MONEY(sum(rows,['Total','Amount','OrderValue'])),'Loaded value','money','₹')].forEach(x=>grid.appendChild(x))}
 else if(t==='PAYMENTS'){const verified=rows.filter(r=>status(r)==='VERIFIED');[make('Total Collected',MONEY(sum(verified,['Amount'])),'Verified payments','money','₹'),make('Verified',verified.length,'Cleared','good','✓'),make('Pending',count(rows,r=>['PENDING','INITIATED','PROCESSING'].includes(status(r))),'Awaiting verification','warn','◷'),make('Failed / Rejected',count(rows,r=>['FAILED','REJECTED','CANCELLED'].includes(status(r))),'Review required','danger','!'),make('Payment Records',rows.length,'Loaded records')].forEach(x=>grid.appendChild(x))}
 else if(t==='PAYMENT LINK STOCK'||t==='LINK STOCK'){const a=rows.filter(r=>status(r)==='AVAILABLE'),r=rows.filter(x=>status(x)==='RESERVED'),u=rows.filter(x=>status(x)==='USED');[make('Available',a.length,`${MONEY(sum(a,['Denomination']))} value`,'good','↗'),make('Reserved',r.length,`${MONEY(sum(r,['Denomination']))} value`,'warn','◷'),make('Used',u.length,'Consumed links','info','✓'),make('Total Stock',rows.length,'All records')].forEach(x=>grid.appendChild(x))}
 else if(t==='SHOPPERS'){const s=rows.filter(r=>upper(r.Role)!=='ADMIN');[make('Shoppers',s.length,'Customer accounts'),make('Active',count(s,r=>upper(r.Status)==='ACTIVE'),'Can shop','good','✓'),make('Removed / Blocked',count(s,r=>['REMOVED','BLOCKED','DISABLED'].includes(upper(r.Status))),'Needs attention','danger','!')].forEach(x=>grid.appendChild(x))}
 else if(t==='PRODUCTS'){const d=rows.map(r=>num(r.DiscountPercent)).filter(x=>x>0),avg=d.length?d.reduce((a,b)=>a+b,0)/d.length:0;[make('Products',rows.length,'Catalog records'),make('Active',count(rows,r=>['TRUE','YES','ACTIVE'].includes(upper(r.Active||r.Status))),'Available','good','✓'),make('Brands',new Set(rows.map(r=>clean(r.BrandID)).filter(Boolean)).size,'Unique brand IDs','info','◆'),make('Avg Cashback',`${avg.toFixed(2)}%`,'Current product discounts','money','%')].forEach(x=>grid.appendChild(x))}
 else if(t==='VOUCHERS'){[make('Vouchers',rows.length,'Voucher records'),make('Delivered',count(rows,r=>status(r)==='DELIVERED'),'Issued','good','✓'),make('Pending',count(rows,r=>['PENDING','PROCESSING'].includes(status(r))),'Awaiting completion','warn','◷'),make('Failed / Cancelled',count(rows,r=>['FAILED','CANCELLED','REJECTED'].includes(status(r))),'Review','danger','!')].forEach(x=>grid.appendChild(x))}
 else [make('Total Records',rows.length,'Loaded records')].forEach(x=>grid.appendChild(x))
 const tableWrap=page.querySelector('.tc-table-wrap');tableWrap.parentNode.insertBefore(grid,tableWrap)
}

let dashboardPromise=null
async function refreshDashboard(){
 const main=document.querySelector('.tc-admin-main');if(!main)return
 const page=[...main.querySelectorAll('.tc-admin-page')].find(x=>x.querySelector('h2')?.textContent==='Operations at a glance.')
 if(!page||page.querySelector('.tc-command-dashboard'))return
 const token=localStorage.getItem('tc_erp_session');if(!token)return
 try{
  dashboardPromise=dashboardPromise||api.adminDashboard(token)
  const data=await dashboardPromise
  if(!document.body.contains(page))return
  const enhanced=buildDashboard(data)
  page.replaceWith(enhanced)
 }catch(e){dashboardPromise=null;console.warn('Dashboard enhancement:',e.message)}
}

export default function AdminSummaryEnhancer(){
 useEffect(()=>{
  let timer
  const run=()=>{clearTimeout(timer);timer=setTimeout(()=>{refreshDashboard();refreshSummary()},100)}
  const observer=new MutationObserver(run)
  observer.observe(document.body,{subtree:true,childList:true,characterData:true})
  run()
  return()=>{clearTimeout(timer);observer.disconnect();document.querySelectorAll('.tc-live-summary-grid,.tc-command-dashboard').forEach(x=>x.remove())}
 },[])
 return null
}
