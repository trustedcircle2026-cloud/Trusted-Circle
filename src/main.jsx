import React,{useEffect,useState} from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErpApp from './ErpApp'
import GlobalLoading from './GlobalLoading'
import './styles.css'
import './site.css'
import './public-ui.css'
import './erp-overrides.css'
import './shopping-upgrade.css'
import './erp-polish.css'
import './books-footer.css'
import './footer-books-link.js'

function isErpRoute(){return window.location.hash.replace(/^#\/?/,'').startsWith('erp')}

function Root(){
  const[erp,setErp]=useState(isErpRoute())
  useEffect(()=>{const onHash=()=>setErp(isErpRoute());window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash)},[])
  return <React.StrictMode>
    <GlobalLoading />
    {erp?<ErpApp/>:<App/>}
  </React.StrictMode>
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />)
