# Trusted Circle Backend setup

The ERP password and payment credentials stay in **Apps Script Script Properties** and are never stored in GitHub.

In **Google Apps Script → Project Settings → Script Properties**, set:

- `ADMIN_EMAIL` = configured administrator email
- `ADMIN_PASSWORD` = administrator ERP password
- `SPREADSHEET_ID` = operational spreadsheet ID
- `EMAIL_FROM` = `trustedcircle2026@gmail.com` or a verified Gmail send-as alias
- `PAYMENT_WEBHOOK_SECRET` = legacy/provider-independent webhook secret, if that route is used

Run `setupBackend()` once. It creates/migrates the operational sheets, including:

- `PaymentLinkStock`
- `PaymentLinkStockAlerts`
- `CashbackWallet`
- `CashbackTransactions`
- `WalletRedemptions`

## Payment-link stock

Use `PaymentLinkStock` for reusable payment links. Keep five available links for each value:

- ₹500 — 5 links
- ₹1,000 — 5 links
- ₹1,500 — 5 links
- ₹2,000 — 5 links

Required columns are `PaymentLinkStockID`, `Denomination`, `Link`, `Label`, `Status`, `OrderID`, `PaymentLinkID`, `ProviderLinkID`, `CreatedAt`, `UpdatedAt`. Reservation metadata uses `ReservedAt` and `ExpiresAt`.

Use `AVAILABLE` for fresh stock. A checkout reserves one matching link as `RESERVED`. A verified payment changes it to `USED`. A cancelled pending order releases it back to `AVAILABLE`.

`ProviderLinkID` is optional and can be retained for future provider integrations. The current Trusted Circle flow does not require Paytm MID, Merchant Key, API credentials, or a Paytm webhook.

## Payment-link stock alerts and email replenishment

`PaymentLinkStockAlertService.gs` uses a **separate** `PaymentLinkStockAlerts` sheet. This keeps the existing `AdminEmailActions` records used by order action emails unchanged.

The alert threshold is **below 2 AVAILABLE links** for each supported denomination. Alerts are checked immediately after a link is reserved or consumed, and `sendLowStockAlertsForAllPaymentLinkDenominations_()` can be run manually to scan all four supported denominations.

When a customer requests a payment link and no matching stock exists, the backend immediately sends an administrator email containing:

- Requested amount
- Customer email/name when available
- Order ID when the request already belongs to an order
- One-time secure stock-action token
- Payment-link textbox
- `ADD LINK TO STOCK` button
- `Open secure stock form` fallback for email clients that do not support HTML forms

The amount/denomination is bound to the token on the server. The submitted link must use HTTPS and cannot duplicate an existing stocked link. Successful submission:

1. Inserts the link into `PaymentLinkStock` as `AVAILABLE`
2. Marks the alert token `USED`
3. Records an audit event
4. Shows a confirmation page with the remaining available stock

The token expires automatically after 7 days and cannot be reused. The server re-reads the token inside a script lock before inserting the stock row.

The `PaymentLinkStockAlerts` sheet uses:

`AlertID`, `TokenHash`, `Denomination`, `RequestedAmount`, `OrderID`, `UserID`, `UserEmail`, `UserName`, `Reason`, `Status`, `ExpiresAt`, `CreatedAt`, `UsedAt`, `UsedBy`.

For first-time installation, copy **all** files from `backend/apps-script` into the same Apps Script project. The new alert sheet is created automatically the first time an alert or secure stock form is used. If you use a deployment without live script access to the updated source, create a **new Web App deployment/version** after importing these changes.

### Email action endpoint

`Code.gs` now preserves the existing `emailAction` order buttons and additionally recognizes:

`?stockAction=ADD_PAYMENT_LINK&token=...`

- GET without a link displays the secure stock form.
- POST with the payment link validates and inserts it into stock.

The existing generic API POST route continues unchanged for normal application requests.

## Paytm for Business payment links

Trusted Circle currently uses **manually-created Paytm for Business payment links** as payment-link stock. These links are assigned to the customer order by denomination.

The current setup is intentionally **not** a Paytm Payment Gateway/API integration. There is no Paytm MID, Merchant Key, checksum validation, or Paytm webhook code in Trusted Circle.

When a customer pays, the payment must be verified in the Paytm for Business dashboard/app before the order is treated as paid. Trusted Circle must never mark an order paid merely because the customer returns from Paytm/UPI in the browser, or based on a screenshot.

Full automatic server-side Paytm payment verification is not available in this manual-link model. It would require a supported Paytm API/webhook integration to be added later.

The operational flow is therefore:

`Paytm for Business payment link → Customer pays → Admin verifies payment in Paytm Business → Trusted Circle voucher delivery`

The admin's operational responsibility remains limited to voucher delivery after payment has been independently verified.

## Automated payment verification

The customer pays the full voucher value. The backend does **not** mark an order paid because the browser returned from a UPI app.

The existing generic `paymentWebhook` route remains available for non-Paytm providers that supply a supported server-to-server webhook. Paytm for Business manually-created links do not use that route automatically.

## Cashback wallet

Checkout collects the **full voucher value**. The product discount is stored as cashback instead of reducing the payment amount.

Cashback is credited only after verified payment. The shopper sees the balance in the header and can open the wallet to view transaction history or request a redemption to:

- UPI ID
- Bank account + IFSC

Wallet redemption creates a `WalletRedemptions` request. Actual money transfer requires the payout/transfer process or provider integration used by the business.

## Customer emails

Customer-facing transactional emails are limited to:

1. OTP
2. Payment link received
3. Voucher receipt

Each supported event sends one separate shopper email and one separate operations copy to `info@trustedcircle.in`. Order-created and generic payment-status emails are not sent.

Payment-link and voucher emails use the shopper's name and brand/voucher names instead of internal item codes.

## Deployment

After changing Apps Script files, create a **new Web App deployment/version** so the live URL uses the latest code. The first deployment after invoice/wallet changes may request additional Google permissions.

Never put ERP passwords, payment credentials, webhook secrets, API keys, or Google service credentials in this repository.
