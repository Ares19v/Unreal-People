"use client"; 
import React, { useState, useEffect, useRef } from "react"; 
import ChatInterface from "@/components/ChatInterface";
import VoidInterface from "@/components/VoidInterface";
import AgentList from "@/components/AgentList";
import { EditModal, AuthModal } from "@/components/Modals";

const GlobalCursor = ({ darkMode }: { darkMode: boolean }) => {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  useEffect(() => {
    const handleMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);
  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, width: "24px", height: "24px", pointerEvents: "none", zIndex: 9999, transform: "translate(-50%, -50%)", transition: "transform 0.05s linear" }}>
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill={darkMode ? "#fff" : "#000"} />
      </svg>
    </div>
  );
};

export default function Home() {
  const [activeAgent, setActiveAgent] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
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
  const [apiModelStr, setApiModelStr] = useState("llama3-70b-8192");

  // --- CREW EXECUTION STATES ---
  const [executingTeamId, setExecutingTeamId] = useState<string | null>(null);
  const [crewTaskInput, setCrewTaskInput] = useState("");
  const [isCrewProcessing, setIsCrewProcessing] = useState(false);
  const [crewResult, setCrewResult] = useState<string | null>(null);

  // --- QUARANTINED PAGE 2 STATES ---
  const [localModelType, setLocalModelType] = useState("FULL"); 
  const [quantLevel, setQuantLevel] = useState("Q4"); 
  const [localModelFile, setLocalModelFile] = useState<File | null>(null);
  const [loraFile, setLoraFile] = useState<File | null>(null);

  const [mcpStatus, setMcpStatus] = useState("OFFLINE"); 
  
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const loraInputRef = useRef<HTMLInputElement>(null);

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

  // --- QUARANTINED LOCAL HANDSHAKE ---
  const handleLocalEngineInit = async () => {
    if (!localModelFile) return alert("// CRITICAL_ERROR: NO_MODEL_FILE_DETECTED.");
    try {
      const formData = new FormData();
      formData.append("file", localModelFile);
      formData.append("type", "MODEL");
      await fetch("http://localhost:8000/api/upload_model", { method: "POST", body: formData });
      const response = await fetch("http://localhost:8000/api/initialize_engine", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_filename: localModelFile.name, lora_filename: loraFile ? loraFile.name : "NONE", precision: localModelType, quant_level: quantLevel }),
      });
      const data = await response.json();
      if (data.status === "ENGINE_INITIALIZED") alert(`// LOCAL_ENGINE_ONLINE: ${data.model} LOCKED TO VRAM`);
      else alert(`// SERVER_FAULT: ${data.detail}`);
    } catch (error) { alert("// CORE_SYSTEM_OFFLINE: Cannot reach backend."); }
  };

  // --- PURE CLOUD API EXECUTION ---
  const executeCrewProtocol = async () => {
    if (!crewTaskInput || !executingTeamId) return;
    if (!apiKey) return alert("// PROTOCOL_ABORT: API KEY REQUIRED FOR CLOUD EXECUTION.");

    setIsCrewProcessing(true);
    setCrewResult(null);
    const team = crewTeams.find(t => t.id === executingTeamId);
    const teamAgents = team?.members.map(mid => agents.find(a => a.id === mid)).filter(Boolean);

    try {
      const response = await fetch("http://localhost:8000/api/execute_crew", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          team_name: team?.name, 
          task: crewTaskInput, 
          agents: teamAgents,
          api_key: apiKey,
          provider: apiProvider,
          api_model: apiModelStr
        })
      });
      const data = await response.json();
      if(response.ok) setCrewResult(data.result);
      else setCrewResult(`// CRITICAL_FAILURE: ${data.detail}`);
    } catch(err) { setCrewResult("// OFFLINE: FAILED TO ESTABLISH CONNECTION WITH CLOUD ENGINE."); } 
    finally { setIsCrewProcessing(false); }
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
    if (editingAgent?.id === id) setEditingAgent(prev => ({ ...prev, [key]: value }) as any);
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

  const triggerVoid = () => { setAnimating(true); setTimeout(() => { setIsVoid(true); setAnimating(false); }, 400); };

  const colors = { bg: darkMode ? "#050505" : "#ffffff", text: darkMode ? "#ffffff" : "#000000", line: darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)", sub: darkMode ? "#aaaaaa" : "#666666", highlight: darkMode ? "#111111" : "#f9f9f9" };
  const currentPlaylist = darkMode ? darkPlaylist : lightPlaylist;
  const currentVideo = currentPlaylist.length > 0 ? currentPlaylist[videoIndex % currentPlaylist.length] : null;

  return (
    <>
      <style global jsx>{` * { cursor: none !important; } `}</style>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Audiowide&display=swap');
        .glitch-out { animation: glitch 0.4s forwards; } 
        @keyframes glitch { 0% { filter: brightness(1) blur(0px); } 100% { filter: brightness(15) blur(20px); } }
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
        .pulse { animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
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
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${colors.line}`, paddingBottom: "20px", marginBottom: "40px" }}>
                <span style={{ fontSize: "12px", letterSpacing: "4px", fontWeight: "bold" }}>// CLOUD_ORCHESTRATION_CONSOLE</span>
                <button onClick={() => { setExecutingTeamId(null); setCrewResult(null); setCrewTaskInput(""); }} style={{ background: "transparent", color: colors.text, border: "none", cursor: "pointer", fontSize: "12px", letterSpacing: "2px" }}>[ ABORT_OPERATION ]</button>
              </div>

              {!isCrewProcessing && !crewResult ? (
                <div style={{ maxWidth: "800px", marginLeft: "auto", marginRight: "auto", width: "100%", paddingTop: "4rem" }}>
                  <h2 style={{ fontSize: "36px", fontWeight: "300", letterSpacing: "-1px", marginBottom: "20px" }}>Define Protocol</h2>
                  <p style={{ color: colors.sub, marginBottom: "40px", lineHeight: "1.6", fontSize: "14px" }}>
                    Enter the primary objective for <strong style={{color: colors.text}}>{crewTeams.find(t=>t.id===executingTeamId)?.name}</strong>. The agents will sequence operations autonomously via the {apiProvider} API.
                  </p>
                  <textarea 
                    value={crewTaskInput}
                    onChange={(e) => setCrewTaskInput(e.target.value)}
                    placeholder="e.g., Draft a comprehensive launch strategy..."
                    style={{ width: "100%", height: "200px", background: "transparent", border: `1px solid ${colors.line}`, color: colors.text, padding: "24px", fontFamily: "inherit", outline: "none", marginBottom: "40px", resize: "none", fontSize: "14px", lineHeight: "1.8" }}
                  />
                  <button onClick={executeCrewProtocol} style={{ padding: "20px 40px", background: colors.text, color: colors.bg, border: "none", fontWeight: "bold", letterSpacing: "3px", cursor: "pointer", fontSize: "12px", width: "100%" }}>ENGAGE_CLOUD_UPLINK</button>
                </div>
              ) : isCrewProcessing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "4rem", maxWidth: "800px", marginLeft: "auto", marginRight: "auto", width: "100%" }}>
                  <span className="pulse" style={{ fontSize: "28px", fontWeight: "bold", letterSpacing: "4px" }}>&gt; SYNTHESIZING_WORKFLOW...</span>
                  <span style={{ color: colors.sub, letterSpacing: "2px" }}>&gt; Authenticating API Credentials...</span>
                  <span style={{ color: colors.sub, letterSpacing: "2px" }}>&gt; Injecting Personalities into Context Window...</span>
                  <span style={{ color: colors.sub, letterSpacing: "2px" }}>&gt; Executing Remote Neural Inference...</span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", maxWidth: "1200px", marginLeft: "auto", marginRight: "auto", width: "100%" }}>
                  <span style={{ fontSize: "16px", fontWeight: "bold", letterSpacing: "4px", color: colors.text, marginBottom: "30px", borderBottom: `1px solid ${colors.line}`, paddingBottom: "20px" }}>&gt; PROTOCOL_COMPLETE</span>
                  <div style={{ flexGrow: 1, overflowY: "auto", border: `1px dashed ${colors.line}`, padding: "40px", whiteSpace: "pre-wrap", lineHeight: "1.8", fontSize: "14px", background: colors.highlight }}>{crewResult}</div>
                </div>
              )}
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
            
            {/* PAGE 2: ISOLATED LOCAL ENGINE */}
            <section style={{ padding: "10rem 4vw", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", borderTop: `1px solid ${colors.line}` }}>
              <div style={{ width: "100%", maxWidth: "1200px" }}> 
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "2rem", borderBottom: `1px solid ${colors.line}`, marginBottom: "5rem" }}>
                  <h3 style={{ fontSize: "12px", letterSpacing: "4px", fontWeight: "900", color: colors.sub }}>// ENGINE_01_LOCAL_CORE</h3>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors.text }} />
                </div>

                <div style={{ width: "100%" }}>
                  <div>
                    <span style={{ fontSize: "10px", fontWeight: "800", color: colors.sub, letterSpacing: "3px" }}>CUSTOM_WEIGHTS</span>
                    <h2 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: "300", letterSpacing: "-2px", marginTop: "1rem" }}>Local Model Engine</h2>
                  </div>
                  <p style={{ fontSize: "16px", color: colors.sub, lineHeight: "1.8", maxWidth: "800px", marginTop: "2rem", marginBottom: "4rem" }}>
                    Quarantine Sandbox: Upload your trained local neural network and inject fine-tuned LoRA adapters. This environment is isolated from Cloud routing protocols.
                  </p>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "4rem", marginTop: "1rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
                      <div>
                         <label style={{ fontSize: "10px", letterSpacing: "2px", color: colors.sub, display:"block", marginBottom:"12px" }}>BASE_MODEL_WEIGHTS</label>
                         <input type="file" accept=".gguf,.safetensors,.bin" ref={modelInputRef} style={{ display: "none" }} onChange={(e) => { if(e.target.files?.length) setLocalModelFile(e.target.files[0]) }} />
                         <div className="upload-area" onClick={() => modelInputRef.current?.click()} style={{ padding: "24px", textAlign: "center", cursor: "pointer", fontSize: "11px", letterSpacing: "2px", fontWeight: "bold" }}>
                           {localModelFile ? `[ LOADED: ${localModelFile.name} ]` : "+ UPLOAD .GGUF / .SAFETENSORS"}
                         </div>
                      </div>
                      <div>
                         <label style={{ fontSize: "10px", letterSpacing: "2px", color: colors.sub, display:"block", marginBottom:"12px" }}>FINE_TUNED_ADAPTER (LORA)</label>
                         <input type="file" accept=".safetensors,.bin" ref={loraInputRef} style={{ display: "none" }} onChange={(e) => { if(e.target.files?.length) setLoraFile(e.target.files[0]) }} />
                         <div className="upload-area" onClick={() => loraInputRef.current?.click()} style={{ padding: "24px", textAlign: "center", cursor: "pointer", fontSize: "11px", letterSpacing: "2px", fontWeight: "bold" }}>
                           {loraFile ? `[ INJECTED: ${loraFile.name} ]` : "+ ADD LORA ADAPTER"}
                         </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
                      <div>
                        <label style={{ fontSize: "10px", letterSpacing: "2px", color: colors.sub, display:"block", marginBottom:"12px" }}>PRECISION_COMPRESSION</label>
                        <div style={{ display: "flex", gap: "10px" }}>
                           <button onClick={()=>setLocalModelType("FULL")} style={{ flex: 1, padding: "16px", fontSize: "11px", letterSpacing: "2px", fontWeight: "bold", background: localModelType === "FULL" ? colors.text : "transparent", color: localModelType === "FULL" ? colors.bg : colors.text, border: `1px solid ${localModelType === "FULL" ? colors.text : colors.line}`, cursor: "pointer", transition: "all 0.3s" }}>FULL_WEIGHTS</button>
                           <button onClick={()=>setLocalModelType("QUANTIZED")} style={{ flex: 1, padding: "16px", fontSize: "11px", letterSpacing: "2px", fontWeight: "bold", background: localModelType === "QUANTIZED" ? colors.text : "transparent", color: localModelType === "QUANTIZED" ? colors.bg : colors.text, border: `1px solid ${localModelType === "QUANTIZED" ? colors.text : colors.line}`, cursor: "pointer", transition: "all 0.3s" }}>QUANTIZED</button>
                        </div>
                        
                        <div style={{ display: "flex", gap: "10px", marginTop: "15px", height: "45px", opacity: localModelType === "QUANTIZED" ? 1 : 0, pointerEvents: localModelType === "QUANTIZED" ? "auto" : "none", transition: "opacity 0.3s" }}>
                           {["F16", "8-BIT", "Q4", "Q2"].map(q => (
                             <button key={q} onClick={()=>setQuantLevel(q)} style={{ flex: 1, padding: "10px", fontSize: "11px", letterSpacing: "1px", fontWeight: "bold", background: quantLevel === q ? colors.text : "transparent", color: quantLevel === q ? colors.bg : colors.text, border: `1px solid ${quantLevel === q ? colors.text : colors.line}`, cursor: "pointer", transition: "all 0.2s" }}>{q}</button>
                           ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: "6rem", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "3rem", borderTop: `1px solid ${colors.line}` }}>
                    <div onClick={handleLocalEngineInit} style={{ display: "flex", alignItems: "center", gap: "1.5rem", cursor: "pointer" }} onMouseOver={(e) => e.currentTarget.style.opacity="0.5"} onMouseOut={(e) => e.currentTarget.style.opacity="1"}>
                      <div style={{ width: "60px", height: "1px", background: colors.text }} />
                      <span style={{ fontSize: "12px", fontWeight: "900", letterSpacing: "4px" }}>INITIALIZE_LOCAL_ENGINE</span>
                    </div>
                  </div>
                </div>
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
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "10px", color: colors.sub, letterSpacing: "1px" }}>VECTORS:</span> <span style={{ fontSize: "10px", fontWeight: "bold" }}>14,203</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "10px", color: colors.sub, letterSpacing: "1px" }}>STATUS:</span> <span style={{ fontSize: "10px", fontWeight: "bold" }}>READY</span></div>
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
                            <><option style={{color:colors.text, background:colors.bg}} value="llama3-70b-8192">LLAMA 3 (70B)</option><option style={{color:colors.text, background:colors.bg}} value="llama3-8b-8192">LLAMA 3 (8B)</option></>
                          ) : (
                            <><option style={{color:colors.text, background:colors.bg}} value="gpt-4o">GPT-4o</option><option style={{color:colors.text, background:colors.bg}} value="gpt-3.5-turbo">GPT-3.5</option></>
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
                              <select className="team-select" onChange={(e) => addAgentToTeam(team.id, e.target.value)} value="">
                                <option value="" disabled>+ ASSIGN AGENT</option>
                                {agents.filter(a => !team.members.includes(a.id)).map(a => (
                                  <option key={a.id} value={a.id} style={{background: colors.bg, color: colors.text}}>{a.name}</option>
                                ))}
                              </select>
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
