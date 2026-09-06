import { ArrowRight, Gift, ShieldCheck, Sparkles, Tag, Zap } from 'lucide-react'
import VoucherCard from '../components/VoucherCard'
import BrandLogo from '../components/BrandLogo'

export default function HomePage({ brands, products, brandName, liked, onLike, onAdd, onOpen, onBrowse }) {
  return (
    <main className="page-home">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="eyebrow"><Sparkles size={15}/> SMARTER WAY TO GIFT</span>
          <h1>More value.<br/><em>More to gift.</em></h1>
          <p>Discover popular gift vouchers at transparent discounts, manage your cart in one account and choose your preferred payment route.</p>
          <div className="hero-buttons"><button className="btn-primary" onClick={onBrowse}>Explore vouchers <ArrowRight size={17}/></button><button className="btn-quiet" onClick={() => onBrowse('brands')}>Browse brands</button></div>
          <div className="hero-points"><span><ShieldCheck size={16}/> Secure account</span><span><Zap size={16}/> Digital delivery</span><span><Tag size={16}/> Visible savings</span></div>
        </div>
        <div className="hero-art"><div className="hero-orbit hero-orbit-a"/><div className="hero-orbit hero-orbit-b"/><div className="hero-gift-card"><div className="hero-card-top"><span><img src="https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg" alt="Trusted Circle"/> Trusted Circle</span><small>GIFT VOUCHER</small></div><strong>₹1,000</strong><div><span>CHOOSE • SAVE • GIFT</span><b>UP TO 16% OFF</b></div></div><div className="hero-save"><small>TOP SAVING</small><strong>16%</strong><span>OFF</span></div></div>
      </section>
      <section className="home-section">
        <div className="section-title"><div><span className="eyebrow">POPULAR BRANDS</span><h2>Shop by brand</h2></div><button className="text-action" onClick={() => onBrowse('brands')}>View all <ArrowRight size={15}/></button></div>
        <div className="brand-logo-grid">{brands.slice(0, 8).map(b => <button key={b.BrandID} className="brand-logo-tile" onClick={() => onBrowse('vouchers', String(b.BrandID))}><BrandLogo name={b.Name} size="lg"/><strong>{b.Name}</strong><small>Gift vouchers</small></button>)}</div>
      </section>
      <section className="home-section voucher-preview">
        <div className="section-title"><div><span className="eyebrow">BEST SAVINGS</span><h2>Featured vouchers</h2></div><button className="text-action" onClick={() => onBrowse('vouchers')}>View all <ArrowRight size={15}/></button></div>
        <div className="voucher-grid">{products.slice(0, 6).map(p => <VoucherCard key={p.ProductID} product={p} brandName={brandName(p.BrandID)} liked={liked.includes(p.ProductID)} onLike={onLike} onAdd={onAdd} onOpen={() => onOpen(p.ProductID)} />)}</div>
        {!products.length && <div className="empty-panel"><Gift size={28}/><h3>Vouchers are being prepared</h3><p>The live catalogue will appear here when products are published.</p></div>}
      </section>
    </main>
  )
}
