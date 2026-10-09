# Trusted Circle Agent Business

Dedicated backend and frontend for the Agent Business module.

## Google Apps Script setup

Paste **Code.gs** into the Agent Business Apps Script project.

Configure only these two sensitive/runtime values in **Apps Script → Project Settings → Script Properties**:

```text
AGENT_BUSINESS_SHEET_ID = 1goWIbN1aQtxCs9PoNPLPl0xfFdCwI5vJxh4TOtahbl0
AGENT_BUSINESS_ADMIN_PASSWORD = YOUR_ADMIN_PASSWORD
```

The Google Sheet ID and Admin password are read directly from Apps Script Project Properties. The Admin password is not stored in GitHub or the Google Sheet. Set `AGENT_BUSINESS_ADMIN_PASSWORD` manually in Apps Script → Project Settings → Script Properties.

Run the setup/reset functions manually from Apps Script. They can also read `AGENT_BUSINESS_SHEET_ID` directly from Script Properties, so the ID does not need to be passed as an argument.

For a non-destructive setup:

```javascript
freshSetupAgentBusinessSheets()
```

For a destructive fresh reset:

```javascript
resetAgentBusinessDatabase()
```

This creates/checks all required tabs without clearing existing data for fresh setup. The reset clears only the managed Agent Business tabs and recreates the schema.

After authorizing, run `freshSetupAgentBusinessSheets()` once to confirm the database structure, then deploy as a Web App:
- Execute as: Me
- Who has access: Anyone

Copy the Web App URL and configure the frontend build variable:

```
VITE_AGENT_BUSINESS_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

The frontend client is `src/agentBusinessApi.js`.

## Frontend

Hidden route:

`#/agent-business`

The Shopping footer exposes **Agent Business** immediately beside **ERP Login**.

## Database tabs created by freshSetupAgentBusinessSheets()

Agents, AgentUsers, Clients, Policies, PremiumBills, PaymentRequests, Payments, Receipts, Cards, CardRules, CardTransactions, Cashback, AgentSettlements, MoneyLedger, Expenses, Notifications, AuditLogs, Settings.


## Standalone portal pages

The Agent Business portals are separate Vite HTML entry points and do not use the Shopping Website header/footer:

- Agent Portal: `/agent-portal.html`
- Admin Portal: `/admin-portal.html`

The Shopping Website footer links directly to these standalone pages.


## Fresh database reset

The Agent Business database reset is intentionally destructive. Before using a reset, make a backup/export of the Google Sheet.

For a fresh database based on the current `AGENT_BUSINESS.SHEETS` schema, the reset operation should:
1. Preserve the Google Spreadsheet itself.
2. Remove all existing data from the managed Agent Business tabs.
3. Recreate the current headers and Settings defaults.
4. Preserve no old Agent, AgentUser, Client, Payment, Card, Cashback, Ledger, Settlement, Expense, Notification, or Audit records.

Current schema version: `1.3.0` (PaymentRequests now includes `PolicyID`).

After a fresh reset, create AgentUsers again because the agent login now requires a mobile number and 4-digit password.


## Current backend structure

The Agent Business Apps Script backend is intentionally consolidated into a single file: backend/agent-business/Code.gs

The old placeholder service .gs files have been removed because they contained no executable service logic.

## Fresh setup

The setup operations are Apps Script-only and are not exposed through the public web-app endpoint.

Use:

```javascript
freshSetupAgentBusinessSheets()
```

or, for a truly empty database:

```javascript
resetAgentBusinessDatabase()
```

Both functions read `AGENT_BUSINESS_SHEET_ID` from Script Properties when no argument is supplied.

Do not expose database-reset operations through the public web-app endpoint. Database reset is an administrative Apps Script operation only.


## Current version 1.3.0 — Fast policy-first Agent Portal backend

Agent login is mobile number + 4-digit password. Passwords are stored as SHA-256 hashes in AgentUsers.PasswordHash; the raw password is never stored.

### Admin authentication
Admin authentication reads `AGENT_BUSINESS_ADMIN_PASSWORD` directly from Script Properties. The raw Admin password is never stored in GitHub, `Code.gs`, or the Google Sheet.

Set or change the property manually in Apps Script → Project Settings → Script Properties.

### Fresh database
For a completely fresh database, run manually in the Apps Script editor:

```javascript
resetAgentBusinessDatabase()
```

This clears only the managed Agent Business tabs and then recreates the current schema and Settings. The reset function is intentionally not exposed through doGet/doPost.

If the existing data must be preserved, run instead:

```javascript
freshSetupAgentBusinessSheets()
```

The setup adds missing current columns without deleting existing rows.

## Phase 2 — agent partial invoice payments (v1.8.0)

The Agent Portal now supports partial payments against the total outstanding invoice balance. Agents choose an amount up to the current payable, upload a payment receipt, and submit it for Admin verification. The payable balance is **not** reduced while the report is pending.

After Admin confirms the receipt, the backend applies the confirmed amount FIFO to the oldest outstanding InvoiceItems first. Each premium line is updated to PAID, PARTIALLY_PAID, or PAYABLE, with PaidAmount and OutstandingAmount; invoice status and the Agent Portal payable summary are recalculated. Rejected reports do not reduce the balance. A report is stored in AgentInvoicePayments, and an Admin email includes receipt access plus secure review links.

The Receipts page supports text search and a single **Paid Date** filter. The Admin Portal's **More → Agent Receivables → Agent Payment Receipts** view can review and confirm/reject reports.

### Activate the backend update

The Apps Script source in this repository must also be deployed to the live Agent Business Web App; pushing Code.gs to GitHub alone does not update the running Apps Script deployment.

1. Copy the latest backend/agent-business/Code.gs into the Agent Business Apps Script project.
2. Run freshSetupAgentBusinessSheets() once. This is non-destructive and adds the new AgentInvoicePayments tab and the additional invoice-item balance columns while preserving existing records.
3. Deploy a new Web App version (Execute as: Me; access: Anyone) and confirm the frontend VITE_AGENT_BUSINESS_API_URL still points to the active /exec deployment URL.
4. Test a small partial payment end-to-end before using this for real settlements: submit a receipt as an agent, confirm it in Admin, and verify FIFO allocation, invoice status, remaining payable, and the updated Outstanding Summary PDF.
