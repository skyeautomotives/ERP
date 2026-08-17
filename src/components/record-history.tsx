import { createClient } from "@/lib/supabase/server";

function summarizeChange(oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null) {
  if (!oldData || !newData) return null;
  const changed: string[] = [];
  for (const key of Object.keys(newData)) {
    if (key === "updated_at" || key === "updated_by") continue;
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changed.push(`${key}: ${JSON.stringify(oldData[key])} -> ${JSON.stringify(newData[key])}`);
    }
  }
  return changed;
}

export async function RecordHistory({ table, recordId }: { table: string; recordId: string }) {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("action, old_data, new_data, created_at, user_id")
    .eq("table_name", table)
    .eq("record_id", recordId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!logs || logs.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No history yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {logs.map((log, i) => {
        const changes = summarizeChange(
          log.old_data as Record<string, unknown> | null,
          log.new_data as Record<string, unknown> | null,
        );
        return (
          <li key={i} className="border-b border-gray-100 pb-3 text-sm last:border-0">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700 dark:text-gray-300">{log.action}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
            {changes && changes.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-xs text-gray-500 dark:text-gray-400">
                {changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
