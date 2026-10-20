"use client";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api } from "@/lib/catalog-api";
import {
  announceAdminChange,
  operationsPath,
  shippingFeeKobo,
  type ShippingPolicy,
  type ShippingSettings,
  type ShippingRate,
} from "@/lib/admin-operations";
import { useAdminResource } from "@/lib/admin-resource";
import { LiveDataState } from "@/components/admin/live-data-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
function Days({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number[];
  onChange: (value: number[]) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-3">
        {days.map((day, index) => (
          <label key={day} className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={value.includes(index)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...value, index].sort()
                    : value.filter((value) => value !== index),
                )
              }
            />
            {day.slice(0, 3)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
function PolicyEditor({ settings }: { settings: ShippingSettings }) {
  const [policy, setPolicy] = useState(settings.policy),
    [holidayText, setHolidayText] = useState(
      settings.policy.holidays.join("\n"),
    ),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const setSection = <K extends keyof ShippingPolicy>(
    section: K,
    value: ShippingPolicy[K],
  ) => setPolicy((current) => ({ ...current, [section]: value }));
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      await api(operationsPath("shipping/settings"), {
        method: "PUT",
        body: JSON.stringify({
          expectedVersion: settings.version,
          reason: String(form.get("reason") ?? "").trim(),
          policy: {
            ...policy,
            holidays: holidayText
              .split("\n")
              .map((value) => value.trim())
              .filter(Boolean),
          },
        }),
      });
      toast.success("Delivery policy saved");
      announceAdminChange();
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Unable to save shipping settings.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className="grid gap-6 rounded-xl border bg-card p-5 sm:p-6"
      onSubmit={save}
    >
      <div>
        <h2 className="font-display text-lg">Delivery and pickup policy</h2>
        <p className="text-xs text-muted-foreground">
          Saved policy used for new checkout quotes. Times use Africa/Lagos.
        </p>
      </div>
      <section className="grid gap-4 border-t pt-4">
        <h3 className="font-medium">Preparation</h3>
        <label className="grid max-w-xs gap-1 text-sm">
          Preparation working days
          <Input
            type="number"
            min={1}
            max={90}
            required
            value={policy.preparation.workingDays}
            onChange={(event) =>
              setSection("preparation", {
                ...policy.preparation,
                workingDays: Number(event.target.value),
              })
            }
          />
        </label>
        <Days
          label="Preparation weekdays"
          value={policy.preparation.weekdays}
          onChange={(weekdays) =>
            setSection("preparation", { ...policy.preparation, weekdays })
          }
        />
      </section>
      <section className="grid gap-4 border-t pt-4">
        <h3 className="font-medium">Transit and dispatch</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Minimum transit working days
            <Input
              type="number"
              min={1}
              max={90}
              required
              value={policy.transit.minWorkingDays}
              onChange={(event) =>
                setSection("transit", {
                  ...policy.transit,
                  minWorkingDays: Number(event.target.value),
                })
              }
            />
          </label>
          <label className="grid gap-1 text-sm">
            Maximum transit working days
            <Input
              type="number"
              min={1}
              max={90}
              required
              value={policy.transit.maxWorkingDays}
              onChange={(event) =>
                setSection("transit", {
                  ...policy.transit,
                  maxWorkingDays: Number(event.target.value),
                })
              }
            />
          </label>
        </div>
        <Days
          label="Transit weekdays"
          value={policy.transit.weekdays}
          onChange={(weekdays) =>
            setSection("transit", { ...policy.transit, weekdays })
          }
        />
        <Days
          label="Dispatch weekdays"
          value={policy.dispatch.weekdays}
          onChange={(weekdays) =>
            setSection("dispatch", { ...policy.dispatch, weekdays })
          }
        />
        <div className="flex flex-wrap gap-3">
          {(["from", "to"] as const).map((key) => (
            <label key={key} className="grid gap-1 text-sm">
              Dispatch {key}
              <Input
                type="time"
                required
                value={policy.dispatch.hours[key]}
                onChange={(event) =>
                  setSection("dispatch", {
                    ...policy.dispatch,
                    hours: {
                      ...policy.dispatch.hours,
                      [key]: event.target.value,
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
        <label className="grid gap-1 text-sm">
          Holidays (YYYY-MM-DD, one per line)
          <Textarea
            value={holidayText}
            onChange={(event) => setHolidayText(event.target.value)}
          />
        </label>
      </section>
      <section className="grid gap-4 border-t pt-4">
        <h3 className="font-medium">Store pickup</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={policy.pickup.enabled}
            onChange={(event) =>
              setSection("pickup", {
                ...policy.pickup,
                enabled: event.target.checked,
              })
            }
          />
          Enable free pickup
        </label>
        <label className="grid gap-1 text-sm">
          Full pickup address
          <Input
            required
            maxLength={255}
            value={policy.pickup.address}
            onChange={(event) =>
              setSection("pickup", {
                ...policy.pickup,
                address: event.target.value,
              })
            }
          />
        </label>
        <label className="grid gap-1 text-sm">
          Pickup phone (+234…)
          <Input
            required
            maxLength={16}
            pattern="\+234[789][0-9]{9}"
            value={policy.pickup.phone}
            onChange={(event) =>
              setSection("pickup", {
                ...policy.pickup,
                phone: event.target.value,
              })
            }
          />
        </label>
        <div className="flex flex-wrap gap-3">
          {(["from", "to"] as const).map((key) => (
            <label key={key} className="grid gap-1 text-sm">
              Pickup {key}
              <Input
                type="time"
                required
                value={policy.pickup.hours[key]}
                onChange={(event) =>
                  setSection("pickup", {
                    ...policy.pickup,
                    hours: {
                      ...policy.pickup.hours,
                      [key]: event.target.value,
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={policy.pickup.weekdays === null}
            onChange={(event) =>
              setSection("pickup", {
                ...policy.pickup,
                weekdays: event.target.checked ? null : [],
              })
            }
          />
          Pickup weekdays are not confirmed
        </label>
        {policy.pickup.weekdays !== null && (
          <Days
            label="Confirmed pickup weekdays"
            value={policy.pickup.weekdays}
            onChange={(weekdays) =>
              setSection("pickup", { ...policy.pickup, weekdays })
            }
          />
        )}
      </section>
      <label className="grid gap-1 border-t pt-4 text-sm">
        Reason for this change
        <Input name="reason" maxLength={255} required />
      </label>
      <Button type="submit" className="justify-self-start" disabled={busy}>
        {busy ? "Saving…" : "Save delivery policy"}
      </Button>
      <p role="status">{message}</p>
    </form>
  );
}
type Place = { id: string; name: string };
function RateEditor({
  destination,
  rates,
  version,
}: {
  destination: Place;
  rates: ShippingRate[];
  version: number;
}) {
  const labels = {
    collection: "Delivery / collection",
    doorstep: "Doorstep delivery",
    park: "Motor park / bus stop collection",
  } as const;
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState<string | null>(null);
  return (
    <div className="grid gap-4">
      {(["collection", "doorstep", "park"] as const).map((method) => {
        const rate = rates.find(
            (rate) =>
              rate.destinationId === destination.id && rate.method === method,
          ),
          amount = BigInt(rate?.feeKobo ?? "0");
        return (
          <form
            key={method}
            className="grid gap-3 rounded-xl border p-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy) return;
              const data = new FormData(event.currentTarget);
              setMessage("");
              setBusy(method);
              try {
                await api(operationsPath("shipping/rates"), {
                  method: "PUT",
                  body: JSON.stringify({
                    expectedVersion: version,
                    reason: String(data.get("reason") ?? "").trim(),
                    rates: [
                      {
                        destinationId: destination.id,
                        method,
                        enabled: data.get("enabled") === "on",
                        feeKobo: shippingFeeKobo(
                          String(data.get("fee") ?? "").trim(),
                        ),
                      },
                    ],
                  }),
                });
                toast.success("Delivery rate saved");
                announceAdminChange();
              } catch (cause) {
                setMessage(
                  cause instanceof Error
                    ? cause.message
                    : "Unable to save rate.",
                );
              } finally {
                setBusy(null);
              }
            }}
          >
            <h3 className="font-medium">
              {labels[method]} — {destination.name}
            </h3>
            <div className="grid items-end gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                Fee (₦)
                <Input
                  name="fee"
                  inputMode="decimal"
                  required
                  defaultValue={`${amount / BigInt("100")}.${(amount % BigInt("100")).toString().padStart(2, "0")}`}
                />
              </label>
              <label className="flex items-center gap-2 py-2 text-sm">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={rate?.enabled ?? false}
                />
                Enable this rate
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              Reason
              <Input name="reason" required maxLength={255} />
            </label>
            <Button
              type="submit"
              className="justify-self-start"
              variant="outline"
              disabled={Boolean(busy)}
            >
              {busy === method ? "Saving…" : "Save rate"}
            </Button>
          </form>
        );
      })}
      <p role="status">{message}</p>
    </div>
  );
}
function ShippingRates() {
  const [state, setState] = useState(""),
    [destinationId, setDestinationId] = useState("");
  const states = useAdminResource<{ data: Place[] }>(
    "/api/v1/store/shipping/states",
  );
  const destinations = useAdminResource<{ data: Place[] }>(
    state
      ? `/api/v1/store/shipping/destinations?stateId=${encodeURIComponent(state)}`
      : null,
  );
  const rates = useAdminResource<{
    data: ShippingRate[];
    meta: { version: number };
  }>(state ? operationsPath("shipping/rates", { stateId: state }) : null);
  const destination = destinations.data?.data.find(
    (value) => value.id === destinationId,
  );
  return (
    <section className="grid gap-4 rounded-xl border bg-card p-5 sm:p-6">
      <div>
        <h2 className="font-display text-lg">Delivery rates</h2>
        <p className="text-xs text-muted-foreground">
          Enable reviewed catalogue destinations explicitly. An unpriced
          destination requires a quote; there is no automatic state fallback.
        </p>
      </div>
      {!states.data ? (
        <LiveDataState {...states} />
      ) : (
        <label className="grid gap-1 text-sm">
          State
          <select
            className="h-11 rounded-lg border bg-card px-3"
            value={state}
            onChange={(event) => {
              setState(event.target.value);
              setDestinationId("");
            }}
          >
            <option value="">Select a state</option>
            {states.data.data.map((value) => (
              <option key={value.id} value={value.id}>
                {value.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {state &&
        (!destinations.data ? (
          <LiveDataState {...destinations} />
        ) : (
          <label className="grid gap-1 text-sm">
            Destination
            <select
              className="h-11 rounded-lg border bg-card px-3"
              value={destinationId}
              onChange={(event) => setDestinationId(event.target.value)}
            >
              <option value="">Select a destination</option>
              {destinations.data.data.map((value) => (
                <option key={value.id} value={value.id}>
                  {value.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      {destination &&
        (!rates.data ? (
          <LiveDataState {...rates} />
        ) : (
          <RateEditor
            key={`${destination.id}:${rates.data.meta.version}`}
            destination={destination}
            rates={rates.data.data}
            version={rates.data.meta.version}
          />
        ))}
    </section>
  );
}
export default function SettingsPage() {
  const settings = useAdminResource<ShippingSettings>(
    operationsPath("shipping/settings"),
  );
  if (!settings.data)
    return (
      <div className="p-6">
        <LiveDataState {...settings} />
      </div>
    );
  return (
    <div className="grid gap-5 p-4 sm:p-6">
      <div className="flex items-center justify-between rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Saved delivery settings apply to new orders. Existing order snapshots
          stay intact.
        </p>
        <Button variant="outline" onClick={settings.refresh}>
          Refresh
        </Button>
      </div>
      <PolicyEditor key={settings.data.version} settings={settings.data} />
      <ShippingRates />
      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-display text-lg">Payment credentials</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Contact your deployment administrator to change payment credentials.
          Payment keys are never stored in this browser.
        </p>
      </section>
    </div>
  );
}
