import { Gift } from "lucide-react";

export function FreeEntryBadge({ label = "GRÁTIS" }: { label?: string }) {
  return (
    <div className="present-badge">
      <div className="present-ribbon" />
      <div className="present-ribbon-vertical" />
      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-amber-300">
        <Gift className="h-3 w-3" />
        <span>{label}</span>
      </div>
    </div>
  );
}
