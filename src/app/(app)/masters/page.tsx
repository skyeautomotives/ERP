import Link from "next/link";
import { redirect } from "next/navigation";
import { can, getCurrentUser } from "@/lib/auth/permissions";

const LINKS = [
  { href: "/masters/customers", label: "Customers", description: "Customer accounts, credit terms, routes" },
  { href: "/masters/suppliers", label: "Suppliers", description: "Supplier/creditor accounts and bank details" },
  { href: "/masters/products", label: "Products", description: "Stock items, pricing, GST rates" },
  { href: "/masters/routes", label: "Routes", description: "Delivery routes and assigned staff" },
];

export default async function MastersPage() {
  const user = await getCurrentUser();
  if (!can(user, "masters", "view")) {
    redirect("/unauthorized");
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Masters</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Core reference data used across the ERP.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/30"
          >
            <p className="font-medium text-gray-900 dark:text-gray-100">{link.label}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
