import { ArrowRight, Mail, ShieldCheck, WalletCards } from 'lucide-react'
import { useEffect, useState } from 'react'
import { walletApi } from '../wallet-services-api'
import './wallet-services.css'

const SESSION_KEY = 'tc_wallet_session'

export default function WalletServicesPage() {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [token, setToken] = useState(() => localStorage.getItem(SESSION_KEY) || '')
  const [user, setUser] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [balance] = useState(0)

  useEffect(() => {
    if (!token) return
    walletApi.me(token)
      .then(result => setUser(result.user))
      .catch(() => {
        localStorage.removeItem(SESSION_KEY)
        setToken('')
      })
  }, [token])

  const requestOtp = async event => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      await walletApi.requestOtp(email)
      setStep('otp')
      setMessage(`OTP sent to ${email}`)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  const verifyOtp = async event => {
    event.preventDefault()
    if (otp.length !== 6) return

    setBusy(true)
    setMessage('')
    try {
      const result = await walletApi.verifyOtp(email, otp)
      localStorage.setItem(SESSION_KEY, result.session.token)
      setToken(result.session.token)
      setUser(result.user)
      setStep('email')
      setOtp('')
      setMessage('')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  if (token && user) {
    return (
      <main className="wallet-services-page">
        <section className="wallet-services-shell">
          <div className="wallet-services-top">
            <div>
              <span className="wallet-services-eyebrow">WALLET SERVICES</span>
              <h1>Welcome back, {user.name}</h1>
              <p>Manage your wallet balance, add money, withdraw and view every transaction.</p>
            </div>
            <div className="wallet-services-mark"><WalletCards size={24} /></div>
          </div>

          <div className="wallet-services-balance-card">
            <span>Available Balance</span>
            <strong>₹{balance.toLocaleString('en-IN')}</strong>
            <small>Wallet Services</small>
          </div>

          <div className="wallet-services-actions">
            <button className="wallet-service-action primary" type="button">
              <span>Add Money</span><ArrowRight size={17} />
            </button>
            <button className="wallet-service-action" type="button">
              <span>Withdraw</span><ArrowRight size={17} />
            </button>
          </div>

          <div className="wallet-services-placeholder">
            <ShieldCheck size={20} />
            <div>
              <strong>Wallet Home is ready</strong>
              <p>The transaction engine, payment-link stock and withdrawal modules will plug into this independent Wallet backend.</p>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="wallet-services-page wallet-login-page">
      <section className="wallet-login-card">
        <div className="wallet-login-icon"><WalletCards size={28} /></div>
        <span className="wallet-services-eyebrow">TRUSTED CIRCLE</span>
        <h1>Wallet Services</h1>
        <p>Sign in with your email. We will send a secure one-time password.</p>

        {step === 'email' ? (
          <form onSubmit={requestOtp}>
            <label>Email address</label>
            <div className="wallet-input-wrap">
              <Mail size={17} />
              <input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <button className="wallet-submit" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Continue'} <ArrowRight size={17} />
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp}>
            <label>6-digit OTP</label>
            <input
              className="wallet-otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoFocus
              required
            />
            <button className="wallet-submit" type="submit" disabled={busy || otp.length !== 6}>
              {busy ? 'Verifying…' : 'Verify & Open Wallet'} <ArrowRight size={17} />
            </button>
            <button
              className="wallet-change-email"
              type="button"
              onClick={() => { setStep('email'); setOtp(''); setMessage('') }}
            >
              Use another email
            </button>
          </form>
        )}

        {message && <div className="wallet-login-message">{message}</div>}
      </section>
    </main>
  )
}
