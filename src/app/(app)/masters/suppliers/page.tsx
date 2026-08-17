import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";

const PAGE_SIZE = 20;

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, "masters", "view")) redirect("/unauthorized");

  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("suppliers")
    .select("id, name, phone, gstin, contact_person, is_active", { count: "exact" });

  if (q) query = query.ilike("name", `%${q}%`);

  const { data: suppliers, count } = await query
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Suppliers</h1>
        {can(user, "masters", "create") && (
          <Link
            href="/masters/suppliers/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New supplier
          </Link>
        )}
      </div>

      <div className="mt-4">
        <SearchInput placeholder="Search suppliers..." />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">GSTIN</th>
              <th className="px-4 py-2 font-medium">Contact person</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(suppliers ?? []).map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link href={`/masters/suppliers/${s.id}`} className="font-medium text-blue-600 hover:underline">
                    {s.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-500">{s.phone ?? "-"}</td>
                <td className="px-4 py-2 text-gray-500">{s.gstin ?? "-"}</td>
                <td className="px-4 py-2 text-gray-500">{s.contact_person ?? "-"}</td>
                <td className="px-4 py-2">
                  <StatusBadge active={s.is_active} />
                </td>
              </tr>
            ))}
            {(!suppliers || suppliers.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No suppliers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
      </div>
    </div>
  );
}
