"use client";

import { motion, type Variants } from "framer-motion";
import { Activity, ShieldCheck, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/code-block";
import { CodeToUiPreview } from "@/components/code-to-ui-preview";
import { DevtoolsPreview } from "@/components/devtools-preview";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SpeedLines } from "@/components/speed-lines";

const REGISTRY_COMMAND = "npx shadcn@latest add https://soroform.dev/registry/stellar-provider";

const FEATURES = [
  {
    icon: Activity,
    title: "TanStack inside",
    description:
      "Native caching, live streams for Horizon payments and effects, and balances that refresh themselves.",
  },
  {
    icon: ShieldCheck,
    title: "Total type-safety",
    description:
      "Zod schemas generated directly from a contract's spec. If it's on-chain, it's in your IDE.",
  },
  {
    icon: Wallet,
    title: "Unified signers",
    description:
      "One hook for Freighter, xBull, Albedo, Lobstr, Hana, and Rabet. Sign anything, anywhere.",
  },
];

const EASE = [0.16, 1, 0.3, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.65, ease: EASE } },
};

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,color-mix(in_oklch,var(--chart-2),transparent_82%),transparent)]"
          />
          <div className="absolute inset-x-0 top-0 -z-10 h-[28rem]">
            <SpeedLines />
          </div>

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pt-20 pb-24 text-center sm:pt-28"
          >
            <motion.h1
              variants={item}
              className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-balance sm:text-6xl"
            >
              Build Stellar apps at 100x speed.
            </motion.h1>

            <motion.p
              variants={item}
              className="mt-6 max-w-xl text-balance text-muted-foreground sm:text-lg"
            >
              The React SDK for the Stellar blockchain. Fully type-safe hooks, automatic Zod
              validation, and integrated TanStack Query. Stop writing XDR, start writing products.
            </motion.p>

            <motion.div variants={item} id="registry" className="mt-10 w-full max-w-lg scroll-mt-24">
              <CodeBlock language="bash" filename="terminal" theme="dark">
                {REGISTRY_COMMAND}
              </CodeBlock>
            </motion.div>

            <motion.div variants={item} className="mt-20 w-full">
              <CodeToUiPreview />
            </motion.div>
          </motion.div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 py-16">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={container}
            className="text-center"
          >
            <motion.h2
              variants={item}
              className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Zero-context debugging.
            </motion.h2>
            <motion.p variants={item} className="mt-3 text-balance text-muted-foreground">
              Integrated devtools that visualize your simulations, resource usage, and auth
              entries in real time. Never open the Laboratory again.
            </motion.p>
            <motion.div variants={item} className="mt-10">
              <DevtoolsPreview />
            </motion.div>
          </motion.div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 py-16">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={container}
          >
            <motion.h2
              variants={item}
              className="text-center font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Everything you need to ship.
            </motion.h2>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {FEATURES.map((feature) => (
                <motion.div key={feature.title} variants={item} whileHover={{ y: -4 }}>
                  <Card className="h-full transition-colors hover:border-cyan-500/40">
                    <CardHeader>
                      <feature.icon className="size-5 text-cyan-500" />
                      <CardTitle className="mt-2">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {feature.description}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
