"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ImagePlusIcon, Link2Icon, Loader2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import type { Badge as BadgeType, Category, Product } from "@/lib/types";
import { useCatalog } from "@/lib/store";
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
    <div className={cn("flex flex-col gap-1.5", className)} data-invalid={error ? true : undefined}>
      <Label className="text-[0.8125rem]">{label}</Label>
      {children}
      {hint && !error ? <p className="text-[0.6875rem] text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p className="text-[0.75rem] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ProductForm({ existing }: { existing?: Product }) {
  const router = useRouter();
  const { addProduct, updateProduct } = useCatalog();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(existing?.name ?? "");
  const [category, setCategory] = useState<Category>(existing?.category ?? "clothing");
  const [badge, setBadge] = useState<BadgeType | "none">(existing?.badge ?? "none");
  const [price, setPrice] = useState(existing ? String(existing.priceNGN) : "");
  const [compareAt, setCompareAt] = useState(
    existing?.compareAtNGN ? String(existing.compareAtNGN) : "",
  );
  const [stock, setStock] = useState(existing ? String(existing.stock) : "");
  const [sizes, setSizes] = useState<number[]>(existing?.sizes ?? [...CLOTHING_SIZES]);
  const [description, setDescription] = useState(existing?.description ?? "");
  const [details, setDetails] = useState(existing?.details.join("\n") ?? "");
  const [images, setImages] = useState<string[]>(existing?.images ?? []);
  const [imageUrl, setImageUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const toggleSize = (s: number) =>
    setSizes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s].sort((a, b) => a - b),
    );

  const addImageUrl = () => {
    const url = imageUrl.trim();
    if (!url) return;
    if (images.length >= 4) {
      toast.error("Four images maximum", { description: "The gallery supports up to four." });
      return;
    }
    setImages((prev) => [...prev, url]);
    setImageUrl("");
    setErrors((e) => ({ ...e, images: "" }));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (images.length >= 4) {
      toast.error("Four images maximum");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImages((prev) => [...prev, String(reader.result)]);
      setErrors((e) => ({ ...e, images: "" }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const validate = () => {
    const err: Record<string, string> = {};
    if (name.trim().length < 3) err.name = "Give the piece a name (3+ characters)";
    const priceNum = Number(price);
    if (!price || Number.isNaN(priceNum) || priceNum <= 0) err.price = "Enter a price in Naira";
    const compareNum = compareAt ? Number(compareAt) : undefined;
    if (compareNum !== undefined && (Number.isNaN(compareNum) || compareNum <= priceNum))
      err.compareAt = "Must be higher than the sale price";
    if (stock === "" || Number.isNaN(Number(stock)) || Number(stock) < 0)
      err.stock = "Enter available units";
    if (category === "clothing" && sizes.length === 0) err.sizes = "Select at least one size";
    if (description.trim().length < 12) err.description = "Write a short description";
    if (images.length === 0) err.images = "Add at least one image";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("A few fields need attention");
      return;
    }
    setSaving(true);

    const payload: Product = {
      id: existing?.id ?? `p-${Date.now()}`,
      slug: existing?.slug ?? slugify(name),
      name: name.trim(),
      category,
      priceNGN: Math.round(Number(price)),
      compareAtNGN: compareAt ? Math.round(Number(compareAt)) : undefined,
      description: description.trim(),
      details: details
        .split("\n")
        .map((d) => d.trim())
        .filter(Boolean),
      images,
      sizes: category === "jewelry" ? [] : sizes,
      stock: Math.max(0, Math.round(Number(stock))),
      badge: badge === "none" ? undefined : badge,
      createdAt: existing?.createdAt ?? new Date().toISOString().slice(0, 10),
    };

    // Simulate a save round-trip; backend will replace with an API call
    window.setTimeout(() => {
      if (existing) {
        updateProduct(existing.id, payload);
        toast.success("Changes saved", { description: payload.name });
      } else {
        addProduct(payload);
        toast.success("Product added", {
          description: `${payload.name} is live on the storefront.`,
        });
      }
      router.push("/admin/products");
    }, 500);
  };

  return (
    <form onSubmit={handleSubmit} className="grid items-start gap-10 lg:grid-cols-[1.4fr_1fr]">
      {/* Left column */}
      <div className="flex flex-col gap-6">
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
            <Select value={badge} onValueChange={(v) => setBadge(v as BadgeType | "none")}>
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
                setPrice(e.target.value);
                setErrors((er) => ({ ...er, price: "" }));
              }}
              placeholder="185000"
              inputMode="numeric"
              aria-invalid={!!errors.price}
              className="h-11 tabular-nums"
            />
          </Field>
          <Field label="Compare-at (₦)" hint="Optional — shows a strikethrough" error={errors.compareAt}>
            <Input
              value={compareAt}
              onChange={(e) => {
                setCompareAt(e.target.value);
                setErrors((er) => ({ ...er, compareAt: "" }));
              }}
              placeholder="220000"
              inputMode="numeric"
              aria-invalid={!!errors.compareAt}
              className="h-11 tabular-nums"
            />
          </Field>
          <Field label="Stock" error={errors.stock}>
            <Input
              value={stock}
              onChange={(e) => {
                setStock(e.target.value);
                setErrors((er) => ({ ...er, stock: "" }));
              }}
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
            </div>
          </Field>
        ) : (
          <p className="rounded-lg border border-dashed px-4 py-3 text-[0.8125rem] text-muted-foreground">
            Jewelry is sold as one size — no numbered sizes needed.
          </p>
        )}

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

        <Field label="Details & care" hint="One per line — shown as bullet points">
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={"100% sandwashed mulberry silk\nBias cut, adjustable straps\nDry clean only"}
            rows={4}
          />
        </Field>
      </div>

      {/* Right column — images + submit */}
      <div className="flex flex-col gap-6 lg:sticky lg:top-8">
        <Field label="Images" hint="Up to 4 — first is the cover" error={errors.images}>
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
                      unoptimized={src.startsWith("data:")}
                    />
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-background/90 px-1.5 py-0.5 text-[0.5625rem] font-medium">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove image ${i + 1}`}
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
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
              <Button type="button" variant="outline" onClick={addImageUrl}>
                Add
              </Button>
            </div>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-[0.8125rem] text-muted-foreground transition-colors duration-150 hover:border-foreground/40 hover:text-foreground"
            >
              <ImagePlusIcon className="size-4" />
              Upload from device
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>
        </Field>

        <Separator />

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/products")}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="min-w-36 transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            {saving ? (
              <>
                <Loader2Icon className="size-4 animate-spin [animation-duration:0.7s]" />
                Saving…
              </>
            ) : existing ? (
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
