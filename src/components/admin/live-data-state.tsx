"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export function LiveDataState({
  owner,
  loading,
  error,
  refresh,
}: {
  owner: boolean;
  loading: boolean;
  error: string;
  refresh: () => void;
}) {
  return (
    <div className="grid gap-4 rounded-xl border border-dashed p-8 text-center">
      <p role={error ? "alert" : "status"}>
        {!owner
          ? "This page requires the verified owner account."
          : loading
            ? "Loading saved data…"
            : error || "No data is available."}
      </p>
      {owner ? (
        <Button
          className="justify-self-center"
          variant="outline"
          onClick={refresh}
        >
          Retry
        </Button>
      ) : (
        <Link href="/admin/products" className="underline">
          Manage products
        </Link>
      )}
    </div>
  );
}
