import {useEffect,useState} from 'react'
import AdminWorkspaceV2 from './AdminWorkspaceV2'
import AdminRemoveUser from './AdminRemoveUser'
export default function ErpApp(){
 const[route,setRoute]=useState(window.location.hash.replace(/^#\/?/,''))
 useEffect(()=>{const onHash=()=>setRoute(window.location.hash.replace(/^#\/?/,''));window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash)},[])
 const isRemove=route==='erp-remove-user'
 const isErp=route.startsWith('erp')
 const token=localStorage.getItem('tc_erp_session')||''
 if(!isErp)return null
 if(isRemove)return <AdminRemoveUser token={token} onBack={()=>{window.location.hash='#/erp'}}/>
 return <AdminWorkspaceV2/>
}
