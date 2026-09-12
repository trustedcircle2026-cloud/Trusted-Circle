import {useEffect} from 'react'
import './admin-header-controls.css'

const LOGO='https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'

export default function AdminHeaderControls(){
 useEffect(()=>{
  let timer
  const get=sel=>document.querySelector(sel)
  const syncClose=()=>{const shell=get('.tc-admin-shell'),sidebar=get('.tc-admin-sidebar');shell?.classList.remove('sidebar-open');shell?.classList.add('sidebar-closed');sidebar?.classList.remove('open');document.body.classList.remove('tc-admin-menu-open')}
  const install=()=>{
   const header=get('.tc-admin-header'),sidebar=get('.tc-admin-sidebar'),shell=get('.tc-admin-shell')
   if(!header||!sidebar||!shell)return false
   header.classList.add('tc-clean-admin-header')
   const nativeMenu=header.querySelector('.tc-admin-mobile')
   if(nativeMenu){nativeMenu.style.display='none';nativeMenu.setAttribute('aria-hidden','true')}
   let menu=header.querySelector('.tc-clean-menu-button')
   if(!menu){menu=document.createElement('button');menu.type='button';menu.className='tc-clean-menu-button';menu.setAttribute('aria-label','Open ERP menu');menu.innerHTML='<span></span><span></span><span></span>';header.appendChild(menu)}
   let home=header.querySelector('.tc-clean-home-button')
   if(!home){home=document.createElement('button');home.type='button';home.className='tc-clean-home-button';home.setAttribute('aria-label','Return to Trusted Circle home');home.innerHTML=`<img src="${LOGO}" alt="Trusted Circle home"/>`;header.appendChild(home)}
   menu.onclick=e=>{
    e.preventDefault();e.stopPropagation()
    const open=shell.classList.contains('sidebar-open')
    if(open){syncClose();return}
    shell.classList.remove('sidebar-closed');shell.classList.add('sidebar-open');sidebar.classList.add('open');document.body.classList.add('tc-admin-menu-open')
   }
   home.onclick=e=>{e.preventDefault();e.stopPropagation();syncClose();window.location.assign('/')}
   if(!sidebar.dataset.tcCleanCloseBound){sidebar.addEventListener('click',e=>{if(e.target.closest('.tc-admin-nav button'))setTimeout(syncClose,100)});sidebar.dataset.tcCleanCloseBound='1'}
   return true
  }
  const tick=()=>{if(!install())timer=setTimeout(tick,100)}
  tick()
  const observer=new MutationObserver(install);observer.observe(document.body,{subtree:true,childList:true})
  const key=e=>{if(e.key==='Escape')syncClose()};window.addEventListener('keydown',key)
  return()=>{clearTimeout(timer);observer.disconnect();window.removeEventListener('keydown',key)}
 },[])
 return null
}
