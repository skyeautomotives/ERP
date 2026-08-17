"use client";

import { useActionState } from "react";
import type { RouteFormState } from "./actions";
import type { Database } from "@/lib/supabase/database.types";

type Route = Database["public"]["Tables"]["routes"]["Row"];
type StaffOption = { id: string; full_name: string };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const initialState: RouteFormState = { error: null };

export function RouteForm({
  route,
  staff,
  action,
  canEdit,
}: {
  route?: Route;
  staff: StaffOption[];
  action: (prevState: RouteFormState, formData: FormData) => Promise<RouteFormState>;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const selectedDays = new Set(route?.route_days ?? []);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Route name</label>
        <input
          name="name"
          required
          defaultValue={route?.name ?? ""}
          disabled={!canEdit}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Area</label>
        <input
          name="area"
          defaultValue={route?.area ?? ""}
          disabled={!canEdit}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Assigned staff</label>
        <select
          name="assigned_user_id"
          defaultValue={route?.assigned_user_id ?? ""}
          disabled={!canEdit}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
        >
          <option value="">Unassigned</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Route days</label>
        <div className="flex flex-wrap gap-3">
          {WEEKDAYS.map((day) => (
            <label key={day} className="flex items-center gap-1 text-sm text-gray-700">
              <input
                type="checkbox"
                name="route_days"
                value={day}
                defaultChecked={selectedDays.has(day)}
                disabled={!canEdit}
              />
              {day}
            </label>
          ))}
        </div>
      </div>

      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      {canEdit && (
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save"}
        </button>
      )}
    </form>
  );
}
