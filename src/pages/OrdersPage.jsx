import { useState } from 'react'
import { ChevronDown, Download, FileText, Link2, PackageCheck, X, AlertTriangle, ShoppingBag, Home } from 'lucide-react'
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

function OrderDetails({ order, detail, detailsLoading, paymentPending, isCancelled, ready, invoiceLoading, cancelLoading, downloadInvoice, setPay, onCancel, onCheckPayment, paymentCheckLoading, paymentDoneLoading, paymentNotice }) {
  if (detailsLoading === order.OrderID && !detail) {
    return <div className="empty-panel"><PackageCheck size={24}/><h3>Refreshing order…</h3><p>Checking the latest order and payment status.</p></div>
  }
  if (!detail) return null

  const detailedOrder = detail.order || order
  const items = detail.items || []
  const paymentStatus = String(detail.payment?.Status || detailedOrder.PaymentStatus || 'PENDING').toUpperCase()
  const status = String(detailedOrder.Status || '').toUpperCase()
  const canCancel = !isCancelled && status === 'PENDING_PAYMENT' && !['PAID','VERIFIED','SUCCESS','CAPTURED'].includes(paymentStatus)

  return (
    <div className="order-detail-content">
      <div className="detail-head">
        <div><span className="eyebrow">ORDER</span><h3>{detailedOrder.OrderNumber}</h3><small className="detail-live-label">Latest status checked just now</small></div>
        <div className="order-detail-actions">
          {paymentPending && <button className="make-payment-btn" onClick={() => setPay(order)}><Link2 size={15}/> Make payment</button>}
          {paymentPending && <button className="check-payment-btn" onClick={() => onCheckPayment(order)} disabled={paymentCheckLoading === order.OrderID}><PackageCheck size={15}/> {paymentCheckLoading === order.OrderID ? 'Checking…' : 'Check payment status'}</button>}
          {paymentPending && <button className="mark-payment-btn" onClick={() => onCheckPayment(order, true)} disabled={paymentDoneLoading === order.OrderID}><FileText size={15}/> {paymentDoneLoading === order.OrderID ? 'Sending…' : 'Mark payment done'}</button>
          {canCancel && <button className="cancel-order-mini" onClick={() => onCancel(order)} disabled={cancelLoading === order.OrderID}><X size={14}/> {cancelLoading === order.OrderID ? 'Cancelling…' : 'Cancel'}</button>}
          {ready && <button className="invoice-download-btn" disabled={invoiceLoading === order.OrderID} onClick={() => downloadInvoice(detailedOrder)}><Download size={15}/> {invoiceLoading === order.OrderID ? 'Preparing…' : 'Download PDF'}</button>}
        </div>
      </div>
      {paymentNotice && paymentNotice.orderId === order.OrderID && <div className={'payment-action-notice ' + (paymentNotice.type || '')}><PackageCheck size={16}/><span>{paymentNotice.message}</span></div>}
      <div className="detail-grid">
        <div><span>Status</span><b>{isCancelled ? 'Cancelled' : status.replaceAll('_', ' ')}</b></div>
        <div><span>Payment</span><b>{paymentStatus.replaceAll('_', ' ')}</b></div>
        <div><span>Items</span><b>{items.length}</b></div>
        <div><span>Subtotal</span><b>{money(detailedOrder.Subtotal)}</b></div>
        <div><span>Cashback</span><b>{money(detailedOrder.Discount)}</b></div>
        <div><span>Total</span><b>{money(detailedOrder.Total)}</b></div>
      </div>
      <div className="detail-items">
        <strong>Items</strong>
        {items.length ? items.map((item, index) => (
          <div className="detail-item" key={item.OrderItemID || index}>
            <span>{item.BrandName || item.Brand || 'Gift voucher'}</span>
            <span>{money(item.Denomination || item.FaceValue)}</span>
            <span>× {item.Quantity}</span>
            <b>{money(item.Total)}</b>
          </div>
        )) : <p>Item details will appear here.</p>}
      </div>
      {detail.paymentLink?.Link && status === 'PENDING_PAYMENT' && (
        <div className="saved-payment-link">
          <div><span>PAYMENT LINK</span><b>{detail.paymentLink.Label || 'Pay online'}</b></div>
          <a href={detail.paymentLink.Link} target="_blank" rel="noreferrer">Pay online <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }}/></a>
        </div>
      )}
      {ready && (
        <div className="invoice-ready-banner">
          <FileText size={19}/>
          <div><strong>Invoice ready</strong><span>Your PDF is ready.</span></div>
          <button onClick={() => downloadInvoice(detailedOrder)} disabled={invoiceLoading === order.OrderID}>{invoiceLoading === order.OrderID ? 'Preparing…' : 'Download PDF'}</button>
        </div>
      )}
    </div>
  )
}

export default function OrdersPage({ orders, loading = false, onBack, onShop, onHome }) {
  const [open, setOpen] = useState(null), [details, setDetails] = useState({}), [detailsLoading, setDetailsLoading] = useState(''), [pay, setPay] = useState(null), [invoiceLoading, setInvoiceLoading] = useState(''), [invoiceError, setInvoiceError] = useState(''), [cancelLoading, setCancelLoading] = useState(''), [cancelTarget, setCancelTarget] = useState(null), [cancelled, setCancelled] = useState(() => new Set()), [showOlder, setShowOlder] = useState(false), [paymentCheckLoading, setPaymentCheckLoading] = useState(''), [paymentDoneLoading, setPaymentDoneLoading] = useState(''), [paymentNotice, setPaymentNotice] = useState(null)

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

  const viewOrder = async order => {
    const id = order.OrderID
    setOpen(open === id ? null : id)
    if (open === id) return
    setDetailsLoading(id)
    setInvoiceError('')
    try {
      const result = await api.orderDetails(localStorage.getItem('tc_session'), id)
      setDetails(previous => ({ ...previous, [id]: result }))
    } catch (error) {
      // Older Apps Script deployments may not yet expose orderDetails.
      // Keep the order fully usable from the list instead of showing a blocking
      // 404 error. The summary already contains the latest order/payment state.
      if (/API request failed \(404\)/i.test(String(error?.message || ''))) {
        setDetails(previous => ({
          ...previous,
          [id]: {
            order,
            payment: { Status: order.PaymentStatus || 'PENDING' },
            items: [],
            legacyFallback: true
          }
        }))
      } else {
        setOpen(null)
        setInvoiceError(error.message || 'Could not load this order.')
      }
    } finally { setDetailsLoading('') }
  }

  const checkPayment = async (order, markDone = false) => {
    const id = order.OrderID
    setPaymentNotice(null)
    if (markDone) setPaymentDoneLoading(id)
    else setPaymentCheckLoading(id)
    try {
      const token = localStorage.getItem('tc_session')
      if (markDone) {
        const result = await api.paymentCheckRequested(token, id)
        setPaymentNotice({orderId:id,type:'success',message:result?.sent ? 'Payment confirmation sent to Trusted Circle admin. The admin will verify the payment and update your order.' : 'Payment confirmation has already been sent. Please wait for admin verification.'})
      } else {
        const result = await api.orderDetails(token, id)
        setDetails(previous => ({...previous,[id]:result}))
        const status = String(result?.payment?.Status || result?.order?.PaymentStatus || 'PENDING').toUpperCase()
        const orderStatus = String(result?.order?.Status || '').toUpperCase()
        const paid = ['PAID','VERIFIED','SUCCESS','CAPTURED'].includes(status) || ['PAID','DELIVERED','COMPLETED'].includes(orderStatus)
        setPaymentNotice({orderId:id,type:paid?'success':'pending',message:paid ? 'Payment is confirmed. Your order status is updated.' : 'Payment is still pending verification. If you have completed payment, use “Mark payment done” to notify the admin.'})
      }
    } catch(error) {
      setPaymentNotice({orderId:id,type:'error',message:error.message || (markDone ? 'Could not send payment confirmation.' : 'Could not check payment status.')})
    } finally {
      setPaymentCheckLoading('')
      setPaymentDoneLoading('')
    }
  }

  const cancel = async order => {
    setCancelLoading(order.OrderID)
    try {
      await api.cancelOrder(localStorage.getItem('tc_session'), order.OrderID)
      setCancelled(previous => new Set(previous).add(order.OrderID))
      setDetails(previous => {
        const current = previous[order.OrderID]
        return current ? {...previous,[order.OrderID]:{...current,order:{...current.order,Status:'CANCELLED'}}} : previous
      })
      setCancelTarget(null)
      setPay(null)
    } catch (error) { setInvoiceError(error.message || 'Could not cancel the order.') }
    finally { setCancelLoading('') }
  }

  return <main className="orders-page">
    <div className="page-shell">
      <div className="page-banner compact"><span className="eyebrow">MY ORDERS</span><h1>Your orders</h1><p>Open an order to view its latest status.</p></div>
      {invoiceError && <div className="invoice-error"><FileText size={16}/><span>{invoiceError}</span><button onClick={() => setInvoiceError('')}><X size={14}/></button></div>}
      {loading ? <div className="empty-panel"><PackageCheck size={30}/><h3>Loading your orders…</h3><p>Please wait.</p></div> : orders.length ? (() => { const orderedOrders=[...orders].sort((a,b)=>{const da=Date.parse(a.CreatedAt||'')||0;const db=Date.parse(b.CreatedAt||'')||0;return db-da}); const recentOrders=orderedOrders.slice(0,4); const olderOrders=orderedOrders.slice(4); const visibleOrders=showOlder?orderedOrders:recentOrders; return <><div className="orders-list">{visibleOrders.map(order => {
        const expanded = open === order.OrderID
        const detail = details[order.OrderID]
        const displayOrder = detail?.order || order
        const detailPaymentStatus = String(detail?.payment?.Status || displayOrder.PaymentStatus || order.PaymentStatus || 'PENDING').toUpperCase()
        const ready = invoiceReady({...displayOrder,PaymentStatus:detailPaymentStatus})
        const paymentPending = pending({...order,...displayOrder,PaymentStatus:detailPaymentStatus})
        const isCancelled = cancelled.has(order.OrderID) || String(displayOrder.Status || '').toUpperCase() === 'CANCELLED'
        const stateLabel = isCancelled ? 'Cancelled' : paymentPending ? 'Payment Pending' : ready ? 'Delivered' : `Payment ${detailPaymentStatus.replaceAll('_',' ')}`
        const stateClass = isCancelled ? 'cancelled' : paymentPending ? 'pending' : ready ? 'delivered' : detailPaymentStatus === 'PAID' || detailPaymentStatus === 'VERIFIED' ? 'paid' : 'checking'
        return <article className={`order-card order-card-rich ${expanded ? 'expanded' : ''}`} key={order.OrderID}>
          <button className="order-main" onClick={() => viewOrder(order)}><div className="order-icon"><PackageCheck size={20}/></div><div className="order-copy"><span>{order.OrderNumber}</span><h3>{isCancelled ? 'Cancelled' : String(displayOrder.Status || 'ORDER').replaceAll('_', ' ')}</h3><small>{order.CreatedAt ? new Date(order.CreatedAt).toLocaleString('en-IN') : ''}</small></div><div className="order-right"><strong>{money(order.Total)}</strong><span className={`payment-state ${stateClass}`}>{stateLabel}</span></div><ChevronDown size={17} className="order-chevron"/></button>
          {expanded && <div className="order-details"><OrderDetails order={order} detail={detail} detailsLoading={detailsLoading} paymentPending={paymentPending} isCancelled={isCancelled} ready={ready} invoiceLoading={invoiceLoading} cancelLoading={cancelLoading} downloadInvoice={downloadInvoice} setPay={setPay} onCancel={setCancelTarget} onCheckPayment={checkPayment} paymentCheckLoading={paymentCheckLoading} paymentDoneLoading={paymentDoneLoading} paymentNotice={paymentNotice}/></div>}
        </article>
      })}</div>{olderOrders.length>0 && <div className="older-orders-action">{showOlder ? <button className="btn-quiet" onClick={()=>{setShowOlder(false);window.scrollTo({top:0,behavior:'smooth'})}}>Show recent 4 orders</button> : <button className="btn-quiet" onClick={()=>setShowOlder(true)}>View Older orders <ChevronDown size={16}/></button>}</div>}</>})() : <div className="empty-panel"><PackageCheck size={30}/><h3>No orders yet</h3><p>Your orders will appear here.</p><button className="btn-primary" onClick={onBack}>Browse vouchers</button></div>}
      <div className="orders-bottom-actions"><button className="btn-primary" onClick={onShop}><ShoppingBag size={16}/> Shop more</button><button className="btn-quiet" onClick={onHome}><Home size={16}/> Home</button></div>
    </div>

    {cancelTarget && <div className="cancel-confirm-backdrop" onClick={() => setCancelTarget(null)}><div className="cancel-confirm-modal" onClick={event => event.stopPropagation()}><div className="cancel-warning-icon"><AlertTriangle size={22}/></div><span className="eyebrow">CANCEL ORDER</span><h2>Cancel this order?</h2><p>This payment-pending order will be cancelled. You can create a new order later.</p><div className="cancel-confirm-actions"><button className="btn-quiet" onClick={() => setCancelTarget(null)}>Keep order</button><button className="cancel-confirm-btn" disabled={cancelLoading === cancelTarget.OrderID} onClick={() => cancel(cancelTarget)}>{cancelLoading === cancelTarget.OrderID ? 'Cancelling…' : 'Yes, cancel order'}</button></div></div></div>}

    {pay && <div className="order-pay-overlay" onClick={() => setPay(null)}><div className="order-pay-modal" onClick={event => event.stopPropagation()}><PaymentGateway mode="order" total={pay.Total} cashback={pay.Discount} orderId={pay.OrderID} qrUrl="https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/UPIQR.jpg" onBack={() => setPay(null)} /></div></div>}
  </main>
}
