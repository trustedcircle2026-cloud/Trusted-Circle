import React,{useEffect,useState} from 'react'
import ReactDOM from 'react-dom/client'
import AdminWorkspaceV2 from './AdminWorkspaceV2'
import AdminRemoveUser from './AdminRemoveUser'
import GlobalLoading from './GlobalLoading'
import './styles.css'
import './admin-entry.css'

function go(path){window.location.hash=path;window.location.reload()}

function AdminApp(){
  const [route,setRoute]=useState(window.location.hash.replace(/^#\/?/,''))
  useEffect(()=>{const onHash=()=>setRoute(window.location.hash.replace(/^#\/?/,''));window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash)},[])
  const remove=route==='remove-user'||route==='erp-remove-user'
  const back=()=>go('#/dashboard')
  return <>
    <GlobalLoading />
    {!remove&&<div className="tc-admin-quickbar"><span>ERP</span><button onClick={()=>go('#/dashboard')}>Dashboard</button><button onClick={()=>go('#/remove-user')}>Remove User</button></div>}
    {remove?<AdminRemoveUser token={localStorage.getItem('tc_erp_session')||''} onBack={back}/>:<AdminWorkspaceV2/>}
  </>
}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><AdminApp/></React.StrictMode>)
