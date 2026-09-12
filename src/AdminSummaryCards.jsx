import {Activity,CheckCircle2,CircleDollarSign,Clock3,PackageCheck,Users,WalletCards,Link2,ShoppingBag,Store,Boxes,AlertTriangle} from 'lucide-react'

const n=v=>Number(v||0)
const money=v=>`₹${n(v).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const text=v=>String(v??'').toUpperCase()
const count=(rows,p)=>rows.filter(p).length
const sum=(rows,fields)=>rows.reduce((s,r)=>{for(const f of fields){if(r[f]!==undefined&&r[f]!==''&&!Number.isNaN(Number(r[f])))return s+n(r[f])}return s},0)
const status=(rows,value)=>count(rows,r=>text(r.Status)===value)

function card(icon,label,value,tone='neutral',sub=''){
 return {icon,label,value,tone,sub}
}

export default function AdminSummaryCards({sheet,rows=[]}){
 const r=Array.isArray(rows)?rows:[]
 let cards=[]
 if(sheet==='PaymentLinkStock'){
  const available=status(r,'AVAILABLE'),reserved=status(r,'RESERVED'),used=status(r,'USED')
  cards=[
   card(Link2,'Available Stock',available,'good',`${money(sum(r.filter(x=>text(x.Status)==='AVAILABLE'),['Denomination']))} value`),
   card(CircleDollarSign,'Available Value',money(sum(r.filter(x=>text(x.Status)==='AVAILABLE'),['Denomination'])),'money','Ready for customer orders'),
   card(Clock3,'Reserved',reserved,'warn',`${money(sum(r.filter(x=>text(x.Status)==='RESERVED'),['Denomination']))} reserved value`),
   card(CheckCircle2,'Used / Collected',used,'info',`${money(sum(r.filter(x=>text(x.Status)==='USED'),['Denomination']))} face value`),
   card(Boxes,'Total Stock',r.length,'neutral','All stocked payment links')
  ]
 }else if(sheet==='PaymentLinks'){
  cards=[
   card(Link2,'Total Links',r.length,'neutral','Assigned payment links'),
   card(CheckCircle2,'Used',status(r,'USED'),'good','Successfully consumed'),
   card(Clock3,'Pending / Active',count(r,x=>!['USED','EXPIRED','CANCELLED'].includes(text(x.Status))),'warn','Currently in circulation'),
   card(CircleDollarSign,'Link Face Value',money(sum(r,['Amount','Denomination','FaceValue'])),'money','Across available records')
  ]
 }else if(sheet==='Orders'){
  const paid=count(r,x=>['PAID','PROCESSING','DELIVERED'].includes(text(x.Status)))
  const pending=status(r,'PENDING_PAYMENT')
  const delivered=status(r,'DELIVERED')
  cards=[
   card(ShoppingBag,'Total Orders',r.length,'neutral','Latest records loaded'),
   card(CheckCircle2,'Paid Orders',paid,'good','Payment verified / fulfilled'),
   card(Clock3,'Pending Payment',pending,'warn','Needs payment attention'),
   card(PackageCheck,'Delivered',delivered,'info','Voucher delivery completed'),
   card(CircleDollarSign,'Collected',money(sum(r,['Total','Amount','OrderValue'])),'money','Order value in loaded records')
  ]
 }else if(sheet==='Payments'){
  const verified=status(r,'VERIFIED')
  cards=[
   card(CircleDollarSign,'Total Collected',money(sum(r.filter(x=>text(x.Status)==='VERIFIED'),['Amount'])),'money','Verified payments only'),
   card(CheckCircle2,'Verified',verified,'good','Payment records cleared'),
   card(Clock3,'Pending',count(r,x=>['PENDING','INITIATED','PROCESSING'].includes(text(x.Status))),'warn','Awaiting verification'),
   card(AlertTriangle,'Failed / Rejected',count(r,x=>['FAILED','REJECTED','CANCELLED'].includes(text(x.Status))),'danger','Requires review'),
   card(Activity,'Payment Records',r.length,'neutral','All loaded payment records')
  ]
 }else if(sheet==='Users'){
  cards=[
   card(Users,'Shoppers',count(r,x=>text(x.Role)!=='ADMIN'),'neutral','Customer accounts'),
   card(CheckCircle2,'Active',count(r,x=>text(x.Status)==='ACTIVE'&&text(x.Role)!=='ADMIN'),'good','Accounts able to shop'),
   card(AlertTriangle,'Removed / Blocked',count(r,x=>['REMOVED','BLOCKED','DISABLED'].includes(text(x.Status))),'danger','Accounts requiring attention'),
   card(Activity,'Admin Accounts',count(r,x=>text(x.Role)==='ADMIN'),'info','Operations access')
  ]
 }else if(sheet==='Products'){
  const active=count(r,x=>text(x.Active)==='TRUE'||text(x.Active)==='YES'||text(x.Status)==='ACTIVE')
  const discounts=r.map(x=>n(x.DiscountPercent)).filter(x=>x>0)
  const avg=discounts.length?discounts.reduce((a,b)=>a+b,0)/discounts.length:0
  cards=[
   card(PackageCheck,'Products',r.length,'neutral','Catalog records'),
   card(CheckCircle2,'Active',active,'good','Available for sale'),
   card(Store,'Brands Covered',new Set(r.map(x=>String(x.BrandID||'')).filter(Boolean)).size,'info','Unique brand IDs'),
   card(CircleDollarSign,'Avg Cashback',`${avg.toFixed(2)}%`,'money','Across products with cashback')
  ]
 }else if(sheet==='Brands'){
  const active=count(r,x=>text(x.Active)==='TRUE'||text(x.Active)==='YES'||text(x.Status)==='ACTIVE')
  cards=[
   card(Store,'Total Brands',r.length,'neutral','Configured brands'),
   card(CheckCircle2,'Active Brands',active,'good','Visible in shopping'),
   card(AlertTriangle,'Inactive Brands',Math.max(0,r.length-active),'warn','Not currently active')
  ]
 }else if(sheet==='Vouchers'){
  cards=[
   card(PackageCheck,'Total Vouchers',r.length,'neutral','Voucher records'),
   card(CheckCircle2,'Delivered',status(r,'DELIVERED'),'good','Successfully issued'),
   card(Clock3,'Pending',count(r,x=>['PENDING','PROCESSING'].includes(text(x.Status))),'warn','Awaiting completion'),
   card(AlertTriangle,'Cancelled / Failed',count(r,x=>['CANCELLED','FAILED','REJECTED'].includes(text(x.Status))),'danger','Requires review')
  ]
 }else if(sheet==='WalletRedemptions'){
  cards=[
   card(WalletCards,'Payout Requests',r.length,'neutral','Wallet redemption records'),
   card(Clock3,'Pending',status(r,'PENDING'),'warn','Needs payout processing'),
   card(CheckCircle2,'Completed',count(r,x=>['PAID','COMPLETED','SUCCESS'].includes(text(x.Status))),'good','Payouts completed'),
   card(CircleDollarSign,'Payout Value',money(sum(r,['Amount','RequestedAmount','RedeemedAmount'])),'money','Across loaded records')
  ]
 }else if(sheet==='CashbackWallet'){
  cards=[
   card(WalletCards,'Wallets',r.length,'neutral','Customer wallet records'),
   card(CircleDollarSign,'Total Balance',money(sum(r,['Balance','AvailableBalance','CashbackBalance'])),'money','Current wallet balances'),
   card(CheckCircle2,'Positive Balance',count(r,x=>n(x.Balance||x.AvailableBalance||x.CashbackBalance)>0),'good','Wallets holding cashback'),
   card(AlertTriangle,'Zero Balance',count(r,x=>n(x.Balance||x.AvailableBalance||x.CashbackBalance)<=0),'warn','No current cashback')
  ]
 }else if(sheet==='CashbackTransactions'){
  cards=[
   card(Activity,'Transactions',r.length,'neutral','Cashback ledger entries'),
   card(CircleDollarSign,'Total Value',money(sum(r,['Amount','CashbackAmount','Value'])),'money','Across loaded transactions'),
   card(CheckCircle2,'Credits',count(r,x=>['CREDIT','CREDITED'].includes(text(x.Type)||text(x.TransactionType))),'good','Cashback credited'),
   card(AlertTriangle,'Debits / Payouts',count(r,x=>['DEBIT','DEBITED','REDEEMED'].includes(text(x.Type)||text(x.TransactionType))),'warn','Cashback consumed')
  ]
 }else if(sheet==='Cart'){
  cards=[
   card(ShoppingBag,'Cart Lines',r.length,'neutral','Saved cart records'),
   card(Users,'Customers',new Set(r.map(x=>String(x.UserID||'')).filter(Boolean)).size,'info','Unique shoppers'),
   card(Boxes,'Total Quantity',sum(r,['Quantity']),'good','Voucher units in carts'),
   card(CircleDollarSign,'Cart Value',money(sum(r,['Total','Amount','Value'])),'money','Loaded cart value')
  ]
 }else if(sheet==='Notifications'){
  cards=[
   card(Activity,'Notifications',r.length,'neutral','All notifications'),
   card(Clock3,'Unread',count(r,x=>!String(x.ReadAt||'').trim()),'warn','Awaiting customer view'),
   card(CheckCircle2,'Read',count(r,x=>String(x.ReadAt||'').trim()),'good','Already viewed')
  ]
 }else if(sheet==='OTP'){
  cards=[
   card(Activity,'OTP Requests',r.length,'neutral','Authentication events'),
   card(CheckCircle2,'Successful',count(r,x=>['TRUE','YES','SUCCESS','VERIFIED'].includes(text(x.Success||x.Status))),'good','Verified OTP attempts'),
   card(AlertTriangle,'Failed',count(r,x=>['FALSE','NO','FAILED','REJECTED'].includes(text(x.Success||x.Status))),'danger','Unsuccessful attempts')
  ]
 }else if(sheet==='UserSessions'){
  cards=[
   card(Activity,'Sessions',r.length,'neutral','Session records'),
   card(CheckCircle2,'Active',count(r,x=>['ACTIVE','TRUE','YES'].includes(text(x.Status||x.Active))),'good','Currently active'),
   card(Clock3,'Expired / Revoked',count(r,x=>['EXPIRED','REVOKED','INACTIVE'].includes(text(x.Status))),'warn','No longer active')
  ]
 }else if(sheet==='AuditLogs'){
  cards=[
   card(Activity,'Total Activity',r.length,'neutral','Audit records loaded'),
   card(CheckCircle2,'Successful Actions',count(r,x=>!['ERROR','FAILED'].includes(text(x.Status||x.Result))),'good','Normal operations'),
   card(AlertTriangle,'Errors',count(r,x=>['ERROR','FAILED'].includes(text(x.Status||x.Result))),'danger','Requires investigation')
  ]
 }else{
  cards=[card(DatabaseIcon(sheet),'Total Records',r.length,'neutral','Loaded records')]
 }
 return <div className="tc-summary-grid">{cards.map((c,i)=>{const Icon=c.icon;return <div className={`tc-summary-card ${c.tone}`} key={`${c.label}-${i}`}><span className="tc-summary-icon"><Icon size={17}/></span><div className="tc-summary-copy"><small>{c.label}</small><strong>{c.value}</strong>{c.sub&&<em>{c.sub}</em>}</div></div>})}</div>
}
function DatabaseIcon(sheet){return sheet==='Brands'?Store:sheet==='Products'?PackageCheck:sheet==='Users'?Users:Activity}
