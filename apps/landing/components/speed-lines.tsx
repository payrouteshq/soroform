"use client";

import { motion } from "framer-motion";

const STREAKS = [
  { left: "4%", height: 120, duration: 1.1, delay: 0, opacity: 0.5 },
  { left: "11%", height: 80, duration: 0.9, delay: 0.4, opacity: 0.35 },
  { left: "18%", height: 160, duration: 1.4, delay: 0.15, opacity: 0.45 },
  { left: "26%", height: 100, duration: 1, delay: 0.7, opacity: 0.3 },
  { left: "34%", height: 140, duration: 1.2, delay: 0.3, opacity: 0.5 },
  { left: "42%", height: 90, duration: 0.85, delay: 0.55, opacity: 0.3 },
  { left: "50%", height: 170, duration: 1.5, delay: 0, opacity: 0.55 },
  { left: "58%", height: 100, duration: 1, delay: 0.6, opacity: 0.35 },
  { left: "66%", height: 130, duration: 1.15, delay: 0.25, opacity: 0.45 },
  { left: "74%", height: 90, duration: 0.95, delay: 0.45, opacity: 0.3 },
  { left: "82%", height: 150, duration: 1.3, delay: 0.1, opacity: 0.5 },
  { left: "90%", height: 110, duration: 1.05, delay: 0.65, opacity: 0.35 },
  { left: "96%", height: 80, duration: 0.9, delay: 0.35, opacity: 0.3 },
];

export function SpeedLines() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {STREAKS.map((streak, index) => (
        <motion.span
          key={index}
          className="absolute top-0 w-px bg-gradient-to-b from-transparent via-cyan-400 to-transparent"
          style={{ left: streak.left, height: streak.height, opacity: streak.opacity }}
          initial={{ y: "-20%" }}
          animate={{ y: "420%" }}
          transition={{
            duration: streak.duration,
            delay: streak.delay,
            repeat: Infinity,
            repeatDelay: 1.6,
            ease: "easeIn",
          }}
        />
      ))}
    </div>
  );
}
