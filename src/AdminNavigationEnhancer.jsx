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
    trigger.innerHTML=`<img src="${LOGO}" alt="Trusted Circle"/><span><b>Trusted Circle</b><small>ERP MENU · DASHBOARD</small></span><i>☰</i>`
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
   const openMenu=()=>{sidebar.classList.add('open');document.body.classList.add('tc-admin-menu-open')}
   const goDashboard=()=>{const dashboard=[...sidebar.querySelectorAll('.tc-admin-nav button')].find(button=>/dashboard/i.test(button.textContent||''));if(dashboard)dashboard.click()}
   trigger.onclick=()=>{goDashboard();openMenu()}
   backdrop.onclick=close
   if(!sidebar.dataset.tcCloseBound){
    sidebar.addEventListener('click',event=>{if(event.target.closest('.tc-admin-nav button'))window.setTimeout(close,80)})
    sidebar.dataset.tcCloseBound='1'
   }
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
