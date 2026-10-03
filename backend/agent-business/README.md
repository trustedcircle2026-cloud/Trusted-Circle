# Trusted Circle Agent Business

Dedicated backend and frontend for the Agent Business module.

## Google Apps Script setup

Paste **Code.gs** into a new Apps Script project connected to the dedicated Agent Business Google Sheet.

Run exactly one setup function:

```javascript
setupAgentBusinessSheets('1goWIbN1aQtxCs9PoNPLPl0xfFdCwI5vJxh4TOtahbl0')
```

This creates/checks all required tabs without clearing existing data. It is idempotent: you can run it again safely after backend schema updates. It also stores the setup version in the `Settings` tab.

After authorizing, run `verifyAgentBusinessSheets()` once to confirm the database structure, then deploy as a Web App:
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

## Database tabs created by setupAgentBusinessSheets()

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
