const installBooksLink=()=>{
 const footer=document.querySelector('.site-footer .footer-bottom')
 if(!footer||footer.querySelector('.footer-books-link'))return
 const link=document.createElement('a')
 link.className='footer-books-link'
 link.href='./books.html'
 link.textContent='Books'
 link.setAttribute('aria-label','Trusted Circle Books')
 const erp=footer.querySelector('a[href*="admin.html"]')
 if(erp)footer.insertBefore(link,erp)
 else footer.appendChild(link)
}

const observer=new MutationObserver(installBooksLink)
observer.observe(document.body,{childList:true,subtree:true})
installBooksLink()
