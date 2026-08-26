import React, { useState } from "react";

interface Agent {
  id: string;
  name: string;
  subheading: string;
  desc: string;
  type?: string;
}

interface Team {
  id: string;
  name: string;
  members: string[];
}

interface GraphVisualizerProps {
  agents: Agent[];
  teams: Team[];
  colors: Record<string, string>;
  darkMode: boolean;
  onDeployTeam?: (teamId: string) => void;
}

type SelectedNodeType = "entry" | "supervisor" | "agent" | "synthesizer" | "end" | "tool";

interface SelectedNodeInfo {
  type: SelectedNodeType;
  title: string;
  subtitle: string;
  details: string;
  tools?: string[];
}

export default function GraphVisualizer({
  agents,
  teams,
  colors,
  darkMode,
  onDeployTeam,
}: GraphVisualizerProps) {
  const [activeTeamId, setActiveTeamId] = useState<string>(
    teams.length > 0 ? teams[0].id : ""
  );
  const [graphMode, setGraphMode] = useState<"supervisor" | "sequential">(
    "supervisor"
  );
  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>({
    type: "supervisor",
    title: "SUPERVISOR_ROUTER",
    subtitle: "Orchestration & Task Decomposition Node",
    details:
      "Analyzes high-level user tasks, evaluates agent protocols, and dynamically emits a structured JSON subtask assignment plan.",
    tools: ["task_decomposition", "dynamic_routing", "state_passing"],
  });

  const currentTeam =
    teams.find((t) => t.id === activeTeamId) || (teams.length > 0 ? teams[0] : null);

  const teamAgents = currentTeam
    ? currentTeam.members
        .map((mid) => agents.find((a) => a.id === mid))
        .filter(Boolean) as Agent[]
    : agents;

  const nodeBorder = darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)";
  const nodeHover = darkMode ? "#222222" : "#f0f0f0";
  const nodeActiveBorder = darkMode ? "#ffffff" : "#000000";

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "3rem" }}>
      {/* Header with Title & Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "1.5rem",
          paddingBottom: "2rem",
          borderBottom: `1px solid ${colors.line}`,
        }}
      >
        <div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 800,
              color: colors.sub,
              letterSpacing: "3px",
              fontFamily: "Space Mono, monospace",
            }}
          >
            // LANGGRAPH_STATE_MACHINE
          </span>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 48px)",
              fontWeight: 300,
              letterSpacing: "-1.5px",
              marginTop: "0.5rem",
              margin: 0,
            }}
          >
            Interactive Agent Graph
          </h2>
        </div>

        {/* Team Selector & Flow Mode */}
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* Team Switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                fontSize: "9px",
                fontWeight: 800,
                color: colors.sub,
                letterSpacing: "2px",
                fontFamily: "Space Mono, monospace",
              }}
            >
              TEAM:
            </span>
            <select
              value={currentTeam?.id || ""}
              onChange={(e) => setActiveTeamId(e.target.value)}
              style={{
                background: "transparent",
                border: `1px solid ${colors.line}`,
                color: colors.text,
                padding: "8px 12px",
                fontSize: "10px",
                fontFamily: "Space Mono, monospace",
                letterSpacing: "1px",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {teams.map((t) => (
                <option
                  key={t.id}
                  value={t.id}
                  style={{ background: colors.bg, color: colors.text }}
                >
                  {t.name} ({t.members.length} AGENTS)
                </option>
              ))}
            </select>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: "flex", border: `1px solid ${colors.line}` }}>
            {(["supervisor", "sequential"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setGraphMode(m)}
                style={{
                  padding: "8px 16px",
                  fontSize: "9px",
                  fontWeight: 900,
                  letterSpacing: "2px",
                  fontFamily: "Space Mono, monospace",
                  border: "none",
                  background: graphMode === m ? colors.text : "transparent",
                  color: graphMode === m ? colors.bg : colors.sub,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Graph Canvas & Inspector Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "2.5rem",
          alignItems: "stretch",
        }}
      >
        {/* Visual Graph Canvas Area */}
        <div
          style={{
            border: `1px solid ${colors.line}`,
            background: darkMode ? "#080808" : "#fafafa",
            padding: "2.5rem 2rem",
            position: "relative",
            minHeight: "440px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Legend / Status Overlay */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "9px",
              fontFamily: "Space Mono, monospace",
              color: colors.sub,
              letterSpacing: "2px",
              marginBottom: "1rem",
            }}
          >
            <span>FLOW: {graphMode === "supervisor" ? "DAG_DECOMPOSITION" : "LINEAR_CHAIN"}</span>
            <span style={{ color: "#4ade80" }}>● GRAPH_COMPILED</span>
          </div>

          {/* Graph Nodes Architecture */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2rem",
              alignItems: "center",
              width: "100%",
            }}
          >
            {/* Level 1: Entry Point */}
            <div
              onClick={() =>
                setSelectedNode({
                  type: "entry",
                  title: "USER_TASK_ENTRY",
                  subtitle: "High-level Goal Input",
                  details:
                    "Receives natural language objective from user interface. Initializes shared LangGraph AgentState dictionary.",
                  tools: ["state_init", "prompt_injection"],
                })
              }
              style={{
                border: `1px solid ${selectedNode?.type === "entry" ? nodeActiveBorder : nodeBorder}`,
                padding: "10px 24px",
                fontSize: "10px",
                fontFamily: "Space Mono, monospace",
                fontWeight: 900,
                letterSpacing: "3px",
                cursor: "pointer",
                background: selectedNode?.type === "entry" ? colors.text : "transparent",
                color: selectedNode?.type === "entry" ? colors.bg : colors.text,
                transition: "all 0.2s ease",
              }}
            >
              [ 01. TASK_ENTRY ]
            </div>

            {/* Connector Line */}
            <div
              style={{
                width: "1px",
                height: "24px",
                background: colors.line,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "-3px",
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: colors.sub,
                }}
              />
            </div>

            {/* Level 2: Supervisor or Linear Entry */}
            {graphMode === "supervisor" ? (
              <div
                onClick={() =>
                  setSelectedNode({
                    type: "supervisor",
                    title: "SUPERVISOR_ROUTER",
                    subtitle: "Orchestration & Task Decomposition Node",
                    details:
                      "Analyzes high-level user tasks, evaluates agent protocols, and dynamically emits a structured JSON subtask assignment plan.",
                    tools: ["task_decomposition", "dynamic_routing", "state_passing"],
                  })
                }
                style={{
                  border: `1px solid ${selectedNode?.type === "supervisor" ? "#a78bfa" : nodeBorder}`,
                  padding: "12px 28px",
                  fontSize: "11px",
                  fontFamily: "Space Mono, monospace",
                  fontWeight: 900,
                  letterSpacing: "3px",
                  color: selectedNode?.type === "supervisor" ? "#a78bfa" : colors.text,
                  background: selectedNode?.type === "supervisor" ? "rgba(167,139,250,0.1)" : "transparent",
                  cursor: "pointer",
                  boxShadow: selectedNode?.type === "supervisor" ? "0 0 15px rgba(167,139,250,0.2)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                ◆ SUPERVISOR_NODE
              </div>
            ) : null}

            {/* Connector to Worker Agents */}
            <div
              style={{
                width: "1px",
                height: "24px",
                background: colors.line,
                position: "relative",
              }}
            />

            {/* Level 3: Specialist Agent Nodes (Parallel or Linear) */}
            <div
              style={{
                display: "flex",
                gap: "1.2rem",
                justifyContent: "center",
                flexWrap: "wrap",
                width: "100%",
              }}
            >
              {teamAgents.length === 0 ? (
                <div style={{ fontSize: "10px", color: colors.sub, fontStyle: "italic" }}>
                  No agents assigned in this team.
                </div>
              ) : (
                teamAgents.map((ag, idx) => {
                  const isSelected =
                    selectedNode?.type === "agent" && selectedNode.title === ag.name;
                  return (
                    <div
                      key={ag.id}
                      onClick={() =>
                        setSelectedNode({
                          type: "agent",
                          title: ag.name,
                          subtitle: `${ag.subheading} Specialist`,
                          details: ag.desc || "Executes assigned subtask using specialist reasoning and tools.",
                          tools: ["read_file", "write_file", "web_search", "run_python"],
                        })
                      }
                      style={{
                        border: `1px solid ${isSelected ? "#60a5fa" : nodeBorder}`,
                        padding: "12px 20px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                        background: isSelected ? "rgba(96,165,250,0.1)" : "transparent",
                        transition: "all 0.2s ease",
                        minWidth: "120px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "8px",
                          color: colors.sub,
                          fontFamily: "Space Mono, monospace",
                        }}
                      >
                        WORKER_{String(idx + 1).padStart(2, "0")}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 900,
                          letterSpacing: "2px",
                          color: isSelected ? "#60a5fa" : colors.text,
                          fontFamily: "Space Mono, monospace",
                        }}
                      >
                        {ag.name}
                      </span>
                      <span
                        style={{
                          fontSize: "8px",
                          color: "#f59e0b",
                          fontFamily: "Space Mono, monospace",
                          letterSpacing: "1px",
                        }}
                      >
                        [ReAct + Tools]
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Connector Line to Synthesizer */}
            <div
              style={{
                width: "1px",
                height: "24px",
                background: colors.line,
                position: "relative",
              }}
            />

            {/* Level 4: Synthesizer & Result */}
            <div
              onClick={() =>
                setSelectedNode({
                  type: "synthesizer",
                  title: "SYNTHESIZER_NODE",
                  subtitle: "Output Assembly & Conflict Resolver",
                  details:
                    "Aggregates all agent deliverables, resolves contradictions, verifies tool outputs, and formats the unified markdown report.",
                  tools: ["output_merger", "markdown_formatter", "pinecone_upsert"],
                })
              }
              style={{
                border: `1px solid ${selectedNode?.type === "synthesizer" ? "#4ade80" : nodeBorder}`,
                padding: "12px 28px",
                fontSize: "11px",
                fontFamily: "Space Mono, monospace",
                fontWeight: 900,
                letterSpacing: "3px",
                color: selectedNode?.type === "synthesizer" ? "#4ade80" : colors.text,
                background: selectedNode?.type === "synthesizer" ? "rgba(74,222,128,0.1)" : "transparent",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              ✓ SYNTHESIZER → END
            </div>
          </div>
        </div>

        {/* Node Inspector / Protocol Detail Card */}
        <div
          style={{
            border: `1px solid ${colors.line}`,
            padding: "2.5rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "transparent",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: `1px solid ${colors.line}`,
                paddingBottom: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 900,
                  letterSpacing: "3px",
                  color: colors.sub,
                  fontFamily: "Space Mono, monospace",
                }}
              >
                // NODE_INSPECTOR
              </span>
              <span
                style={{
                  fontSize: "9px",
                  color: "#4ade80",
                  letterSpacing: "1px",
                  fontFamily: "Space Mono, monospace",
                }}
              >
                ACTIVE_IN_DAG
              </span>
            </div>

            {selectedNode ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div>
                  <h3
                    style={{
                      fontSize: "22px",
                      fontWeight: 800,
                      letterSpacing: "1px",
                      fontFamily: "Space Mono, monospace",
                      margin: 0,
                      color: colors.text,
                    }}
                  >
                    {selectedNode.title}
                  </h3>
                  <span
                    style={{
                      fontSize: "11px",
                      color: colors.sub,
                      letterSpacing: "2px",
                      fontFamily: "Space Mono, monospace",
                      marginTop: "4px",
                      display: "block",
                    }}
                  >
                    {selectedNode.subtitle}
                  </span>
                </div>

                <div
                  style={{
                    padding: "16px",
                    background: darkMode ? "#0c0c0c" : "#f4f4f4",
                    border: `1px dashed ${colors.line}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 800,
                      letterSpacing: "2px",
                      color: colors.sub,
                      display: "block",
                      marginBottom: "8px",
                      fontFamily: "Space Mono, monospace",
                    }}
                  >
                    PROTOCOL & RESPONSIBILITY:
                  </span>
                  <p
                    style={{
                      fontSize: "12px",
                      lineHeight: "1.7",
                      color: colors.text,
                      margin: 0,
                      fontFamily: "Space Mono, monospace",
                    }}
                  >
                    {selectedNode.details}
                  </p>
                </div>

                {selectedNode.tools && selectedNode.tools.length > 0 && (
                  <div>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 800,
                        letterSpacing: "2px",
                        color: colors.sub,
                        display: "block",
                        marginBottom: "10px",
                        fontFamily: "Space Mono, monospace",
                      }}
                    >
                      BOUND MCP TOOLS & CAPABILITIES:
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {selectedNode.tools.map((tool) => (
                        <span
                          key={tool}
                          style={{
                            padding: "6px 12px",
                            border: `1px solid ${colors.line}`,
                            fontSize: "10px",
                            fontFamily: "Space Mono, monospace",
                            color: "#f59e0b",
                            background: darkMode ? "#111" : "#fff",
                          }}
                        >
                          {tool}()
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  fontSize: "11px",
                  color: colors.sub,
                  fontFamily: "Space Mono, monospace",
                }}
              >
                Click any graph node on the left to inspect its state, role protocol, and tool configuration.
              </div>
            )}
          </div>

          {/* Quick Action */}
          {currentTeam && onDeployTeam && (
            <div style={{ marginTop: "2.5rem", borderTop: `1px solid ${colors.line}`, paddingTop: "1.5rem" }}>
              <button
                onClick={() => onDeployTeam(currentTeam.id)}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  background: colors.text,
                  color: colors.bg,
                  border: "none",
                  fontWeight: 900,
                  fontSize: "11px",
                  letterSpacing: "4px",
                  fontFamily: "Space Mono, monospace",
                  cursor: "pointer",
                  transition: "opacity 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                EXECUTE {currentTeam.name} GRAPH →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
