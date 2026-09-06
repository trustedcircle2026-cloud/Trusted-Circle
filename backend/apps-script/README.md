# Trusted Circle Backend — Google Apps Script

This folder contains the server-side API for the Trusted Circle shopping website.

## Architecture

`React/Vite frontend → HTTPS Apps Script Web App → Google Sheets`

The browser must never access the operational spreadsheet directly.

## Initial API

- `health`
- `setupBackend`
- `requestOtp`
- `verifyOtp`
- `me`
- `logout`

## First-time deployment

1. Create the operational Google Spreadsheet.
2. Create an Apps Script project and add the files from this folder.
3. In **Project Settings → Script Properties**, add `SPREADSHEET_ID` with the spreadsheet ID.
4. Optionally add `ADMIN_EMAIL`; the production default is `trustedcircle2026@gmail.com`.
5. Run `setupBackend()` once from the Apps Script editor and authorize the required Google services.
6. Deploy as a Web App. Execute as the project owner and restrict access according to the intended production access model.
7. Put only the deployed Web App URL in the frontend configuration. Never commit credentials or Script Properties.

## Security notes

- OTPs are stored only as SHA-256 hashes, never plaintext.
- OTPs expire and have a maximum attempt count.
- OTP resend has a server-side cooldown.
- Sessions use random bearer tokens; only token hashes are stored.
- User responses expose only non-sensitive profile fields.
- Admin role is server-controlled and cannot be selected by a client.
- Payment verification, order creation, voucher fulfilment and other privileged operations must remain server-side.
