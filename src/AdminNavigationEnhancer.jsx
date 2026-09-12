import {useEffect} from 'react'

const LOGO='https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'

export default function AdminNavigationEnhancer(){
 useEffect(()=>{
  let timer
  const install=()=>{
   const sidebar=document.querySelector('.tc-admin-sidebar')
   const header=document.querySelector('.tc-admin-header')
   if(!sidebar||!header)return false

   header.style.display='none'

   let chrome=document.querySelector('.tc-admin-fixed-chrome')
   if(!chrome){
    chrome=document.createElement('div')
    chrome.className='tc-admin-fixed-chrome'
    chrome.innerHTML=`<button type="button" class="tc-admin-logo-button" aria-label="Open website"><img src="${LOGO}" alt="Trusted Circle"/></button><button type="button" class="tc-admin-mobile-menu" aria-label="Open ERP menu">☰</button>`
    document.body.appendChild(chrome)
    chrome.querySelector('.tc-admin-logo-button').onclick=()=>{document.body.classList.remove('tc-admin-menu-open');window.location.href='/' }
    chrome.querySelector('.tc-admin-mobile-menu').onclick=()=>{sidebar.classList.add('open');document.body.classList.add('tc-admin-menu-open')}
   }

   const close=()=>{sidebar.classList.remove('open');document.body.classList.remove('tc-admin-menu-open')}
   if(!sidebar.dataset.tcCloseBound){
    sidebar.addEventListener('click',event=>{
     if(event.target.closest('.tc-admin-nav button'))window.setTimeout(close,80)
    })
    sidebar.dataset.tcCloseBound='1'
   }
   if(!document.body.dataset.tcOutsideMenuBound){
    document.addEventListener('click',event=>{
     if(!document.body.classList.contains('tc-admin-menu-open'))return
     if(event.target.closest('.tc-admin-sidebar')||event.target.closest('.tc-admin-mobile-menu'))return
     close()
    })
    document.body.dataset.tcOutsideMenuBound='1'
   }
   return true
  }
  const onKey=event=>{if(event.key==='Escape')document.body.classList.remove('tc-admin-menu-open')}
  const tick=()=>{if(!install())timer=window.setTimeout(tick,120)}
  tick()
  window.addEventListener('keydown',onKey)
  const observer=new MutationObserver(()=>install())
  observer.observe(document.body,{childList:true,subtree:true})
  return()=>{window.clearTimeout(timer);window.removeEventListener('keydown',onKey);observer.disconnect();document.querySelector('.tc-admin-fixed-chrome')?.remove();document.body.classList.remove('tc-admin-menu-open')}
 },[])
 return null
}
