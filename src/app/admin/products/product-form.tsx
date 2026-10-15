"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ImagePlusIcon, Link2Icon, Loader2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import type { Badge as BadgeType, Category } from "@/lib/types";
import { useAdminCatalog, type AdminProduct } from "@/lib/admin-catalog";
import {
  saveCatalogProduct,
  getProduct,
  type CatalogProduct,
  type NewProduct,
  nairaToKobo,
  validateImage,
} from "@/lib/catalog-api";
import { CLOTHING_SIZES } from "@/lib/products";
import { slugify } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const BADGES: { value: BadgeType | "none"; label: string }[] = [
  { value: "none", label: "No badge" },
  { value: "new", label: "New" },
  { value: "bestseller", label: "Bestseller" },
  { value: "limited", label: "Limited" },
];

function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col gap-1.5", className)}
      data-invalid={error ? true : undefined}
    >
      <Label className="text-[0.8125rem]">{label}</Label>
      {children}
      {hint && !error ? (
        <p className="text-[0.6875rem] text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-[0.75rem] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function koboInput(value: string) {
  const kobo = BigInt(value);
  return `${kobo / BigInt(100)}.${(kobo % BigInt(100)).toString().padStart(2, "0")}`;
}

export function ProductForm({ existing }: { existing?: AdminProduct }) {
  const router = useRouter();
  const { refresh } = useAdminCatalog();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(existing?.name ?? "");
  const [category, setCategory] = useState<Category>(
    existing?.category ?? "clothing",
  );
  const [badge, setBadge] = useState<BadgeType | "none">(
    existing?.badge ?? "none",
  );
  const [price, setPrice] = useState(existing ? String(existing.priceNGN) : "");
  const [compareAt, setCompareAt] = useState(
    existing?.compareAtNGN ? String(existing.compareAtNGN) : "",
  );
  const [variantStock, setVariantStock] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (existing?.backend.variants ?? []).map((variant) => [
        variant.sizeLabel,
        String(variant.onHand),
      ]),
    ),
  );
  const [snapshot, setSnapshot] = useState<CatalogProduct | null>(
    existing?.backend ?? null,
  );
  const [imageIds, setImageIds] = useState<(string | null)[]>(
    existing?.backend.images.map((image) => image.id) ?? [],
  );
  const [sizes, setSizes] = useState<number[]>(
    existing?.sizes ?? [...CLOTHING_SIZES],
  );
  const [description, setDescription] = useState(existing?.description ?? "");
  const [details, setDetails] = useState(existing?.details.join("\n") ?? "");
  const [images, setImages] = useState<string[]>(existing?.images ?? []);
  const [imageUrl, setImageUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(
    existing?.id ?? null,
  );
  const [uploadedCount, setUploadedCount] = useState(
    existing?.images.length ?? 0,
  );
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [progress, setProgress] = useState("");
  const [variantPrices, setVariantPrices] = useState<
    Record<string, { price: string; compareAt: string }>
  >(() =>
    Object.fromEntries(
      (existing?.backend.variants ?? []).map((variant) => [
        variant.sizeLabel,
        {
          price: koboInput(variant.priceKobo),
          compareAt: variant.compareAtPriceKobo
            ? koboInput(variant.compareAtPriceKobo)
            : "",
        },
      ]),
    ),
  );
  const sizeLabels =
    category === "jewelry" || sizes.length === 0
      ? ["One size"]
      : sizes.map(String);

  const toggleSize = (s: number) =>
    setSizes((prev) =>
      prev.includes(s)
        ? prev.filter((x) => x !== s)
        : [...prev, s].sort((a, b) => a - b),
    );

  const addImageUrl = () => {
    const url = imageUrl.trim();
    if (!url) return;
    if (images.length >= 4) {
      toast.error("Four images maximum", {
        description: "The gallery supports up to four.",
      });
      return;
    }
    try {
      const parsed = new URL(url);
      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password
      )
        throw new Error();
    } catch {
      toast.error("Enter a valid HTTP or HTTPS image URL");
      return;
    }
    setImages((prev) => [...prev, url]);
    setImageIds((previous) => [...previous, null]);
    setImageUrl("");
    setErrors((e) => ({ ...e, images: "" }));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      validateImage(file);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Invalid image");
      e.target.value = "";
      return;
    }
    if (images.length >= 4) {
      toast.error("Four images maximum");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImages((prev) => [...prev, String(reader.result)]);
      setImageIds((previous) => [...previous, null]);
      setErrors((e) => ({ ...e, images: "" }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const validate = (desiredStatus: "DRAFT" | "PUBLISHED") => {
    const err: Record<string, string> = {};
    {
      if (name.trim().length < 3)
        err.name = "Give the piece a name (3+ characters)";
      if (description.trim().length < 12)
        err.description = "Write a short description";
      try {
        for (const size of sizeLabels) {
          const quantity = variantStock[size] ?? "0";
          if (!/^\d+$/.test(quantity) || Number(quantity) > 1_000_000)
            throw new Error(
              `Enter whole stock units from 0 to 1,000,000 for size ${size}`,
            );
          const values = variantPrices[size];
          const selling = nairaToKobo(values?.price ?? price);
          const compare = values?.compareAt ?? compareAt;
          if (compare && BigInt(nairaToKobo(compare)) < BigInt(selling))
            throw new Error(
              `Compare-at price for size ${size} must not be below its selling price`,
            );
        }
      } catch (cause) {
        err.price =
          cause instanceof Error ? cause.message : "Enter valid size prices";
      }
    }
    if (images.length === 0 && desiredStatus === "PUBLISHED")
      err.images = "Add at least one image";
    if (images.length > 4) err.images = "Four images maximum";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const desiredStatus =
      submitter?.dataset.intent === "DRAFT" ? "DRAFT" : "PUBLISHED";
    if (saving || !validate(desiredStatus)) return;
    setSaving(true);
    setProgress("Preparing images…");
    setErrors({});
    try {
      // Resolve selected sources before creating the draft, so failed URL imports don't leave empty products.
      const files: File[] = [];
      for (let index = uploadedCount; index < images.length; index++) {
        const response = await fetch(images[index]!, { credentials: "omit" });
        if (!response.ok)
          throw new Error(
            "Could not read the image URL; upload the file from your device instead",
          );
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Image source is empty");
        const chunks: Uint8Array<ArrayBuffer>[] = [];
        let size = 0;
        try {
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            size += chunk.value.byteLength;
            if (size > 5_000_000)
              throw new Error("Images must not exceed 5 MB");
            chunks.push(new Uint8Array(chunk.value));
          }
        } finally {
          await reader.cancel();
          reader.releaseLock();
        }
        const file = new File(chunks, `product-${index + 1}`, {
          type: response.headers.get("Content-Type")?.split(";")[0] ?? "",
        });
        validateImage(file);
        files.push(file);
      }
      const current =
        snapshot ?? (createdId ? await getProduct(createdId) : null);
      const payload: NewProduct = {
        name: name.trim(),
        slug: current?.slug ?? slugify(name),
        category: category === "clothing" ? "CLOTHING" : "JEWELRY",
        description: description.trim(),
        careDetails: details
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        ...(badge !== "none" ? { badge: badge.toUpperCase() } : {}),
        variants: sizeLabels.map((sizeLabel) => {
          const values = variantPrices[sizeLabel];
          const compare = values?.compareAt ?? compareAt;
          return {
            sku:
              current?.variants.find(
                (variant) => variant.sizeLabel === sizeLabel,
              )?.sku ??
              `${slugify(name).toUpperCase().slice(0, 35)}-${sizeLabel.replaceAll(" ", "-").toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
            sizeLabel,
            priceKobo: nairaToKobo(values?.price ?? price),
            onHand: Number(variantStock[sizeLabel] ?? "0"),
            ...(compare ? { compareAtPriceKobo: nairaToKobo(compare) } : {}),
          };
        }),
      };
      await saveCatalogProduct({
        input: payload,
        previous: current,
        status: desiredStatus,
        files,
        uploadOffset: uploadedCount,
        removeImageIds: removedImageIds,
        onImageRemoved: (id) =>
          setRemovedImageIds((previous) =>
            previous.filter((entry) => entry !== id),
          ),
        onCreated: setCreatedId,
        onSaved: setSnapshot,
        onProgress: setProgress,
        onUploaded: (index, imageId) => {
          setUploadedCount(index + 1);
          setImageIds((previous) =>
            previous.map((id, item) => (item === index ? imageId : id)),
          );
        },
      });
      await refresh();
      toast.success(existing ? "Changes saved" : "Product saved", {
        description: `${name.trim()} · ${desiredStatus.toLowerCase()}`,
      });
      router.push("/admin/products");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Could not save product";
      setErrors({ submit: message });
      toast.error("Could not finish saving", { description: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid items-start gap-10 lg:grid-cols-[1.4fr_1fr]"
    >
      {/* Left column */}
      <fieldset
        disabled={saving || snapshot?.status === "ARCHIVED"}
        className="flex min-w-0 flex-col gap-6"
      >
        <Field label="Product name" error={errors.name}>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((er) => ({ ...er, name: "" }));
            }}
            placeholder="Ada Silk Slip Dress"
            aria-invalid={!!errors.name}
            className="h-11"
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Category">
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as Category)}
            >
              <SelectTrigger className="h-11 w-full" aria-label="Category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="jewelry">Jewelry</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Badge">
            <Select
              value={badge}
              onValueChange={(v) => setBadge(v as BadgeType | "none")}
            >
              <SelectTrigger className="h-11 w-full" aria-label="Badge">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {BADGES.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <Field label="Price (₦)" error={errors.price}>
            <Input
              value={price}
              onChange={(e) => {
                const value = e.target.value;
                setPrice(value);
                setVariantPrices((previous) => ({
                  ...previous,
                  ...Object.fromEntries(
                    sizeLabels.map((size) => [
                      size,
                      {
                        price: value,
                        compareAt: previous[size]?.compareAt ?? compareAt,
                      },
                    ]),
                  ),
                }));
                setErrors((er) => ({ ...er, price: "" }));
              }}
              placeholder="185000"
              inputMode="numeric"
              aria-invalid={!!errors.price}
              className="h-11 tabular-nums"
            />
          </Field>
          <Field
            label="Compare-at (₦)"
            hint="Optional — shows a strikethrough"
            error={errors.compareAt}
          >
            <Input
              value={compareAt}
              onChange={(e) => {
                const value = e.target.value;
                setCompareAt(value);
                setVariantPrices((previous) => ({
                  ...previous,
                  ...Object.fromEntries(
                    sizeLabels.map((size) => [
                      size,
                      {
                        price: previous[size]?.price ?? price,
                        compareAt: value,
                      },
                    ]),
                  ),
                }));
                setErrors((er) => ({ ...er, compareAt: "" }));
              }}
              placeholder="220000"
              inputMode="numeric"
              aria-invalid={!!errors.compareAt}
              className="h-11 tabular-nums"
            />
          </Field>
          <Field
            label="Stock"
            hint="Total on hand across selected sizes"
            error={errors.stock}
          >
            <Input
              readOnly
              value={sizeLabels.reduce(
                (sum, size) => sum + (Number(variantStock[size]) || 0),
                0,
              )}
              placeholder="14"
              inputMode="numeric"
              aria-invalid={!!errors.stock}
              className="h-11 tabular-nums"
            />
          </Field>
        </div>

        {category === "clothing" ? (
          <Field label="Available sizes (numbered)" error={errors.sizes}>
            <div className="flex flex-wrap gap-2 pt-1">
              {CLOTHING_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSize(s)}
                  aria-pressed={sizes.includes(s)}
                  className={cn(
                    "grid size-10 place-items-center rounded-md border text-sm tabular-nums transition-all duration-150 ease-out active:scale-95",
                    sizes.includes(s)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-foreground/40",
                  )}
                >
                  {s}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSizes([])}
                aria-pressed={sizes.length === 0}
                className={cn(
                  "rounded-md border px-3 text-sm",
                  sizes.length === 0
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border",
                )}
              >
                One size
              </button>
            </div>
          </Field>
        ) : (
          <p className="rounded-lg border border-dashed px-4 py-3 text-[0.8125rem] text-muted-foreground">
            Jewelry is sold as one size — no numbered sizes needed.
          </p>
        )}

        <Field
          label="Prices & stock by size"
          hint="Each size starts with the price above. Change individual prices here."
        >
          <div className="flex flex-col gap-3">
            {sizeLabels.map((sizeLabel) => (
              <div
                key={sizeLabel}
                className="grid grid-cols-[4rem_1fr_1fr_5rem] items-center gap-3"
              >
                <span className="text-sm">{sizeLabel}</span>
                <Input
                  aria-label={`Size ${sizeLabel} price in naira`}
                  value={variantPrices[sizeLabel]?.price ?? price}
                  inputMode="decimal"
                  placeholder="Price (₦)"
                  onChange={(event) =>
                    setVariantPrices((previous) => ({
                      ...previous,
                      [sizeLabel]: {
                        price: event.target.value,
                        compareAt: previous[sizeLabel]?.compareAt ?? compareAt,
                      },
                    }))
                  }
                />
                <Input
                  aria-label={`Size ${sizeLabel} compare-at price in naira`}
                  value={variantPrices[sizeLabel]?.compareAt ?? compareAt}
                  inputMode="decimal"
                  placeholder="Compare-at (₦)"
                  onChange={(event) =>
                    setVariantPrices((previous) => ({
                      ...previous,
                      [sizeLabel]: {
                        price: previous[sizeLabel]?.price ?? price,
                        compareAt: event.target.value,
                      },
                    }))
                  }
                />
                <Input
                  aria-label={`Size ${sizeLabel} stock`}
                  value={variantStock[sizeLabel] ?? "0"}
                  inputMode="numeric"
                  placeholder="Stock"
                  onChange={(event) =>
                    setVariantStock((previous) => ({
                      ...previous,
                      [sizeLabel]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </Field>

        <Field label="Description" error={errors.description}>
          <Textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setErrors((er) => ({ ...er, description: "" }));
            }}
            placeholder="A bias-cut slip in sandwashed silk that moves the way you do…"
            rows={4}
            aria-invalid={!!errors.description}
          />
        </Field>

        <Field
          label="Details & care"
          hint="One per line — shown as bullet points"
        >
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={
              "100% sandwashed mulberry silk\nBias cut, adjustable straps\nDry clean only"
            }
            rows={4}
          />
        </Field>
      </fieldset>

      {/* Right column — images + submit */}
      <div className="flex flex-col gap-6 lg:sticky lg:top-8">
        <Field
          label="Images"
          hint="Up to 4 — first is the cover"
          error={errors.images}
        >
          <div className="flex flex-col gap-3">
            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((src, i) => (
                  <div
                    key={`${src.slice(0, 32)}-${i}`}
                    className="group relative aspect-[4/5] overflow-hidden rounded-md border bg-muted"
                  >
                    <Image
                      src={src}
                      alt={`Product image ${i + 1}`}
                      fill
                      sizes="96px"
                      className="object-cover"
                      unoptimized
                    />
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-background/90 px-1.5 py-0.5 text-[0.5625rem] font-medium">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove image ${i + 1}`}
                      disabled={saving}
                      onClick={() => {
                        const imageId = imageIds[i];
                        if (imageId)
                          setRemovedImageIds((previous) => [
                            ...previous,
                            imageId,
                          ]);
                        setImages((previous) =>
                          previous.filter((_, index) => index !== i),
                        );
                        setImageIds((previous) =>
                          previous.filter((_, index) => index !== i),
                        );
                        if (i < uploadedCount)
                          setUploadedCount((count) => count - 1);
                      }}
                      className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-espresso/80 text-espresso-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2Icon className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addImageUrl();
                    }
                  }}
                  placeholder="Paste an image URL"
                  className="h-10 pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={addImageUrl}
              >
                Add
              </Button>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-[0.8125rem] text-muted-foreground transition-colors duration-150 hover:border-foreground/40 hover:text-foreground"
            >
              <ImagePlusIcon className="size-4" />
              Upload from device
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFile}
              className="hidden"
            />
          </div>
        </Field>

        {saving && (
          <p role="status" className="text-sm text-muted-foreground">
            {progress}
          </p>
        )}
        {errors.submit && (
          <p role="alert" className="text-sm text-destructive">
            {errors.submit}
            {createdId &&
              " Your saved product is retained. Retry to finish the remaining changes."}
          </p>
        )}
        <Separator />

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/admin/products")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            data-intent="DRAFT"
            variant="outline"
            disabled={saving}
          >
            {snapshot?.status === "PUBLISHED"
              ? "Unpublish / Save draft"
              : "Save draft"}
          </Button>
          <Button
            type="submit"
            data-intent="PUBLISHED"
            disabled={saving}
            className="min-w-36 transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            {saving ? (
              <>
                <Loader2Icon className="size-4 animate-spin [animation-duration:0.7s]" />
                Saving…
              </>
            ) : snapshot?.status === "PUBLISHED" ? (
              "Save changes"
            ) : (
              "Publish product"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
