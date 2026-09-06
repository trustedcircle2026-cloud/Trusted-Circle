import { ChevronDown, Search, X } from 'lucide-react'
import VoucherCard from '../components/VoucherCard'

export default function VouchersPage({ products, brands, brandFilter, setBrandFilter, query, setQuery, brandName, liked, onLike, onAdd, onOpen }) {
  return (
    <main className="page-shell">
      <div className="page-banner"><span className="eyebrow">GIFT VOUCHERS</span><h1>Save on the brands you already love.</h1><p>Compare discounts, choose a voucher and add it to your persistent cart.</p></div>
      <div className="catalog-toolbar"><label className="catalog-search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search vouchers or brands"/>{query && <button onClick={() => setQuery('')}><X size={15}/></button>}</label><label className="catalog-select"><select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}><option value="">All brands</option>{brands.map(b => <option key={b.BrandID} value={b.BrandID}>{b.Name}</option>)}</select><ChevronDown size={15}/></label></div>
      {brandFilter && <div className="active-filter">{brandName(brandFilter)}<button onClick={() => setBrandFilter('')}><X size={13}/></button></div>}
      {products.length ? <div className="voucher-grid">{products.map(p => <VoucherCard key={p.ProductID} product={p} brandName={brandName(p.BrandID)} liked={liked.includes(p.ProductID)} onLike={onLike} onAdd={onAdd} onOpen={() => onOpen(p.ProductID)} />)}</div> : <div className="empty-panel"><h3>No matching vouchers</h3><p>Try another brand or search term.</p></div>}
    </main>
  )
}
