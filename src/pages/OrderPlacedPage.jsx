import { CheckCircle2, PackageCheck } from 'lucide-react'

export default function OrderPlacedPage({ order, onOrders, onShop }) {
  return <main className="page-shell order-placed-page"><section className="order-success"><div className="success-ring"><CheckCircle2 size={42}/></div><span className="eyebrow">ORDER CREATED</span><h1>Your order is ready for payment.</h1><p>This order has been created with <strong>PENDING PAYMENT</strong> status. It will become paid only after verified payment is received.</p>{order?.order && <div className="success-order"><div><small>ORDER NUMBER</small><strong>{order.order.OrderNumber}</strong></div><div><small>TOTAL</small><strong>₹{Number(order.order.Total || 0).toLocaleString('en-IN')}</strong></div></div>}<div className="success-actions"><button className="btn-primary" onClick={onOrders}><PackageCheck size={17}/> View orders</button><button className="btn-quiet" onClick={onShop}>Continue shopping</button></div></section></main>
}
