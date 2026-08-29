"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, KeyRound, LoaderCircle } from "lucide-react";

const STEPS = [
  {
    key: "simulating",
    label: "Simulating",
    detail: "checking balances & auth",
    icon: LoaderCircle,
    spin: true,
    color: "text-primary",
  },
  {
    key: "needsSignature",
    label: "Awaiting signature",
    detail: "confirm in wallet",
    icon: KeyRound,
    spin: false,
    color: "text-amber-400",
  },
  {
    key: "submitting",
    label: "Submitting",
    detail: "broadcasting to network",
    icon: LoaderCircle,
    spin: true,
    color: "text-primary",
  },
  {
    key: "success",
    label: "Success",
    detail: "transfer · 100 XLM",
    icon: CircleCheck,
    spin: false,
    color: "text-emerald-400",
  },
] as const;

const STEP_DURATIONS_MS = [1400, 1600, 1400, 2200];

export function LiveStatusPreview() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIndex((current) => (current + 1) % STEPS.length);
    }, STEP_DURATIONS_MS[index]);
    return () => clearTimeout(timeout);
  }, [index]);

  const step = STEPS[index];

  return (
    <div className="flex flex-col justify-center rounded-xl border border-white/10 bg-[#0a0a0a] p-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-white/40">Live preview</span>
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <span
              key={s.key}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === index ? "w-4 bg-primary" : "w-1.5 bg-white/15"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 h-[68px] overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-full items-center gap-3 px-4"
          >
            <step.icon
              className={`size-4 shrink-0 ${step.color} ${step.spin ? "animate-spin" : ""}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">{step.label}</p>
              <p className="truncate text-xs text-white/40">{step.detail}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="mt-4 text-xs text-white/30">
        status, data, and error, fully typed, zero XDR in sight.
      </p>
    </div>
  );
}
