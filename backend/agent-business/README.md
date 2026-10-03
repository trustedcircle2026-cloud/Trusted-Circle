# Trusted Circle Agent Business

Dedicated backend and frontend for the Agent Business module.

## Google Apps Script setup

Paste **Code.gs** into a new Apps Script project connected to the dedicated Agent Business Google Sheet.

Run exactly one setup function:

```javascript
freshSetupAgentBusinessSheets('1goWIbN1aQtxCs9PoNPLPl0xfFdCwI5vJxh4TOtahbl0')
```

This creates/checks all required tabs without clearing existing data. It is idempotent: you can run it again safely after backend schema updates. It also stores the setup version in the `Settings` tab.

After authorizing, run `` once to confirm the database structure, then deploy as a Web App:
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

- LIC Agent Portal: `/agent-portal.html`
- Admin Portal: `/admin-portal.html`

The Shopping Website footer links directly to these standalone pages.


## Fresh database reset

The Agent Business database reset is intentionally destructive. Before using a reset, make a backup/export of the Google Sheet.

For a fresh database based on the current `AGENT_BUSINESS.SHEETS` schema, the reset operation should:
1. Preserve the Google Spreadsheet itself.
2. Remove all existing data from the managed Agent Business tabs.
3. Recreate the current headers and Settings defaults.
4. Preserve no old Agent, AgentUser, Client, Payment, Card, Cashback, Ledger, Settlement, Expense, Notification, or Audit records.

Current schema version: `1.1.0`.

After a fresh reset, create AgentUsers again because the agent login now requires a mobile number and 4-digit password.


## Current backend structure

The Agent Business Apps Script backend is intentionally consolidated into a single file: backend/agent-business/Code.gs

The old placeholder service .gs files have been removed because they contained no executable service logic.

## Fresh setup

The only setup operation exposed by the backend is:

freshSetupAgentBusinessSheets('1goWIbN1aQtxCs9PoNPLPl0xfFdCwI5vJxh4TOtahbl0')

For a truly empty database, first remove/clear the existing Agent Business tabs in the Google Sheet, then run the fresh setup function. This creates the current schema and Settings defaults without carrying forward old records.

Do not expose database-reset operations through the public web-app endpoint. Database reset is an administrative Apps Script operation only.


## Current version 1.2.0

Agent login is mobile number + 4-digit password. Passwords are stored as SHA-256 hashes in AgentUsers.PasswordHash; the raw password is never stored.

### Fresh database
For a completely fresh database, run manually in the Apps Script editor:

resetAgentBusinessDatabase('1goWIbN1aQtxCs9PoNPLPl0xfFdCwI5vJxh4TOtahbl0')

This clears only the managed Agent Business tabs and then recreates the current schema and Settings. The reset function is intentionally not exposed through doGet/doPost.

If the existing data must be preserved, run instead:

freshSetupAgentBusinessSheets('1goWIbN1aQtxCs9PoNPLPl0xfFdCwI5vJxh4TOtahbl0')

The setup adds missing current columns without deleting existing rows.
