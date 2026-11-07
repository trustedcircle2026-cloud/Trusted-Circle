# Traders App — Google Apps Script backend

Create a new spreadsheet dedicated to Traders App, open **Extensions → Apps Script**, and add `Config.gs` and `Code.gs` from this directory. In Apps Script **Project Settings → Script properties**, add:

- `TRADERS_SPREADSHEET_ID` = ID of the newly created Traders App Google Sheet

Run `tradersSetupProduction()` once, authorize the script, then deploy a new Web App:
- Execute as: Me
- Access: Anyone (only after reviewing authentication and access controls)
- Copy the `/exec` URL into `src/config.js`

For a production deployment, implement OTP issuing/verification and account creation before opening access to end users. The initial API in this milestone has the authenticated data handlers, but does not yet provide a public registration/login flow. Do not expose a live deployment until that is completed and reviewed.

## Authentication and local-first behaviour
- `register` and `login` accept email/password; registration also accepts display name. Passwords are salted and iteratively SHA-256 hashed on the server; plaintext passwords are never written to Sheets or browser storage.
- Sessions are random opaque tokens, stored hashed in the Sessions sheet and returned to the browser. The browser persists the session token for remembered sign-in; users can sign out to revoke it.
- Frontend caches records in Chrome localStorage and queues writes for background sync when online. This is browser/device-local caching, not a replacement for server-side backups or multi-device sync.

## API actions currently implemented
- `health`
- `setup`
- `dashboard`
- `listTrades` / `saveTrade`
- `listLedger` / `saveLedgerEntry`
- `listAccounts` / `saveAccount`

Every write requires an authenticated session, owner scoping, and an idempotency key. The first milestone deliberately does not claim that realised P&L, open positions, XIRR or drawdown are fully calculated; lot matching and validated cash-flow performance calculations are subsequent implementation work.

Do not store broker credentials, passwords, API keys or tokens in this repository.
