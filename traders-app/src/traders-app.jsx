import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownLeft, ArrowUpRight, BarChart3, BookOpen, BriefcaseBusiness, CircleDollarSign, Plus, RefreshCw, Settings2, Wallet } from 'lucide-react'
import { tradersRequest } from './api'

const money = (value, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0))
const dateText = value => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function TradersApp() {
  const [tab, setTab] = useState('overview')
  const [account, setAccount] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [trades, setTrades] = useState([])
  const [ledger, setLedger] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('tc_traders_session') || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [tradeOpen, setTradeOpen] = useState(false)
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [form, setForm] = useState({ Market: 'INDIAN_EQUITY', Segment: 'CASH', Side: 'BUY', Quantity: '', Price: '', Fees: '0', Taxes: '0', Symbol: '', TradeDateTime: new Date().toISOString().slice(0, 16), Strategy: '', Notes: '' })
  const [cashForm, setCashForm] = useState({ EntryType: 'DEPOSIT', Amount: '', Currency: 'INR', Description: '', EntryDate: new Date().toISOString().slice(0, 10) })
  const [accountForm, setAccountForm] = useState({ Name: 'Primary Trading Account', Market: 'MULTI_MARKET', Broker: '', BaseCurrency: 'INR', InitialCapital: '' })

  const refresh = async () => {
    if (!token) return
    setBusy(true); setError('')
    try {
      const [a, t, l, d] = await Promise.all([
        tradersRequest('listAccounts', {}, token),
        tradersRequest('listTrades', {}, token),
        tradersRequest('listLedger', {}, token),
        tradersRequest('dashboard', {}, token),
      ])
      setAccounts(a.items || []); setTrades(t.items || []); setLedger(l.items || []); setDashboard(d.summary || null)
      if (!account && a.items?.length) setAccount(a.items[0])
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  useEffect(() => { refresh() }, [token])

  const activeTrades = useMemo(() => trades.filter(t => t.Status === 'POSTED'), [trades])
  const activeLedger = useMemo(() => ledger.filter(x => x.Status === 'POSTED'), [ledger])
  const totalDeposits = activeLedger.filter(x => Number(x.AmountBase) > 0).reduce((s, x) => s + Number(x.AmountBase), 0)
  const totalWithdrawals = activeLedger.filter(x => Number(x.AmountBase) < 0).reduce((s, x) => s + Math.abs(Number(x.AmountBase)), 0)

  const saveTrade = async event => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      await tradersRequest('saveTrade', { trade: { ...form, AccountID: account?.AccountID, Quantity: Number(form.Quantity), Price: Number(form.Price), Fees: Number(form.Fees), Taxes: Number(form.Taxes), IdempotencyKey: crypto.randomUUID() } }, token)
      setTradeOpen(false); setForm(f => ({ ...f, Symbol: '', Quantity: '', Price: '', Notes: '' })); await refresh()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const saveLedger = async event => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const multiplier = ['WITHDRAWAL', 'FEE', 'TAX', 'ADJUSTMENT_DEBIT'].includes(cashForm.EntryType) ? -1 : 1
      await tradersRequest('saveLedgerEntry', { entry: { ...cashForm, AccountID: account?.AccountID, Amount: Math.abs(Number(cashForm.Amount)) * multiplier, FxRateToBase: 1, IdempotencyKey: crypto.randomUUID() } }, token)
      setLedgerOpen(false); setCashForm(f => ({ ...f, Amount: '', Description: '' })); await refresh()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const saveAccount = async event => {
    event.preventDefault(); setBusy(true); setError('')
    try { await tradersRequest('saveAccount', { account: accountForm }, token); setAccountOpen(false); await refresh() }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const nav = [
    ['overview', 'Overview', BarChart3], ['trades', 'Trade Book', Activity],
    ['ledger', 'Cash Ledger', BookOpen], ['accounts', 'Accounts', BriefcaseBusiness],
  ]

  return <div className="traders-shell">
    <header className="traders-top"><div className="traders-brand"><span className="brand-mark">TC</span><div><b>Trusted Circle</b><small>TRADERS APP</small></div></div><button className="icon-button" onClick={refresh} aria-label="Refresh" disabled={busy}><RefreshCw size={18}/></button></header>
    <main className="traders-main">
      <section className="welcome"><div><span className="eyebrow">YOUR TRADING JOURNAL</span><h1>Trading, clearly recorded.</h1><p>Keep every trade, cash movement and performance metric in one place.</p></div><div className="account-picker">{account?.Name || 'No trading account'}<button onClick={() => setAccountOpen(true)}>＋</button></div></section>
      {!token && <section className="setup-card"><div className="setup-icon"><Wallet/></div><h2>Connect your Traders account</h2><p>Paste a session token after the authentication service is deployed. Account registration and OTP login are the next backend milestone.</p><input aria-label="Session token" type="password" placeholder="Session token" value={token} onChange={e => setToken(e.target.value)} /><small>For development only. Do not share this token.</small></section>}
      {error && <div className="error-banner">{error}</div>}
      <section className="metric-grid">
        <article className="metric-card"><span>Realised P&amp;L</span><strong>—</strong><small>Lot matching engine pending</small></article>
        <article className="metric-card"><span>Unrealised P&amp;L</span><strong>—</strong><small>Live/stored price feed pending</small></article>
        <article className="metric-card"><span>Net deposits</span><strong>{money(totalDeposits - totalWithdrawals, account?.BaseCurrency || 'INR')}</strong><small>Posted cash ledger</small></article>
        <article className="metric-card"><span>Trades recorded</span><strong>{activeTrades.length}</strong><small>All markets</small></article>
      </section>
      <div className="section-head"><div><h2>Workspace</h2><p>Manage records and review activity.</p></div><div className="quick-actions"><button onClick={() => setTradeOpen(true)}><Plus size={16}/> Trade</button><button className="secondary" onClick={() => setLedgerOpen(true)}><Plus size={16}/> Cash entry</button></div></div>
      <nav className="traders-tabs">{nav.map(([id, label, Icon]) => <button className={tab === id ? 'active' : ''} onClick={() => setTab(id)} key={id}><Icon size={17}/><span>{label}</span></button>)}</nav>
      {tab === 'overview' && <section className="content-card"><div className="card-heading"><div><h3>Recent trades</h3><p>Latest recorded executions</p></div><button className="text-button" onClick={() => setTab('trades')}>View trade book →</button></div><TradeTable trades={activeTrades.slice(0, 6)}/></section>}
      {tab === 'trades' && <section className="content-card"><div className="card-heading"><div><h3>Trade book</h3><p>{activeTrades.length} executions recorded</p></div><button onClick={() => setTradeOpen(true)}><Plus size={16}/> Add trade</button></div><TradeTable trades={activeTrades}/></section>}
      {tab === 'ledger' && <section className="content-card"><div className="card-heading"><div><h3>Cash ledger</h3><p>Deposits, withdrawals and adjustments</p></div><button onClick={() => setLedgerOpen(true)}><Plus size={16}/> Add entry</button></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th></tr></thead><tbody>{activeLedger.map(x => <tr key={x.LedgerID}><td>{dateText(x.EntryDate)}</td><td>{x.EntryType}</td><td>{x.Description || '—'}</td><td className={Number(x.AmountBase) < 0 ? 'negative' : 'positive'}>{money(x.AmountBase, x.Currency)}</td></tr>)}</tbody></table>{!activeLedger.length && <div className="empty-state">No cash movements recorded yet.</div>}</div></section>}
      {tab === 'accounts' && <section className="content-card"><div className="card-heading"><div><h3>Trading accounts</h3><p>Separate records by broker or strategy account</p></div><button onClick={() => setAccountOpen(true)}><Plus size={16}/> New account</button></div><div className="account-list">{accounts.map(a => <button className={account?.AccountID === a.AccountID ? 'account-row selected' : 'account-row'} key={a.AccountID} onClick={() => setAccount(a)}><span className="account-avatar"><BriefcaseBusiness/></span><span><b>{a.Name}</b><small>{a.Broker || 'Broker not specified'} · {a.Market}</small></span><strong>{a.BaseCurrency}</strong></button>)}</div>{!accounts.length && <div className="empty-state">Create your first trading account.</div>}</section>}
      <footer className="traders-footer">Record-keeping and analytics only. Not a broker, investment adviser or order execution platform.</footer>
    </main>
    {tradeOpen && <Modal title="Record a trade" onClose={() => setTradeOpen(false)}><form onSubmit={saveTrade} className="entry-form"><label>Market<select value={form.Market} onChange={e => setForm({...form, Market:e.target.value, Currency:e.target.value === 'FOREX' ? 'USD' : 'INR'})}><option value="INDIAN_EQUITY">Indian equity</option><option value="FOREX">Forex</option><option value="INDIAN_FNO">Indian F&amp;O</option></select></label><div className="form-two"><label>Symbol / pair<input required value={form.Symbol} onChange={e => setForm({...form,Symbol:e.target.value})} placeholder="e.g. RELIANCE / EURUSD"/></label><label>Segment<select value={form.Segment} onChange={e => setForm({...form,Segment:e.target.value})}><option value="CASH">Cash</option><option value="FUTURES">Futures</option><option value="OPTIONS">Options</option><option value="SPOT">Spot</option></select></label></div><div className="form-two"><label>Side<select value={form.Side} onChange={e => setForm({...form,Side:e.target.value})}><option>BUY</option><option>SELL</option></select></label><label>Trade date/time<input required type="datetime-local" value={form.TradeDateTime} onChange={e => setForm({...form,TradeDateTime:e.target.value})}/></label></div><div className="form-two"><label>Quantity<input required type="number" min="0.000001" step="any" value={form.Quantity} onChange={e => setForm({...form,Quantity:e.target.value})}/></label><label>Price<input required type="number" min="0.000001" step="any" value={form.Price} onChange={e => setForm({...form,Price:e.target.value})}/></label></div><div className="form-two"><label>Fees<input type="number" min="0" step="any" value={form.Fees} onChange={e => setForm({...form,Fees:e.target.value})}/></label><label>Taxes<input type="number" min="0" step="any" value={form.Taxes} onChange={e => setForm({...form,Taxes:e.target.value})}/></label></div><label>Strategy (optional)<input value={form.Strategy} onChange={e => setForm({...form,Strategy:e.target.value})}/></label><label>Notes<textarea value={form.Notes} onChange={e => setForm({...form,Notes:e.target.value})}/></label><button className="primary-submit" disabled={busy || !account}>Save trade</button></form></Modal>}
    {ledgerOpen && <Modal title="Cash ledger entry" onClose={() => setLedgerOpen(false)}><form onSubmit={saveLedger} className="entry-form"><label>Entry type<select value={cashForm.EntryType} onChange={e => setCashForm({...cashForm,EntryType:e.target.value})}>{['DEPOSIT','WITHDRAWAL','BROKERAGE','TAX','DIVIDEND','INTEREST','ADJUSTMENT'].map(x => <option key={x}>{x}</option>)}</select></label><label>Date<input type="date" required value={cashForm.EntryDate} onChange={e => setCashForm({...cashForm,EntryDate:e.target.value})}/></label><label>Amount<input required type="number" min="0.01" step="any" value={cashForm.Amount} onChange={e => setCashForm({...cashForm,Amount:e.target.value})}/></label><label>Description<input value={cashForm.Description} onChange={e => setCashForm({...cashForm,Description:e.target.value})}/></label><button className="primary-submit" disabled={busy || !account}>Save entry</button></form></Modal>}
    {accountOpen && <Modal title="Create trading account" onClose={() => setAccountOpen(false)}><form onSubmit={saveAccount} className="entry-form"><label>Account name<input required value={accountForm.Name} onChange={e => setAccountForm({...accountForm,Name:e.target.value})}/></label><label>Market<select value={accountForm.Market} onChange={e => setAccountForm({...accountForm,Market:e.target.value})}><option value="MULTI_MARKET">Multi-market</option><option value="INDIAN_EQUITY">Indian equity</option><option value="FOREX">Forex</option></select></label><label>Broker<input value={accountForm.Broker} onChange={e => setAccountForm({...accountForm,Broker:e.target.value})}/></label><label>Base currency<select value={accountForm.BaseCurrency} onChange={e => setAccountForm({...accountForm,BaseCurrency:e.target.value})}><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></label><label>Initial capital<input type="number" min="0" step="any" value={accountForm.InitialCapital} onChange={e => setAccountForm({...accountForm,InitialCapital:e.target.value})}/></label><button className="primary-submit" disabled={busy}>Create account</button></form></Modal>}
  </div>
}

function TradeTable({ trades }) {
  if (!trades.length) return <div className="empty-state">No trades yet. Record your first execution to start the trade book.</div>
  return <div className="table-wrap"><table><thead><tr><th>Date</th><th>Instrument</th><th>Market</th><th>Side</th><th>Qty</th><th>Price</th><th>Fees + taxes</th></tr></thead><tbody>{trades.map(t => <tr key={t.TradeID}><td>{dateText(t.TradeDateTime)}</td><td><b>{t.Symbol}</b></td><td>{t.Market}</td><td><span className={t.Side === 'BUY' ? 'side-buy' : 'side-sell'}>{t.Side}</span></td><td>{Number(t.Quantity).toLocaleString('en-IN')}</td><td>{Number(t.Price).toLocaleString('en-IN')}</td><td>{Number(t.Fees || 0) + Number(t.Taxes || 0)}</td></tr>)}</tbody></table></div>
}
function Modal({ title, onClose, children }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><section className="modal-panel" role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button type="button" onClick={onClose}>×</button></header>{children}</section></div>
}
