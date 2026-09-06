import { ArrowRight, PackageCheck } from 'lucide-react'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function OrdersPage({ orders, onBack }) {
  return <main className="page-shell"><div className="page-banner compact"><span className="eyebrow">MY ORDERS</span><h1>Your voucher orders.</h1><p>Every order is linked to your account and its current backend status.</p></div>{orders.length ? <div className="orders-list">{orders.map(o => <article className="order-card" key={o.OrderID}><div className="order-icon"><PackageCheck size={20}/></div><div className="order-copy"><span>{o.OrderNumber}</span><h3>{o.Status?.replaceAll('_', ' ') || 'ORDER'}</h3><small>{o.CreatedAt ? new Date(o.CreatedAt).toLocaleString('en-IN') : ''}</small></div><strong>{money(o.Total)}</strong><ArrowRight size={17}/></article>)}</div> : <div className="empty-panel"><PackageCheck size={30}/><h3>No orders yet</h3><p>Your completed checkout orders will appear here.</p><button className="btn-primary" onClick={onBack}>Browse vouchers</button></div>}</main>
}
