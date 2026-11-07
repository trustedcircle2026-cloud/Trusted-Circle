import React from 'react'
import { createRoot } from 'react-dom/client'
import TradersApp from './traders-app.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(<React.StrictMode><TradersApp /></React.StrictMode>)
