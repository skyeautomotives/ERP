"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function RouteFilter({ routes }: { routes: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams);
    if (e.target.value) {
      params.set("route", e.target.value);
    } else {
      params.delete("route");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      defaultValue={searchParams.get("route") ?? ""}
      onChange={handleChange}
      className="rounded-md border border-gray-300 px-3 py-2 text-sm"
    >
      <option value="">All routes</option>
      {routes.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  );
}
