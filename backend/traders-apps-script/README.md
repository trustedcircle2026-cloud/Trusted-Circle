# Traders App — Google Apps Script backend

## Connect the existing Google Sheet

The frontend is configured to call the supplied Web App URL. The Apps Script project behind that URL must contain the latest files from this directory.

1. Open the supplied Google Sheet:
   https://docs.google.com/spreadsheets/d/1ti24m5cZcPzDSHAujYrZGDWGDF0MRxDlL6dMudMcQHY/edit
2. Open **Extensions → Apps Script** for that spreadsheet (or open the Apps Script project that owns the supplied Web App deployment).
3. Replace/update `Config.gs` and `Code.gs` with the current repository versions.
4. In **Project Settings → Script properties**, add:
   - Property: `TRADERS_SPREADSHEET_ID`
   - Value: `1ti24m5cZcPzDSHAujYrZGDWGDF0MRxDlL6dMudMcQHY`
5. Save the project. Run `tradersSetupProduction` once from the editor and authorize access to the spreadsheet.
6. Deploy → **Manage deployments** → Edit the existing Web App deployment → select **New version** → Deploy. Keep the existing deployment URL. Execute as **Me**; access must be configured to allow the intended app users.
7. Open the Web App URL in a browser. A healthy deployment should return JSON with `ok:true`, `service`, and `status:"ok"`.

## Authentication and local-first behaviour

- `register` and `login` accept email/password; registration also accepts display name. Passwords are salted and iteratively SHA-256 hashed on the server; plaintext passwords are never written to Sheets or browser storage.
- Sessions are random opaque tokens, stored hashed in the Sessions sheet and returned to the browser.
- The browser caches trading records and a write queue in Chrome localStorage, then syncs when online and on a 15-second interval.
- Chrome localStorage is device-specific and not encrypted. Do not use shared devices for sensitive trading records; sign out on shared devices.

## API actions

- `health`, `setup`, `register`, `login`, `logout`
- `dashboard`
- `listTrades` / `saveTrade`
- `listLedger` / `saveLedgerEntry`
- `listAccounts` / `saveAccount`

The initial milestone does not yet calculate FIFO realised P&L, open-position unrealised P&L, XIRR or drawdown. Those require the next accounting-engine milestone. Do not store broker credentials, passwords, API keys or tokens in this repository.


## Cross-origin browser connection

The Traders frontend submits URL-encoded POST forms to the Apps Script Web App in a hidden iframe. The server returns an HTML response that posts a nonce-matched result to the app window. This avoids browser fetch/CORS restrictions and does not put passwords in URL query strings. Update Code.gs, save, then deploy a New version of the existing Web App. Bridge.html is no longer required for API requests. Keep access configured for the intended audience (public self-registration requires the Web App to be accessible to anyone). Bridge.html only accepts messages from https://trustedcircle.shop and https://www.trustedcircle.shop; update that allowlist if the production app uses another origin.

The password accepts any non-empty value up to 128 characters; there is no forced complexity or minimum-length format rule. Users should still choose a strong, unique password.
