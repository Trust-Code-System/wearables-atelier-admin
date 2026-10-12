const configuredUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3100";
const storefrontUrl = new URL(configuredUrl);
if (!['http:', 'https:'].includes(storefrontUrl.protocol)) {
  throw new Error('NEXT_PUBLIC_STOREFRONT_URL must be an HTTP or HTTPS address.');
}

export function storefrontHref(path = "/") {
  return new URL(path, storefrontUrl).href;
}
