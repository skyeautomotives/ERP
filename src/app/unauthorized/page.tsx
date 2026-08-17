import Link from "next/link";
import { logout } from "@/app/login/actions";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 px-4 text-center">
      <h1 className="text-lg font-semibold text-gray-900">Access denied</h1>
      <p className="max-w-sm text-sm text-gray-500">
        Your account doesn&apos;t have permission to view this page, or your account has been
        deactivated. Contact an administrator if you think this is a mistake.
      </p>
      <div className="mt-2 flex gap-3">
        <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:underline">
          Back to dashboard
        </Link>
        <form action={logout}>
          <button type="submit" className="text-sm font-medium text-gray-500 hover:underline">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
