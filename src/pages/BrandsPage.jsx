import BrandLogo from '../components/BrandLogo'

export default function BrandsPage({ brands, onBrowse }) {
  return <main className="page-shell"><div className="page-banner"><span className="eyebrow">ALL BRANDS</span><h1>Find your favourite brand.</h1><p>Choose a brand to see its available gift vouchers and current discount.</p></div><div className="all-brand-grid">{brands.map(b => <button className="all-brand-card" key={b.BrandID} onClick={() => onBrowse(String(b.BrandID))}><BrandLogo name={b.Name} size="xl"/><div><strong>{b.Name}</strong><span>Gift vouchers</span></div></button>)}</div></main>
}
