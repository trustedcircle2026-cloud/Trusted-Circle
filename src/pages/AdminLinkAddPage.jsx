import {useMemo,useState} from 'react'
import {AlertCircle,CheckCircle2,Link2,LogIn,PackagePlus,RefreshCw,ShieldCheck,Trash2,UploadCloud,X} from 'lucide-react'
import {api} from '../api'
import '../admin-link-add.css'

const DENOMS=[500,1000,1500,2000]

export default function AdminLinkAddPage({logoUrl}){
  const[adminKey,setAdminKey]=useState('')
  const[denomination,setDenomination]=useState(500)
  const[label,setLabel]=useState('Shopping Payment ₹500')
  const[link,setLink]=useState('')
  const[links,setLinks]=useState('')
  const[loading,setLoading]=useState(false)
  const[result,setResult]=useState(null)
  const[error,setError]=useState('')
  const[stockRows,setStockRows]=useState([])
  const[popup,setPopup]=useState(null)

  const parsedLinks=useMemo(()=>links.split(/\r?\n/).map(v=>v.trim()).filter(Boolean),[links])
  const validLinks=parsedLinks.filter(v=>/^https:\/\//i.test(v))
  const invalidCount=parsedLinks.length-validLinks.length

  const authenticate=async()=>{
    if(!adminKey.trim())throw new Error('Enter the Admin Key.')
    const r=await api.adminLogin('trustedcircle2026@gmail.com',adminKey.trim())
    return r.session.token
  }

  const showPopup=(type,title,message)=>{setPopup({type,title,message});window.setTimeout(()=>setPopup(null),3500)}

  const single=async()=>{
    setLoading(true);setError('');setResult(null)
    try{
      if(!/^https:\/\//i.test(link.trim()))throw new Error('Enter a valid HTTPS payment gateway link.')
      const session=await authenticate()
      const r=await api.adminAddPaymentLinkStock(session,denomination,link.trim(),label.trim()||'Pay securely')
      setResult({added:1,skipped:0,paymentLinkStockId:r?.paymentLinkStockId})
      setLink('')
      showPopup('success','Payment Link Added','The payment link was added to Shopping PaymentLinkStock successfully.')
      await refresh(true)
    }catch(e){const msg=String(e?.message||'Could not add payment link.');setError(msg);showPopup('error','Action Failed',msg)}
    finally{setLoading(false)}
  }

  const bulk=async()=>{
    setLoading(true);setError('');setResult(null)
    try{
      if(!validLinks.length)throw new Error('Paste at least one valid HTTPS payment link, one per line.')
      if(validLinks.length>200)throw new Error('Maximum 200 payment links can be added at once.')
      const session=await authenticate()
      const r=await api.adminAddPaymentLinkStockBulk(session,validLinks.map(x=>({denomination,link:x,label:label.trim()||'Pay securely'})))
      setResult(r)
      if(Number(r?.added||0)>0)setLinks('')
      showPopup('success','Bulk Links Added',`${Number(r?.added||0)} link(s) added and ${Number(r?.skipped||0)} duplicate(s) skipped.`)
      await refresh(true)
    }catch(e){const msg=String(e?.message||'Could not add payment links.');setError(msg);showPopup('error','Action Failed',msg)}
    finally{setLoading(false)}
  }

  const refresh=async(silent=false)=>{
    setError('');if(!silent)setResult(null);setLoading(true)
    try{
      const session=await authenticate()
      const r=await api.adminTable(session,'PaymentLinkStock')
      const rows=Array.isArray(r?.rows)?r.rows:Array.isArray(r?.table?.rows)?r.table.rows:Array.isArray(r)?r:[]
      setStockRows(rows)
      setResult({stock:r})
      if(!silent)showPopup('success','Stock Refreshed',`${rows.length} payment-link stock record(s) loaded from Google Sheets.`)
    }catch(e){const msg=String(e?.message||'Could not refresh stock.');setError(msg);showPopup('error','Refresh Failed',msg)}
    finally{setLoading(false)}
  }

  return <main className="admin-link-add-page">
    <div className="admin-link-add-orb orb-a"/><div className="admin-link-add-orb orb-b"/>
    <header className="admin-link-add-header">
      <div className="admin-link-add-brand">
        <div className="admin-link-add-logo"><img src={logoUrl} alt="Trusted Circle"/></div>
        <div><b>Trusted Circle</b><span>SHOPPING PAYMENT GATEWAY</span></div>
      </div>
      <div className="admin-link-add-security"><ShieldCheck size={16}/> ADMIN ONLY</div>
    </header>

    <section className="admin-link-add-shell">
      {popup&&<div className={'admin-link-add-popup '+popup.type} role="alert"><div className="admin-link-add-popup-icon">{popup.type==='success'?<CheckCircle2 size={22}/>:<AlertCircle size={22}/>}</div><div><b>{popup.title}</b><span>{popup.message}</span></div><button type="button" onClick={()=>setPopup(null)}><X size={16}/></button></div>}
      <form className="admin-link-add-card" onSubmit={e=>e.preventDefault()}>
        <h2>Add Payment Link Stock</h2>
        <div className="admin-link-add-grid">
          <label className="admin-link-add-field"><span>Shopping Admin Key</span><input type="password" value={adminKey} onChange={e=>setAdminKey(e.target.value)} placeholder="Private admin key" disabled={loading}/></label>
          <label className="admin-link-add-field"><span>Denomination</span><select value={denomination} onChange={e=>{const d=Number(e.target.value);setDenomination(d);if(!label||/^Shopping Payment ₹\d+$/.test(label))setLabel('Shopping Payment ₹'+d)}} disabled={loading}><option value="500">₹500</option><option value="1000">₹1,000</option><option value="1500">₹1,500</option><option value="2000">₹2,000</option></select></label>
          <label className="admin-link-add-field"><span>Payment Link Label</span><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Shopping Payment ₹500" disabled={loading}/></label>
          <label className="admin-link-add-field"><span>Single Payment Gateway Link</span><input value={link} onChange={e=>setLink(e.target.value)} placeholder="https://..." disabled={loading}/></label>
          <label className="admin-link-add-field admin-link-add-full"><span>Bulk Payment Gateway Links — one link per line</span><textarea value={links} onChange={e=>setLinks(e.target.value)} placeholder={'https://payment-link-1\nhttps://payment-link-2'} disabled={loading} spellCheck="false"/></label>
        </div>
        <div className="admin-link-add-actions">
          <button type="button" className="admin-link-add-primary" onClick={single} disabled={loading}>{loading?<RefreshCw size={16} className="admin-link-spin"/>:<UploadCloud size={16}/>} Add Single Link</button>
          <button type="button" className="admin-link-add-primary" onClick={bulk} disabled={loading}>{loading?<RefreshCw size={16} className="admin-link-spin"/>:<UploadCloud size={16}/>} Add Bulk Links</button>
          <button type="button" className="admin-link-add-secondary" onClick={refresh} disabled={loading}><RefreshCw size={16}/> Refresh Stock</button>
        </div>
        <div className="admin-link-add-counter"><span><Link2 size={15}/> {parsedLinks.length} bulk link{parsedLinks.length===1?'':'s'} detected</span><span>{invalidCount?invalidCount+' invalid':''}</span></div>
        {error&&<div className="admin-link-add-message error"><AlertCircle size={17}/><span>{error}</span><button type="button" onClick={()=>setError('')}><X size={15}/></button></div>}
        {result&&result.stock&&<div className="admin-link-add-message success"><CheckCircle2 size={18}/><div><b>Stock refreshed</b><span>{result.stock.rows?.length||0} stock records loaded.</span></div></div>}
        {result&&!result.stock&&<div className="admin-link-add-message success"><CheckCircle2 size={18}/><div><b>{result.added||1} links added</b><span>{result.skipped||0} duplicate links skipped.</span></div></div>}
        <div className="admin-link-add-note"><ShieldCheck size={15}/> Shopping payment links are validated as HTTPS and duplicate links are skipped automatically.</div>
      </form>

      <section className="admin-link-add-stock-card">
        <h2>Stock Summary</h2>
        <div className="admin-link-add-summary">
          {DENOMS.map(d=>{
            const rows=stockRows.filter(x=>Number(x.Denomination??x.denomination)===d)
            const available=rows.filter(x=>String(x.Status??x.status).toUpperCase()==='AVAILABLE').length
            const reserved=rows.filter(x=>String(x.Status??x.status).toUpperCase()==='RESERVED').length
            const used=rows.filter(x=>String(x.Status??x.status).toUpperCase()==='USED').length
            return <div key={d}><b>{available}</b><span>₹{d.toLocaleString('en-IN')} available · {reserved} reserved · {used} used</span></div>
          })}
        </div>
        <div className="admin-link-add-table-wrap">
          <table className="admin-link-add-table"><thead><tr><th>Denomination</th><th>Status</th><th>Transaction</th><th>Expires</th><th>Payment Link</th><th>Action</th></tr></thead>
          <tbody>
            {stockRows.length===0?<tr><td colSpan="6" className="admin-link-add-empty">No stock records loaded. Click Refresh Stock.</td></tr>:
            stockRows.slice().reverse().map((x,i)=>{
              const status=String(x.Status??x.status??'').toUpperCase()
              return <tr key={x.PaymentLinkStockID||x.paymentLinkStockId||i}><td>₹{Number((x.Denomination??x.denomination)||0).toLocaleString('en-IN')}</td><td><span className={'admin-link-add-status '+status.toLowerCase()}>{status||'—'}</span></td><td>{x.OrderID||x.orderId||x.TransactionID||x.transactionId||'—'}</td><td>{x.ExpiresAt||x.expiresAt?' '+new Date(x.ExpiresAt||x.expiresAt).toLocaleString('en-IN'):'—'}</td><td className="admin-link-add-url">{x.PaymentLink||x.paymentLink||x.Link||x.link||'—'}</td><td>—</td></tr>
            })}
          </tbody></table>
        </div>
      </section>
    </section>
  </main>
}