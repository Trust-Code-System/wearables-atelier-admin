"use client";

import type { ReactNode } from "react";
import { AnimatedValue, MetricSurface } from "./animated-value";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ManagementSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <SearchIcon
        aria-hidden
        className="absolute top-2.5 left-3 size-4 text-muted-foreground"
      />
      <Input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 pl-9"
      />
    </div>
  );
}

export function ManagementFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(value) => value && onChange(value)}
      items={options}
    >
      <SelectTrigger aria-label={label} className="h-9 min-w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function MetricCards({
  items,
}: {
  items: { label: string; value: string | number; hint: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <MetricSurface
          key={item.label}
          className="admin-stat rounded-xl border bg-card p-5"
        >
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="admin-stat-value mt-3 font-semibold tabular-nums">
            <AnimatedValue value={item.value} />
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{item.hint}</p>
        </MetricSurface>
      ))}
    </div>
  );
}

export function EmptyResults({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
