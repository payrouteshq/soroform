import Link from "next/link";
import { GithubIcon } from "@/components/github-icon";
import { PayroutesLogo } from "@/components/payroutes-logo";
import { SorokitLogo } from "@/components/sorokit-logo";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Docs", href: "https://docs.sorokit.xyz" },
      { label: "Quickstart", href: "https://docs.sorokit.xyz/quickstart" },
      { label: "Roadmap", href: "https://docs.sorokit.xyz/roadmap" },
    ],
  },
  {
    heading: "Reference",
    links: [
      { label: "SorokitProvider", href: "https://docs.sorokit.xyz/components/sorokit-provider" },
      { label: "useContractCall", href: "https://docs.sorokit.xyz/hooks/use-contract-call" },
      { label: "useWallet", href: "https://docs.sorokit.xyz/hooks/use-wallet" },
    ],
  },
  {
    heading: "Community",
    links: [
      { label: "GitHub", href: "https://github.com/payrouteshq/sorokit" },
      { label: "X / Twitter", href: "https://x.com/payrouteshq" },
    ],
  },
];

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M18.24 2h3.28l-7.17 8.19L23 22h-6.6l-5.17-6.76L5.3 22H2.02l7.67-8.77L1 2h6.77l4.68 6.18L18.24 2Zm-1.15 18h1.82L7.02 3.9H5.06L17.09 20Z" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-10 px-6 py-16 sm:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="relative size-6 overflow-hidden">
              <SorokitLogo />
            </span>
            <span className="font-(family-name:--font-display) text-[1.05rem] font-bold tracking-tight text-foreground">
              sorokit
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">wagmi for Stellar.</p>
          <div className="mt-1 flex items-center gap-3">
            <Link
              href="https://github.com/payrouteshq/sorokit"
              aria-label="Sorokit on GitHub"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <GithubIcon className="size-4" />
            </Link>
            <Link
              href="https://x.com/payrouteshq"
              aria-label="Sorokit on X"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <XIcon className="size-4" />
            </Link>
          </div>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.heading} className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold tracking-wide text-foreground uppercase">
              {column.heading}
            </h3>
            <ul className="flex flex-col gap-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-6 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>&copy; {new Date().getFullYear()} Sorokit</span>
          <span className="flex items-center gap-1.5">
            <span>Built with</span>
            <span aria-hidden>&#10084;&#65039;</span>
            <span>by</span>
            <Link
              href="https://odii.site"
              className="underline underline-offset-2 transition-colors hover:text-foreground"
            >
              Odii
            </Link>
            <span>at</span>
            <Link
              href="https://payroutes.sh"
              className="flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <PayroutesLogo className="size-4" aria-hidden />
              Payroutes
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
