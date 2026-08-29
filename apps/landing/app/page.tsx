"use client";

import { motion, type Variants } from "framer-motion";
import { Braces, Layers, ShieldCheck, Wallet, Wrench } from "lucide-react";
import Link from "next/link";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Marquee } from "@/components/ui/marquee";
import { TextAnimate } from "@/components/ui/text-animate";
import { DevtoolsPreview } from "@/components/devtools-preview";
import { OnboardingTabs } from "@/components/onboarding-tabs";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";

const WALLETS = ["Freighter", "xBull", "Albedo", "Lobstr", "Hana", "Rabet"];
const CONNECTORS = ["Stellar Wallets Kit", "Blux", "Para"];

const FEATURES = [
  {
    name: "No code generation",
    description:
      "Every hook fetches a contract's spec at runtime from its contractId and derives a Zod schema automatically. Point at a different contract — nothing to regenerate, nothing to republish.",
    Icon: Braces,
    className: "col-span-3 lg:col-span-2",
  },
  {
    name: "One entry point",
    description:
      "SorokitProvider wires up network config, wallet connection, and devtools in a single component. No nested providers to get wrong.",
    Icon: Layers,
    className: "col-span-3 lg:col-span-1",
  },
  {
    name: "Swap wallets, not code",
    description:
      "stellarWalletsKit(), blux(), or para() — the same useWallet() hook either way. Hot-swap the connector without touching a component.",
    Icon: Wallet,
    className: "col-span-3 lg:col-span-1",
  },
  {
    name: "Total type-safety",
    description:
      "Args validated, results decoded, errors normalized across all 16 contract error classes — before any of it reaches your component.",
    Icon: ShieldCheck,
    className: "col-span-3 lg:col-span-1",
  },
  {
    name: "See every send",
    description:
      "A devtools panel that logs every simulate → sign → submit cycle, with the built transaction and resource usage, right next to your app.",
    Icon: Wrench,
    className: "col-span-3 lg:col-span-1",
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
          <DotPattern
            glow
            className={cn(
              "absolute inset-x-0 top-0 -z-10 h-[42rem]",
              "[mask-image:radial-gradient(48rem_28rem_at_50%_0%,white,transparent)]",
            )}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,color-mix(in_oklch,var(--chart-2),transparent_84%),transparent)]"
          />

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pt-20 pb-24 text-center sm:pt-28"
          >
            <motion.div
              variants={item}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm"
            >
              <span className="size-1.5 rounded-full bg-primary" />
              wagmi for Stellar
            </motion.div>

            <TextAnimate
              as="h1"
              by="word"
              animation="blurInUp"
              once
              className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-balance sm:text-6xl"
            >
              Ship Soroban dApps without touching XDR.
            </TextAnimate>

            <motion.p
              variants={item}
              className="mt-6 max-w-xl text-balance text-muted-foreground sm:text-lg"
            >
              Sorokit turns a deployed contract&apos;s spec into typed, validated React hooks. One
              provider wires up network config, wallet connection, and devtools — no code
              generation, no hand-rolled signing glue.
            </motion.p>

            <motion.div
              variants={item}
              className="mt-10 flex flex-wrap items-center justify-center gap-3"
            >
              <Button asChild size="lg">
                <Link href="https://docs.sorokit.dev">Read the docs</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="https://github.com/payrouteshq/sorokit">View on GitHub</Link>
              </Button>
            </motion.div>
          </motion.div>
        </section>

        <section className="border-y border-border/60 bg-card/30 py-10">
          <p className="text-center text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Works with the wallets your users already have
          </p>
          <div className="mt-6">
            <Marquee pauseOnHover className="[--duration:32s]">
              {[...WALLETS, ...CONNECTORS].map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground/80"
                >
                  {name}
                </span>
              ))}
            </Marquee>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 py-20">
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
              From install to your first hook.
            </motion.h2>
            <motion.p variants={item} className="mt-3 text-balance text-muted-foreground">
              Three steps, no detours: install the packages, wire up a wallet, call a contract.
            </motion.p>
            <motion.div variants={item} className="mt-10 flex justify-center">
              <OnboardingTabs />
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
              Integrated devtools that visualize your simulations, resource usage, and auth entries
              in real time. Never open the Laboratory again.
            </motion.p>
            <motion.div variants={item} className="mt-10">
              <DevtoolsPreview />
            </motion.div>
          </motion.div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 py-20">
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
            <motion.div variants={item} className="mt-10">
              <BentoGrid className="grid-cols-3 auto-rows-[16rem] gap-4">
                {FEATURES.map((feature) => (
                  <BentoCard
                    key={feature.name}
                    name={feature.name}
                    description={feature.description}
                    Icon={feature.Icon}
                    className={feature.className}
                    href="https://docs.sorokit.dev"
                    cta="Read the docs"
                    background={
                      <div
                        aria-hidden
                        className="absolute top-0 right-0 h-full w-1/2 bg-[radial-gradient(circle_at_100%_0%,color-mix(in_oklch,var(--primary),transparent_88%),transparent_60%)]"
                      />
                    }
                  />
                ))}
              </BentoGrid>
            </motion.div>
          </motion.div>
        </section>

        <section className="mx-auto w-full max-w-3xl px-6 pb-24">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={item}
            className="relative overflow-hidden rounded-2xl border border-border bg-card px-8 py-16 text-center"
          >
            <BorderBeam
              size={200}
              duration={8}
              colorFrom="var(--primary)"
              colorTo="var(--chart-2)"
            />
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-3xl">
              Ready to ship on Stellar?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-balance text-muted-foreground">
              Install Sorokit, wrap your app in one provider, and call your first hook.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="https://docs.sorokit.dev/quickstart">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="https://github.com/payrouteshq/sorokit">Star on GitHub</Link>
              </Button>
            </div>
          </motion.div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
