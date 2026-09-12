import {useEffect} from 'react'
import './admin-header-controls.css'

const LOGO='https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'

export default function AdminHeaderControls(){
 useEffect(()=>{
  let timer
  let observer
  const get=sel=>document.querySelector(sel)
  const close=()=>{
   const nativeClose=get('.tc-admin-sidebar .tc-sidebar-close')
   if(nativeClose) nativeClose.click()
   else{
    get('.tc-admin-sidebar')?.classList.remove('open')
    get('.tc-admin-shell')?.classList.remove('sidebar-open')
    get('.tc-admin-shell')?.classList.add('sidebar-closed')
   }
   document.body.classList.remove('tc-admin-menu-open')
  }
  const install=()=>{
   const header=get('.tc-admin-header'),sidebar=get('.tc-admin-sidebar'),shell=get('.tc-admin-shell')
   if(!header||!sidebar||!shell)return false
   header.classList.add('tc-clean-admin-header')
   const nativeMenu=header.querySelector('.tc-admin-mobile')
   nativeMenu?.setAttribute('aria-hidden','true')

   let menu=header.querySelector('.tc-clean-menu-button')
   if(!menu){
    menu=document.createElement('button')
    menu.type='button'
    menu.className='tc-clean-menu-button'
    menu.setAttribute('aria-label','Open ERP menu')
    menu.innerHTML='<span></span><span></span><span></span>'
    header.appendChild(menu)
   }
   let home=header.querySelector('.tc-clean-home-button')
   if(!home){
    home=document.createElement('button')
    home.type='button'
    home.className='tc-clean-home-button'
    home.setAttribute('aria-label','Return to Trusted Circle home')
    home.innerHTML=`<img src="${LOGO}" alt="Trusted Circle home"/>`
    header.appendChild(home)
   }

   menu.onclick=()=>{
    // Use the real React-controlled menu button so sidebarOpen/mobile state stays in sync.
    if(nativeMenu){nativeMenu.click();return}
    const isOpen=shell.classList.contains('sidebar-open')||sidebar.classList.contains('open')
    shell.classList.toggle('sidebar-open',!isOpen)
    shell.classList.toggle('sidebar-closed',isOpen)
    sidebar.classList.toggle('open',!isOpen)
    document.body.classList.toggle('tc-admin-menu-open',!isOpen)
   }
   home.onclick=()=>{close();window.location.href='/' }

   if(!sidebar.dataset.tcCleanCloseBound){
    sidebar.addEventListener('click',event=>{
     if(event.target.closest('.tc-admin-nav button'))window.setTimeout(close,80)
    })
    sidebar.dataset.tcCleanCloseBound='1'
   }
   return true
  }
  const onKey=e=>{if(e.key==='Escape')close()}
  const tick=()=>{if(!install())timer=window.setTimeout(tick,100)}
  tick()
  observer=new MutationObserver(()=>install())
  observer.observe(document.body,{subtree:true,childList:true})
  window.addEventListener('keydown',onKey)
  return()=>{clearTimeout(timer);observer?.disconnect();window.removeEventListener('keydown',onKey)}
 },[])
 return null
}
