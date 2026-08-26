import React, { useState, useEffect, useRef } from "react"; 
import ChatInterface from "@/components/ChatInterface";
import VoidInterface from "@/components/VoidInterface";
import AgentList from "@/components/AgentList";
import { EditModal, AuthModal } from "@/components/Modals";
import ExecutionTrace from "@/components/ExecutionTrace";
import MCPPanel from "@/components/MCPPanel";
import GraphVisualizer from "@/components/GraphVisualizer";

const GlobalCursor = ({ darkMode }: { darkMode: boolean }) => {
  const cursorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX - 12}px, ${e.clientY - 12}px, 0)`;
      }
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);
  return (
    <div ref={cursorRef} style={{ position: "fixed", left: 0, top: 0, width: "24px", height: "24px", pointerEvents: "none", zIndex: 9999, willChange: "transform", transform: "translate3d(-100px, -100px, 0)" }}>
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill={darkMode ? "#fff" : "#000"} />
      </svg>
    </div>
  );
};

export default function App() {
  const [activeAgent, setActiveAgent] = useState<any>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isVoid, setIsVoid] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [headerLoaded, setHeaderLoaded] = useState(false);
  
  const [newName, setNewName] = useState("");
  const [newSubheading, setNewSubheading] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const [agents, setAgents] = useState([
    { id: "real-estate", name: "REAL ESTATE", subheading: "CLASSIFIED_PROTOCOL", desc: "Strategic asset analytics and valuation intelligence.", type: "RealEstate" },
    { id: "medical", name: "MEDICAL", subheading: "EXPERT", desc: "Clinical health reasoning and diagnostic protocols.", type: "Medical" },
    { id: "coding", name: "CODING", subheading: "DEVELOPER", desc: "Full-stack algorithmic architect and engine logic.", type: "Coding" }
  ]);

  const [crewTeams, setCrewTeams] = useState<{id: string, name: string, members: string[]}[]>([
    { id: "team-alpha", name: "ALPHA_SQUAD", members: ["coding", "medical"] }
  ]);
  const [newTeamName, setNewTeamName] = useState("");

  // --- CLOUD API CONFIG (Resides inside CrewAI Hub) ---
  const [apiProvider, setApiProvider] = useState("GROQ");
  const [apiKey, setApiKey] = useState(""); 
  const [apiModelStr, setApiModelStr] = useState("qwen/qwen3.8-27b");
  const [execMode, setExecMode] = useState<"supervisor" | "sequential">("supervisor");

  // --- CREW EXECUTION STATES ---
  const [executingTeamId, setExecutingTeamId] = useState<string | null>(null);
  const [crewTaskInput, setCrewTaskInput] = useState("");
  const [isCrewProcessing, setIsCrewProcessing] = useState(false);
  const [crewResult, setCrewResult] = useState<string | null>(null);
  const [crewError, setCrewError] = useState<string | null>(null);

  // --- EXECUTION TRACE STATE ---
  const [traceEvents, setTraceEvents] = useState<Array<{id: string; type: string; timestamp: number; data: Record<string, any>}>>([]);
  const [recentToolCalls, setRecentToolCalls] = useState<Array<{tool: string; agent: string; ts: number}>>([]);

  const [mcpStatus, setMcpStatus] = useState("CHECKING"); 
  const [vectorDbData, setVectorDbData] = useState<{status: string, vectors: number | string, namespaces?: number} | null>(null);
  
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);

  const [videoIndex, setVideoIndex] = useState(0);
  const [lightPlaylist, setLightPlaylist] = useState(["/moon1.mp4", "/moon2.mp4", "/moon3.mp4", "/moon4.mp4", "/moon5.mp4"]);
  const [darkPlaylist, setDarkPlaylist] = useState(["/batman1.mp4", "/batman2.mp4", "/batman3.mp4", "/batman4.mp4", "/batman5.mp4"]);

  useEffect(() => {
    const savedAgents = localStorage.getItem("up_agents");
    if (savedAgents) setAgents(JSON.parse(savedAgents));
    const savedTeams = localStorage.getItem("up_teams");
    if (savedTeams) setCrewTeams(JSON.parse(savedTeams));
  }, []);

  useEffect(() => { localStorage.setItem("up_agents", JSON.stringify(agents)); }, [agents]);
  useEffect(() => { localStorage.setItem("up_teams", JSON.stringify(crewTeams)); }, [crewTeams]);
  useEffect(() => { setVideoIndex(0); }, [darkMode]);

  useEffect(() => {
    const hasVisited = sessionStorage.getItem("up_visited");
    if (!hasVisited) { setTimeout(() => { setHeaderLoaded(true); sessionStorage.setItem("up_visited", "true"); }, 100); } 
    else { setHeaderLoaded(true); }
    // Fetch real peripheral status on mount
    fetch("/api/status/pinecone").then(r => r.json()).then(d => setVectorDbData(d)).catch(() => setVectorDbData({ status: "OFFLINE", vectors: "N/A" }));
    fetch("/api/status/mcp").then(r => r.json()).then(d => setMcpStatus(d.status === "ACTIVE" ? "ACTIVE" : "OFFLINE")).catch(() => setMcpStatus("OFFLINE"));
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!videoContainerRef.current || !videoWrapperRef.current) return;
      const rect = videoContainerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      let progress = 1 - (rect.top / windowHeight);
      progress = Math.max(0, Math.min(1, progress)); 
      const easeProgress = progress * (2 - progress); 
      const width = 60 + (40 * easeProgress); 
      const height = 60 + (40 * easeProgress); 
      const radius = 40 - (40 * easeProgress); 
      videoWrapperRef.current.style.width = `${width}vw`;
      videoWrapperRef.current.style.height = `${height}vh`;
      videoWrapperRef.current.style.borderRadius = `${radius}px`;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const observerOptions = { root: null, rootMargin: "0px", threshold: 0.15 };
      const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.target.classList.contains('agents-list-wrapper')) {
            const cards = entry.target.querySelectorAll('.agent-card');
            cards.forEach((card, index) => { setTimeout(() => { card.classList.add('slide-in-left'); }, index * 250); });
          }
        });
      }, observerOptions);
      const agentList = document.querySelector('.agents-list-wrapper');
      if (agentList) scrollObserver.observe(agentList);
    }, 500); 
    return () => clearTimeout(timer);
  }, [agents, isVoid, activeAgent]); 

  // --- STREAMING EXECUTION via SSE ---
  const executeCrewProtocol = async () => {
    if (!crewTaskInput || !executingTeamId) return;
    if (!apiKey) return alert("// PROTOCOL_ABORT: API KEY REQUIRED FOR CLOUD EXECUTION.");

    setIsCrewProcessing(true);
    setCrewResult(null);
    setCrewError(null);
    setTraceEvents([]);

    const team = crewTeams.find(t => t.id === executingTeamId);
    const teamAgents = team?.members.map(mid => agents.find(a => a.id === mid)).filter(Boolean);

    const addEvent = (type: string, data: Record<string, any>) => {
      setTraceEvents(prev => [
        ...prev,
        { id: `${type}-${Date.now()}-${Math.random()}`, type, timestamp: Date.now(), data }
      ]);
    };

    try {
      const response = await fetch("/api/execute_stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_name: team?.name,
          task: crewTaskInput,
          agents: teamAgents,
          api_key: apiKey,
          provider: apiProvider,
          api_model: apiModelStr,
          mode: execMode
        })
      });

      if (!response.ok || !response.body) {
        setCrewError("// FAILED TO CONNECT TO EXECUTION STREAM.");
        setIsCrewProcessing(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            const evType = event.type;

            // Track tool calls for MCP panel
            if (evType === "tool_call") {
              setRecentToolCalls(prev => [
                { tool: event.tool, agent: event.agent ?? "agent", ts: Date.now() },
                ...prev.slice(0, 19)
              ]);
            }

            // Capture final output
            if (evType === "task_complete") {
              setCrewResult(event.final_output ?? null);
            }

            if (evType === "error") {
              setCrewError(event.message ?? "Unknown error");
            }

            if (evType === "stream_end") {
              setIsCrewProcessing(false);
              break;
            }

            addEvent(evType, event);
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (err) {
      setCrewError("// OFFLINE: FAILED TO ESTABLISH CONNECTION WITH CLOUD ENGINE.");
    } finally {
      setIsCrewProcessing(false);
    }
  };

  // --- CRUD ---
  const addAgentLogic = () => {
    if (!newName) return;
    const id = "agent-" + Date.now();
    setAgents([...agents, { id, name: newName.toUpperCase(), subheading: newSubheading.toUpperCase() || "CLASSIFIED_ENTITY", desc: newDesc || "You are a helpful AI.", type: "User" }]);
    setNewName(""); setNewSubheading(""); setNewDesc("");
  };

  const updateAgentDetail = (id: string, key: string, value: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, [key]: value } : a));
    if (editingAgent?.id === id) setEditingAgent((prev: any) => ({ ...prev, [key]: value }));
  };

  const deleteAgent = (id: string) => {
    if (window.confirm("CRITICAL: DELETE AGENT?")) {
      setAgents(prev => prev.filter(a => a.id !== id));
      setEditingAgent(null);
      setCrewTeams(prev => prev.map(t => ({...t, members: t.members.filter(m => m !== id)})));
    }
  };

  const createTeam = () => {
    if(!newTeamName) return;
    const id = "team-" + Date.now();
    setCrewTeams([...crewTeams, { id, name: newTeamName.toUpperCase(), members: [] }]);
    setNewTeamName("");
  };

  const addAgentToTeam = (teamId: string, agentId: string) => {
    setCrewTeams(prev => prev.map(t => t.id === teamId && !t.members.includes(agentId) ? { ...t, members: [...t.members, agentId] } : t));
  };

  const removeAgentFromTeam = (teamId: string, agentId: string) => {
    setCrewTeams(prev => prev.map(t => t.id === teamId ? { ...t, members: t.members.filter(m => m !== agentId) } : t));
  };

  const deleteTeam = (teamId: string) => {
    if (window.confirm("CRITICAL: DELETE THIS TEAM?")) {
      setCrewTeams(prev => prev.filter(t => t.id !== teamId));
      if (executingTeamId === teamId) { setExecutingTeamId(null); setCrewResult(null); }
    }
  };

  const triggerVoid = () => { setAnimating(true); setTimeout(() => { setIsVoid(true); setAnimating(false); }, 400); };

  const colors = { bg: darkMode ? "#050505" : "#ffffff", text: darkMode ? "#ffffff" : "#000000", line: darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)", sub: darkMode ? "#aaaaaa" : "#666666", highlight: darkMode ? "#111111" : "#f9f9f9" };
  const currentPlaylist = darkMode ? darkPlaylist : lightPlaylist;
  const currentVideo = currentPlaylist.length > 0 ? currentPlaylist[videoIndex % currentPlaylist.length] : null;

  return (
    <>
      <style>{`
        .page-header { transition: opacity 4s cubic-bezier(0.25, 1, 0.5, 1); }
        .model-btn-card { border: 1px solid ${colors.line}; transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .model-btn-card:hover { border-color: ${colors.text} !important; transform: translateY(-4px); box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        .upload-area { border: 1px dashed ${colors.line}; transition: all 0.2s ease; cursor: pointer; }
        .upload-area:hover { background: ${colors.highlight}; border-color: ${colors.sub}; }
        .team-select { appearance: none; background: transparent; border: 1px solid ${colors.line}; color: ${colors.text}; padding: 8px 12px; font-size: 10px; letter-spacing: 2px; outline: none; cursor: pointer; }
        .dynamic-video-container { width: 100%; height: 100vh; display: flex; justify-content: center; align-items: center; position: relative; background: transparent; }
        .video-wrapper { overflow: hidden; display: flex; justify-content: center; align-items: center; will-change: width, height, border-radius; }
        .dynamic-video { width: 100%; height: 100%; object-fit: cover; filter: none; border-radius: inherit; }
        .agents-section { padding: 8rem 4vw; background: transparent; position: relative; min-height: 100vh; display: flex; flex-direction: column; align-items: center; }
        .agents-list-wrapper { width: 100%; max-width: 1200px; display: flex; flex-direction: column; gap: 0; }
        .agent-card { opacity: 0; transform: translateX(-80px); transition: opacity 1.8s ease-out, transform 1.8s cubic-bezier(0.16, 1, 0.3, 1); }
        .agent-card.slide-in-left { opacity: 1; transform: translateX(0); }
        .void-trigger-title { transition: transform 0.3s ease; display: inline-block; cursor: pointer; }
        .void-trigger-title:hover { transform: scale(1.02); }
        .exec-console { position: fixed; top: 0; left: 0; width: 100%; height: 100vh; background: ${colors.bg}; z-index: 999; display: flex; flex-direction: column; padding: 4rem; color: ${colors.text}; font-family: monospace; }
      `}</style>
      <GlobalCursor darkMode={darkMode} />
      
      {isVoid ? ( <VoidInterface setIsVoid={setIsVoid} /> ) : activeAgent ? (
        <main style={{ background: colors.bg, minHeight: "100vh", color: colors.text, fontFamily: "Inter, sans-serif" }}>
          <nav style={{ padding: "30px 10vw", display: "flex", justifyContent: "space-between", position: "fixed", top: 0, width: "100%", background: colors.bg + "ee", backdropFilter: "blur(20px)", borderBottom: "1px solid " + colors.line, zIndex: 100 }}>
            <span style={{ fontWeight: "900", fontSize: "14px", letterSpacing: "3px" }}>{(activeAgent as any).name} // {(activeAgent as any).subheading}</span>
            <button onClick={() => setActiveAgent(null)} style={{ background: "none", border: "none", color: colors.text, fontSize: "10px", fontWeight: "900", letterSpacing: "3px", cursor: "pointer" }}>RETURN_TO_CORE</button>
          </nav>
          <div style={{ maxWidth: "1000px", marginLeft: "auto", marginRight: "auto", padding: "160px 4vw" }}>
            <ChatInterface agent={activeAgent} darkMode={darkMode} />
          </div>
        </main>
      ) : (
        <main style={{ background: colors.bg, color: colors.text, display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>
          
          {editingAgent && <EditModal editingAgent={editingAgent} updateAgentDetail={updateAgentDetail} deleteAgent={deleteAgent} setEditingAgent={setEditingAgent} colors={colors} />}
          {showAuth && <AuthModal setShowAuth={setShowAuth} colors={colors} />}

          {/* THE EXECUTION CONSOLE OVERLAY */}
          {executingTeamId && (
            <div className="exec-console">
              {/* Top bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${colors.line}`, paddingBottom: "20px", marginBottom: "32px", flexShrink: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "12px", letterSpacing: "4px", fontWeight: 900, fontFamily: "Space Mono, monospace" }}>
                    // ORCHESTRATION_CONSOLE
                  </span>
                  <span style={{ fontSize: "9px", letterSpacing: "2px", color: colors.sub, fontFamily: "Space Mono, monospace" }}>
                    TEAM: {crewTeams.find(t => t.id === executingTeamId)?.name} · MODE: {execMode.toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={() => { setExecutingTeamId(null); setCrewResult(null); setCrewTaskInput(""); setTraceEvents([]); setCrewError(null); setIsCrewProcessing(false); }}
                  style={{ background: "transparent", color: colors.text, border: `1px solid ${colors.line}`, cursor: "pointer", fontSize: "10px", letterSpacing: "3px", fontFamily: "Space Mono, monospace", padding: "8px 16px" }}
                >
                  ABORT
                </button>
              </div>

              {/* Main content area — scrollable */}
              <div style={{ flexGrow: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "1000px", width: "100%", marginLeft: "auto", marginRight: "auto" }}>

                {/* Task input — only show when not yet running */}
                {!isCrewProcessing && traceEvents.length === 0 && !crewResult && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                    <div>
                      <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.5px", marginBottom: "12px" }}>
                        Define Objective
                      </h2>
                      <p style={{ color: colors.sub, fontSize: "13px", lineHeight: "1.7" }}>
                        Assign a task to <strong style={{ color: colors.text }}>{crewTeams.find(t => t.id === executingTeamId)?.name}</strong>.
                        {execMode === "supervisor"
                          ? " The supervisor will decompose it and assign each agent their specific subtask."
                          : " Agents will process it sequentially, each refining the previous output."}
                      </p>
                    </div>

                    {/* Mode selector */}
                    <div style={{ display: "flex", gap: "1rem" }}>
                      {(["supervisor", "sequential"] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setExecMode(m)}
                          style={{
                            padding: "10px 24px",
                            fontSize: "10px",
                            fontWeight: 900,
                            letterSpacing: "3px",
                            fontFamily: "Space Mono, monospace",
                            border: `1px solid ${execMode === m ? colors.text : colors.line}`,
                            background: execMode === m ? colors.text : "transparent",
                            color: execMode === m ? colors.bg : colors.sub,
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                        >
                          {m.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={crewTaskInput}
                      onChange={(e) => setCrewTaskInput(e.target.value)}
                      placeholder="e.g., Build a Python REST API with JWT auth and unit tests..."
                      style={{ width: "100%", height: "160px", background: "transparent", border: `1px solid ${colors.line}`, color: colors.text, padding: "20px", fontFamily: "Space Mono, monospace", outline: "none", resize: "none", fontSize: "13px", lineHeight: "1.8" }}
                    />

                    <button
                      onClick={executeCrewProtocol}
                      style={{ padding: "18px 40px", background: colors.text, color: colors.bg, border: "none", fontWeight: 900, letterSpacing: "4px", cursor: "pointer", fontSize: "11px", fontFamily: "Space Mono, monospace", width: "100%" }}
                    >
                      DEPLOY_TEAM →
                    </button>
                  </div>
                )}

                {/* Live execution trace */}
                {(isCrewProcessing || traceEvents.length > 0 || crewResult || crewError) && (
                  <ExecutionTrace
                    isRunning={isCrewProcessing}
                    events={traceEvents}
                    finalOutput={crewResult}
                    error={crewError}
                    colors={colors}
                  />
                )}

                {/* Re-run button */}
                {!isCrewProcessing && (crewResult || crewError) && (
                  <button
                    onClick={() => { setTraceEvents([]); setCrewResult(null); setCrewError(null); }}
                    style={{ padding: "14px 32px", background: "transparent", color: colors.sub, border: `1px solid ${colors.line}`, fontWeight: 900, letterSpacing: "3px", cursor: "pointer", fontSize: "10px", fontFamily: "Space Mono, monospace", alignSelf: "flex-start" }}
                  >
                    ← NEW_TASK
                  </button>
                )}
              </div>
            </div>
          )}


          <div className={animating ? "glitch-out" : ""} style={{ width: "100%" }}>
            
            {/* PAGE 1: HEADER & TITLE */}
            <header className="page-header" style={{ opacity: headerLoaded ? 1 : 0, minHeight: "100vh", padding: "3rem 4vw", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                <h2 style={{ fontSize: "12px", letterSpacing: "4px", fontWeight: "900", color: colors.sub }}>// CORE_SYSTEM</h2>
                <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
                  <button onClick={() => setShowAuth(true)} style={{ background: "transparent", border: "none", color: colors.text, fontSize: "11px", fontWeight: "900", letterSpacing: "3px", cursor: "pointer" }}>SIGN_UP</button>
                  <button onClick={() => setDarkMode(!darkMode)} style={{ background: colors.text, color: colors.bg, border: "none", padding: "12px 24px", fontSize: "11px", fontWeight: "900", letterSpacing: "3px", cursor: "pointer" }}>{darkMode ? "GO_LIGHT" : "GO_DARK"}</button>
                </div>
              </div>
              <div style={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                <h1 className="void-trigger-title" onClick={triggerVoid} style={{ fontFamily: "'Audiowide', sans-serif", fontSize: "clamp(60px, 12vw, 200px)", fontWeight: "400", letterSpacing: "-4px", lineHeight: "0.85", margin: 0, textTransform: "uppercase", textAlign: "center" }}>UNREAL<br/>PEOPLE</h1>
              </div>
            </header>
            
            {/* PAGE 2: INTERACTIVE AGENT GRAPH VISUALIZER */}
            <section style={{ padding: "8rem 4vw", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", borderTop: `1px solid ${colors.line}` }}>
              <div style={{ width: "100%", maxWidth: "1200px" }}> 
                <GraphVisualizer
                  agents={agents}
                  teams={crewTeams}
                  colors={colors}
                  darkMode={darkMode}
                  onDeployTeam={(teamId) => setExecutingTeamId(teamId)}
                />
              </div>
            </section>

            {/* PAGE 3: PERIPHERALS (API DRIVEN) */}
            <section style={{ padding: "10rem 4vw", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", borderTop: `1px solid ${colors.line}` }}>
              <div style={{ width: "100%", maxWidth: "1200px" }}> 
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "2rem", borderBottom: `1px solid ${colors.line}`, marginBottom: "5rem" }}>
                  <h3 style={{ fontSize: "12px", letterSpacing: "4px", fontWeight: "900", color: colors.sub }}>// ENGINE_02_PERIPHERALS</h3>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors.text }} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "3rem", width: "100%" }}>
                  <div className="model-btn-card" style={{ padding: "4rem", display: "flex", flexDirection: "column", gap: "1.5rem", background: "transparent", height: "100%" }}>
                    <div style={{ marginBottom: "2rem" }}>
                      <span style={{ fontSize: "10px", fontWeight: "800", color: colors.sub, letterSpacing: "3px" }}>CORE_ARCHITECTURE</span>
                      <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: "300", letterSpacing: "-1px", marginTop: "1rem" }}>Vector Database</h2>
                      <p style={{ fontSize: "14px", color: colors.sub, lineHeight: "1.8", marginTop: "1rem" }}>Retrieval-Augmented Generation. Active database synthesis and dynamic contextualization protocols via Pinecone VectorDB.</p>
                      
                      <div style={{ marginTop: "1.5rem", padding: "20px", border: `1px dashed ${colors.line}`, display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "10px", color: colors.sub, letterSpacing: "1px" }}>INDEX:</span> <span style={{ fontSize: "10px", fontWeight: "bold" }}>UNREAL_MEMORY</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "10px", color: colors.sub, letterSpacing: "1px" }}>VECTORS:</span> <span style={{ fontSize: "10px", fontWeight: "bold" }}>{vectorDbData ? vectorDbData.vectors.toLocaleString() : "..."}</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "10px", color: colors.sub, letterSpacing: "1px" }}>STATUS:</span> <span style={{ fontSize: "10px", fontWeight: "bold", color: vectorDbData?.status === "CONNECTED" ? "#00ff88" : vectorDbData?.status === "OFFLINE" ? "#ff4444" : "inherit" }}>{vectorDbData?.status ?? "CHECKING"}</span></div>
                      </div>

                      <div style={{ marginTop: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ width: "20px", height: "1px", background: colors.text }} />
                        <span style={{ fontSize: "10px", fontWeight: "900", letterSpacing: "2px", cursor: "pointer" }}>SYNC_DATABASE</span>
                      </div>
                    </div>

                    <div style={{ width: "100%", height: "1px", background: colors.line, margin: "1rem 0" }}></div>

                    <div>
                      <span style={{ fontSize: "10px", fontWeight: "800", color: colors.sub, letterSpacing: "3px" }}>ENVIRONMENT_BRIDGE</span>
                      <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: "300", letterSpacing: "-1px", marginTop: "1rem" }}>MCP Protocol</h2>
                      <p style={{ fontSize: "14px", color: colors.sub, lineHeight: "1.8", marginTop: "1rem" }}>Grants the AI entity secure, direct read/write access to your local development environments and filesystems.</p>
                      
                      <div onClick={() => setMcpStatus(prev => prev === "OFFLINE" ? "ACTIVE" : "OFFLINE")} style={{ marginTop: "2rem", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", border: `1px solid ${colors.text}`, background: mcpStatus === "ACTIVE" ? colors.text : "transparent", color: mcpStatus === "ACTIVE" ? colors.bg : colors.text, cursor: "pointer", transition: "all 0.3s" }}>
                        <span style={{ fontSize: "11px", letterSpacing: "3px", fontWeight: "900" }}>MCP_LINK</span>
                        <span style={{ fontSize: "11px", letterSpacing: "2px", fontWeight: "bold" }}>[{mcpStatus}]</span>
                      </div>
                    </div>
                  </div>

                  <div className="model-btn-card" style={{ padding: "4rem", display: "flex", flexDirection: "column", gap: "1.5rem", background: "transparent", height: "100%" }}>
                    
                    {/* --- INJECTED CLOUD API CONFIGURATION --- */}
                    <div style={{ borderBottom: `1px solid ${colors.line}`, paddingBottom: "2rem", marginBottom: "1rem" }}>
                      <span style={{ fontSize: "10px", fontWeight: "800", color: colors.sub, letterSpacing: "3px" }}>[ API_UPLINK_CONFIGURATION ]</span>
                      
                      <div style={{ display: "flex", gap: "10px", marginTop: "1.5rem", marginBottom: "1rem" }}>
                         <button onClick={()=>setApiProvider("GROQ")} style={{ flex: 1, padding: "10px", fontSize: "10px", fontWeight: "bold", background: apiProvider === "GROQ" ? colors.text : "transparent", color: apiProvider === "GROQ" ? colors.bg : colors.text, border: `1px solid ${colors.line}`, cursor: "pointer" }}>GROQ</button>
                         <button onClick={()=>setApiProvider("OPENAI")} style={{ flex: 1, padding: "10px", fontSize: "10px", fontWeight: "bold", background: apiProvider === "OPENAI" ? colors.text : "transparent", color: apiProvider === "OPENAI" ? colors.bg : colors.text, border: `1px solid ${colors.line}`, cursor: "pointer" }}>OPENAI</button>
                      </div>

                      <div style={{ display: "flex", gap: "10px" }}>
                        <input type="password" placeholder="API Key..." value={apiKey} onChange={e=>setApiKey(e.target.value)} style={{ flex: 2, padding: "12px", background: "transparent", border: `1px dashed ${colors.line}`, color: colors.text, fontSize: "11px", outline: "none", letterSpacing: "2px" }} />
                        <select value={apiModelStr} onChange={e=>setApiModelStr(e.target.value)} style={{ flex: 1, padding: "12px", background: "transparent", border: `1px solid ${colors.line}`, color: colors.text, fontSize: "10px", outline: "none" }}>
                          {apiProvider === "GROQ" ? (
                            <>
                              <option style={{color:colors.text, background:colors.bg}} value="qwen/qwen3.8-27b">QWEN 3.8 (27B)</option>
                              <option style={{color:colors.text, background:colors.bg}} value="openai/gpt-oss-120b">GPT OSS (120B)</option>
                              <option style={{color:colors.text, background:colors.bg}} value="groq/compound">GROQ COMPOUND</option>
                            </>
                          ) : (
                            <>
                              <option style={{color:colors.text, background:colors.bg}} value="gpt-4o">GPT-4o</option>
                              <option style={{color:colors.text, background:colors.bg}} value="gpt-4o-mini">GPT-4o Mini</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    <div>
                      <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: "300", letterSpacing: "-1px" }}>CrewAI Hub</h2>
                    </div>
                    <p style={{ fontSize: "14px", color: colors.sub, lineHeight: "1.8" }}>Deploy specialized teams of AI agents to autonomously collaborate via Cloud APIs.</p>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "1rem", flexGrow: 1 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "15px", maxHeight: "250px", overflowY: "auto" }}>
                        {crewTeams.map(team => (
                          <div key={team.id} style={{ border: `1px solid ${colors.line}`, padding: "20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${colors.line}`, paddingBottom: "15px", marginBottom: "15px" }}>
                              <span style={{ fontSize: "12px", fontWeight: "bold", letterSpacing: "2px" }}>{team.name}</span>
                              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                              <button onClick={() => deleteTeam(team.id)} style={{ background: "transparent", border: "none", color: "#ff4444", fontSize: "9px", fontWeight: "900", letterSpacing: "2px", cursor: "pointer" }}>DELETE</button>
                              <select className="team-select" onChange={(e) => addAgentToTeam(team.id, e.target.value)} value="">
                                <option value="" disabled>+ ASSIGN AGENT</option>
                                {agents.filter(a => !team.members.includes(a.id)).map(a => (
                                  <option key={a.id} value={a.id} style={{background: colors.bg, color: colors.text}}>{a.name}</option>
                                ))}
                              </select>
                              </div>
                            </div>
                            
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                              {team.members.length === 0 && <span style={{fontSize: "11px", color: colors.sub, fontStyle: "italic"}}>No agents assigned.</span>}
                              {team.members.map(memberId => {
                                const agent = agents.find(a => a.id === memberId);
                                return agent ? (
                                  <div key={memberId} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", background: colors.highlight, border: `1px solid ${colors.line}` }}>
                                    <span style={{ fontSize: "10px", letterSpacing: "1px", fontWeight: "bold" }}>{agent.name}</span>
                                    <button onClick={() => removeAgentFromTeam(team.id, memberId)} style={{ background: "transparent", border: "none", color: colors.text, cursor: "pointer", fontSize: "12px", padding: "0" }}>×</button>
                                  </div>
                                ) : null;
                              })}
                            </div>

                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                              <button onClick={() => { if (team.members.length === 0) { alert("// PROTOCOL_ABORT: YOU MUST ASSIGN AT LEAST ONE AGENT TO THIS TEAM."); return; } setExecutingTeamId(team.id); }} style={{ background: colors.text, color: colors.bg, border: "none", padding: "10px 20px", fontSize: "10px", fontWeight: "bold", letterSpacing: "2px", cursor: "pointer" }}>DEPLOY_TEAM</button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: "flex", gap: "10px", marginTop: "auto" }}>
                        <input type="text" placeholder="NEW_TEAM_NAME..." value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} style={{ flex: 1, background: "transparent", border: `1px solid ${colors.line}`, color: colors.text, padding: "14px", fontSize: "11px", letterSpacing: "2px", outline: "none" }} />
                        <button onClick={createTeam} style={{ background: colors.text, color: colors.bg, border: "none", padding: "0 24px", fontSize: "10px", fontWeight: "bold", letterSpacing: "2px", cursor: "pointer" }}>CREATE</button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* MCP REGISTRY PANEL — Connected servers & tool status */}
            <section style={{ padding: "6rem 4vw", borderTop: `1px solid ${colors.line}` }}>
              <div style={{ width: "100%", maxWidth: "1200px", marginLeft: "auto", marginRight: "auto" }}>
                <MCPPanel colors={colors} recentToolCalls={recentToolCalls} />
              </div>
            </section>

            {/* PAGE 4: DYNAMIC SCROLL VIDEO SECTION */}
            <section className="dynamic-video-container" ref={videoContainerRef}>
              <div className="video-wrapper" ref={videoWrapperRef}>
                {currentVideo && (
                  <video 
                    key={currentVideo} src={currentVideo} className="dynamic-video" autoPlay muted playsInline 
                    onEnded={() => setVideoIndex((prev) => prev + 1)}
                    onError={() => { if (darkMode) { setDarkPlaylist(prev => prev.filter(v => v !== currentVideo)); } else { setLightPlaylist(prev => prev.filter(v => v !== currentVideo)); } }}
                  />
                )}
              </div>
            </section>

            {/* PAGE 5: AGENTS LIST */}
            <section className="agents-section">
              <div className="agents-list-wrapper">
                <AgentList agents={agents} setActiveAgent={setActiveAgent} setEditingAgent={setEditingAgent} colors={colors} darkMode={darkMode} newName={newName} setNewName={setNewName} newSubheading={newSubheading} setNewSubheading={setNewSubheading} newDesc={newDesc} setNewDesc={setNewDesc} addAgent={addAgentLogic} />
              </div>
            </section>

          </div>
        </main>
      )}
    </>
  );
}
