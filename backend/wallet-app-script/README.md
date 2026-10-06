# Trusted Circle Wallet Services Backend

Wallet Services is a **completely separate business system** from the existing Shopping website.

## Separation

**Shopping**
- Existing Shopping Google Sheet
- Existing Shopping Apps Script
- Existing Shopping payment links

**Wallet Services**
- New Wallet Google Sheet
- New Wallet Apps Script
- New Wallet payment-link stock
- New Wallet users, wallets and transactions

The Wallet backend does **not** call the Shopping backend and does **not** use Shopping payment-link stock.

## 1. Create the new Wallet Google Sheet

Create a completely new Google Sheet, for example:

**Trusted Circle — Wallet Services**

Do not copy the Shopping payment sheet into this file.

The Apps Script setupBackend() function creates these tabs automatically:

1. WalletUsers
2. WalletOTP
3. WalletSessions
4. Wallets
5. WalletTransactions
6. WalletPaymentLinks
7. WalletAdminActions
8. WalletAuditLogs

## 2. Configure Apps Script Properties

In the Wallet Apps Script project open:

**Project Settings → Script Properties**

Add:

- SPREADSHEET_ID = ID of the new Wallet Google Sheet
- ADMIN_EMAIL = trustedcircle2026@gmail.com
- WALLET_ADMIN_KEY = a strong private key

Never commit WALLET_ADMIN_KEY to GitHub.

The spreadsheet ID is also intentionally not hard-coded in Code.gs.

## 3. Run the initial setup

After the three properties are saved:

1. Open Apps Script editor.
2. Select setupBackend.
3. Click Run.
4. Approve Google authorization when requested.
5. Open the Wallet Google Sheet.

You should then see all eight Wallet tabs with their header rows.

## 4. Wallet payment-link stock

WalletPaymentLinks is the separate payment-link inventory.

Supported denominations:

- ₹500
- ₹1,000
- ₹1,500
- ₹2,000

Lifecycle:

AVAILABLE → RESERVED → USED

AVAILABLE → RESERVED → AVAILABLE when the payment is marked Not Received or the reservation expires.

AVAILABLE → REMOVED when Wallet Admin removes unused stock.

Reservations are held for 15 minutes.

## 5. Current frontend foundation

The Shopping home page now has a separate Wallet Services button beside Shop vouchers.

It opens:

#/wallet-services

The new page has:

1. Email login
2. OTP verification
3. Wallet Home shell after successful login

Wallet login uses its own session key:

tc_wallet_session

It does not reuse the Shopping login session.

## 6. Wallet Apps Script deployment

After the backend is complete:

- Deploy the Wallet Apps Script as a Web App.
- Execute as the Wallet owner/admin account.
- Give the web app the required access for the intended customer flow.
- Copy the /exec URL.
- Put it into the frontend environment variable:

VITE_WALLET_APPS_SCRIPT_URL

The current frontend intentionally contains a placeholder until the real /exec URL is available.

## 7. Next Wallet modules

The next implementation stage will connect the Wallet Home to:

- real balance
- Add Money
- ₹500 / ₹1,000 / ₹1,500 / ₹2,000 payment-link reservation
- independent Wallet payment gateway stock
- payment waiting/checking
- admin Received / Not Received / Rejected
- retry payment
- withdrawal with UPI ID
- Wallet Orders
- transaction timeline
- downloadable transaction statement
- WalletAdminaddlink.html stock management
