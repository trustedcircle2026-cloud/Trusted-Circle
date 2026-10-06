# Wallet Services Apps Script

Separate backend for Trusted Circle Wallet Services.

## Google Sheet
ID: 1Q5-xDelfCBiYldQAnToDTuQRy4c_rZlHoDvtsaP1mNI

## Script Properties
- SPREADSHEET_ID = 1Q5-xDelfCBiYldQAnToDTuQRy4c_rZlHoDvtsaP1mNI
- ADMIN_EMAIL = trustedcircle2026@gmail.com
- SHOPPING_PAYMENT_API_URL = https://script.google.com/macros/s/AKfycbxkIICfsVN783oq04KPBTN73ATEYaBuMXPaPCDsbnvP4uTHFDKH2wglKNAj2nWo5He9/exec
- SHOPPING_PAYMENT_BRIDGE_SECRET = same secret as WALLET_BRIDGE_SECRET in the existing Shopping Apps Script

Do not commit the bridge secret to GitHub.

## Setup
1. Copy Code.gs into the Wallet Apps Script project.
2. Add the Script Properties.
3. Deploy as Web App.
4. Call ?action=setupBackend once.
5. The backend creates WalletUsers, WalletOTP, WalletSessions, Wallets, WalletTransactions, WalletAdminActions and WalletAuditLogs.

## API
requestOtp, verifyOtp, me, wallet, walletOrders, transactionStatus, addMoney, retryAddMoney, withdrawMoney, logout.

## Payment architecture
Wallet owns wallet users, balances and transactions. Existing Shopping owns payment-link stock. Wallet calls the existing Shopping bridge actions reserveWalletPaymentLink, releaseWalletPaymentLink and consumeWalletPaymentLink.
