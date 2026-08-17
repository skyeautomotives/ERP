import { getCurrentUser } from "@/lib/auth/permissions";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Welcome back, {user?.fullName}.</p>

      <div className="mt-6 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Coming soon</p>
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
          The full sales/collection/stock dashboard (section 40-41 of the spec) is built in a
          later phase, once Sales, Purchase, Inventory and Accounts exist to report on.
        </p>
      </div>
    </div>
  );
}
