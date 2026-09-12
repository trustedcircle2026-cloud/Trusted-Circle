import {useEffect} from 'react'

const LOGO='https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'

export default function AdminNavigationEnhancer(){
 useEffect(()=>{
  let timer
  const install=()=>{
   const header=document.querySelector('.tc-admin-header')
   const sidebar=document.querySelector('.tc-admin-sidebar')
   if(!header||!sidebar)return false
   let trigger=header.querySelector('.tc-menu-trigger')
   let backdrop=document.querySelector('.tc-admin-menu-backdrop')
   if(!trigger){
    trigger=document.createElement('button')
    trigger.type='button'
    trigger.className='tc-menu-trigger'
    trigger.setAttribute('aria-label','Open ERP menu')
    trigger.innerHTML=`<img src="${LOGO}" alt="Trusted Circle"/><span><b>Trusted Circle</b><small>ERP MENU</small></span><i>☰</i>`
    header.insertBefore(trigger,header.firstChild)
   }
   if(!backdrop){
    backdrop=document.createElement('button')
    backdrop.type='button'
    backdrop.className='tc-admin-menu-backdrop'
    backdrop.setAttribute('aria-label','Close ERP menu')
    document.body.appendChild(backdrop)
   }
   const close=()=>{sidebar.classList.remove('open');document.body.classList.remove('tc-admin-menu-open')}
   const toggle=()=>{const open=!sidebar.classList.contains('open');sidebar.classList.toggle('open',open);document.body.classList.toggle('tc-admin-menu-open',open)}
   trigger.onclick=toggle
   backdrop.onclick=close
   sidebar.querySelectorAll('.tc-admin-nav button').forEach(button=>{button.onclick=(()=>{const original=button.onclick;return function(e){if(original&&original!==arguments.callee)original.call(this,e);close()}})()})
   return true
  }
  const tick=()=>{if(!install())timer=window.setTimeout(tick,120)}
  tick()
  const observer=new MutationObserver(()=>install())
  observer.observe(document.body,{childList:true,subtree:true})
  return()=>{window.clearTimeout(timer);observer.disconnect();document.body.classList.remove('tc-admin-menu-open');document.querySelector('.tc-admin-menu-backdrop')?.remove()}
 },[])
 return null
}
