import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, ShieldCheck } from 'lucide-react'
import './global-loading.css'

export default function GlobalLoading() {
  const [state, setState] = useState({ active: false, message: 'Please wait…' })
  const activeCount = useRef(0)

  useEffect(() => {
    const onLoading = event => {
      const active = Boolean(event.detail?.active)
      activeCount.current = Math.max(0, activeCount.current + (active ? 1 : -1))
      setState({
        active: activeCount.current > 0,
        message: event.detail?.message || 'Please wait…',
      })
    }
    window.addEventListener('tc:loading', onLoading)
    return () => window.removeEventListener('tc:loading', onLoading)
  }, [])

  useEffect(() => {
    if (!state.active) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [state.active])

  if (!state.active) return null

  return (
    <div className="global-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="global-loading-card">
        <div className="global-loading-icon"><LoaderCircle className="global-loading-spin" size={30} /></div>
        <strong>{state.message}</strong>
        <span><ShieldCheck size={13} /> Securely processing your request</span>
      </div>
    </div>
  )
}
