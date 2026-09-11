import { useEffect,useState } from 'react'
import AdminWorkspaceV2 from './AdminWorkspaceV2'
export default function ErpApp(){
 const[isErp,setIsErp]=useState(()=>window.location.hash.replace(/^#\/?/,'').startsWith('erp'))
 useEffect(()=>{const onHash=()=>setIsErp(window.location.hash.replace(/^#\/?/,'').startsWith('erp'));window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash)},[])
 return isErp?<AdminWorkspaceV2/>:null
}
