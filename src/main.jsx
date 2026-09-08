import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErpApp from './ErpApp'
import GlobalLoading from './GlobalLoading'
import './styles.css'
import './site.css'
import './public-ui.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlobalLoading />
    <App />
    <ErpApp />
  </React.StrictMode>
)
