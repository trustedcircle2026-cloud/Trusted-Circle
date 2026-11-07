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
