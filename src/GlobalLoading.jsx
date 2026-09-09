import { useEffect, useRef, useState } from 'react'
import './global-loading.css'

const LOGO_URL='https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'

export default function GlobalLoading(){
  const [active,setActive]=useState(false)
  const activeCount=useRef(0)
  useEffect(()=>{
    const onLoading=event=>{
      const next=Boolean(event.detail?.active)
      activeCount.current=Math.max(0,activeCount.current+(next?1:-1))
      setActive(activeCount.current>0)
    }
    window.addEventListener('tc:loading',onLoading)
    return()=>window.removeEventListener('tc:loading',onLoading)
  },[])
  if(!active)return null
  return <div className="global-loading" role="status" aria-live="polite" aria-busy="true"><div className="global-loading-mark"><img src={LOGO_URL} alt="Trusted Circle"/></div></div>
}
