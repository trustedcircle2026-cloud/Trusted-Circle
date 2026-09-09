# Trusted Circle Backend setup

The ERP password and payment webhook secret stay in **Apps Script Script Properties** and are never stored in GitHub.

In **Google Apps Script → Project Settings → Script Properties**, set:

- `ADMIN_EMAIL` = configured administrator email
- `ADMIN_PASSWORD` = administrator ERP password
- `SPREADSHEET_ID` = operational spreadsheet ID
- `EMAIL_FROM` = `trustedcircle2026@gmail.com` or a verified Gmail send-as alias
- `PAYMENT_WEBHOOK_SECRET` = a long random secret shared only with the payment gateway webhook

Run `setupBackend()` once. It creates/migrates the operational sheets, including:

- `PaymentLinkStock`
- `CashbackWallet`
- `CashbackTransactions`
- `WalletRedemptions`

## Payment-link stock

Use `PaymentLinkStock` for reusable payment links. Keep five available links for each value:

- ₹500 — 5 links
- ₹1,000 — 5 links
- ₹1,500 — 5 links
- ₹2,000 — 5 links

Required columns are `PaymentLinkStockID`, `Denomination`, `Link`, `Label`, `Status`, `OrderID`, `PaymentLinkID`, `CreatedAt`, `UpdatedAt`.

Use `AVAILABLE` for fresh stock. A checkout reserves one matching link as `RESERVED`. A verified payment changes it to `PAID`. A cancelled pending order releases it back to `AVAILABLE`.

## Automated payment verification

The customer pays the full voucher value. The backend does **not** mark an order paid because the browser returned from a UPI app.

The payment gateway must call the Apps Script Web App with:

`action=paymentWebhook`

and provide `webhookSecret`, `orderNumber` (or `orderId`), `amount`, `status`, `paymentId`, and `provider`.

Only successful gateway statuses (`SUCCESS`, `PAID`, `CAPTURED`, `COMPLETED`) are accepted, and the gateway amount must exactly match the order total. A successful webhook then:

1. verifies the payment;
2. changes the order to `PAID`;
3. credits the calculated cashback to the shopper wallet;
4. marks a reserved payment-link stock item as `PAID`.

The admin does **not** need to confirm payment manually. The only per-order fulfilment action left for admin is sending the voucher.

The gateway provider still needs its webhook configuration mapped to the `paymentWebhook` payload above. Until that gateway callback is configured, payment verification cannot be fully automatic.

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
