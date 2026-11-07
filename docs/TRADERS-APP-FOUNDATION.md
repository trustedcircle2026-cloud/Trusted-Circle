# Traders App — Foundation and roadmap

## Scope
Mobile-first app for Forex and Indian stock market record-keeping. Separate from Trusted Circle Shopping and Trusted Circle Books.

## Repository layout
- `traders-app/`: standalone frontend source and app entry.
- `backend/traders-apps-script/`: dedicated Google Apps Script backend.
- The Apps hub will add a launch tile only after a frontend route/hosting choice is confirmed.

## Phased delivery
1. **Foundation:** isolated repo area, mobile dashboard shell, trade-entry/ledger/account views, dedicated Apps Script tables/API skeleton.
2. **Accounting engine:** FIFO/LIFO/weighted-average lot matching (configurable by market/product), partial exits, reversals, realised/unrealised P&L, charges and corporate actions.
3. **Performance:** daily equity curve, net/gross returns, TWR, XIRR, drawdown, win rate, expectancy and strategy analytics.
4. **Broker imports:** configurable CSV column mapping, duplicate detection, error queue, import audit trail.
5. **Reports:** day/month/FY P&L, instrument/segment/strategy reports, ledger, tax/charges summary and PDF/CSV exports.
6. **Hardening:** OTP onboarding, access controls, data validation, backup/export, audit and security review.

## Important design decision
Do not publish invented or partial values as completed performance results. The first dashboard labels performance metrics as pending until the lot-matching and cash-flow engine is implemented and tested.
