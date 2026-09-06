import { getBrandAsset } from '../brandAssets'

export default function BrandLogo({ name, size = 'md' }) {
  const asset = getBrandAsset(name)
  return (
    <span className={`brand-logo-image brand-logo-${size}`} title={name}>
      {asset.logo ? <img src={asset.logo} alt={`${name} logo`} loading="lazy" /> : <span>{String(name || '?').charAt(0)}</span>}
    </span>
  )
}
