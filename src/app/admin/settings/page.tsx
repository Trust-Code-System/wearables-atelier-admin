"use client";

import { useState } from "react";
import { CheckIcon, EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { useSettings, type StoreSettings } from "@/lib/store";
import { NGN_PER_USD } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { DashboardButton } from "@/components/block/dashboard-shell";
import type { Currency } from "@/lib/types";
import { cn } from "@/lib/utils";

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-[0.8125rem]">{label}</Label>
      {children}
      {hint ? <p className="text-[0.6875rem] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 rounded-xl border bg-card p-5 sm:p-6">
      <div>
        <h2 className="font-display text-lg tracking-tight">{title}</h2>
        <p className="mt-0.5 text-[0.75rem] text-muted-foreground">{description}</p>
      </div>
      <Separator />
      {children}
    </section>
  );
}

export default function AdminSettingsPage() {
  const { settings, saveSettings } = useSettings();
  const [draft, setDraft] = useState<StoreSettings>(settings);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  const set =
    <K extends keyof StoreSettings>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setDraft((d) => ({ ...d, [key]: e.target.value }));

  const setNumber =
    <K extends keyof StoreSettings>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setDraft((d) => ({ ...d, [key]: Number(e.target.value.replace(/[^0-9]/g, "")) || 0 }));

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  const handleSave = () => {
    setSaving(true);
    // Simulate a save round-trip; backend will replace with an API call
    window.setTimeout(() => {
      saveSettings(draft);
      setSaving(false);
      toast.success("Settings saved", {
        description: "Your changes are stored and will apply across the dashboard.",
      });
    }, 500);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:p-6">
      <Section title="Store details" description="Shown on receipts, emails, and the storefront footer.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Store name">
            <Input value={draft.storeName} onChange={set("storeName")} className="h-10" />
          </Field>
          <Field label="Contact email">
            <Input type="email" value={draft.email} onChange={set("email")} className="h-10" />
          </Field>
          <Field label="Phone">
            <Input type="tel" value={draft.phone} onChange={set("phone")} className="h-10" />
          </Field>
          <Field label="Address">
            <Input value={draft.address} onChange={set("address")} className="h-10" />
          </Field>
        </div>
        <Field label="Default display currency" hint="Visitors can still switch ₦ / $ in the header.">
          <ToggleGroup
            value={[draft.defaultCurrency]}
            onValueChange={(v) => {
              const next = (Array.isArray(v) ? v[0] : v) as Currency | undefined;
              if (next) setDraft((d) => ({ ...d, defaultCurrency: next }));
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="NGN" className="px-4">₦ Naira</ToggleGroupItem>
            <ToggleGroupItem value="USD" className="px-4">$ US Dollar</ToggleGroupItem>
          </ToggleGroup>
          <p className="text-[0.6875rem] text-muted-foreground">
            Conversion rate: ₦{NGN_PER_USD.toLocaleString()} = $1 (set by backend)
          </p>
        </Field>
      </Section>

      <Section
        title="Payments — Paystack"
        description="Keys are stored locally for now; the backend team will move them to server environment variables."
      >
        <div className="flex flex-col gap-5">
          <Field label="Public key" hint="Starts with pk_test_ or pk_live_">
            <Input
              value={draft.paystackPublicKey}
              onChange={set("paystackPublicKey")}
              placeholder="pk_test_…"
              className="h-10 font-mono text-[0.8125rem]"
            />
          </Field>
          <Field label="Demo secret-key placeholder" hint="Stored in this browser only. Live secrets belong in server environment variables after backend integration.">
            <div className="relative">
              <Input
                type={showSecret ? "text" : "password"}
                value={draft.paystackSecretKey}
                onChange={set("paystackSecretKey")}
                placeholder="sk_test_…"
                className="h-10 pr-10 font-mono text-[0.8125rem]"
              />
              <button
                type="button"
                aria-label={showSecret ? "Hide secret key" : "Show secret key"}
                onClick={() => setShowSecret((s) => !s)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-all duration-150 ease-out hover:text-foreground active:scale-90"
              >
                {showSecret ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
          </Field>
          <label className="flex w-fit cursor-pointer items-center gap-2.5 text-[0.8125rem]">
            <Checkbox
              checked={draft.paystackTestMode}
              onCheckedChange={(checked) =>
                setDraft((d) => ({ ...d, paystackTestMode: checked === true }))
              }
            />
            Test mode
            <span className="text-muted-foreground">— no real charges while enabled</span>
          </label>
        </div>
      </Section>

      <Section title="Delivery" description="Fees shown at checkout. All amounts in Naira.">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Free over (₦)" hint="Complimentary delivery threshold">
            <Input
              value={draft.freeShippingThresholdNGN || ""}
              onChange={setNumber("freeShippingThresholdNGN")}
              inputMode="numeric"
              className="h-10 tabular-nums"
            />
          </Field>
          <Field label="Standard fee (₦)">
            <Input
              value={draft.standardFeeNGN || ""}
              onChange={setNumber("standardFeeNGN")}
              inputMode="numeric"
              className="h-10 tabular-nums"
            />
          </Field>
          <Field label="Express fee (₦)">
            <Input
              value={draft.expressFeeNGN || ""}
              onChange={setNumber("expressFeeNGN")}
              inputMode="numeric"
              className="h-10 tabular-nums"
            />
          </Field>
        </div>
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <DashboardButton
          variant="primary"
          size="sm"
          disabled={!dirty || saving}
          onClick={handleSave}
          className="h-9 px-5 shadow-lg shadow-foreground/10"
        >
          {saving ? (
            <>
              <Loader2Icon className="size-4 animate-spin [animation-duration:0.7s]" />
              Saving…
            </>
          ) : (
            <>
              <CheckIcon aria-hidden />
              Save changes
            </>
          )}
        </DashboardButton>
      </div>
    </div>
  );
}
