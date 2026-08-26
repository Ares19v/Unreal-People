import React, { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MCPTool {
  name: string;
  description: string;
  args: Record<string, string>;
}

interface MCPServer {
  id: string;
  name: string;
  status: "ACTIVE" | "OFFLINE";
  description: string;
  tools: MCPTool[];
}

interface ToolCallEvent {
  tool: string;
  agent: string;
  ts: number;
}

interface MCPPanelProps {
  colors: Record<string, string>;
  recentToolCalls?: ToolCallEvent[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MCPPanel({ colors, recentToolCalls = [] }: MCPPanelProps) {
  const [registry, setRegistry] = useState<MCPServer[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mcp/registry")
      .then((r) => r.json())
      .then((data) => {
        setRegistry(data.registry ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const activeCount = registry.filter((s) => s.status === "ACTIVE").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: "2rem",
          borderBottom: `1px solid ${colors.line}`,
          marginBottom: "2rem",
        }}
      >
        <h2
          style={{
            fontSize: "12px",
            fontWeight: 900,
            letterSpacing: "4px",
            color: colors.sub,
            fontFamily: "Space Mono, monospace",
            margin: 0,
          }}
        >
          // CONNECTED_MCPs
        </h2>
        {!loading && (
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "3px",
              color: "#4ade80",
              fontFamily: "Space Mono, monospace",
            }}
          >
            {activeCount} ACTIVE
          </span>
        )}
      </div>

      {/* Server list */}
      {loading ? (
        <div
          style={{
            fontSize: "11px",
            fontFamily: "Space Mono, monospace",
            color: colors.sub,
            letterSpacing: "2px",
          }}
        >
          LOADING_REGISTRY...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {registry.map((server) => {
            const isExpanded = expanded === server.id;
            const isActive = server.status === "ACTIVE";

            // Find the most recent tool call for this server
            const lastCall = recentToolCalls
              .filter((tc) =>
                server.tools.some((t) => t.name === tc.tool)
              )
              .sort((a, b) => b.ts - a.ts)[0];

            const secAgo = lastCall
              ? Math.round((Date.now() - lastCall.ts) / 1000)
              : null;

            return (
              <div
                key={server.id}
                style={{
                  borderBottom: `1px solid ${colors.line}`,
                }}
              >
                {/* Server row */}
                <div
                  onClick={() => setExpanded(isExpanded ? null : server.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "1.5rem 0",
                    cursor: "pointer",
                    transition: "padding-left 0.3s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.paddingLeft = "1rem")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.paddingLeft = "0")
                  }
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                    {/* Status dot */}
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: isActive ? "#4ade80" : "#555",
                        display: "inline-block",
                        boxShadow: isActive ? "0 0 8px #4ade80" : "none",
                        flexShrink: 0,
                      }}
                    />

                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 800,
                          letterSpacing: "3px",
                          color: isActive ? colors.text : colors.sub,
                          fontFamily: "Space Mono, monospace",
                        }}
                      >
                        {server.name}
                      </div>
                      <div
                        style={{
                          fontSize: "9px",
                          color: colors.sub,
                          letterSpacing: "1px",
                          marginTop: "2px",
                          fontFamily: "Space Mono, monospace",
                        }}
                      >
                        {server.description}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
                    {/* Last tool call indicator */}
                    {secAgo !== null && (
                      <span
                        style={{
                          fontSize: "9px",
                          color: "#f59e0b",
                          fontFamily: "Space Mono, monospace",
                          letterSpacing: "1px",
                        }}
                      >
                        ↑ {lastCall?.tool} by {lastCall?.agent} · {secAgo}s ago
                      </span>
                    )}

                    {/* Tool count */}
                    <span
                      style={{
                        fontSize: "9px",
                        letterSpacing: "2px",
                        color: colors.sub,
                        fontFamily: "Space Mono, monospace",
                      }}
                    >
                      {server.tools.length} TOOLS
                    </span>

                    {/* Expand arrow */}
                    <span
                      style={{
                        fontSize: "10px",
                        color: colors.sub,
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                        transition: "transform 0.3s ease",
                        display: "inline-block",
                      }}
                    >
                      ▾
                    </span>
                  </div>
                </div>

                {/* Expanded: tool list */}
                {isExpanded && (
                  <div
                    style={{
                      paddingBottom: "1.5rem",
                      paddingLeft: "1.5rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    {server.tools.map((tool) => (
                      <div
                        key={tool.name}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "160px 1fr",
                          gap: "1rem",
                          fontSize: "10px",
                          fontFamily: "Space Mono, monospace",
                        }}
                      >
                        <span style={{ color: "#f59e0b", fontWeight: 700 }}>
                          {tool.name}
                        </span>
                        <span style={{ color: colors.sub }}>
                          {tool.description}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
