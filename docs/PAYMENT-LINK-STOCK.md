# Payment Link Stock

## Stock format

Use the private ERP stock page to paste rows from Excel/Google Sheets:

`Amount | Payment Link | Label`

Allowed amounts:
- ₹500
- ₹1,000
- ₹1,500
- ₹2,000

Links must use HTTPS.

## Order allocation

For Payment Link checkout, the backend:
1. Creates the pending order.
2. Calculates the exact order value.
3. Finds one AVAILABLE stock link with the same denomination.
4. Reserves that link against the order.
5. Creates the PaymentLinks and Payments records.
6. Sends the payment link to the shopper and `info@trustedcircle.in`.

If no matching link is available, the order cannot receive a payment link.

## Stock lifecycle

`AVAILABLE → RESERVED → USED`

- `AVAILABLE`: ready for a new order.
- `RESERVED`: assigned to a pending order.
- `USED`: payment was verified for the assigned order.
- A cancelled pending order releases its reserved link back to `AVAILABLE`.

The order number is retained on the stock record so admin can see which order used a link.

## Automatic payment verification

The generic backend webhook is already available as the `paymentWebhook` action. Configure the gateway to call the deployed Apps Script web app and send:

- `webhookSecret`
- `orderNumber` or `orderId`
- `status` = `SUCCESS`, `PAID`, `CAPTURED` or `COMPLETED`
- `amount`
- `paymentId` / `providerPaymentId`
- `provider`

Set the secret in Apps Script Script Properties as `PAYMENT_WEBHOOK_SECRET`.

The backend verifies the secret and exact amount before marking the payment VERIFIED and the order PAID. It then credits cashback and marks the assigned payment-link stock as USED.

### Important

The UPI deep link itself cannot prove that a payment was completed. Automatic verification requires the actual payment provider/gateway to send a trusted server-side webhook. Until that gateway webhook is configured and tested, admin payment confirmation remains the controlled fallback.

## Admin responsibility

After payment becomes PAID, the remaining operational step is voucher delivery. Admin sends the voucher from the ERP; the order then becomes DELIVERED and the voucher receipt email is sent.
