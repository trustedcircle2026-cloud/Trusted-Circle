# Trusted Circle — Shopping Website Production Scope

## Current milestone
Production-quality public shopping foundation for branded gift vouchers.

## Public navigation
- Home
- Gift Vouchers
- Brands
- Offers
- How It Works
- Help
- Search
- Cart
- Login / Register

## Account
Shopping users authenticate with Email + OTP. A central Trusted Circle User ID is created for every account. Cart and order data are persisted by the backend after API integration.

## Checkout requirements
1. Cart review
2. Customer details
3. Payment initiation
4. Server-side payment verification
5. Order creation
6. Voucher fulfilment
7. Email confirmation
8. Order success page

The browser must never be trusted to declare a payment successful.

## Product data
The UI currently uses local seed data only. Production product, brand, price, discount, inventory, and voucher availability must come from the Apps Script API.

## Hidden ERP
The public shopping UI contains only a low-visibility `ERP Login` link in the footer. Investment functionality must not appear in the shopping navigation, homepage, offers, or account UI unless the user explicitly enters the ERP/investor area.

## Security
No payment credentials, API keys, Google service credentials, OTP secrets, or private backend configuration belong in this repository.
