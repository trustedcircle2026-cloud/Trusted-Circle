# Trusted Circle Backend setup

The ERP password and payment credentials stay in **Apps Script Script Properties** and are never stored in GitHub.

In **Google Apps Script → Project Settings → Script Properties**, set:

- `ADMIN_EMAIL` = configured administrator email
- `ADMIN_PASSWORD` = administrator ERP password
- `SPREADSHEET_ID` = operational spreadsheet ID
- `EMAIL_FROM` = `trustedcircle2026@gmail.com` or a verified Gmail send-as alias
- `PAYMENT_WEBHOOK_SECRET` = legacy/provider-independent webhook secret, if that route is used
- `PAYTM_MID` = production Paytm Merchant ID
- `PAYTM_MERCHANT_KEY` = production Paytm Merchant Key (keep secret; 16 characters)

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

Required columns are `PaymentLinkStockID`, `Denomination`, `Link`, `Label`, `Status`, `OrderID`, `PaymentLinkID`, `ProviderLinkID`, `CreatedAt`, `UpdatedAt`.

Use `AVAILABLE` for fresh stock. A checkout reserves one matching link as `RESERVED`. A verified payment changes it to `USED`. A cancelled pending order releases it back to `AVAILABLE`.

`ProviderLinkID` is optional but important for Paytm links created outside Trusted Circle. Paytm sends its link identifier in `MERC_UNQ_REF`; storing that value lets the webhook map the payment to the reserved Trusted Circle order.

## Paytm Payment Link automation

Trusted Circle now has a Paytm-specific S2S webhook adapter in `PaytmWebhookService.gs`.

Paytm's Link Payment Status webhook sends fields including `ORDERID`, `TXNAMOUNT`, `STATUS`, `TXNID`, `MERC_UNQ_REF` and `CHECKSUMHASH`. The backend verifies the Paytm checksum using the merchant key before changing any order state.

Configure the **Link Payment Status** webhook for the Paytm MID to the Trusted Circle Apps Script Web App URL:

`https://script.google.com/macros/s/AKfycbxkIICfsVN783oq04KPBTN73ATEYaBuMXPaPCDsbnvP4uTHFDKH2wglKNAj2nWo5He9/exec`

No `action` parameter is required for Paytm. The backend detects a Paytm link-status payload automatically and routes it to `paytmLinkPaymentWebhook_()`.

For API-created Paytm links, the recommended production model is to create the link with Trusted Circle's order number as Paytm's `linkOrderId`. Paytm then returns that order reference in the webhook, allowing deterministic order mapping.

For existing manually-created Paytm links, a short URL alone is **not** sufficient for deterministic server-side mapping because the Paytm webhook does not send the short URL. In that case, store the Paytm `MERC_UNQ_REF` / link ID in `ProviderLinkID` when the link is stocked. Do not mark a payment paid based only on a browser return or screenshot.

A successful Paytm webhook (`STATUS=TXN_SUCCESS`) then:

1. verifies the Paytm checksum;
2. verifies the configured Paytm MID when `PAYTM_MID` is present;
3. maps the transaction to the Trusted Circle order;
4. verifies the exact payment amount against the order total;
5. records the Paytm transaction ID;
6. changes the order to `PAID`;
7. credits the calculated cashback to the shopper wallet;
8. marks the reserved payment-link stock as `USED`;
9. leaves the admin with only the voucher-delivery job.

Duplicate Paytm notifications are handled idempotently by `TXNID`.

Paytm's Link Payment Status webhook is the authoritative payment event; the frontend never marks an order paid by itself.

## Automated payment verification

The customer pays the full voucher value. The backend does **not** mark an order paid because the browser returned from a UPI app.

The existing generic `paymentWebhook` route remains available for non-Paytm providers. Paytm payment links use the Paytm-specific route above.

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

After configuring Paytm's Link Payment Status webhook, run a real low-value test and verify this chain in the spreadsheet:

`Paytm success → Payments VERIFIED → Orders PAID → Cashback credited → PaymentLinkStock USED → Admin voucher queue`

Never put ERP passwords, payment credentials, webhook secrets, API keys, or Google service credentials in this repository.
