import { useState } from 'react'
import { Check, Heart, ShoppingBag, Zap } from 'lucide-react'
import BrandLogo from './BrandLogo'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function VoucherCard({ product, brandName, liked, onLike, onAdd, onOpen }) {
  const [adding, setAdding] = useState(false)
  const discount = Number(product.DiscountPercent || 0)
  const add = async event => {
    event?.stopPropagation?.()
    if (adding) return
    setAdding(true)
    try {
      await onAdd(product)
      if (localStorage.getItem('tc_session')) {
        window.dispatchEvent(new CustomEvent('tc:cart-added', { detail: { title: product.Title } }))
        setTimeout(() => { window.location.hash = '#/cart' }, 120)
      }
    } finally {
      setTimeout(() => setAdding(false), 350)
    }
  }
  return (
    <article className="voucher-card-page">
      <div className="voucher-card-art">
        <span className="voucher-discount">{discount}% OFF</span>
        <button className={`voucher-like ${liked ? 'is-liked' : ''}`} onClick={() => onLike(product.ProductID)} aria-label="Save voucher"><Heart size={17} fill={liked ? 'currentColor' : 'none'} /></button>
        <button className="voucher-logo-button" onClick={onOpen} aria-label={`View ${product.Title}`}><BrandLogo name={brandName} size="lg" /></button>
        <span className="voucher-brand">{brandName}</span><h3>{product.Title}</h3><span className="voucher-delivery"><Zap size={12} /> Digital delivery</span>
      </div>
      <div className="voucher-card-content">
        <div className="voucher-meta"><span>{product.SKU || 'GIFT VOUCHER'}</span><span>Instant</span></div>
        <p>{product.Description || 'Digital gift voucher delivered after successful fulfilment.'}</p>
        <div className="voucher-price-row"><div><small>VALUE</small><del>{money(product.FaceValue)}</del><strong>{money(product.SellingPrice)}</strong></div><button onClick={add} disabled={adding}>{adding ? <><Check size={15}/> Added</> : <><ShoppingBag size={15}/> Add to cart</>}</button></div>
      </div>
    </article>
  )
}
