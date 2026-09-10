import { useState } from 'react'
import { ChevronDown, Download, FileText, Link2, PackageCheck, X } from 'lucide-react'
import { api } from '../api'
import PaymentGateway from '../components/PaymentGateway'
import './orders-page.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const invoiceReady = order => String(order.Status || '').toUpperCase() === 'DELIVERED' && ['VERIFIED', 'PAID'].includes(String(order.PaymentStatus || '').toUpperCase())

function downloadBase64Pdf(base64, fileName) {
  const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName || 'Trusted-Circle-Invoice.pdf'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function OrdersPage({ orders, onBack }) {
  const [open, setOpen] = useState(null), [pay, setPay] = useState(null), [invoiceLoading, setInvoiceLoading] = useState(''), [invoiceError, setInvoiceError] = useState(''), [cancelLoading, setCancelLoading] = useState(''), [cancelled, setCancelled] = useState(() => new Set())
  const pending = order => !cancelled.has(order.OrderID) && String(order.PaymentStatus || 'PENDING').toUpperCase() === 'PENDING' && !['PAID', 'DELIVERED', 'CANCELLED', 'REFUNDED'].includes(String(order.Status || '').toUpperCase())

  const downloadInvoice = async order => {
    setInvoiceError('')
    setInvoiceLoading(order.OrderID)
    try {
      const result = await api.createInvoicePdf(localStorage.getItem('tc_session'), order.OrderID)
      if (!result?.base64) throw new Error('Invoice not available.')
      downloadBase64Pdf(result.base64, result.fileName)
    } catch (error) {
      setInvoiceError(error.message || 'Could not download invoice.')
    } finally { setInvoiceLoading('') }
  }

  const cancel = async order => {
    if (!window.confirm('Cancel this order?')) return
    setCancelLoading(order.OrderID)
    try {
      await api.cancelOrder(localStorage.getItem('tc_session'), order.OrderID)
      setCancelled(previous => new Set(previous).add(order.OrderID))
      setPay(null)
    } catch (error) { setInvoiceError(error.message || 'Could not cancel the order.') }
    finally { setCancelLoading('') }
  }

  return <main className="orders-page">
    <div className="page-shell">
      <div className="page-banner compact"><span className="eyebrow">MY ORDERS</span><h1>Your orders</h1><p>See your orders and payment status.</p></div>
      {invoiceError && <div className="invoice-error"><FileText size={16}/><span>{invoiceError}</span><button onClick={() => setInvoiceError('')}><X size={14}/></button></div>}
      {orders.length ? <div className="orders-list">{orders.map(order => {
        const expanded = open === order.OrderID, items = order.Items || [], ready = invoiceReady(order), paymentPending = pending(order), isCancelled = cancelled.has(order.OrderID) || String(order.Status || '').toUpperCase() === 'CANCELLED'
        const stateLabel = isCancelled ? 'Cancelled' : paymentPending ? 'Payment Pending' : ready ? 'Delivered' : `Payment ${String(order.PaymentStatus || 'PAID')}`
        const stateClass = isCancelled ? 'cancelled' : paymentPending ? 'pending' : ready ? 'delivered' : 'paid'
        return <article className={`order-card order-card-rich ${expanded ? 'expanded' : ''}`} key={order.OrderID}>
          <button className="order-main" onClick={() => setOpen(expanded ? null : order.OrderID)}><div className="order-icon"><PackageCheck size={20}/></div><div className="order-copy"><span>{order.OrderNumber}</span><h3>{isCancelled ? 'Cancelled' : String(order.Status || 'ORDER').replaceAll('_', ' ')}</h3><small>{order.CreatedAt ? new Date(order.CreatedAt).toLocaleString('en-IN') : ''}</small></div><div className="order-right"><strong>{money(order.Total)}</strong><span className={`payment-state ${stateClass}`}>{stateLabel}</span></div><ChevronDown size={17} className="order-chevron"/></button>
          {expanded && <div className="order-details">
            <div className="detail-head"><div><span className="eyebrow">ORDER</span><h3>{order.OrderNumber}</h3></div><div className="order-detail-actions">{paymentPending && <button className="make-payment-btn" onClick={() => setPay(order)}><Link2 size={15}/> Make payment</button>}{paymentPending && <button className="cancel-order-btn" disabled={cancelLoading === order.OrderID} onClick={() => cancel(order)}><X size={15}/> {cancelLoading === order.OrderID ? 'Cancelling…' : 'Cancel order'}</button>}{ready && <button className="invoice-download-btn" disabled={invoiceLoading === order.OrderID} onClick={() => downloadInvoice(order)}><Download size={15}/> {invoiceLoading === order.OrderID ? 'Preparing…' : 'Download PDF'}</button>}</div></div>
            <div className="detail-grid"><div><span>Status</span><b>{isCancelled ? 'Cancelled' : String(order.Status || '').replaceAll('_', ' ')}</b></div><div><span>Payment</span><b>{String(order.PaymentStatus || 'PENDING').replaceAll('_', ' ')}</b></div><div><span>Items</span><b>{items.length}</b></div><div><span>Subtotal</span><b>{money(order.Subtotal)}</b></div><div><span>Cashback</span><b>{money(order.Discount)}</b></div><div><span>Total</span><b>{money(order.Total)}</b></div></div>
            <div className="detail-items"><strong>Items</strong>{items.length ? items.map((item, index) => <div className="detail-item" key={item.OrderItemID || index}><span>{item.BrandName || item.Brand || 'Gift voucher'}</span><span>{money(item.Denomination || item.FaceValue)}</span><span>× {item.Quantity}</span><b>{money(item.Total)}</b></div>) : <p>Item details will appear here.</p>}</div>
            {order.PaymentLink?.Link && <div className="saved-payment-link"><div><span>PAYMENT LINK</span><b>{order.PaymentLink.Label || 'Pay online'}</b></div><a href={order.PaymentLink.Link} target="_blank" rel="noreferrer">Pay online <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }}/></a></div>}
            {ready && <div className="invoice-ready-banner"><FileText size={19}/><div><strong>Invoice ready</strong><span>Your PDF is ready.</span></div><button onClick={() => downloadInvoice(order)} disabled={invoiceLoading === order.OrderID}>{invoiceLoading === order.OrderID ? 'Preparing…' : 'Download PDF'}</button></div>}
          </div>}
        </article>
      })}</div> : <div className="empty-panel"><PackageCheck size={30}/><h3>No orders yet</h3><p>Your orders will appear here.</p><button className="btn-primary" onClick={onBack}>Browse vouchers</button></div>}
    </div>

    {pay && <div className="order-pay-overlay" onClick={() => setPay(null)}><div className="order-pay-modal" onClick={event => event.stopPropagation()}><PaymentGateway mode="order" total={pay.Total} cashback={pay.Discount} orderId={pay.OrderID} qrUrl="https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/UPIQR.jpg" onBack={() => setPay(null)} /></div></div>}
  </main>
}
