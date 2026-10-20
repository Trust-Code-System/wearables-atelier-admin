import { getApiBaseUrl } from "./api-config.ts";

export interface CatalogImage {
  id: string;
  url: string | null;
  altText: string;
  position: number;
}
export interface CatalogVariant {
  id: string;
  sku: string;
  sizeLabel: string;
  priceKobo: string;
  compareAtPriceKobo: string | null;
  archivedAt: string | null;
  onHand: number;
  reserved: number;
  available: number;
}
export interface CatalogProduct {
  createdAt: string;
  updatedAt: string;
  id: string;
  name: string;
  slug: string;
  category: "CLOTHING" | "JEWELRY";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  description: string;
  careDetails: string[];
  badge: string | null;
  variants: CatalogVariant[];
  images: CatalogImage[];
}
export interface CatalogPage {
  data: CatalogProduct[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
export interface NewProduct {
  name: string;
  slug: string;
  category: CatalogProduct["category"];
  description: string;
  careDetails: string[];
  badge?: string;
  variants: {
    sku: string;
    onHand?: number;
    sizeLabel: string;
    priceKobo: string;
    compareAtPriceKobo?: string;
  }[];
}

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    if (typeof window !== "undefined" && response.status === 401)
      window.dispatchEvent(new Event("wearables:session-invalid"));
    if (response.status === 401)
      throw new ApiError(
        "Sign in with your administrator account, then try again.",
        401,
      );
    if (response.status === 403)
      throw new ApiError(
        "Your account does not have permission for this action. Owner access may be required.",
        403,
      );
    const body = await response.json().catch(() => null);
    const message = body?.message;
    throw new Error(
      Array.isArray(message)
        ? message.join(". ")
        : typeof message === "string"
          ? message
          : `Request failed (${response.status})`,
    );
  }
  return response.json() as Promise<T>;
}
export const getProduct = (id: string, signal?: AbortSignal) =>
  api<CatalogProduct>(`/api/v1/admin/products/${encodeURIComponent(id)}`, {
    signal,
  });
export const listProducts = (page: number, signal?: AbortSignal) =>
  api<CatalogPage>(`/api/v1/admin/products?page=${page}&limit=20`, { signal });
export const createProduct = (input: NewProduct) =>
  api<{ id: string }>("/api/v1/admin/products", {
    method: "POST",
    body: JSON.stringify(input),
  });

export function nairaToKobo(value: string): string {
  if (!/^\d{1,16}(\.\d{1,2})?$/.test(value))
    throw new Error("Enter a valid price with at most two decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const kobo = BigInt(whole!) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (kobo <= BigInt(0) || kobo.toString().length > 18)
    throw new Error("Price must be positive and within the supported range.");
  return kobo.toString();
}
export function displayKobo(value: string) {
  const kobo = BigInt(value);
  return `₦${(kobo / BigInt(100)).toLocaleString("en-NG")}.${(kobo % BigInt(100)).toString().padStart(2, "0")}`;
}

export function validateImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPEG, PNG or WebP image.");
  if (!file.size || file.size > 5_000_000)
    throw new Error("Images must be between 1 byte and 5 MB.");
}
export async function uploadImage(
  productId: string,
  file: File,
  altText: string,
): Promise<CatalogProduct> {
  validateImage(file);
  const grant = await api<{
    storageKey: string;
    uploadUrl: string;
    method: "PUT";
    headers: Record<string, string>;
  }>("/api/v1/admin/media/uploads", {
    method: "POST",
    body: JSON.stringify({ contentType: file.type, sizeBytes: file.size }),
  });
  // Send file bytes directly to storage, without API cookies or credentials.
  const upload = await fetch(grant.uploadUrl, {
    method: grant.method,
    headers: grant.headers,
    body: file,
    credentials: "omit",
  });
  if (!upload.ok) throw new Error("Image upload failed. Please try again.");
  return api<CatalogProduct>(
    `/api/v1/admin/products/${encodeURIComponent(productId)}/images`,
    {
      method: "POST",
      body: JSON.stringify({ storageKey: grant.storageKey, altText }),
    },
  );
}

export const updateProduct = (
  id: string,
  input: NewProduct & { expectedUpdatedAt: string; stockReason?: string },
) =>
  api<CatalogProduct>(`/api/v1/admin/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
export const setProductStatus = (
  id: string,
  status: "DRAFT" | "PUBLISHED",
  expectedUpdatedAt: string,
) =>
  api<CatalogProduct>(
    `/api/v1/admin/products/${encodeURIComponent(id)}/status`,
    { method: "PATCH", body: JSON.stringify({ status, expectedUpdatedAt }) },
  );
export const archiveProduct = (id: string) =>
  api<{ id: string; action: "archived" }>(
    `/api/v1/admin/products/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
export const removeProductImage = (id: string, imageId: string) =>
  api<CatalogProduct>(
    `/api/v1/admin/products/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`,
    { method: "DELETE" },
  );

export async function saveCatalogProduct(options: {
  input: NewProduct;
  previous: CatalogProduct | null;
  status: "DRAFT" | "PUBLISHED";
  files: File[];
  uploadOffset: number;
  removeImageIds?: string[];
  onImageRemoved?: (id: string) => void;
  onCreated: (id: string) => void;
  onSaved: (product: CatalogProduct) => void;
  onUploaded: (index: number, imageId: string) => void;
  onProgress: (message: string) => void;
}) {
  let product = options.previous;
  if (
    product?.status === "PUBLISHED" &&
    (options.status === "DRAFT" ||
      (options.removeImageIds?.length ?? 0) === product.images.length)
  ) {
    product = await setProductStatus(product.id, "DRAFT", product.updatedAt);
    options.onSaved(product);
  }
  for (const id of options.removeImageIds ?? []) {
    if (!product) break;
    product = await removeProductImage(product.id, id);
    options.onImageRemoved?.(id);
    options.onSaved(product);
  }
  options.onProgress("Saving product…");
  if (product)
    product = await updateProduct(product.id, {
      ...options.input,
      expectedUpdatedAt: product.updatedAt,
    });
  else {
    const created = await createProduct(options.input);
    options.onCreated(created.id);
    product = await getProduct(created.id);
  }
  options.onSaved(product);
  for (let offset = 0; offset < options.files.length; offset++) {
    const index = options.uploadOffset + offset;
    options.onProgress(
      `Uploading image ${index + 1} of ${options.uploadOffset + options.files.length}…`,
    );
    product = await uploadImage(
      product.id,
      options.files[offset]!,
      `${options.input.name} — ${index === 0 ? "cover" : `view ${index + 1}`}`,
    );
    options.onSaved(product);
    options.onUploaded(index, product.images[product.images.length - 1]!.id);
  }
  if (product.status !== options.status)
    product = await setProductStatus(
      product.id,
      options.status,
      product.updatedAt,
    );
  options.onSaved(product);
  return product;
}
