import React,{useEffect,useState} from 'react'

const PURPOSES={
  booksRequestOtp:'Sending verification code to your email…',
  booksVerifyOtp:'Verifying your OTP and creating a secure Books session…',
  booksMe:'Checking your Books session and organisation access…',
  booksLogout:'Signing you out securely…',
  booksGetOrganisation:'Loading your active organisation…',
  booksDashboard:'Loading dashboard financial data…',
  booksUiList:'Loading records…',
  booksUiSave:'Saving your record securely…',
  booksSearch:'Searching your Books workspace…',
  booksSaveOrganisation:'Saving organisation details…',
  booksGeneralLedger:'Loading General Ledger…',
  booksAccountLedger:'Loading Account Ledger…',
  booksDayBook:'Loading Day Book…',
  booksCashFlow:'Calculating Cash Flow…',
  booksGstReport:'Loading GST report data…',
  booksGstrData:'Preparing GSTR-oriented data…',
  booksStockLedger:'Loading stock ledger…',
  booksFifoValuation:'Calculating FIFO inventory valuation…',
  booksCreateInvoice:'Posting invoice and accounting entries…',
  booksCreateBill:'Posting bill and accounting entries…'
}

export const loadingPurpose=action=>PURPOSES[action]||'Processing your Books request…'

export default function BooksLoading(){
  const[active,setActive]=useState(null)
  useEffect(()=>{
    const start=e=>setActive(e.detail||{message:'Processing your Books request…'})
    const stop=()=>setActive(null)
    window.addEventListener('tc-books-loading-start',start)
    window.addEventListener('tc-books-loading-stop',stop)
    return()=>{
      window.removeEventListener('tc-books-loading-start',start)
      window.removeEventListener('tc-books-loading-stop',stop)
    }
  },[])
  if(!active)return null
  return <div className="tc-books-loading" role="status" aria-live="polite" aria-label={active.message}>
    <div className="tc-books-loading-card">
      <div className="tc-books-loading-logo"><img src="https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg" alt="Trusted Circle"/></div>
      <div className="tc-books-spinner" aria-hidden="true"/>
      <strong>Trusted Circle Books</strong>
      <span>{active.message}</span>
    </div>
  </div>
}
