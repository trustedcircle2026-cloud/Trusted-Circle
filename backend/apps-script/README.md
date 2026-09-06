# Trusted Circle Backend — Google Apps Script

This folder contains the server-side API for the Trusted Circle shopping website.

## Architecture

`React/Vite frontend → HTTPS Apps Script Web App → Google Sheets`

The browser must never access the operational spreadsheet directly.

## Shopping API

- `health`
- `setupBackend` — initializes sheets and seeds the requested shopping catalog
- `requestOtp`
- `verifyOtp`
- `me`
- `profileUpdate`
- `logout`
- `brands`
- `products`
- `product`
- `cart`
- `cartAdd`
- `cartUpdate`
- `cartRemove`
- `placeOrder`
- `orders`

## Current catalog

`CatalogService.gs` contains the requested 15 shopping voucher entries and discount rates. The setup seed uses a **₹1,000 demo denomination** so the UI can be populated immediately. Live voucher denominations, inventory and fulfilment must be configured before production.

## First-time / upgrade deployment

1. Keep the operational Google Spreadsheet connected to Apps Script.
2. Add/update all files from this folder in the Apps Script project, including `OrderService.gs` and `CatalogService.gs`.
3. In **Project Settings → Script Properties**, keep `SPREADSHEET_ID` and `ADMIN_EMAIL` configured.
4. Run `setupBackend()` once after this upgrade. It initializes missing sheets and idempotently seeds/updates the default shopping catalog.
5. Deploy a **new Web App version** using the same Web App URL.
6. Confirm the `health` endpoint reports API version `1.3.0` or newer.
7. Refresh the shopping website after the new Apps Script deployment is live.

## Order flow

`Browse → Product → Cart → Checkout → Place Order → PENDING_PAYMENT order → Order Placed page`

The current checkout intentionally does **not** claim that payment was successful. Payment-gateway integration and server-side payment verification must be completed before production sales.

## Security notes

- OTPs are stored only as SHA-256 hashes, never plaintext.
- OTPs expire and have a maximum attempt count.
- OTP resend has a server-side cooldown.
- Sessions use random bearer tokens; only token hashes are stored.
- User responses expose only non-sensitive profile fields.
- Admin role is server-controlled and cannot be selected by a client.
- Order creation, payment verification, voucher fulfilment and other privileged operations remain server-side.
- Never commit payment credentials, API keys, service-account credentials or other secrets.
