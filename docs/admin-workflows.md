# Admin workflows

All `/admin` pages require an administrator session through `/login`. Catalog,
images and inventory use the shared backend; customers, orders and analytics still
use this origin's prototype browser data. Storefront synchronization is deferred.

- **Inventory** (`/admin/inventory`): backend stock totals, low/out-of-stock filters,
  valuation and adjustments for each size with reasons. Adjustments preserve
  reserved quantities and create an audited history. Checkout reservations and
  automatic order-driven stock changes remain future work.
- **Customers** (`/admin/customers`): contacts derived from orders, grouped by normalized email (phone or order ID if absent), newest contact details, purchase history, paid spending, returning-customer filter and CSV export. These are contacts, not signed-in accounts. More than one non-cancelled order counts as returning.
- **Analytics** (`/admin/analytics`): inclusive UTC order-date filters, paid/fulfilled revenue, average order value, paid units and status breakdown. The revenue chart shows the last six calendar months within the filtered records. Item rankings use captured order prices and still include products removed from the current catalog. Delivery charges or discounts can make order totals differ from item sales. No fabricated conversion or traffic metrics.
- **Orders**: reference/contact search, status tabs, newest-first sorting, filtered CSV export, internal notes, courier and tracking-number fields. Saving does not send customer notifications or contact a courier. Changes are stored locally.
- **Catalog**: create drafts or publish products, upload verified images, edit
  fields and size prices/stock, unpublish and archive products. Archive preserves
  database history and excludes products from public results. Exports escape
  quotes, multiline text and spreadsheet formula prefixes.

The overview uses the same revenue definition as Analytics: pending and cancelled orders are excluded. The shell identifies the app as a prototype.

## Verification

`npm test` runs focused calculations/validation tests using Node.js 22.18+ built-in type stripping. Cases cover unpaid/cancelled revenue exclusion, customer grouping, inclusive dates, deleted-product snapshots, CSV safety and stock boundaries. `npm run lint` and `npm run build` check the app.

Verified on 12 October 2026: all six tests, lint and production build passed. An isolated localhost preview confirmed custom stock filters, stock adjustment/history persistence after reload, customer search/profile history, order-note/courier/tracking persistence after reload, date filtering and a downloaded sales CSV. Analytics and Inventory were checked at 390px with no page-width overflow, including mobile menu keyboard navigation. Test mutations were confined to the isolated localhost origin, not the deployed admin data.
