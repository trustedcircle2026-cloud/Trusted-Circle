import {useMemo,useState} from 'react'
import {AlertCircle,CheckCircle2,Link2,LogIn,PackagePlus,RefreshCw,ShieldCheck,Trash2,UploadCloud,X} from 'lucide-react'
import {api} from '../api'
import '../admin-link-add.css'

const DENOMS=[500,1000,1500,2000]

export default function AdminLinkAddPage({logoUrl}){
  const[token,setToken]=useState(()=>localStorage.getItem('tc_erp_session')||'')
  const[denomination,setDenomination]=useState(Number(new URLSearchParams(window.location.hash.split('?')[1]||'').get('denomination'))||500)
  const[links,setLinks]=useState('')
  const[label,setLabel]=useState('Pay securely')
  const[loading,setLoading]=useState(false)
  const[result,setResult]=useState(null)
  const[error,setError]=useState('')

  const parsedLinks=useMemo(()=>links.split(/\r?\n/).map(v=>v.trim()).filter(Boolean),[links])
  const validLinks=parsedLinks.filter(v=>/^https:\/\//i.test(v))
  const invalidCount=parsedLinks.length-validLinks.length

  const login=async()=>{
    setError('')
    try{
      const password=window.prompt('Enter Admin password to open the secure stock page.')
      if(!password)return
      const r=await api.adminLogin('trustedcircle2026@gmail.com',password)
      localStorage.setItem('tc_erp_session',r.session.token)
      localStorage.setItem('tc_erp_admin_user',JSON.stringify(r.user||{}))
      setToken(r.session.token)
    }catch(e){setError(String(e?.message||'Admin authentication failed.'))}
  }

  const submit=async e=>{
    e.preventDefault()
    if(!token){setError('Admin authentication is required.');return}
    if(!validLinks.length){setError('Paste at least one valid HTTPS payment link, one per line.');return}
    if(validLinks.length>200){setError('Maximum 200 payment links can be added at once.');return}
    setLoading(true);setError('');setResult(null)
    try{
      const rows=validLinks.map(link=>({denomination,link,label}))
      const r=await api.adminAddPaymentLinkStockBulk(token,rows)
      setResult(r)
      if(Number(r?.added||0)>0)setLinks('')
    }catch(e){setError(String(e?.message||'Could not add payment links.'))}
    finally{setLoading(false)}
  }

  return <main className="admin-link-add-page">
    <div className="admin-link-add-orb orb-a"/><div className="admin-link-add-orb orb-b"/>
    <header className="admin-link-add-header">
      <div className="admin-link-add-brand">
        <div className="admin-link-add-logo"><img src={logoUrl} alt="Trusted Circle"/></div>
        <div><b>Trusted Circle</b><span>SECURE STOCK CONTROL</span></div>
      </div>
      <div className="admin-link-add-security"><ShieldCheck size={16}/> ADMIN ONLY</div>
    </header>

    <section className="admin-link-add-shell">
      <div className="admin-link-add-hero">
        <div className="admin-link-add-hero-icon"><PackagePlus size={27}/></div>
        <span className="eyebrow">PAYMENT LINK INVENTORY</span>
        <h1>Add payment links.</h1>
        <p>Select one denomination and paste multiple secure payment links — one link per line.</p>
        <div className="admin-link-add-stepbar">
          <span className="active"><b>1</b> Denomination</span><i/><span className={validLinks.length?'active':''}><b>2</b> Links</span><i/><span className={token?'active':''}><b>3</b> Add to stock</span>
        </div>
      </div>

      <form className="admin-link-add-card" onSubmit={submit}>
        {!token && <div className="admin-link-add-auth">
          <div><ShieldCheck size={20}/><div><b>Admin authentication required</b><p>Sign in with the Trusted Circle admin account before adding stock.</p></div></div>
          <button type="button" className="admin-link-add-primary" onClick={login}><LogIn size={17}/> Authenticate</button>
        </div>}

        <div className="admin-link-add-grid">
          <label className="admin-link-add-field"><span>Voucher denomination</span><select value={denomination} onChange={e=>setDenomination(Number(e.target.value))} disabled={!token||loading}>{DENOMS.map(d=><option key={d} value={d}>₹{d.toLocaleString('en-IN')}</option>)}</select></label>
          <label className="admin-link-add-field"><span>Link label</span><input value={label} onChange={e=>setLabel(e.target.value)} disabled={!token||loading} placeholder="Pay securely"/></label>
        </div>

        <label className="admin-link-add-field"><span>Payment links <small>one per line</small></span>
          <textarea value={links} onChange={e=>setLinks(e.target.value)} disabled={!token||loading} placeholder={'https://paytm.me/...\nhttps://paytm.me/...\nhttps://paytm.me/...'} spellCheck="false"/>
        </label>

        <div className="admin-link-add-counter"><span><Link2 size={15}/> {parsedLinks.length} link{parsedLinks.length===1?'':'s'} detected</span><span>{invalidCount?invalidCount+' invalid':''}</span></div>

        {error&&<div className="admin-link-add-message error"><AlertCircle size={17}/><span>{error}</span><button type="button" onClick={()=>setError('')}><X size={15}/></button></div>}
        {result&&<div className="admin-link-add-message success"><CheckCircle2 size={18}/><div><b>{result.added||0} links added</b><span>{result.skipped||0} duplicate links skipped.</span></div></div>}

        <div className="admin-link-add-actions">
          <button type="button" className="admin-link-add-secondary" onClick={()=>setLinks('')} disabled={!links||loading}><Trash2 size={16}/> Clear</button>
          <button type="submit" className="admin-link-add-primary" disabled={!token||loading||!validLinks.length}>
            {loading?<><RefreshCw size={17} className="admin-link-spin"/> Adding to stock…</>:<><UploadCloud size={17}/> Add {validLinks.length||''} link{validLinks.length===1?'':'s'} to stock</>}
          </button>
        </div>
        <div className="admin-link-add-note"><ShieldCheck size={15}/> Links are validated as HTTPS and duplicate links are skipped automatically.</div>
      </form>
    </section>
  </main>
}