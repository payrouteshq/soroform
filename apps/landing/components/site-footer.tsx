import Link from "next/link";
import { GithubIcon } from "@/components/github-icon";
import { PayroutesLogo } from "@/components/payroutes-logo";

export function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row sm:justify-between">
      <span>&copy; {new Date().getFullYear()} Soroform</span>

      <Link
        href="https://payroutes.com"
        className="flex items-center gap-1.5 transition-colors hover:text-foreground"
      >
        Built with <span aria-hidden>&#10084;&#65039;</span> by
        <PayroutesLogo className="size-4" />
        Payroutes
      </Link>

      <div className="flex items-center gap-4">
        <Link
          href="https://github.com/payrouteshq/soroform"
          aria-label="Soroform on GitHub"
          className="transition-colors hover:text-foreground"
        >
          <GithubIcon className="size-4" />
        </Link>
        <Link
          href="https://x.com/payrouteshq"
          aria-label="Soroform on X"
          className="transition-colors hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
            <path d="M18.24 2h3.28l-7.17 8.19L23 22h-6.6l-5.17-6.76L5.3 22H2.02l7.67-8.77L1 2h6.77l4.68 6.18L18.24 2Zm-1.15 18h1.82L7.02 3.9H5.06L17.09 20Z" />
          </svg>
        </Link>
      </div>
    </footer>
  );
}
