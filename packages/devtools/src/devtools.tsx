import { useState, type CSSProperties } from "react";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { WriteLogPanel } from "./write-log-panel.js";

type Tab = "writes" | "cache";

const toggleStyle: CSSProperties = {
  position: "fixed",
  bottom: "1rem",
  right: "1rem",
  zIndex: 99998,
  background: "#18181b",
  color: "#fafafa",
  border: "1px solid #3f3f46",
  borderRadius: "9999px",
  padding: "0.5rem 0.9rem",
  fontFamily: "ui-monospace, monospace",
  fontSize: "0.75rem",
  cursor: "pointer",
};

const panelStyle: CSSProperties = {
  position: "fixed",
  bottom: 0,
  right: 0,
  left: 0,
  height: "22rem",
  zIndex: 99999,
  background: "#09090b",
  color: "#fafafa",
  borderTop: "1px solid #3f3f46",
  display: "flex",
  flexDirection: "column",
};

const tabBarStyle: CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  padding: "0.5rem 0.75rem",
  borderBottom: "1px solid #27272a",
  fontFamily: "ui-monospace, monospace",
  fontSize: "0.75rem",
};

function tabButtonStyle(active: boolean): CSSProperties {
  return {
    background: active ? "#27272a" : "transparent",
    color: "#fafafa",
    border: "none",
    borderRadius: "0.25rem",
    padding: "0.25rem 0.6rem",
    cursor: "pointer",
  };
}

export interface SoroformDevtoolsProps {
  /** Renders the panel open by default instead of collapsed. */
  initialOpen?: boolean;
}

/**
 * A development-only devtools panel for Soroform. Renders nothing when
 * `process.env.NODE_ENV !== "development"`, matching
 * `@tanstack/react-query-devtools`'s own convention, so it is always safe
 * to leave mounted in an app.
 *
 * In development, shows a floating toggle that opens a panel with two
 * tabs: a log of every `useContractWrite` invocation this session (status,
 * args, result, and a readable summary of the built transaction), and the
 * app's TanStack Query cache (via an embedded
 * `@tanstack/react-query-devtools` panel, since Soroform's own hooks
 * already namespace every query key under `"soroform"`, making them easy
 * to pick out).
 *
 * @example
 * ```tsx
 * import { SoroformDevtools } from "@soroform/devtools";
 *
 * export function App({ children }: { children: React.ReactNode }) {
 *   return (
 *     <>
 *       {children}
 *       <SoroformDevtools />
 *     </>
 *   );
 * }
 * ```
 */
export function SoroformDevtools(props: SoroformDevtoolsProps) {
  const [isOpen, setIsOpen] = useState(props.initialOpen ?? false);
  const [tab, setTab] = useState<Tab>("writes");

  if (process.env.NODE_ENV !== "development") return null;

  if (!isOpen) {
    return (
      <button type="button" style={toggleStyle} onClick={() => setIsOpen(true)}>
        Soroform
      </button>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={tabBarStyle}>
        <button
          type="button"
          style={tabButtonStyle(tab === "writes")}
          onClick={() => setTab("writes")}
        >
          Writes
        </button>
        <button
          type="button"
          style={tabButtonStyle(tab === "cache")}
          onClick={() => setTab("cache")}
        >
          Query cache
        </button>
        <button
          type="button"
          style={{ ...tabButtonStyle(false), marginLeft: "auto" }}
          onClick={() => setIsOpen(false)}
        >
          Close
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {tab === "writes" ? (
          <WriteLogPanel />
        ) : (
          <ReactQueryDevtoolsPanel style={{ height: "100%" }} onClose={() => setTab("writes")} />
        )}
      </div>
    </div>
  );
}
