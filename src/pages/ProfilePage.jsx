import { ArrowRight, CalendarDays, FileText, LogOut, Mail, PackageCheck, ShieldCheck, UserRound } from 'lucide-react'
import '../profile-modern.css'

const formatDate = value => {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ProfilePage({ user, name, setName, onSave, onLogout, onOrders }) {
  const displayName = user?.name || name || 'Trusted Circle Member'
  const firstName = displayName.trim().split(/\s+/)[0] || 'there'
  const memberSince = formatDate(user?.createdAt)
  const lastSignIn = formatDate(user?.lastLoginAt)

  return (
    <main className="profile-modern page-shell">
      <div className="page-banner compact profile-banner">
        <span className="eyebrow">MY ACCOUNT</span>
        <h1>Welcome back, {firstName}.</h1>
        <p>Manage your profile, orders and account security in one place.</p>
      </div>

      <div className="profile-overview">
        <section className="profile-hero-card">
          <div className="profile-avatar profile-avatar-large"><UserRound size={30} /></div>
          <div className="profile-hero-copy">
            <span className="eyebrow">SHOPPER ACCOUNT</span>
            <h2>{displayName}</h2>
            <p>{user?.email || 'Email not available'}</p>
            <div className="profile-status"><span className="profile-status-dot" /> Account active <span>•</span> Email verified</div>
          </div>
        </section>

        <div className="profile-stats">
          <div><PackageCheck size={18} /><span>Orders</span><strong>View your orders</strong></div>
          <div><FileText size={18} /><span>Invoices</span><strong>Download when ready</strong></div>
          <div><ShieldCheck size={18} /><span>Security</span><strong>Email + OTP</strong></div>
        </div>
      </div>

      <div className="profile-grid profile-grid-modern">
        <section className="profile-card profile-edit-card">
          <div className="profile-section-head">
            <div><span className="eyebrow">PROFILE DETAILS</span><h2>Personal information</h2></div>
            <ShieldCheck size={21} />
          </div>

          <label>Full name
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" autoComplete="name" />
          </label>

          <label>Email address
            <div className="readonly-field"><Mail size={16} />{user?.email || '—'}<span>Verified</span></div>
          </label>

          <div className="profile-details-grid">
            <div className="profile-detail-tile"><small>ACCOUNT STATUS</small><strong>{user?.status === 'ACTIVE' ? 'Active' : user?.status || 'Active'}</strong></div>
            <div className="profile-detail-tile"><small>SIGN-IN</small><strong>Email + one-time code</strong></div>
            <div className="profile-detail-tile"><small>MEMBER SINCE</small><strong>{memberSince}</strong></div>
            <div className="profile-detail-tile"><small>LAST SIGN-IN</small><strong>{lastSignIn}</strong></div>
          </div>

          <button className="btn-primary wide" onClick={onSave}>Save changes <ArrowRight size={16} /></button>
          <div className="profile-meta-line"><CalendarDays size={14} /> Your account details are kept with your Trusted Circle account.</div>
        </section>

        <section className="profile-side profile-actions-modern">
          <button className="profile-action" onClick={onOrders}>
            <div><span className="action-icon"><PackageCheck size={18} /></span><span><strong>My Orders</strong><span>Track payments, voucher delivery and invoices.</span></span></div>
            <ArrowRight size={18} />
          </button>

          <div className="profile-security-note">
            <ShieldCheck size={18} />
            <div><strong>Your account is protected</strong><span>Sign-in uses a one-time verification code sent to your registered email.</span></div>
          </div>

          <button className="profile-action danger" onClick={onLogout}>
            <div><span className="action-icon"><LogOut size={18} /></span><span><strong>Sign out</strong><span>End this browser session securely.</span></span></div>
            <LogOut size={18} />
          </button>
        </section>
      </div>
    </main>
  )
}
