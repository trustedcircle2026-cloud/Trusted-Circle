import React,{useEffect,useState} from 'react'
import ReactDOM from 'react-dom/client'
import AdminWorkspaceV2 from './AdminWorkspaceV2'
import AdminRemoveUser from './AdminRemoveUser'
import AdminKpiAllPages from './AdminKpiAllPages'
import AdminHeaderControls from './AdminHeaderControls'
import GlobalLoading from './GlobalLoading'
import './styles.css'
import './admin-entry.css'

function route(){return window.location.hash.replace(/^#\/?/,'')}

function AdminApp(){
 const[routeName,setRouteName]=useState(route())
 useEffect(()=>{
  const onHash=()=>setRouteName(route())
  window.addEventListener('hashchange',onHash)
  return()=>window.removeEventListener('hashchange',onHash)
 },[])
 const remove=routeName==='remove-user'||routeName==='erp-remove-user'
 return <>
  <GlobalLoading/>
  {!remove&&<AdminKpiAllPages/>}
  {!remove&&<AdminHeaderControls/>}
  {remove
   ? <AdminRemoveUser token={localStorage.getItem('tc_erp_session')||''} onBack={()=>{window.location.hash='';setRouteName('')}}/>
   : <AdminWorkspaceV2/>
  }
 </>
}

ReactDOM.createRoot(document.getElementById('root')).render(<AdminApp/>)
