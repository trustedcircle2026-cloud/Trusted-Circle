# Trusted Circle ERP setup

The ERP password is intentionally **not stored in GitHub**.

In the Google Apps Script project **Trusted Circle Backend**, open:
**Project Settings → Script Properties → Add script property**

Set:

- `ADMIN_EMAIL` = the configured administrator email
- `ADMIN_PASSWORD` = the administrator ERP password
- `SPREADSHEET_ID` = the operational spreadsheet ID

Then run `setupBackend()` once. This creates the `PaymentLinks` sheet if it does not already exist.

After updating the Apps Script source files, create a new Web App deployment/version so the deployed URL uses the ERP actions (`adminLogin`, `adminDashboard`, `adminUpdateRow`, `adminCreatePaymentLink`, `adminConfirmPayment`, `adminSendVoucher`, `adminUpdateOrder`).

Never put the ERP password, payment credentials, API keys, or Google service credentials in this repository.
