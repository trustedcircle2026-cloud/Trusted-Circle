import {useState} from 'react'
import {AlertTriangle,ArrowLeft,CheckCircle2,Search,ShieldAlert,UserRound,X} from 'lucide-react'
import {api} from './api'
import './admin-remove-user.css'

export default function AdminRemoveUser({token,onBack}){
 const[query,setQuery]=useState(''),[reason,setReason]=useState(''),[user,setUser]=useState(null),[loading,setLoading]=useState(false),[removing,setRemoving]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 async function findUser(e){e?.preventDefault();setLoading(true);setError('');setMessage('');setUser(null);try{const r=await api.adminFindUserForRemoval(token,query);setUser(r.user)}catch(e){setError(e.message||'Shopper not found.')}finally{setLoading(false)}}
 async function removeUser(){if(!user||!reason.trim())return;setRemoving(true);setError('');setMessage('');try{const r=await api.adminRemoveUser(token,user.email||user.userId,reason);setMessage(`Shopper removed successfully. ${r.revokedSessions||0} active session(s) revoked.`);setUser({...user,status:'REMOVED'});setReason('')}catch(e){setError(e.message||'Unable to remove shopper.')}finally{setRemoving(false)}}
 return <section className="tc-remove-user-page">
  <div className="tc-remove-user-head"><button className="tc-remove-back" onClick={onBack}><ArrowLeft size={16}/> Back to ERP</button><div><small>ADMIN CONTROL · CUSTOMER ACCOUNT</small><h2>Remove User</h2><p>Deactivate a shopper account without deleting financial or order history.</p></div></div>
  <div className="tc-remove-user-grid">
   <div className="tc-remove-card"><div className="tc-remove-card-title"><Search size={18}/><div><b>Find shopper</b><span>Search using email or User ID.</span></div></div><form onSubmit={findUser} className="tc-remove-search"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Email or User ID" autoComplete="off"/><button disabled={loading||!query.trim()}>{loading?'Searching…':'Find User'}</button></form></div>
   {user&&<div className={`tc-remove-card tc-user-result ${user.status==='REMOVED'?'removed':''}`}><div className="tc-remove-card-title"><UserRound size={18}/><div><b>Shopper account</b><span>{user.status}</span></div></div><div className="tc-user-fields"><div><small>Name</small><strong>{user.name||'—'}</strong></div><div><small>Email</small><strong>{user.email}</strong></div><div><small>User ID</small><strong>{user.userId}</strong></div><div><small>Created</small><strong>{user.createdAt||'—'}</strong></div><div><small>Last login</small><strong>{user.lastLoginAt||'—'}</strong></div><div><small>Role</small><strong>{user.role}</strong></div></div></div>}
   {user&&user.status!=='REMOVED'&&<div className="tc-remove-card tc-danger-card"><div className="tc-danger-head"><ShieldAlert size={20}/><div><b>Permanent account action</b><span>This disables the shopper account and revokes all active sessions.</span></div></div><div className="tc-preserve"><CheckCircle2 size={16}/><span>Orders, payments, vouchers, wallet and audit history are preserved.</span></div><label>Removal reason<textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Enter the reason for removing this shopper account…" maxLength={500}/></label><button className="tc-remove-confirm" disabled={removing||!reason.trim()} onClick={removeUser}><AlertTriangle size={16}/>{removing?'Removing user…':'Remove User'}</button></div>}
   {message&&<div className="tc-remove-success"><CheckCircle2 size={18}/><span>{message}</span><button onClick={()=>setMessage('')}><X size={15}/></button></div>}
   {error&&<div className="tc-remove-error"><AlertTriangle size={18}/><span>{error}</span><button onClick={()=>setError('')}><X size={15}/></button></div>}
  </div>
 </section>
}
