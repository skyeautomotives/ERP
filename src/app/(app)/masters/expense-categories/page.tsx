import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { StatusBadge } from "@/components/status-badge";
import { DeactivateButton } from "@/components/deactivate-button";
import { ConfirmButton } from "@/components/confirm-button";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { CategoryForm } from "./category-form";
import { setExpenseCategoryActive, deleteExpenseCategory } from "./actions";

export default async function ExpenseCategoriesPage() {
  const user = await getCurrentUser();
  if (!can(user, "masters", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("expense_categories")
    .select("id, name, is_active")
    .order("name");

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Expense Categories</h1>
          <HelpButton content={HELP_CONTENT["expense-categories"]} />
        </div>
        {can(user, "masters", "create") && <CategoryForm />}
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {(categories ?? []).map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{c.name}</td>
                <td className="px-4 py-2">
                  <StatusBadge active={c.is_active} />
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    {can(user, "masters", "edit") && (
                      <DeactivateButton id={c.id} isActive={c.is_active} action={setExpenseCategoryActive} />
                    )}
                    {can(user, "masters", "delete") && (
                      <ConfirmButton
                        id={c.id}
                        label="Delete"
                        confirmTitle="Delete this category?"
                        confirmBody="This permanently removes the category. If any payments reference it, the delete will be blocked - deactivate it instead in that case."
                        confirmLabel="Delete category"
                        action={deleteExpenseCategory}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {(!categories || categories.length === 0) && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No expense categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
