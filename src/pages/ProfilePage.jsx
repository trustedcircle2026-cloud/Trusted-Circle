import { ArrowRight, LogOut, Mail, PackageCheck, UserRound, WalletCards } from 'lucide-react'
import '../profile-modern.css'

export default function ProfilePage({ user, name, setName, onSave, onLogout, onOrders }) {
  const displayName = user?.name || name || 'Trusted Circle Member'
  const firstName = displayName.trim().split(/\s+/)[0] || 'there'

  return (
    <main className="profile-modern page-shell">
      <div className="page-banner compact profile-banner profile-enter">
        <span className="eyebrow">MY ACCOUNT</span>
        <h1>Hi, {firstName}.</h1>
        <p>Manage your profile, orders and cashback.</p>
      </div>

      <section className="profile-hero-card profile-enter profile-enter-delay">
        <div className="profile-avatar profile-avatar-large"><UserRound size={30}/></div>
        <div className="profile-hero-copy">
          <span className="eyebrow">ACCOUNT</span>
          <h2>{displayName}</h2>
          <p>Trusted Circle shopper</p>
          <div className="profile-status"><span className="profile-status-dot"/> Account active</div>
        </div>
        <div className="profile-hero-mark" aria-hidden="true"><WalletCards size={30}/></div>
      </section>

      <div className="profile-grid profile-grid-modern profile-enter profile-enter-delay-2">
        <section className="profile-card profile-edit-card">
          <div className="profile-section-head">
            <div><span className="eyebrow">PROFILE</span><h2>Personal details</h2></div>
            <UserRound size={21}/>
          </div>
          <label>Full name
            <input value={name} onChange={event => setName(event.target.value)} placeholder="Your full name" autoComplete="name"/>
          </label>
          <div className="profile-email-safe">
            <Mail size={16}/>
            <div><span>Email address</span><strong>{user?.email || '—'}</strong></div>
            <em>Verified</em>
          </div>
          <button className="btn-primary wide profile-save-button" onClick={onSave}>Save changes <ArrowRight size={16}/></button>
        </section>

        <section className="profile-side profile-actions-modern">
          <button className="profile-action" onClick={onOrders}>
            <div><span className="action-icon"><PackageCheck size={18}/></span><span><strong>My Orders</strong><span>Payments, vouchers and invoices.</span></span></div>
            <ArrowRight size={18}/>
          </button>
          <button className="profile-action" onClick={() => { window.location.hash = '#/wallet' }}>
            <div><span className="action-icon"><WalletCards size={18}/></span><span><strong>Cashback Wallet</strong><span>Balance, redeem and transaction history.</span></span></div>
            <ArrowRight size={18}/>
          </button>
          <button className="profile-action danger" onClick={onLogout}>
            <div><span className="action-icon"><LogOut size={18}/></span><span><strong>Sign out</strong><span>End your current session.</span></span></div>
            <LogOut size={18}/>
          </button>
        </section>
      </div>
    </main>
  )
}
