# Razorpay Money Wallet Webhook (AWS Lambda)

This Lambda is the public Razorpay webhook endpoint. It verifies Razorpay's HMAC-SHA256 signature against the **exact raw request body**, then forwards a normalized event to the Trusted Circle Google Apps Script backend.

## Lambda configuration

Runtime: Node.js 20.x or newer  
Handler: `index.handler`  
Memory: 128 MB is sufficient for this small webhook.  
Timeout: 15 seconds.

Set these Lambda environment variables (never commit their values):

- `RAZORPAY_WEBHOOK_SECRET`: the webhook secret configured in Razorpay.
- `WALLET_RAZORPAY_INTERNAL_SECRET`: a separate long random secret shared with Apps Script.
- `WALLET_APPS_SCRIPT_URL`: the deployed Trusted Circle main Apps Script Web App URL.

The Razorpay Orders API credentials (`RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`) are stored only in the main Apps Script project's Script Properties. Apps Script creates each dynamic Order; this Lambda remains the signed webhook verifier/forwarder. Do not put the API Key Secret in Lambda webhook settings or frontend code.

In the Apps Script project, set Script Property `WALLET_RAZORPAY_INTERNAL_SECRET` to the same internal secret.

## Razorpay Dashboard

Create a webhook pointing to the Lambda Function URL. Subscribe to:

- `payment.captured`
- `payment.failed`


Copy the webhook secret into the Lambda environment variable. Do not use the Razorpay API Key Secret here; this is the separate webhook secret.

## Payment-to-wallet matching

- The Wallet creates a pending transaction before showing the Payment Button.
- Captured payment email must exactly match the signed-in Trusted Circle account email.
- Checkout mobile must be present, valid, and exactly match the mobile number stored with the pending wallet transaction.
- - Currency must be INR and the captured amount in paise must exactly equal the pending wallet transaction amount.
- Only one pending Razorpay top-up per user is allowed to avoid ambiguous matches.
- Duplicate event IDs and duplicate payment IDs are ignored.
- An unmatched, ambiguous, or amount-mismatched payment is logged and is **not credited**.
- Only `payment.captured` / `order.paid` events can credit the wallet. A browser redirect never credits the wallet.

## Deploy

1. Create a Lambda function and paste `index.mjs`.
2. Add the environment variables above.
3. Create and enable a Lambda Function URL.
4. Add the Function URL in Razorpay Webhooks.
5. Set Apps Script property `WALLET_RAZORPAY_INTERNAL_SECRET`.
6. Deploy a new version of the main Apps Script Web App.
7. Send a Razorpay test webhook and inspect Lambda logs plus the `MoneyWalletWebhookEvents` sheet.

Do not put either secret in frontend code, GitHub, or a public configuration file.
