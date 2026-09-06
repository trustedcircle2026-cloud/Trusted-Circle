# Trusted Circle

Production web application for Trusted Circle's branded gift-voucher shopping business, with a separate hidden ERP/investor system.

## Current build

The first production milestone is the public shopping website foundation:

- Responsive branded homepage
- Gift voucher discovery and brand sections
- Search interaction
- Wishlist interaction
- Cart count interaction
- Shopping Login / Register entry point
- Secure checkout architecture documented for backend integration
- Hidden ERP Login link restricted to the footer
- GitHub Pages deployment workflow

## Architecture

```text
Public Shopping Frontend (React + Vite)
                |
                v
       HTTPS Apps Script API
                |
        +-------+--------+
        |                |
   Google Sheets     Google Drive/Gmail
```

The browser will never connect directly to Google Sheets. Authentication, authorization, payment verification, order creation, voucher fulfilment, and sensitive-data handling will be server-side.

## Development

```bash
npm install
npm run dev
npm run build
```

See `docs/SHOPPING-MVP.md` for the production shopping scope and security rules.
