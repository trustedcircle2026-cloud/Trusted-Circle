# Trusted Circle Agent Business

Dedicated backend and frontend for the Agent Business module.

## Google Apps Script setup

Paste **Code.gs** into a new Apps Script project connected to the dedicated Agent Business Google Sheet.

Run exactly one setup function:

```javascript
setupAgentBusinessSheets('1goWIbN1aQtxCs9PoNPLPl0xfFdCwI5vJxh4TOtahbl0')
```

This creates/checks all required tabs without clearing existing data.

After authorizing, deploy as a Web App:
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
