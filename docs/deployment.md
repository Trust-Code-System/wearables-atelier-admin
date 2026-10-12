# Vercel deployment — 12 October 2026

Production admin: https://wearables-atelier-admin.vercel.app/admin

Customer site: https://wearables-atelier-storefront.vercel.app

The owner requested public GitHub repositories and separate deployments in the signed-in Chrome Vercel account. This project's GitHub repository is https://github.com/Trust-Code-System/wearables-atelier-admin and is public. Vercel project `wearables-atelier-admin` belongs to **Trustcode System** (`hello-76386237s-projects`), uses the Next.js preset and root `./`, and deploys from `main`. Its initial verified production code commit was `3123a86`.

Production and Preview use the public build variable `NEXT_PUBLIC_STOREFRONT_URL=https://wearables-atelier-storefront.vercel.app`. No backend secrets were configured. Vercel reported a successful deployment; the browser root redirected to `/admin`, the catalog/filter UI rendered, and the View store / Shop page hrefs matched the live storefront.

This remains the local-browser prototype: authentication, shared storage/API and real payments are deferred. Neither app reads the other app's browser storage. The original brand deployment was retained.
