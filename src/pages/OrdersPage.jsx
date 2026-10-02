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

function OrderDetails({ order, detail, detailsLoading, paymentPending, isCancelled, ready, invoiceLoading, cancelLoading, downloadInvoice, setPay, onCancel, onCheckPayment, paymentCheckLoading, paymentNotice, onRetryPayment, retryPaymentLoading }) {
  if (detailsLoading === order.OrderID && !detail) {
    return <div className="empty-panel"><PackageCheck size={24}/><h3>Refreshing order…</h3><p>Checking the latest order and payment status.</p></div>
  }
  if (!detail) return null

  const detailedOrder = detail.order || order
  const items = detail.items || []
  const paymentStatus = String(detail.payment?.Status || detailedOrder.PaymentStatus || 'PENDING').toUpperCase()
  const status = String(detailedOrder.Status || '').toUpperCase()
  const failedPayment = paymentStatus === 'NOT_RECEIVED'
  const canCancel = !isCancelled && status === 'PENDING_PAYMENT' && !['PAID','VERIFIED','SUCCESS','CAPTURED'].includes(paymentStatus)

  return (
    <div className="order-detail-content">
      <div className="detail-head">
        <div><span className="eyebrow">ORDER</span><h3>{detailedOrder.OrderNumber}</h3><small className="detail-live-label">Latest status checked just now</small></div>
        <div className="order-detail-actions">
          {paymentPending && !failedPayment && <button className="make-payment-btn" onClick={() => setPay(order)}><Link2 size={15}/> Make payment</button>}
          {failedPayment && !isCancelled && <button className="retry-payment-btn" onClick={() => onRetryPayment(order)}><Link2 size={15}/> Retry payment</button>}
          {paymentPending && <button className="check-payment-btn" onClick={() => onCheckPayment(order)} disabled={paymentCheckLoading === order.OrderID}><PackageCheck size={15}/> {paymentCheckLoading === order.OrderID ? 'Checking…' : 'Check payment status'}</button>}
          {canCancel && <button className="cancel-order-mini" onClick={() => onCancel(order)} disabled={cancelLoading === order.OrderID}><X size={14}/> {cancelLoading === order.OrderID ? 'Cancelling…' : 'Cancel'}</button>}
          {ready && <button className="invoice-download-btn" disabled={invoiceLoading === order.OrderID} onClick={() => downloadInvoice(detailedOrder)}><Download size={15}/> {invoiceLoading === order.OrderID ? 'Preparing…' : 'Download PDF'}</button>}
        </div>
      </div>
      {paymentNotice && paymentNotice.orderId === order.OrderID && <div className={'payment-action-notice ' + (paymentNotice.type || '')}><PackageCheck size={16}/><span>{paymentNotice.message}</span></div>}
      <div className="detail-grid">
        <div><span>Status</span><b>{isCancelled ? 'Cancelled' : failedPayment ? 'Failed Payment' : status.replaceAll('_', ' ')}</b></div>
        <div><span>Payment</span><b>{failedPayment ? 'Failed Payment' : paymentStatus.replaceAll('_', ' ')}</b></div>
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
      {failedPayment && !isCancelled && (
        <div className="orders-failed-payment-panel">
          <div className="orders-failed-payment-copy">
            <span>PAYMENT FAILED</span>
            <strong>Payment was not received</strong>
            <p>The previous payment attempt was marked as not received. The payment link has been returned to available stock and can be reused.</p>
          </div>
          <button className="retry-payment-btn orders-failed-retry" onClick={() => onRetryPayment(order)}>
            <Link2 size={15}/>Retry payment
          </button>
        </div>
      )}
      {detail.paymentLink?.Link && status === 'PENDING_PAYMENT' && !failedPayment && (
        <div className="saved-payment-link">
          <div><span>PAYMENT LINK</span><b>{detail.paymentLink.Label || 'Secure payment'}</b></div>
          <button type="button" onClick={() => setPay({...order, items})}>Make payment <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }}/></button>
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

export default function OrdersPage({ orders, loading = false, onBack, onShop, onHome, logoUrl }) {
  const [open, setOpen] = useState(null), [details, setDetails] = useState({}), [detailsLoading, setDetailsLoading] = useState(''), [pay, setPay] = useState(null), [invoiceLoading, setInvoiceLoading] = useState(''), [invoiceError, setInvoiceError] = useState(''), [cancelLoading, setCancelLoading] = useState(''), [cancelTarget, setCancelTarget] = useState(null), [cancelled, setCancelled] = useState(() => new Set()), [showOlder, setShowOlder] = useState(false), [olderLoading, setOlderLoading] = useState(false), [paymentCheckLoading, setPaymentCheckLoading] = useState(''), [paymentNotice, setPaymentNotice] = useState(null)

  const pending = order => !cancelled.has(order.OrderID) && ['PENDING','NOT_RECEIVED'].includes(String(order.PaymentStatus || 'PENDING').toUpperCase()) && !['PAID', 'DELIVERED', 'CANCELLED', 'REFUNDED'].includes(String(order.Status || '').toUpperCase())

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

  const loadOlderOrders = async olderOrders => {
    if (olderLoading || !olderOrders.length) {
      if (!olderOrders.length) setShowOlder(true)
      return
    }
    setOlderLoading(true)
    setInvoiceError('')
    try {
      const token = localStorage.getItem('tc_session')
      const results = await Promise.all(olderOrders.map(async order => {
        if (details[order.OrderID]) return [order.OrderID, details[order.OrderID]]
        try {
          const result = await api.orderDetails(token, order.OrderID)
          return [order.OrderID, result]
        } catch (error) {
          if (/API request failed \(404\)/i.test(String(error?.message || ''))) {
            return [order.OrderID, { order, payment: { Status: order.PaymentStatus || 'PENDING' }, items: [], legacyFallback: true }]
          }
          throw error
        }
      }))
      setDetails(previous => {
        const next = { ...previous }
        results.forEach(([id, result]) => { next[id] = result })
        return next
      })
      setShowOlder(true)
    } catch (error) {
      setInvoiceError(error.message || 'Could not load older order details.')
    } finally {
      setOlderLoading(false)
    }
  }

  const checkPayment = async order => {
    const id = order.OrderID
    setPaymentNotice(null)
    setPaymentCheckLoading(id)
    try {
      const token = localStorage.getItem('tc_session')
      const result = await api.orderDetails(token, id)
      setDetails(previous => ({...previous,[id]:result}))
      const status = String(result?.payment?.Status || result?.order?.PaymentStatus || 'PENDING').toUpperCase()
      const orderStatus = String(result?.order?.Status || '').toUpperCase()
      const paid = ['PAID','VERIFIED','SUCCESS','CAPTURED'].includes(status) || ['PAID','DELIVERED','COMPLETED'].includes(orderStatus)
      setPaymentNotice({orderId:id,type:paid?'success':'pending',message:paid ? 'Payment is confirmed. Your order status is updated.' : 'Payment is still pending verification. Trusted Circle will update the order automatically when payment is verified.'})
    } catch(error) {
      setPaymentNotice({orderId:id,type:'error',message:error.message || 'Could not check payment status.'})
    } finally {
      setPaymentCheckLoading('')
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
        const failedPayment = detailPaymentStatus === 'NOT_RECEIVED'
        const stateLabel = isCancelled ? 'Cancelled' : failedPayment ? 'Failed Payment' : paymentPending ? 'Payment Pending' : ready ? 'Delivered' : `Payment ${detailPaymentStatus.replaceAll('_',' ')}`
        const stateClass = isCancelled ? 'cancelled' : failedPayment ? 'failed-payment' : paymentPending ? 'pending' : ready ? 'delivered' : detailPaymentStatus === 'PAID' || detailPaymentStatus === 'VERIFIED' ? 'paid' : 'checking'
        return <article className={`order-card order-card-rich ${expanded ? 'expanded' : ''}`} key={order.OrderID}>
          <button className="order-main" onClick={() => viewOrder(order)}><div className="order-icon"><PackageCheck size={20}/></div><div className="order-copy"><span>{order.OrderNumber}</span><h3>{isCancelled ? 'Cancelled' : failedPayment ? 'Failed Payment' : String(displayOrder.Status || 'ORDER').replaceAll('_', ' ')}</h3><small>{order.CreatedAt ? new Date(order.CreatedAt).toLocaleString('en-IN') : ''}</small></div><div className="order-right"><strong>{money(order.Total)}</strong><span className={`payment-state ${stateClass}`}>{stateLabel}</span></div><ChevronDown size={17} className="order-chevron"/></button>
          {expanded && <div className="order-details"><OrderDetails order={order} detail={detail} detailsLoading={detailsLoading} paymentPending={paymentPending} isCancelled={isCancelled} ready={ready} invoiceLoading={invoiceLoading} cancelLoading={cancelLoading} downloadInvoice={downloadInvoice} setPay={setPay} onCancel={setCancelTarget} onCheckPayment={checkPayment} paymentCheckLoading={paymentCheckLoading} paymentNotice={paymentNotice} onRetryPayment={order => setPay({...order, items: details[order.OrderID]?.items || []})}/></div>}
        </article>
      })}</div>{olderOrders.length>0 && <div className="older-orders-action">
  {showOlder
    ? <button className="btn-quiet" onClick={()=>{setShowOlder(false);window.scrollTo({top:0,behavior:'smooth'})}}>Show recent 4 orders</button>
    : <button className="btn-quiet" onClick={()=>loadOlderOrders(olderOrders)} disabled={olderLoading}>
        {olderLoading ? 'Loading older orders…' : 'View Older Orders'} <ChevronDown size={16}/>
      </button>}
</div>}</>})() : <div className="empty-panel"><PackageCheck size={30}/><h3>No orders yet</h3><p>Your orders will appear here.</p><button className="btn-primary" onClick={onBack}>Browse vouchers</button></div>}
      <div className="orders-bottom-actions"><button className="btn-primary" onClick={onShop}><ShoppingBag size={16}/> Shop more</button><button className="btn-quiet" onClick={onHome}><Home size={16}/> Home</button></div>
    </div>

    {cancelTarget && <div className="cancel-confirm-backdrop" onClick={() => setCancelTarget(null)}><div className="cancel-confirm-modal" onClick={event => event.stopPropagation()}><div className="cancel-warning-icon"><AlertTriangle size={22}/></div><span className="eyebrow">CANCEL ORDER</span><h2>Cancel this order?</h2><p>This payment-pending order will be cancelled. You can create a new order later.</p><div className="cancel-confirm-actions"><button className="btn-quiet" onClick={() => setCancelTarget(null)}>Keep order</button><button className="cancel-confirm-btn" disabled={cancelLoading === cancelTarget.OrderID} onClick={() => cancel(cancelTarget)}>{cancelLoading === cancelTarget.OrderID ? 'Cancelling…' : 'Yes, cancel order'}</button></div></div></div>}

    {pay && <div className="order-pay-overlay" role="dialog" aria-modal="true">
  <div onClick={event => event.stopPropagation()}>
    <PaymentGateway mode="checkout" items={pay.items || []} total={pay.Total} cashback={pay.Discount} logoUrl={logoUrl} orderId={pay.OrderID} onBack={() => setPay(null)} onOrders={() => { setPay(null); viewOrder(pay) }} />
  </div>
</div>}
  </main>
}
