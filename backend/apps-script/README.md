# Trusted Circle Apps Script Backend

## Money Wallet — Razorpay Orders

Money Wallet top-ups use Razorpay Orders created server-side by Google Apps Script. No fixed Payment Button IDs or finite PaymentLinkStock records are required for new Money Wallet top-ups.

### Required Apps Script Script Properties

Keep these values in **Project Settings → Script Properties**. Never commit credentials to GitHub or expose them in frontend code.

- `SPREADSHEET_ID` — existing Trusted Circle Shopping spreadsheet ID.
- `ADMIN_EMAIL` — admin notification email.
- `RAZORPAY_KEY_ID` — Razorpay API Key ID.
- `RAZORPAY_KEY_SECRET` — Razorpay API Key Secret.
- `WALLET_RAZORPAY_INTERNAL_SECRET` — existing shared secret used by the AWS webhook integration (retain it).

The Razorpay Key ID is returned to the browser for Checkout initialization. The Key Secret remains server-side and is used only by Apps Script to create Orders.

### Razorpay Dashboard Webhook

Point the Razorpay webhook to the AWS Lambda Function URL and subscribe to:

- `payment.captured`
- `payment.failed`

Use the separate Razorpay webhook secret in Lambda as `RAZORPAY_WEBHOOK_SECRET`. Do not use the API Key Secret as the webhook secret.

### AWS Lambda environment

- `RAZORPAY_WEBHOOK_SECRET` — Razorpay webhook secret.
- `WALLET_RAZORPAY_INTERNAL_SECRET` — same value as the Apps Script property.
- `WALLET_APPS_SCRIPT_URL` — deployed main Apps Script Web App URL.

### Customer flow

1. User selects ₹500, ₹1,000, ₹1,500 or ₹2,000.
2. User must provide a valid email (their Trusted Circle account email) and mobile number.
3. Apps Script creates a pending Money Wallet transaction.
4. Apps Script calls Razorpay Orders API using server-side credentials.
5. Frontend opens Razorpay Checkout using the returned Order ID.
6. Razorpay sends a signed webhook to AWS Lambda.
7. Lambda verifies the HMAC-SHA256 signature against the exact raw request body.
8. Lambda forwards the payment ID, Order ID, email, mobile, amount and event to Apps Script.
9. Apps Script matches the payment to the exact pending wallet order and credits only a captured INR payment.
10. Duplicate event IDs and payment IDs are ignored; mismatched or ambiguous payments are not credited.

### Deployment

1. Save the updated Apps Script project.
2. Confirm the required Script Properties above are configured.
3. Deploy a **new version** of the main Apps Script Web App.
4. Deploy the updated Lambda `index.mjs` to the existing function.
5. Keep the existing Lambda Function URL and Razorpay webhook URL.
6. Test a Razorpay payment in Test Mode before enabling live top-ups.

Cashback Wallet and Money Wallet remain separate ledgers. Legacy payment-link stock features used by other Trusted Circle workflows are not removed; they are simply no longer used for new Money Wallet top-ups.
