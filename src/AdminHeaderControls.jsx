import {useEffect} from 'react'
import './admin-header-controls.css'

const LOGO='https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'

export default function AdminHeaderControls(){
 useEffect(()=>{
  let timer
  const install=()=>{
   const header=document.querySelector('.tc-admin-header')
   const sidebar=document.querySelector('.tc-admin-sidebar')
   if(!header||!sidebar)return false

   header.classList.add('tc-clean-admin-header')

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

   const close=()=>{
    sidebar.classList.remove('open')
    document.body.classList.remove('tc-admin-menu-open')
   }
   const toggle=()=>{
    const open=!sidebar.classList.contains('open')
    sidebar.classList.toggle('open',open)
    document.body.classList.toggle('tc-admin-menu-open',open)
   }
   menu.onclick=toggle
   home.onclick=()=>{
    close()
    window.location.href='/'
   }

   if(!sidebar.dataset.tcCleanCloseBound){
    sidebar.addEventListener('click',event=>{
     if(event.target.closest('.tc-admin-nav button'))window.setTimeout(close,80)
    })
    sidebar.dataset.tcCleanCloseBound='1'
   }
   return true
  }
  const onKey=e=>{if(e.key==='Escape'){const sidebar=document.querySelector('.tc-admin-sidebar');sidebar?.classList.remove('open');document.body.classList.remove('tc-admin-menu-open')}}
  const tick=()=>{if(!install())timer=window.setTimeout(tick,100)}
  tick()
  const observer=new MutationObserver(()=>install())
  observer.observe(document.body,{subtree:true,childList:true})
  window.addEventListener('keydown',onKey)
  return()=>{clearTimeout(timer);observer.disconnect();window.removeEventListener('keydown',onKey)}
 },[])
 return null
}
