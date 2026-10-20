"use client";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  chartNaira,
  moneyKobo,
  type AdminReport,
} from "@/lib/admin-operations";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
export function RevenueChart({ report }: { report: AdminReport }) {
  const data = report.daily.map((row) => ({
    date: row.date,
    revenue: chartNaira(row.paidTotalKobo),
  }));
  const displayable = data.every((row) => row.revenue !== null);
  return (
    <div className="grid gap-4 rounded-xl border bg-card p-5">
      <div>
        <h2 className="font-display text-xl">Paid order totals</h2>
        <p className="text-xs text-muted-foreground">
          {report.period.start} – {report.period.end} · UTC · NGN
        </p>
      </div>
      {!data.length ? (
        <div className="grid h-56 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No paid orders in this period.
        </div>
      ) : !displayable ? (
        <p>
          The exact total is {moneyKobo(report.totals.paidTotalKobo)}. This
          amount exceeds the chart’s display range.
        </p>
      ) : (
        <ChartContainer
          config={{
            revenue: {
              label: "Paid order totals (NGN)",
              color: "var(--bronze)",
            },
          }}
          className="h-56 w-full"
        >
          <AreaChart data={data}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              fontSize={11}
            />
            <YAxis
              width={65}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                new Intl.NumberFormat("en", { notation: "compact" }).format(
                  Number(value),
                )
              }
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--bronze)"
              fill="var(--bronze)"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}
