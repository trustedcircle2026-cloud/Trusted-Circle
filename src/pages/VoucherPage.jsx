import { ArrowLeft, CheckCircle2, ShoppingBag, ShieldCheck, Zap } from 'lucide-react'
import BrandLogo from '../components/BrandLogo'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function VoucherPage({ product, brandName, onBack, onAdd }) {
  if (!product) return <main className="page-shell"><div className="empty-panel"><h3>Voucher not found</h3><button className="btn-primary" onClick={onBack}>Back to vouchers</button></div></main>
  const discount = Number(product.DiscountPercent || 0)
  return <main className="page-shell"><button className="back-link" onClick={onBack}><ArrowLeft size={16}/> Back to vouchers</button><section className="voucher-detail"><div className="voucher-detail-art"><span className="voucher-discount">{discount}% OFF</span><BrandLogo name={brandName} size="xl"/><span>{brandName}</span><h1>{product.Title}</h1><p>Digital gift voucher</p></div><div className="voucher-detail-info"><span className="eyebrow">{brandName.toUpperCase()}</span><h2>{product.Title}</h2><p>{product.Description || 'Use this digital gift voucher with the selected brand, subject to the issuer terms.'}</p><div className="detail-price"><div><small>FACE VALUE</small><del>{money(product.FaceValue)}</del></div><div><small>YOU PAY</small><strong>{money(product.SellingPrice)}</strong></div><b>Save {discount}%</b></div><button className="btn-primary wide" onClick={() => onAdd(product)}><ShoppingBag size={17}/> Add to cart</button><div className="detail-trust"><span><CheckCircle2/> Instant digital delivery</span><span><ShieldCheck/> Secure account checkout</span><span><Zap/> Clear savings before payment</span></div></div></section></main>
}
