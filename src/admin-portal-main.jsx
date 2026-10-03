import React from 'react'
import ReactDOM from 'react-dom/client'
import AgentBusinessPage from './pages/AgentBusinessPage'
import './agent-business.css'

document.documentElement.classList.add('standalone-portal')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AgentBusinessPage />
  </React.StrictMode>
)
