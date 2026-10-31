import { Search } from "lucide-react";

/** Case-insensitive search across the given fields + exact status match ("ALL" = any). */
export function filterRequestRows<T extends Record<string, any>>(
  rows: T[],
  query: string,
  status: string,
  fields: (keyof T)[],
): T[] {
  const q = query.trim().toLowerCase();
  return rows.filter((r) => {
    if (status !== "ALL" && String(r["status"] || "").toUpperCase() !== status.toUpperCase())
      return false;
    if (!q) return true;
    return fields.some((f) => String(r[f] ?? "").toLowerCase().includes(q));
  });
}

/** Distinct statuses present in the rows, with counts, for the filter chips. */
export function statusCounts(rows: { status?: string }[]): [string, number][] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const s = String(r["status"] || "PENDING").toUpperCase();
    m.set(s, (m.get(s) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export function RequestFilterBar(props: {
  rows: { status?: string }[];
  query: string;
  onQuery: (q: string) => void;
  status: string;
  onStatus: (s: string) => void;
  placeholder?: string;
}) {
  const chips: [string, number][] = [["ALL", props.rows.length], ...statusCounts(props.rows)];
  return (
    <div className="mb-3 space-y-2">
      <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 dark:border-white/10">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          value={props.query}
          onChange={(e) => props.onQuery(e.target.value)}
          placeholder={props.placeholder || "Search name, number, ID…"}
          className="w-full bg-transparent text-xs outline-none"
        />
      </label>
      <div className="flex flex-wrap gap-1.5">
        {chips.map(([s, n]) => (
          <button
            key={s}
            type="button"
            onClick={() => props.onStatus(s)}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
              props.status === s
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-200 text-gray-600 dark:border-white/10 dark:text-gray-300"
            }`}
          >
            {s} ({n})
          </button>
        ))}
      </div>
    </div>
  );
}
