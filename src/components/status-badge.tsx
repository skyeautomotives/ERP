export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
        active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
