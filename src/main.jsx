import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import GlobalLoading from './GlobalLoading'
import './styles.css'
import './site.css'
import './public-ui.css'
import './erp-overrides.css'
import './shopping-upgrade.css'
import './erp-polish.css'
import './books-footer.css'
import './footer-books-link.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlobalLoading />
    <App />
  </React.StrictMode>
)
