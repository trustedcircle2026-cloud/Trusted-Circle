# Wallet Services Backend

This backend is now **100% independent from Shopping**.

### Separate systems
- Shopping website: existing Shopping Apps Script + Shopping payment-link stock.
- Wallet Services: this Apps Script + separate Wallet Google Sheet + WalletPaymentLinks stock.
- Wallet never calls the Shopping backend for payment links.

### Wallet sheet tabs created by setupBackend
WalletUsers, WalletOTP, WalletSessions, Wallets, WalletTransactions, WalletPaymentLinks, WalletAdminActions, WalletAuditLogs.

### Script Properties
Set these in Apps Script:
- SPREADSHEET_ID = your separate Wallet Google Sheet ID
- ADMIN_EMAIL = trustedcircle2026@gmail.com
- WALLET_ADMIN_KEY = strong private admin key

Never commit WALLET_ADMIN_KEY to GitHub.

### Wallet payment gateway
The Wallet payment gateway is represented by payment URLs stored in WalletPaymentLinks. Admin manually adds the links through WalletAdminaddlink.html.

Supported denominations: 500, 1000, 1500, 2000.

Link lifecycle:
AVAILABLE -> RESERVED -> USED
AVAILABLE -> RESERVED -> AVAILABLE (Not Received / reservation expiry)
AVAILABLE -> REMOVED (admin removal)

Reservation time: 15 minutes.

### Admin page
WalletAdminaddlink.html is the separate stock-management page. Before using it, replace:
PASTE_WALLET_APPS_SCRIPT_EXEC_URL_HERE
with the deployed Wallet Apps Script /exec URL.

The page supports single-link and bulk-link entry and stock viewing.

### Customer flow
1. Customer logs into Wallet Services using Email + OTP.
2. Selects Add Money amount.
3. Wallet reserves a matching payment link from WalletPaymentLinks.
4. Customer is redirected to that payment link.
5. Admin receives Received / Not Received / Rejected.
6. Received consumes the link and credits wallet.
7. Not Received releases the link and enables retry.
8. Rejected releases the link and requires a new payment.

No Shopping code or Shopping payment stock is used by this Wallet backend.
