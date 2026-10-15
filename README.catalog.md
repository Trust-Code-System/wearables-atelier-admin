# Connected admin catalog

The product list, draft creation, product detail and image uploads use the backend API. Other admin modules still use prototype data. Products can be saved as drafts or published. The same product page edits saved fields, size prices, stock and images. Removal archives products; image reordering is not implemented.

For local development:

1. Start the updated backend on port 3000 with its migrations applied and S3 credentials configured.
2. Include `http://localhost:3200` in the backend's `CORS_ORIGINS`.
3. Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000` in this app's `.env.local`.
4. Run `npm run dev`, then open http://localhost:3200/admin/products.
5. Sign in with an existing account that has backend administrator access. This UI does not provision accounts or grant roles.
6. Enter product details, a price for each size (SKUs are generated automatically), and up to four images on the New Product form. Save draft stores the product without publishing; Publish product uploads/verifies selected images before publishing. Both return to the original product list. If an image fails, the saved draft is retained and the form can retry remaining images. Refresh/reopen the list to see persisted products.

Browser uploads PUT file bytes directly into the configured bucket. They require bucket CORS; the backend's `scripts/configure-media-cors.ts` configures allowed origins without making the bucket public. API calls include session cookies; storage requests omit them. Gallery URLs expire after fifteen minutes; refresh the product/list to renew them.

For hosted staging, deploy the backend changes and migration first, then deploy this admin app with `NEXT_PUBLIC_API_BASE_URL=https://api.staging.wearables.trustcodesystem.tech`. Keep the API's explicit CORS allow-list and Better Auth trusted origins aligned with the admin domain. This change does not deploy either repository.

The original admin shell, two-column product form, image URL/device controls and product table are retained. Category tabs, sorting, search and export now use persisted backend products. Inventory now reads backend products, adjusts stock per size and displays stock movement history. Delete removes products from the catalog by archiving them and preserving history.

Product updates include an expectedUpdatedAt token; if another edit won the race, refresh before resubmitting. Published products are exposed through the public catalog API, but the storefront app remains connected to its sample data until a separate integration. Checkout reservation/release is not implemented by manual stock management.
