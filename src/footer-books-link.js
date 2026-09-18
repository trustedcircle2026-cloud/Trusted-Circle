const installPrivateLinks=()=>{
 const footer=document.querySelector('.site-footer .footer-bottom')
 if(!footer)return

 const erp=footer.querySelector('a[href*="admin.html"]')
 if(!footer.querySelector('.footer-books-link')){
  const link=document.createElement('a')
  link.className='footer-books-link'
  link.href='./books.html'
  link.textContent='Books'
  link.setAttribute('aria-label','Trusted Circle Books')
  if(erp)footer.insertBefore(link,erp)
  else footer.appendChild(link)
 }

 if(!footer.querySelector('.footer-cards-link')){
  const link=document.createElement('a')
  link.className='footer-cards-link'
  link.href='./cards.html'
  link.textContent='Cards'
  link.setAttribute('aria-label','Trusted Circle Cards')
  if(erp)footer.insertBefore(link,erp)
  else footer.appendChild(link)
 }
}

const observer=new MutationObserver(installPrivateLinks)
observer.observe(document.body,{childList:true,subtree:true})
installPrivateLinks()
