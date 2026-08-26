import React, { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventType =
  | "execution_start"
  | "supervisor_start"
  | "supervisor_assignment"
  | "agent_start"
  | "tool_call"
  | "tool_result"
  | "agent_complete"
  | "synthesizer_start"
  | "task_complete"
  | "stream_end"
  | "error"
  | (string & {});

export interface TraceEvent {
  id: string;
  type: EventType | string;
  timestamp: number;
  data: Record<string, any>;
}

interface ExecutionTraceProps {
  isRunning: boolean;
  events: TraceEvent[];
  finalOutput: string | null;
  error: string | null;
  colors: Record<string, string>;
}

// ─── Event Row ────────────────────────────────────────────────────────────────

function EventRow({ event, colors }: { event: TraceEvent; colors: Record<string, string> }) {
  const time = new Date(event.timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const getPrefix = (): { label: string; color: string } => {
    switch (event.type) {
      case "execution_start":
        return { label: "INIT", color: "#888" };
      case "supervisor_start":
        return { label: "SUPERVISOR", color: "#a78bfa" };
      case "supervisor_assignment":
        return { label: "ASSIGN", color: "#a78bfa" };
      case "agent_start":
        return { label: `[${event.data.agent?.toUpperCase() ?? "AGENT"}]`, color: "#60a5fa" };
      case "tool_call":
        return { label: `↳ TOOL`, color: "#f59e0b" };
      case "tool_result":
        return { label: `  ↳ RESULT`, color: "#34d399" };
      case "agent_complete":
        return { label: `✓ ${event.data.agent?.toUpperCase() ?? "AGENT"}`, color: "#4ade80" };
      case "synthesizer_start":
        return { label: "SYNTHESIZER", color: "#a78bfa" };
      case "task_complete":
        return { label: "✓ COMPLETE", color: "#4ade80" };
      case "error":
        return { label: "✗ ERROR", color: "#f87171" };
      default:
        return { label: "SYS", color: "#666" };
    }
  };

  const getText = (): string => {
    const d = event.data;
    switch (event.type) {
      case "execution_start":
        return `Team "${d.team}" · ${d.agent_count} agents · mode: ${d.mode}`;
      case "supervisor_start":
        return `Decomposing task → ${d.agents?.length ?? 0} agents`;
      case "supervisor_assignment": {
        const entries = Object.entries(d.assignments ?? {});
        return entries.map(([k, v]) => `${k}: ${(v as string).slice(0, 80)}`).join(" | ");
      }
      case "agent_start":
        return `${d.role} — ${(d.subtask ?? "").slice(0, 100)}${(d.subtask ?? "").length > 100 ? "..." : ""}`;
      case "tool_call":
        return `${d.tool}(${JSON.stringify(d.input ?? {}).slice(0, 80)})`;
      case "tool_result":
        return `${d.tool} → ${String(d.output ?? "").slice(0, 120)}`;
      case "agent_complete":
        return String(d.output ?? "").slice(0, 150) + (String(d.output ?? "").length > 150 ? "..." : "");
      case "synthesizer_start":
        return "Assembling final output from all agents...";
      case "task_complete":
        return "All agents complete. Final output ready.";
      case "error":
        return d.message ?? "Unknown error";
      default:
        return JSON.stringify(d).slice(0, 100);
    }
  };

  const { label, color } = getPrefix();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "60px 130px 1fr",
        gap: "0 1.5rem",
        padding: "6px 0",
        borderBottom: `1px solid ${colors.line}`,
        fontSize: "11px",
        fontFamily: "Space Mono, monospace",
        lineHeight: "1.6",
        animation: "fadeInUp 0.2s ease-out",
      }}
    >
      <span style={{ color: "#555", letterSpacing: "0.5px" }}>{time}</span>
      <span style={{ color, fontWeight: 800, letterSpacing: "1px" }}>{label}</span>
      <span style={{ color: colors.sub }}>{getText()}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExecutionTrace({
  isRunning,
  events,
  finalOutput,
  error,
  colors,
}: ExecutionTraceProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  if (!isRunning && events.length === 0 && !finalOutput && !error) {
    return (
      <div
        style={{
          padding: "4rem",
          textAlign: "center",
          color: colors.sub,
          fontSize: "11px",
          fontFamily: "Space Mono, monospace",
          letterSpacing: "3px",
        }}
      >
        // AWAITING_TASK_DISPATCH
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 0",
          borderBottom: `1px solid ${colors.line}`,
          marginBottom: "0.5rem",
        }}
      >
        <span
          style={{
            fontSize: "9px",
            fontWeight: 900,
            letterSpacing: "4px",
            color: colors.sub,
            fontFamily: "Space Mono, monospace",
          }}
        >
          // EXECUTION_TRACE
        </span>
        {isRunning && (
          <span
            style={{
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "3px",
              color: "#4ade80",
              fontFamily: "Space Mono, monospace",
              animation: "pulse 1.5s infinite",
            }}
          >
            ● LIVE
          </span>
        )}
      </div>

      {/* Event stream */}
      <div style={{ maxHeight: "380px", overflowY: "auto" }}>
        {events.map((ev) => (
          <EventRow key={ev.id} event={ev} colors={colors} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            marginTop: "1.5rem",
            padding: "1.5rem",
            border: "1px solid #f87171",
            fontSize: "11px",
            fontFamily: "Space Mono, monospace",
            color: "#f87171",
          }}
        >
          ✗ ERROR: {error}
        </div>
      )}

      {/* Final output */}
      {finalOutput && !isRunning && (
        <div style={{ marginTop: "2rem" }}>
          <div
            style={{
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "4px",
              color: colors.sub,
              fontFamily: "Space Mono, monospace",
              marginBottom: "1rem",
              paddingBottom: "1rem",
              borderBottom: `1px solid ${colors.line}`,
            }}
          >
            // FINAL_OUTPUT
          </div>
          <div
            style={{
              fontSize: "13px",
              lineHeight: "1.8",
              color: colors.text,
              whiteSpace: "pre-wrap",
              maxHeight: "400px",
              overflowY: "auto",
              fontFamily: "Space Mono, monospace",
            }}
          >
            {finalOutput}
          </div>
        </div>
      )}
    </div>
  );
}
