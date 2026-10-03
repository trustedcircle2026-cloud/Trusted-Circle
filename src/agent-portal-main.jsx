import React from 'react'
import ReactDOM from 'react-dom/client'
import AgentPortalPage from './pages/AgentPortalPage'
import './agent-portal.css'

document.documentElement.classList.add('standalone-portal')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AgentPortalPage />
  </React.StrictMode>
)
