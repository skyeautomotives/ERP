export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
        active ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
