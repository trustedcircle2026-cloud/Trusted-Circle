# Trusted Circle Books — dedicated Apps Script backend

This backend is intentionally separate from the shopping/ERP Apps Script and Google Sheet.

## Connected Google Sheet

Spreadsheet ID:
`1Rw-KNxLaV4Juvhn2O1pDoXv13YgRAkScyuSLGVIJfW8`

The frontend is configured to use the dedicated Books Web App URL stored in `src/books-config.js`.

## Apps Script files

- `Config.gs` — Books configuration, timezone and spreadsheet connection.
- `Code.gs` — HTTP API, OTP authentication, sessions, organisation setup, Chart of Accounts, double-entry journal engine and FY reports.
- `Setup.gs` — production Google Sheet formatting, dropdown validation and date-column setup.

## First-time Google Sheet setup

1. Open the **dedicated Books Google Sheet**.
2. Open **Extensions → Apps Script**.
3. Add `Config.gs`, `Code.gs` and `Setup.gs` from this folder.
4. Save the Apps Script project.
5. Run `booksSetupProduction_()` once from the Apps Script function selector.
6. Grant the requested Google Sheets and Gmail/Mail permissions.
7. Confirm the Sheets below exist and the header row is present.
8. The setup also freezes header rows, creates filters, applies supported dropdown validation and seeds the basic accounting structure/tax rates.

## Web App deployment

After setup:

1. Apps Script → **Deploy → New deployment**.
2. Select **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone**.
5. Deploy.
6. Keep the resulting `/exec` URL in `src/books-config.js`.
7. Whenever Apps Script code changes, create a **new deployment version** so the production Web App uses the latest code.

## Google Sheet tables

`Organisations`, `Users`, `Roles`, `Sessions`, `OTP`, `AuditLogs`, `AccountGroups`, `Accounts`, `JournalEntries`, `JournalLines`, `Customers`, `Vendors`, `Items`, `Invoices`, `InvoiceLines`, `Receipts`, `Bills`, `BillLines`, `Payments`, `Expenses`, `BankAccounts`, `BankTransactions`, `Reconciliations`, `TaxRates`, `TaxTransactions`, `Reports`, `Documents`, `Settings`.

## Initial accounting seed

The backend setup creates the five primary account groups:

- Assets
- Liabilities
- Equity
- Income
- Expenses

It also creates a starter ledger structure including Cash, Bank Accounts, Accounts Receivable, Inventory, Accounts Payable, GST Payable, Owner Capital, Retained Earnings, Sales, Other Income, Cost of Goods Sold, Operating Expenses and Bank Charges.

Starter GST rates are also created for 0%, 5%, 12%, 18% and 28%.

These are a starting chart only; the organisation can extend the Chart of Accounts from the Books UI.

## Current API foundation

- `health`
- `setupBackend`
- `booksRequestOtp`
- `booksVerifyOtp`
- `booksMe`
- `booksLogout`
- `booksGetOrganisation`
- `booksSaveOrganisation`
- `booksListAccounts`
- `booksSaveAccount`
- `booksCreateJournal`
- `booksTrialBalance`
- `booksProfitLoss`
- `booksBalanceSheet`

## Accounting rules

Financial reports are derived from posted double-entry `JournalEntries` + `JournalLines`. A journal is rejected unless total debit equals total credit. Financial years currently follow the Indian April–March convention.

## Security

- OTPs are stored as SHA-256 hashes.
- OTPs expire and have an attempt limit.
- Session bearer tokens are never stored in plaintext; only hashes are stored.
- Organisation and accounting actions require an authenticated Books session.
- Account and journal posting permissions are enforced server-side.
- The browser never connects directly to the Google Sheet.

## Important

The repository can prepare the Apps Script and spreadsheet setup code, but it cannot directly authorize your Google account or create/deploy a Google Apps Script Web App on your behalf. The one-time Apps Script authorization/deployment steps above must be performed in your Google account.

Do not put Google service-account keys, payment secrets or other credentials in GitHub. The spreadsheet ID is an identifier, not a credential.
