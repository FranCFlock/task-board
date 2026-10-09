import { stateVar, type UiState } from "@/lib/labels";

export default function StatusChip({ state, children }: { state: UiState; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-[20px] px-[10px] py-[3px] text-[10.5px] font-bold"
      style={{ background: stateVar(state, "bg"), color: stateVar(state, "fg") }}
    >
      {children}
    </span>
  );
}
