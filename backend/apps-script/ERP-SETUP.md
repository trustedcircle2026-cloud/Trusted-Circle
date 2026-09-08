# Trusted Circle ERP setup

The ERP password is intentionally **not stored in GitHub**.

In the Google Apps Script project **Trusted Circle Backend**, open:
**Project Settings → Script Properties → Add script property**

Set:

- `ADMIN_EMAIL` = the configured administrator email
- `ADMIN_PASSWORD` = the administrator ERP password
- `SPREADSHEET_ID` = the operational spreadsheet ID
- `EMAIL_FROM` = `trustedcircle2026@gmail.com` (or a verified Gmail send-as alias)

The transactional email service sends **two separate emails** for supported events:

1. Shopper email — sent to the shopper's registered email.
2. Operations email — sent separately to `info@trustedcircle.in`.

The current transactional events include order received/placed, payment/order status changes, payment-link requests, payment-link delivery, and voucher delivery.

For `EMAIL_FROM=trustedcircle2026@gmail.com`, the Apps Script Gmail account must be able to send from that address. If `info@trustedcircle.in` is intended to be used as a **From** address rather than the operations recipient, it must first be configured and verified as a Gmail send-as alias.

Then run `setupBackend()` once. This creates/migrates the `PaymentLinks` and `PaymentLinkRequests` sheets.

After updating the Apps Script source files, create a new Web App deployment/version so the deployed URL uses the latest actions:

- `adminLogin`
- `adminDashboard`
- `adminUpdateRow`
- `adminCreatePaymentLink`
- `adminPaymentLinkRequest`
- `adminConfirmPayment`
- `adminSendVoucher`
- `adminUpdateOrder`
- `requestPaymentLink`
- `createInvoicePdf`

### Payment-link workflow

1. Shopper selects **Payment Link** at checkout.
2. Shopper clicks **Request Payment Link**.
3. A pending order is created and a `PaymentLinkRequests` record is created.
4. Separate shopper + operations emails confirm that the request was received.
5. Admin opens **Link Requests** and/or **Payment Links**, selects the request/order from dropdowns and can open the full-detail line popup.
6. Admin enters the HTTPS payment link and saves it.
7. The request is marked `LINK_SENT` and a separate shopper + operations email is sent with the payment link.

### Completed-order invoice

The `createInvoicePdf` API action is authenticated and server-side. It will **reject** invoice generation unless:

- the authenticated shopper owns the order;
- the order status is `DELIVERED`;
- the latest payment is `VERIFIED` or `PAID`; and
- at least one voucher for the order has status `DELIVERED`.

The PDF is generated from a temporary Google Sheet in a Tally-style tabular A4 layout, includes the Trusted Circle logo, order/customer/payment details, line items, denomination, discounts, totals and delivered voucher details, then the temporary sheet is trashed. The PDF is returned to the authenticated browser for download and is not stored permanently by this flow.

Because invoice generation uses temporary spreadsheet/Drive operations and authenticated PDF export, the Apps Script manifest now includes the Google Drive scope. **The first deployment after this change may ask the Apps Script owner to re-authorize the additional permission.**

Never put the ERP password, payment credentials, API keys, or Google service credentials in this repository.
