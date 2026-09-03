import Image from "next/image";
import { cn } from "@/lib/utils";

export function SorokitLogo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <>
      <Image
        src="/sorokit-logo.png"
        alt=""
        fill
        priority={priority}
        className={cn("object-contain dark:hidden", className)}
      />
      <Image
        src="/sorokit-logo-dark.png"
        alt=""
        fill
        priority={priority}
        className={cn("hidden object-contain dark:block", className)}
      />
    </>
  );
}
