import { Heart, ShoppingBag, Zap } from 'lucide-react'
import BrandLogo from './BrandLogo'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function VoucherCard({ product, brandName, liked, onLike, onAdd, onOpen }) {
  const discount = Number(product.DiscountPercent || 0)
  return (
    <article className="voucher-card-page">
      <div className="voucher-card-art">
        <span className="voucher-discount">{discount}% OFF</span>
        <button className={`voucher-like ${liked ? 'is-liked' : ''}`} onClick={() => onLike(product.ProductID)} aria-label="Save voucher">
          <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
        </button>
        <button className="voucher-logo-button" onClick={onOpen} aria-label={`View ${product.Title}`}>
          <BrandLogo name={brandName} size="lg" />
        </button>
        <span className="voucher-brand">{brandName}</span>
        <h3>{product.Title}</h3>
        <span className="voucher-delivery"><Zap size={12} /> Digital delivery</span>
      </div>
      <div className="voucher-card-content">
        <div className="voucher-meta"><span>{product.SKU || 'GIFT VOUCHER'}</span><span>Instant</span></div>
        <p>{product.Description || 'Digital gift voucher delivered after successful fulfilment.'}</p>
        <div className="voucher-price-row">
          <div><small>VALUE</small><del>{money(product.FaceValue)}</del><strong>{money(product.SellingPrice)}</strong></div>
          <button onClick={() => onAdd(product)}><ShoppingBag size={15} /> Add</button>
        </div>
      </div>
    </article>
  )
}
