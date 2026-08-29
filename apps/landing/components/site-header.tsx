import Image from "next/image";
import Link from "next/link";
import { BookOpen, Package } from "lucide-react";
import { GithubIcon } from "@/components/github-icon";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { label: "GitHub", href: "https://github.com/payrouteshq/sorokit", icon: GithubIcon },
  { label: "Docs", href: "https://docs.sorokit.dev", icon: BookOpen },
  { label: "Registry", href: "#registry", icon: Package },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative size-7 overflow-hidden rounded-md ring-1 ring-border">
            <Image src="/sorokit-logo.png" alt="" fill className="object-contain p-1" priority />
          </span>
          <span className="font-(family-name:--font-display) text-[1.05rem] font-bold tracking-tight text-foreground">
            sorokit
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
            >
              <link.icon className="size-3.5" />
              {link.label}
            </Link>
          ))}
          <div className="ml-1 border-l border-border pl-2">
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
