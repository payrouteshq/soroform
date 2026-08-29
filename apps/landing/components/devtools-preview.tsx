import Image from "next/image";
import { BorderBeam } from "@/components/ui/border-beam";

export function DevtoolsPreview() {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a] shadow-2xl shadow-black/40">
      <BorderBeam size={140} duration={10} colorFrom="var(--primary)" colorTo="var(--chart-2)" />
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-red-500/70" />
        <span className="size-2.5 rounded-full bg-yellow-500/70" />
        <span className="size-2.5 rounded-full bg-green-500/70" />
        <span className="ml-2 font-mono text-xs text-white/40">sorokit devtools</span>
      </div>
      <Image
        src="/devtools-panel.png"
        alt="The Sorokit devtools panel, showing a log of two contract sends with their status, args, result, and a copy transaction XDR button"
        width={1400}
        height={352}
        className="w-full"
      />
    </div>
  );
}
