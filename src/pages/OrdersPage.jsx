import { useState } from 'react'
import { CheckCircle2, ChevronDown, Copy, Download, ExternalLink, FileText, PackageCheck, QrCode, Smartphone, X } from 'lucide-react'
import { api } from '../api'
import './orders-page.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const UPI_URI = 'upi://pay?pa=paytm.s2eunub@pty&pn=Paytm&tn=Verified Paytm Account'
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
  const [open, setOpen] = useState(null)
  const [pay, setPay] = useState(null)
  const [copied, setCopied] = useState(false)
  const [invoiceLoading, setInvoiceLoading] = useState('')
  const [invoiceError, setInvoiceError] = useState('')

  const pending = order => String(order.PaymentStatus || 'PENDING').toUpperCase() === 'PENDING' && !['PAID', 'DELIVERED', 'CANCELLED', 'REFUNDED'].includes(String(order.Status || '').toUpperCase())

  const copy = async text => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  const downloadInvoice = async order => {
    setInvoiceError('')
    setInvoiceLoading(order.OrderID)
    try {
      const token = localStorage.getItem('tc_session')
      const result = await api.createInvoicePdf(token, order.OrderID)
      if (!result?.base64) throw new Error('Invoice PDF was not returned.')
      downloadBase64Pdf(result.base64, result.fileName)
    } catch (error) {
      setInvoiceError(error.message || 'Unable to prepare invoice.')
    } finally {
      setInvoiceLoading('')
    }
  }

  return (
    <main className="orders-page">
      <div className="page-shell">
        <div className="page-banner compact">
          <span className="eyebrow">MY ORDERS</span>
          <h1>Your voucher orders.</h1>
          <p>Track payment, delivery and your completed-order invoices from one place.</p>
        </div>

        {invoiceError && (
          <div className="invoice-error">
            <FileText size={16} />
            <span>{invoiceError}</span>
            <button onClick={() => setInvoiceError('')}><X size={14} /></button>
          </div>
        )}

        {orders.length ? (
          <div className="orders-list">
            {orders.map(order => {
              const expanded = open === order.OrderID
              const items = order.Items || []
              const ready = invoiceReady(order)
              const paymentPending = pending(order)
              const stateLabel = paymentPending ? 'Payment Pending' : ready ? 'Completed & Delivered' : `Payment ${String(order.PaymentStatus || 'PAID')}`
              const stateClass = paymentPending ? 'pending' : ready ? 'delivered' : 'paid'

              return (
                <article className={`order-card order-card-rich ${expanded ? 'expanded' : ''}`} key={order.OrderID}>
                  <button className="order-main" onClick={() => setOpen(expanded ? null : order.OrderID)}>
                    <div className="order-icon"><PackageCheck size={20} /></div>
                    <div className="order-copy">
                      <span>{order.OrderNumber}</span>
                      <h3>{String(order.Status || 'ORDER').replaceAll('_', ' ')}</h3>
                      <small>{order.CreatedAt ? new Date(order.CreatedAt).toLocaleString('en-IN') : ''}</small>
                    </div>
                    <div className="order-right">
                      <strong>{money(order.Total)}</strong>
                      <span className={`payment-state ${stateClass}`}>{stateLabel}</span>
                    </div>
                    <ChevronDown size={17} className="order-chevron" />
                  </button>

                  {expanded && (
                    <div className="order-details">
                      <div className="detail-head">
                        <div>
                          <span className="eyebrow">ORDER DETAILS</span>
                          <h3>{order.OrderNumber}</h3>
                        </div>
                        <div className="order-detail-actions">
                          {paymentPending && (
                            <button className="make-payment-btn" onClick={() => setPay(order)}>
                              <Smartphone size={15} /> Make Payment
                            </button>
                          )}
                          {ready ? (
                            <button className="invoice-download-btn" disabled={invoiceLoading === order.OrderID} onClick={() => downloadInvoice(order)}>
                              <Download size={15} />
                              {invoiceLoading === order.OrderID ? 'Preparing PDF…' : 'Download Invoice PDF'}
                            </button>
                          ) : (
                            <span className="invoice-locked"><FileText size={14} /> Invoice unlocks after payment & voucher delivery</span>
                          )}
                        </div>
                      </div>

                      <div className="detail-grid">
                        <div><span>Order ID</span><b>{order.OrderID}</b></div>
                        <div><span>Payment Status</span><b>{String(order.PaymentStatus || 'PENDING')}</b></div>
                        <div><span>Order Status</span><b>{String(order.Status || '')}</b></div>
                        <div><span>Subtotal</span><b>{money(order.Subtotal)}</b></div>
                        <div><span>Discount</span><b>{money(order.Discount)}</b></div>
                        <div><span>Total</span><b>{money(order.Total)}</b></div>
                      </div>

                      <div className="detail-items">
                        <strong>Items</strong>
                        {items.length ? (
                          items.map((item, index) => (
                            <div className="detail-item" key={item.OrderItemID || index}>
                              <span>{item.ProductID}</span>
                              <span>Denomination {money(item.Denomination || item.FaceValue)}</span>
                              <span>× {item.Quantity}</span>
                              <b>{money(item.Total)}</b>
                            </div>
                          ))
                        ) : <p>Item details will appear here.</p>}
                      </div>

                      {order.PaymentLink?.Link && (
                        <div className="saved-payment-link">
                          <div><span>PAYMENT LINK</span><b>{order.PaymentLink.Label || 'Secure payment link'}</b></div>
                          <a href={order.PaymentLink.Link} target="_blank" rel="noreferrer">Open Payment Link <ExternalLink size={14} /></a>
                        </div>
                      )}

                      {order.Payment?.Provider && (
                        <div className="payment-record">
                          <CheckCircle2 size={15} />
                          <span>Latest payment method: <b>{order.Payment.Provider}</b>{order.Payment.ProviderPaymentID && <> · Reference <b>{order.Payment.ProviderPaymentID}</b></>}</span>
                        </div>
                      )}

                      {ready && (
                        <div className="invoice-ready-banner">
                          <FileText size={19} />
                          <div>
                            <strong>Invoice ready</strong>
                            <span>Completed order with verified payment and delivered voucher. Your PDF contains the complete order, payment and voucher record.</span>
                          </div>
                          <button onClick={() => downloadInvoice(order)} disabled={invoiceLoading === order.OrderID}>
                            {invoiceLoading === order.OrderID ? 'Preparing…' : 'Download PDF'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <div className="empty-panel">
            <PackageCheck size={30} />
            <h3>No orders yet</h3>
            <p>Your checkout orders will appear here.</p>
            <button className="btn-primary" onClick={onBack}>Browse vouchers</button>
          </div>
        )}
      </div>

      {pay && (
        <div className="order-pay-overlay" onClick={() => setPay(null)}>
          <div className="order-pay-modal" onClick={event => event.stopPropagation()}>
            <button className="order-pay-close" onClick={() => setPay(null)}><X size={18} /></button>
            <span className="eyebrow">MAKE PAYMENT</span>
            <h2>{money(pay.Total)} payable</h2>
            <p>Order <b>{pay.OrderNumber}</b> is still pending payment.</p>
            <div className="pay-choice-grid">
              <a className="pay-choice" href={UPI_URI}><Smartphone size={22} /><b>UPI Apps</b><small>Open your UPI app</small></a>
              <button className="pay-choice" onClick={() => setPay({ ...pay, showQr: true })}><QrCode size={22} /><b>QR Code</b><small>Scan with any UPI app</small></button>
            </div>
            {pay.showQr && <div className="mini-qr"><img src="https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/UPIQR.jpg" alt="UPI QR" /><span>Scan to pay {money(pay.Total)}</span></div>}
            {pay.PaymentLink?.Link && <a className="payment-link-big" href={pay.PaymentLink.Link} target="_blank" rel="noreferrer"><ExternalLink size={17} /><span><b>{pay.PaymentLink.Label || 'Pay Online'}</b><small>Open payment link</small></span></a>}
            <div className="upi-id-row"><span>UPI ID: <b>paytm.s2eunub@pty</b></span><button onClick={() => copy('paytm.s2eunub@pty')}><Copy size={14} />{copied ? 'Copied' : 'Copy'}</button></div>
            <small className="pay-warning">Payment is marked successful only after verified gateway/payment confirmation.</small>
          </div>
        </div>
      )}
    </main>
  )
}
