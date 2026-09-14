import React,{useEffect,useState} from 'react'
import ReactDOM from 'react-dom/client'
import {ArrowRight,BookOpen,Building2,CheckCircle2,ChevronRight,LockKeyhole,Mail,ShieldCheck} from 'lucide-react'
import {BOOKS_API_URL,BOOKS_SESSION_KEY} from './books-config'
import BooksWorkspace from './BooksWorkspace'
import BooksOnboarding from './BooksOnboarding'
import './books.css'

const LOGO_URL='https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'

async function request(action,payload={}){
 if(!BOOKS_API_URL)throw new Error('Trusted Circle Books backend URL is not configured.')
 const response=await fetch(BOOKS_API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...payload})})
 const text=await response.text();let data={}
 try{data=JSON.parse(text)}catch{throw new Error('Books backend returned an invalid response.')}
 if(!response.ok||data.ok===false)throw new Error(data.error?.message||data.message||'Books request failed.')
 return data.data??data
}

function Login({onLogin}){
 const[email,setEmail]=useState(''),[otp,setOtp]=useState(''),[step,setStep]=useState('email'),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false)
 const sendOtp=async e=>{e.preventDefault();setMessage('');setError(false);setBusy(true);try{await request('booksRequestOtp',{email:email.trim().toLowerCase()});setStep('otp');setMessage(`Verification code sent to ${email.trim()}.`)}catch(e){setError(true);setMessage(e.message)}finally{setBusy(false)}}
 const verify=async e=>{e.preventDefault();setMessage('');setError(false);setBusy(true);try{const data=await request('booksVerifyOtp',{email:email.trim().toLowerCase(),otp});if(data.session?.token){localStorage.setItem(BOOKS_SESSION_KEY,data.session.token);onLogin(data.user,data)}else throw new Error('Login session was not returned by the Books backend.')}catch(e){setError(true);setMessage(e.message)}finally{setBusy(false)}}
 return <main className="books-login-shell"><section className="books-login-card"><div className="books-brand"><span className="books-logo"><img src={LOGO_URL} alt="Trusted Circle"/></span><div><strong>Trusted Circle Books</strong><small>Cloud Accounting</small></div></div><div className="books-eyebrow"><ShieldCheck size={14}/> SECURE BOOKS ACCESS</div><h1>Run your business<br/><span>with complete control.</span></h1><p className="books-lead">Accounting, invoicing, purchases, banking, GST, inventory and financial reporting — built as one Trusted Circle workspace.</p><div className="books-login-form">{step==='email'?<form onSubmit={sendOtp}><label>Work email</label><div className="books-input"><Mail size={17}/><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email"/></div><button className="books-primary" disabled={busy}>{busy?'Sending…':<>Continue with email <ArrowRight size={17}/></>}</button></form>:<form onSubmit={verify}><label>Verification code</label><div className="books-input"><LockKeyhole size={17}/><input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" required value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))} placeholder="6-digit OTP" autoComplete="one-time-code"/></div><button className="books-primary" disabled={busy}>{busy?'Verifying…':<>Verify & continue <ArrowRight size={17}/></>}</button><button type="button" className="books-secondary" onClick={()=>{setStep('email');setMessage('');setError(false)}}>Use another email</button></form>}{message&&<div className={`books-message ${error?'error':'success'}`} role="alert">{message}</div>}</div><div className="books-trust"><CheckCircle2 size={16}/><span>Organisation-level access · Role-based permissions · Audit-ready records</span></div></section><aside className="books-side"><div className="books-side-top"><span className="books-pill"><BookOpen size={14}/> TRUSTED CIRCLE BOOKS</span><h2>One system for your<br/><em>entire financial year.</em></h2><p>Designed for Indian businesses with FY-wise accounting, GST-ready workflows and management reports.</p></div><div className="books-feature-list"><div><Building2 size={18}/><span><b>Organisation Profile</b><small>GSTIN, PAN, financial year, users & preferences</small></span><ChevronRight size={15}/></div><div><BookOpen size={18}/><span><b>Books of Accounts</b><small>Chart of Accounts, ledgers, journals & opening balances</small></span><ChevronRight size={15}/></div><div><CheckCircle2 size={18}/><span><b>Sales & Purchases</b><small>Customers, vendors, quotations, invoices, bills & payments</small></span><ChevronRight size={15}/></div><div><ShieldCheck size={18}/><span><b>Financial Reports</b><small>Trial Balance, Profit & Loss, Balance Sheet, Cash Flow and more</small></span><ChevronRight size={15}/></div></div><footer>© 2026 Trusted Circle · Books</footer></aside></main>
}

function hasActiveOrganisation(user,payload){
 const a=payload?.organisationAccess||user?.organisationAccess
 if(a==='ACTIVE')return true
 if(user?.organisationStatus==='ACTIVE'||user?.membershipStatus==='ACTIVE')return true
 const memberships=payload?.memberships||user?.memberships||user?.organisationMemberships||[]
 return Array.isArray(memberships)&&memberships.some(x=>String(x?.Status||x?.status||x?.MembershipStatus||x?.membershipStatus||'').toUpperCase()==='ACTIVE')
}

function hasPendingOrganisation(user,payload){
 const a=payload?.organisationAccess||user?.organisationAccess
 if(a==='PENDING')return true
 if(user?.organisationStatus==='PENDING'||user?.membershipStatus==='PENDING')return true
 const memberships=payload?.memberships||user?.memberships||user?.organisationMemberships||[]
 return Array.isArray(memberships)&&memberships.some(x=>String(x?.Status||x?.status||x?.MembershipStatus||x?.membershipStatus||'').toUpperCase()==='PENDING')
}

export default function App(){
 const[user,setUser]=useState(null),[authPayload,setAuthPayload]=useState(null),[checking,setChecking]=useState(true)
 useEffect(()=>{const token=localStorage.getItem(BOOKS_SESSION_KEY);if(!token){setChecking(false);return}request('booksMe',{token}).then(x=>{setUser(x.user);setAuthPayload(x)}).catch(()=>localStorage.removeItem(BOOKS_SESSION_KEY)).finally(()=>setChecking(false))},[])
 const logout=async()=>{const token=localStorage.getItem(BOOKS_SESSION_KEY);try{if(token)await request('booksLogout',{token})}catch{}localStorage.removeItem(BOOKS_SESSION_KEY);setUser(null);setAuthPayload(null)}
 const login=(nextUser,payload)=>{setUser(nextUser);setAuthPayload(payload)}
 if(checking)return <div className="bw-loading">Opening Trusted Circle Books…</div>
 if(!user)return <Login onLogin={login}/>
 if(hasActiveOrganisation(user,authPayload))return <BooksWorkspace user={user} onLogout={logout}/>
 return <BooksOnboarding user={user} accessState={hasPendingOrganisation(user,authPayload)?'PENDING':'NEW'} onComplete={x=>{if(x?.user)setUser(x.user);if(x)setAuthPayload(x);if(x?.session?.token)localStorage.setItem(BOOKS_SESSION_KEY,x.session.token)}} onLogout={logout}/>
}

ReactDOM.createRoot(document.getElementById('books-root')).render(<App/>)
