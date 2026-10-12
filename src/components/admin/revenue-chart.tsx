"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useCurrency, useOrders } from "@/lib/store";
import { convertFromNGN, NGN_PER_USD } from "@/lib/format";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--bronze)",
  },
} satisfies ChartConfig;

function compact(value: number, currency: "NGN" | "USD"): string {
  const converted = convertFromNGN(value, currency);
  const formatted = new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(converted);
  return currency === "USD" ? `$${formatted}` : `₦${formatted}`;
}

export function RevenueChart() {
  const { orders } = useOrders();
  const { currency } = useCurrency();

  const data = useMemo(() => {
    // Last 6 calendar months, oldest → newest
    const now = new Date();
    const months: { key: string; label: string; revenue: number; orders: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleString("en", { month: "short" }),
        revenue: 0,
        orders: 0,
      });
    }
    for (const order of orders) {
      if (order.status === "cancelled") continue;
      const d = new Date(order.createdAt);
      const bucket = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (bucket) {
        bucket.revenue += order.totalNGN;
        bucket.orders += 1;
      }
    }
    return months.map((m) => ({
      ...m,
      revenue: Math.round(convertFromNGN(m.revenue, currency)),
    }));
  }, [orders, currency]);

  const peak = Math.max(...data.map((d) => d.revenue), 0);

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="font-display text-xl tracking-tight">Revenue</h2>
          <p className="mt-0.5 text-[0.75rem] text-muted-foreground">
            Last 6 months · {currency === "USD" ? `converted at ₦${NGN_PER_USD}/$` : "in Naira"}
          </p>
        </div>
      </div>

      {peak === 0 ? (
        <div className="grid h-56 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
          Revenue will chart here as orders come in.
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <AreaChart data={data} margin={{ left: -8, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={52}
              tickFormatter={(v: number) =>
                new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v)
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-medium tabular-nums">
                      {compact((value as number) * (currency === "USD" ? NGN_PER_USD : 1), currency)}
                    </span>
                  )}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-revenue)"
              strokeWidth={2}
              fill="url(#revenueFill)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}
