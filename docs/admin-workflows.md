# Admin workflows

These tools operate on this admin origin's browser data. Existing product and order storage keys remain compatible. Shared backend, authentication and storefront synchronization are deferred.

- **Inventory** (`/admin/inventory`): total units, low/out-of-stock counts, retail value, search and stock-level filters. Set a new total with a reason; only nonnegative whole quantities are accepted. The latest 100 adjustments are stored, and the latest 10 are shown. Quantities are product totals, not size-level quantities. Product-form changes and order statuses do not automatically adjust stock or create history entries.
- **Customers** (`/admin/customers`): contacts derived from orders, grouped by normalized email (phone or order ID if absent), newest contact details, purchase history, paid spending, returning-customer filter and CSV export. These are contacts, not signed-in accounts. More than one non-cancelled order counts as returning.
- **Analytics** (`/admin/analytics`): inclusive UTC order-date filters, paid/fulfilled revenue, average order value, paid units and status breakdown. The revenue chart shows the last six calendar months within the filtered records. Item rankings use captured order prices and still include products removed from the current catalog. Delivery charges or discounts can make order totals differ from item sales. No fabricated conversion or traffic metrics.
- **Orders**: reference/contact search, status tabs, newest-first sorting, filtered CSV export, internal notes, courier and tracking-number fields. Saving does not send customer notifications or contact a courier. Changes are stored locally.
- **Catalog**: resetting the catalog requires an inline confirmation, with a Cancel action. Exports escape quotes, multiline text and spreadsheet formula prefixes.

The overview uses the same revenue definition as Analytics: pending and cancelled orders are excluded. The shell identifies the app as a prototype.

## Verification

`npm test` runs focused calculations/validation tests using Node.js 22.18+ built-in type stripping. Cases cover unpaid/cancelled revenue exclusion, customer grouping, inclusive dates, deleted-product snapshots, CSV safety and stock boundaries. `npm run lint` and `npm run build` check the app.

Verified on 12 October 2026: all six tests, lint and production build passed. An isolated localhost preview confirmed custom stock filters, stock adjustment/history persistence after reload, customer search/profile history, order-note/courier/tracking persistence after reload, date filtering and a downloaded sales CSV. Analytics and Inventory were checked at 390px with no page-width overflow, including mobile menu keyboard navigation. Test mutations were confined to the isolated localhost origin, not the deployed admin data.
