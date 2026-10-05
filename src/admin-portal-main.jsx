import React,{lazy,Suspense} from 'react'
import ReactDOM from 'react-dom/client'

const AgentBusinessPage=lazy(()=>import('./pages/AgentBusinessPage'))

document.documentElement.classList.add('standalone-portal')

function PortalBoot(){
  return <div style={{
    minHeight:'100vh',
    display:'grid',
    placeItems:'center',
    background:'#f5f8f6',
    color:'#102c20',
    fontFamily:'Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'
  }}>
    <div style={{textAlign:'center'}}>
      <div style={{
        width:42,
        height:42,
        margin:'0 auto 12px',
        borderRadius:12,
        border:'3px solid #d8e8df',
        borderTopColor:'#16834f',
        animation:'tcPortalSpin .7s linear infinite'
      }}/>
      <strong style={{fontSize:14}}>Trusted Circle</strong>
      <div style={{fontSize:10,marginTop:4,color:'#718078'}}>Loading Admin Portal…</div>
      <style>{'@keyframes tcPortalSpin{to{transform:rotate(360deg)}}'}</style>
    </div>
  </div>
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<PortalBoot/>}>
      <AgentBusinessPage />
    </Suspense>
  </React.StrictMode>
)
