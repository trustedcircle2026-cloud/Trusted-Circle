import { useEffect,useState } from 'react'
import { WalletCards } from 'lucide-react'
import { api } from '../api'

const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
export default function WalletBadge({token,onOpen}){
  const [balance,setBalance]=useState(0)
  useEffect(()=>{let active=true;const load=async()=>{if(!token){setBalance(0);return}try{const data=await api.wallet(token);if(active)setBalance(Number(data?.wallet?.balance||0))}catch{if(active)setBalance(0)}};load();const refresh=()=>load();window.addEventListener('tc:wallet-updated',refresh);return()=>{active=false;window.removeEventListener('tc:wallet-updated',refresh)}},[token])
  if(!token)return null
  return <button className="wallet-badge" onClick={onOpen} aria-label="Cashback wallet"><WalletCards size={17}/><span>{money(balance)}</span></button>
}
