import {useEffect} from 'react'
import './admin-entry.css'

export default function ErpApp(){
 useEffect(()=>{
  if(!window.location.hash.replace(/^#\/?/,'').startsWith('erp'))return
  const target=window.location.origin+'/admin.html'
  if(window.location.pathname.endsWith('/admin.html'))return
  window.location.replace(target)
 },[])
 return null
}
