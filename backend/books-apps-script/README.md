# Trusted Circle Books — dedicated Apps Script backend

This backend is intentionally separate from the shopping/ERP Apps Script.

## Connected spreadsheet

Spreadsheet ID:
`1Rw-KNxLaV4Juvhn2O1pDoXv13YgRAkScyuSLGVIJfW8`

## Apps Script deployment

Use the new Books Apps Script project and deploy it as a Web App. The frontend is already configured to call that Web App URL.

## Files

- `Config.gs` — Books configuration and spreadsheet connection
- `Code.gs` — HTTP API, authentication, organisation setup, Chart of Accounts, double-entry journal engine and core FY reports

## First deployment

1. Open the new Apps Script project linked to the Trusted Circle Books spreadsheet.
2. Replace the default script with the contents of `Config.gs` and `Code.gs` from this folder.
3. Save the project.
4. In Apps Script, run `booksSetup_()` once from the function selector. If the editor does not show private functions, temporarily run `booksSetup_` from the editor; authorization will be requested.
5. Authorize Spreadsheet and Mail permissions.
6. Deploy → New deployment → Web app.
7. Execute as: **Me**.
8. Who has access: **Anyone**.
9. Deploy a new version whenever backend code changes.

## What setup creates

The setup creates these dedicated Books tables:

`Organisations`, `Users`, `Roles`, `Sessions`, `OTP`, `AuditLogs`, `AccountGroups`, `Accounts`, `JournalEntries`, `JournalLines`, `Customers`, `Vendors`, `Items`, `Invoices`, `InvoiceLines`, `Receipts`, `Bills`, `BillLines`, `Payments`, `Expenses`, `BankAccounts`, `BankTransactions`, `Reconciliations`, `TaxRates`, `TaxTransactions`, `Reports`, `Documents`, `Settings`.

## API foundation

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

## Accounting rule

Reports are derived from posted double-entry `JournalEntries` + `JournalLines`. A journal cannot be posted unless total debit equals total credit.

Financial year calculations currently follow the Indian April–March FY convention.

## Security

- OTPs are stored as SHA-256 hashes.
- OTPs expire and have an attempt limit.
- Session bearer tokens are never stored in plaintext; only hashes are stored.
- Organisation and accounting actions require an authenticated Books session.
- Account and journal posting permissions are role-controlled server-side.
- The browser never connects directly to the Google Sheet.

## Important

Do not put Google service-account keys, payment secrets or other credentials in GitHub. The spreadsheet ID is an identifier, not a credential. Apps Script authorization remains server-side.
