# Wearables Atelier admin

Separate admin console for catalog management, inventory, customers, orders, sales reports and store settings. It retains the original ObsidianUI dashboard style with the supplied Wearables by Ashabi logo. This repository contains no customer storefront routes.

![Admin console](docs/previews/admin-separated.jpg)

Source: [wearables-atelier-admin](https://github.com/Trust-Code-System/wearables-atelier-admin). Customer app: [wearables-atelier-storefront](https://github.com/Trust-Code-System/wearables-atelier-storefront).

Live admin: [wearables-atelier-admin.vercel.app/admin](https://wearables-atelier-admin.vercel.app/admin). Live customer site: [wearables-atelier-storefront.vercel.app](https://wearables-atelier-storefront.vercel.app).

## Run locally

Use Node.js 22 LTS or newer:

```sh
npm ci
npm run dev
```

Open [localhost:3200/admin](http://localhost:3200/admin). `/` redirects there. Product, order and settings paths keep their `/admin` prefix. Start the separate storefront from its own folder at `http://localhost:3100`.

Verify with `npm run lint`, `npm test` and `npm run build`. Run the production build locally with `npm run start -- --port 3200`.

## Configure storefront links

Copy `.env.example` to `.env.local` and set:

```dotenv
NEXT_PUBLIC_STOREFRONT_URL=http://localhost:3100
```

For deployment use the storefront's actual HTTPS address. This value is public and inlined during the build; rebuild when changing it. Dashboard and search links use this address to open the other app. It must be an HTTP/HTTPS URL.

## Structure

- `src/app/admin` — overview, products, inventory, customers, analytics, order management and settings.
- `src/components/admin` — search, view state and revenue chart.
- `src/components/block/dashboard-shell.*` — ObsidianUI shell.
- `src/lib/store.tsx` — prototype catalog, order and settings stores.
- `src/lib/storefront-url.ts` — external customer-app links.
- `public/brand` and `public/collection` — independent copies of brand assets.

Next.js 16.4, React 19, Tailwind 4, Base UI, Radix, Duo Icons, Motion and Recharts. Each dependency and asset belongs to this repository; there is no parent workspace or sibling-folder runtime dependency. Inter/Geist fonts are fetched during a clean build.

The shell was adapted from the [official ObsidianUI dashboard shell registry](https://www.obsidianui.dev/r/dashboard-shell.json). Brand imagery comes from the owner's original website, with source attribution in `docs/brand-assets.md`.

## Prototype data

The owner chose to split the projects now and connect a shared backend next. Admin changes and storefront orders **do not sync yet**. This address starts with its own demo data; the original browser data is preserved at the storefront's old origin. Payment is simulated, and key fields are browser-storage placeholders. Do not enter live payment secrets here.

Inventory includes stock-level filters, total quantities, retail valuation, adjustments with reasons and a recent history. Customers are grouped from order contacts with purchase histories, not authenticated customer accounts. Orders support search, status filters, internal notes and courier/tracking details. Analytics uses paid and fulfilled orders only, with date filters and CSV exports. See [admin workflows](docs/admin-workflows.md) for behavior and limitations.

Authentication is not implemented. Keep any prototype preview under the hosting provider's access controls; admin authentication, shared database/API, migration and server-only payment configuration belong to the next phase. The noindex metadata discourages indexing but is not authentication.

## Deploy independently

Import **this repository** into its own Vercel or Next.js/Node.js hosting project. Use repository root `.`, install with `npm ci`, build with `npm run build`, and set `NEXT_PUBLIC_STOREFRONT_URL` in the build environment. Import the storefront repository as a separate hosting project. GitHub Pages cannot run these dynamic Next.js routes.

The source repository is public at the owner's request. This app is deployed as its own Vercel project under Trustcode System, with Git integration on `main`. The production and preview environments set `NEXT_PUBLIC_STOREFRONT_URL=https://wearables-atelier-storefront.vercel.app`. These deployments retain the prototype data/authentication boundary described above.
