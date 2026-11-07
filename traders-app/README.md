# Trusted Circle Traders App

Mobile-first trading journal and books for Indian equity and Forex traders.

## Current milestone

This folder is an isolated application foundation. It does not alter the existing shopping app or Books application.

### Product modules planned
- Dashboard: capital, market value, realised/unrealised P&L, daily P&L and return metrics
- Trade book: equity, futures/options and Forex trade entries
- Positions and holdings: open quantity, average entry, mark-to-market and realised P&L
- Ledger: deposits, withdrawals, charges, taxes, dividends, interest and adjustments
- Reports: day/month/FY summaries, instrument and strategy analysis, win rate, average win/loss, drawdown and equity curve
- Import/export: broker CSV import, CSV export and printable reports
- Settings: base currency, timezone, financial year, brokerage/charges and instrument conventions

## Important metric definitions
- Realised P&L is derived from closed trade lots using a documented lot-matching method.
- Unrealised P&L is calculated from open quantity and the latest available price; a stale or absent price must be labelled.
- Return on invested capital and account return are separate metrics. The app must not mix cash flows with trading profit.
- Time-weighted return (TWR) and money-weighted return (MWR/XIRR) will be reported separately when cash-flow data is sufficient.
- Brokerage, exchange charges, taxes, swap/financing and other expenses are posted to the ledger and included in net performance.
- Forex trade P&L is translated into the account base currency using a recorded conversion rate and conversion date.

## Architecture
- Mobile-first React + Vite frontend under `src/`.
- Google Apps Script backend source under `backend/apps-script/`.
- Google Sheets as the initial persistence layer.
- Browser talks only to the Apps Script HTTPS API; the browser must never access Sheets directly.
- Keep Traders App authentication, data tables, API actions and deployment separate from the current shopping backend.

## Suggested deployment sequence
1. Create a dedicated Google Sheet for Traders App.
2. Copy the Apps Script files in `backend/apps-script/` into a new Apps Script project.
3. Set the spreadsheet ID in Script Properties as `TRADERS_SPREADSHEET_ID`.
4. Run `tradersSetupProduction()` once and authorize.
5. Deploy as a Web App and set the resulting URL in `src/config.js`.
6. Add the web app URL to the Apps hub only after deployment.
7. Validate with test trades, partial exits, deposits, withdrawals, fees, corporate actions and Forex conversion cases before using real trading records.

## Data integrity and safety
- Store immutable trade executions; corrections should use reversal/correction records rather than silently overwriting history.
- Use a unique client-generated idempotency key for each write.
- Every record is scoped to an authenticated owner/user on the server.
- Never store API keys, broker passwords, OTPs or access tokens in source control.
- Market prices are indicative unless sourced from a licensed/authorised provider. Do not imply exchange-grade realtime prices.
- This product is a record-keeping and analytics tool, not investment advice, order execution or a broker.

## Trading execution and margin model

The Trade workspace has two top-level pages: Home and Trade. The Trade page contains Trade, Open positions and History.

- Buy opens a LONG position; Sell opens a SHORT position.
- A LONG is closed with Sell; a SHORT is closed with Buy.
- Partial closes are supported. A close cannot exceed the open quantity for the same account, market, instrument, quote currency and direction.
- Open executions carry a manually entered margin amount in the account's base currency. This is a reserved-funds amount supplied by the trader; the app does not infer leverage or broker margin.
- Available funds = initial capital + posted cash-ledger movements + realised FIFO P&L − reserved open margin − fees/taxes attached to still-open lots.
- Margin is released pro-rata when lots are closed.
- FIFO matching is performed separately by account, market, symbol, quote currency and LONG/SHORT direction.
- LONG gross P&L = (close price − entry price) × matched quantity × contract multiplier.
- SHORT gross P&L = (entry price − close price) × matched quantity × contract multiplier.
- Forex/metal P&L and charges are translated into account base currency using the FX rate entered for the closing execution. Entry charges are translated using the opening execution FX rate.
- Contract multiplier, quote currency, and FX conversion rate must be checked against the broker's instrument contract specification. The default XAUUSD multiplier of 100 is only a suggested starting value, not a broker guarantee.

The server repeats the available-funds and close-quantity checks before writing an execution. The browser's local cache is for responsive UI/offline queuing; it is not the authority for trade acceptance.

## Backend deployment after updating source

After updating backend/traders-apps-script/Code.gs in GitHub, copy the updated Code.gs into the dedicated Google Apps Script project and deploy a new Web App version. Keep the existing spreadsheet Script Property and access settings. The new server-side margin and FIFO checks are not active on the live Apps Script URL until that deployment is updated.

## Minimum validation scenarios

1. Open LONG 2 units at 100 with contract size 1 and margin 500; confirm 500 is reserved.
2. Attempt another opening trade requiring more than available funds; confirm the server rejects it.
3. Close 1 LONG at 110; confirm FIFO realised P&L is +10 before charges and half the lot's margin is released.
4. Open SHORT 2 units at 100 and close 1 at 90; confirm FIFO realised P&L is +10 before charges.
5. Attempt to close more quantity than is open; confirm the server rejects it.
6. Open multiple lots at different prices and close partially; confirm the oldest lot is matched first.
7. For a USD-quoted Forex instrument in an INR account, use the actual close-date USD/INR conversion rate and verify the translated P&L.
