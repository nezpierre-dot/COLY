import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type SortKey = "dateCreated" | "price" | "departureDate" | "destination";
export type SortDir = "asc" | "desc";
export type SortOption = { key: SortKey; dir: SortDir };

interface SortSelectProps {
  value: SortOption;
  onChange: (v: SortOption) => void;
  t: (k: string) => string;
  /** Which sort keys to show (defaults to all 4) */
  keys?: SortKey[];
}

const defaultKeys: SortKey[] = ["dateCreated", "price", "departureDate", "destination"];

const SortSelect = ({ value, onChange, t, keys = defaultKeys }: SortSelectProps) => {
  const [open, setOpen] = useState(false);

  const labels: Record<SortKey, string> = {
    dateCreated: t("sort.dateCreated"),
    price: t("sort.price"),
    departureDate: t("sort.departureDate"),
    destination: t("sort.destination"),
  };

  const handleSelect = (key: SortKey) => {
    if (value.key === key) {
      onChange({ key, dir: value.dir === "asc" ? "desc" : "asc" });
    } else {
      onChange({ key, dir: key === "price" ? "asc" : "desc" });
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted/60 text-muted-foreground hover:bg-muted transition-colors">
          <ArrowUpDown size={13} />
          {labels[value.key]}
          {value.dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1.5" align="start">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
          {t("sort.label")}
        </p>
        {keys.map((key) => {
          const isActive = value.key === key;
          return (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <span>{labels[key]}</span>
              {isActive && (
                value.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
              )}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
};

export default SortSelect;

/**
 * Generic sort helper. Items must have the fields used by `key`.
 */
export function applySortOption<T extends Record<string, any>>(
  items: T[],
  sort: SortOption,
  fieldMap: Partial<Record<SortKey, string>>
): T[] {
  const field = fieldMap[sort.key];
  if (!field) return items;

  return [...items].sort((a, b) => {
    let va = a[field];
    let vb = b[field];

    // Numeric comparison for price
    if (sort.key === "price") {
      const na = parseFloat(String(va ?? "").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
      const nb = parseFloat(String(vb ?? "").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
      return sort.dir === "asc" ? na - nb : nb - na;
    }

    // Date comparison
    if (sort.key === "dateCreated" || sort.key === "departureDate") {
      const da = va ? new Date(va).getTime() : 0;
      const db = vb ? new Date(vb).getTime() : 0;
      return sort.dir === "asc" ? da - db : db - da;
    }

    // String comparison (destination)
    const sa = String(va ?? "").toLowerCase();
    const sb = String(vb ?? "").toLowerCase();
    return sort.dir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
  });
}
