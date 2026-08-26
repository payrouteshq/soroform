"use client";

import { motion } from "framer-motion";
import { CodeBlock } from "@/components/code-block";
import { LiveStatusPreview } from "@/components/live-status-preview";

const SNIPPET = `const { status, sendAsync } = useContractSend({
  contractId: "CDLZ...F3KQ",
  method: "transfer",
});

await sendAsync({ to, amount: 100n });`;

export function CodeToUiPreview() {
  return (
    <div className="grid w-full grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <CodeBlock language="tsx" filename="transfer-form.tsx" theme="dark" className="h-full">
          {SNIPPET}
        </CodeBlock>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 16 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <LiveStatusPreview />
      </motion.div>
    </div>
  );
}
