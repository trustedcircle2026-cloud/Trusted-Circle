# Trusted Circle Wallet Services

## Production configuration

**Wallet Google Sheet**

Spreadsheet ID:
`1Q5-xDelfCBiYldQAnToDTuQRy4c_rZlHoDvtsaP1mNI`

**Wallet Apps Script Web App**

`https://script.google.com/macros/s/AKfycbwQ11gxZCWCwT0_MGmBErUKmqdNVBUToVMo7IZ2nt2wtzUK2tyT4iHNf4Q2L8ZcLXwC/exec`

The Wallet system is completely independent from Shopping.

## Script Properties

Set in the Wallet Apps Script project:

- `SPREADSHEET_ID` = `1Q5-xDelfCBiYldQAnToDTuQRy4c_rZlHoDvtsaP1mNI`
- `ADMIN_EMAIL` = `trustedcircle2026@gmail.com`
- `WALLET_ADMIN_KEY` = private admin key

Never put `WALLET_ADMIN_KEY` in GitHub or frontend code.

## First-time setup

1. Paste the latest `backend/wallet-app-script/Code.gs` into the Wallet Apps Script project.
2. Save.
3. Set the three Script Properties.
4. Run `setupBackend()` manually once.
5. Confirm these tabs exist:
   - WalletUsers
   - WalletOTP
   - WalletSessions
   - Wallets
   - WalletTransactions
   - WalletPaymentLinks
   - WalletAdminActions
   - WalletAuditLogs
6. Deploy a new Web App version using the same deployment URL.
7. Test:
   `?action=health`

## Customer flow

1. Shopping home → Wallet Services.
2. Wallet email login.
3. OTP sent by Wallet Apps Script.
4. OTP verification creates an independent Wallet session.
5. Wallet Home loads balance and transactions.
6. Add Money offers ₹500 / ₹1,000 / ₹1,500 / ₹2,000.
7. Backend reserves a matching WalletPaymentLinks record for 15 minutes.
8. Payment link opens separately.
9. Wallet Home polls the transaction status.
10. Admin email provides Received / Not Received / Rejected.
11. Received consumes the payment link and credits the wallet.
12. Not Received releases the link and allows Retry.
13. Rejected releases the link and requires a new Add Money transaction.
14. Withdraw reserves the amount and sends an admin approval/rejection email.
15. Wallet Orders shows the full transaction ledger.
16. Download exports the visible transaction ledger as CSV.

## Wallet payment-link stock

Supported denominations:

- ₹500
- ₹1,000
- ₹1,500
- ₹2,000

Lifecycle:

`AVAILABLE → RESERVED → USED`

`AVAILABLE → RESERVED → AVAILABLE` on Not Received or reservation expiry.

`AVAILABLE → REMOVED` for unused links removed by Wallet Admin.

Admin page:

`WalletAdminaddlink.html`

The page supports:
- single link
- bulk links
- stock summary
- available/reserved/used/removed status
- remove available link

## Frontend

Wallet Services route:

`#/wallet-services`

Wallet session key:

`tc_wallet_session`

Frontend API client:

`src/wallet-services-api.js`

Wallet UI:

`src/pages/WalletServicesPage.jsx`

The existing Shopping Cashback Wallet page is not reused or overwritten.
