import AdminWorkspace from './AdminWorkspace'

export default function ErpApp(){
  if(!window.location.hash.replace(/^#\/?/,'').startsWith('erp')) return null
  return <AdminWorkspace />
}
