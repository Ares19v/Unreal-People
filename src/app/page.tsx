"use client"; 
import React, { useState, useEffect, useRef } from "react"; 
import ChatInterface from "@/components/ChatInterface";
import VoidInterface from "@/components/VoidInterface";
import Sidebar from "@/components/Sidebar";
import AgentList from "@/components/AgentList";
import { EditModal, AuthModal } from "@/components/Modals";

// --- GLOBAL CRESCENT MOON CURSOR ---
const GlobalCursor = ({ darkMode }: { darkMode: boolean }) => {
  const [pos, setPos] = useState({ x: -100, y: -100 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div style={{
      position: "fixed", left: pos.x, top: pos.y, width: "24px", height: "24px", 
      pointerEvents: "none", zIndex: 9999, transform: "translate(-50%, -50%)", 
      transition: "transform 0.05s linear"
    }}>
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
  
  // Header fade-in state
  const [headerLoaded, setHeaderLoaded] = useState(false);
  
  const [newName, setNewName] = useState("");
  const [newSubheading, setNewSubheading] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const [agents, setAgents] = useState([
    { id: "real-estate", name: "REAL ESTATE", subheading: "CLASSIFIED_PROTOCOL", desc: "Strategic asset analytics and valuation intelligence.", type: "RealEstate" },
    { id: "medical", name: "MEDICAL", subheading: "EXPERT", desc: "Clinical health reasoning and diagnostic protocols.", type: "Medical" },
    { id: "coding", name: "CODING", subheading: "DEVELOPER", desc: "Full-stack algorithmic architect and engine logic.", type: "Coding" }
  ]);

  // --- SELF-HEALING VIDEO PLAYLIST STATE ---
  const [videoIndex, setVideoIndex] = useState(0);
  const [lightPlaylist, setLightPlaylist] = useState([
    "/moon1.mp4", "/moon2.mp4", "/moon3.mp4", "/moon4.mp4", "/moon5.mp4"
  ]);
  const [darkPlaylist, setDarkPlaylist] = useState([
    "/batman1.mp4", "/batman2.mp4", "/batman3.mp4", "/batman4.mp4", "/batman5.mp4"
  ]);

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);

  // Load agents
  useEffect(() => {
    const saved = localStorage.getItem("up_agents");
    if (saved) setAgents(JSON.parse(saved));
  }, []);

  useEffect(() => { localStorage.setItem("up_agents", JSON.stringify(agents)); }, [agents]);

  // Reset playlist index when theme changes
  useEffect(() => { setVideoIndex(0); }, [darkMode]);

  // --- HEADER FIRST-LOAD FADE IN ---
  useEffect(() => {
    const hasVisited = sessionStorage.getItem("up_visited");
    if (!hasVisited) {
      setTimeout(() => {
        setHeaderLoaded(true);
        sessionStorage.setItem("up_visited", "true");
      }, 100); 
    } else {
      setHeaderLoaded(true); 
    }
  }, []);

  // --- VIDEO SCROLL CALCULATION (Page 3) ---
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
    handleScroll(); 
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- INTERSECTION OBSERVER FOR AGENTS (Page 4 Slide from Left) ---
  useEffect(() => {
    const timer = setTimeout(() => {
      const observerOptions = { root: null, rootMargin: "0px", threshold: 0.15 };
      const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (entry.target.classList.contains('agents-list-wrapper')) {
              const cards = entry.target.querySelectorAll('.agent-card');
              cards.forEach((card, index) => {
                setTimeout(() => { 
                  card.classList.add('slide-in-left'); 
                }, index * 250); 
              });
              observer.unobserve(entry.target); 
            }
          }
        });
      }, observerOptions);
      
      const agentList = document.querySelector('.agents-list-wrapper');
      if (agentList) scrollObserver.observe(agentList);

    }, 500); 
    return () => clearTimeout(timer);
  }, [agents, isVoid, activeAgent]); 

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
    }
  };

  // The Void Trigger
  const triggerVoid = () => {
    setAnimating(true);
    setTimeout(() => { setIsVoid(true); setAnimating(false); }, 400);
  };

  const colors = { bg: darkMode ? "#050505" : "#ffffff", text: darkMode ? "#fff" : "#111", line: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", sub: "#888" };

  // --- ACTIVE PLAYLIST RESOLUTION ---
  const currentPlaylist = darkMode ? darkPlaylist : lightPlaylist;
  const safeIndex = currentPlaylist.length > 0 ? videoIndex % currentPlaylist.length : 0;
  const currentVideo = currentPlaylist.length > 0 ? currentPlaylist[safeIndex] : null;

  return (
    <>
      <style global jsx>{` * { cursor: none !important; } `}</style>
      <style>{`
        /* IMPORT THE AUDIOWIDE FONT JUST FOR THE TITLE */
        @import url('https://fonts.googleapis.com/css2?family=Audiowide&display=swap');

        /* Glitch Animation for Void */
        .glitch-out { animation: glitch 0.4s forwards; } 
        @keyframes glitch { 0% { filter: brightness(1) blur(0px); } 100% { filter: brightness(15) blur(20px); } }

        /* PAGE 1: Header Animation */
        .page-header {
          transition: opacity 4s cubic-bezier(0.25, 1, 0.5, 1);
        }

        /* PAGE 2: Model Cards */
        .model-btn-card {
          border: 1px solid ${colors.line};
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .model-btn-card:hover {
          border-color: ${colors.text} !important;
          transform: translateY(-8px);
        }

        /* PAGE 3: Video */
        .dynamic-video-container { width: 100%; height: 100vh; display: flex; justify-content: center; align-items: center; position: relative; background: transparent; }
        .video-wrapper { overflow: hidden; display: flex; justify-content: center; align-items: center; will-change: width, height, border-radius; }
        .dynamic-video { width: 100%; height: 100%; object-fit: cover; filter: none; border-radius: inherit; }
        
        /* PAGE 4: Agent Slide from Left */
        .agents-section { padding: 8rem 4vw; background: transparent; position: relative; min-height: 100vh; display: flex; flex-direction: column; align-items: center; }
        .agents-list-wrapper { width: 100%; max-width: 1200px; display: flex; flex-direction: column; gap: 0; }
        
        .agent-card { opacity: 0; transform: translateX(-80px); transition: opacity 1.8s ease-out, transform 1.8s cubic-bezier(0.16, 1, 0.3, 1); }
        .agent-card.slide-in-left { opacity: 1; transform: translateX(0); }
        
        /* Interactive title hover effect */
        .void-trigger-title { transition: transform 0.3s ease; display: inline-block; }
        .void-trigger-title:hover { transform: scale(1.02); }
      `}</style>

      <GlobalCursor darkMode={darkMode} />
      
      {isVoid ? (
        <VoidInterface setIsVoid={setIsVoid} />
      ) : activeAgent ? (
        <main style={{ background: colors.bg, minHeight: "100vh", color: colors.text, fontFamily: "Inter, sans-serif" }}>
          <nav style={{ padding: "30px 10vw", display: "flex", justifyContent: "space-between", position: "fixed", top: 0, width: "100%", background: colors.bg + "ee", backdropFilter: "blur(20px)", borderBottom: "1px solid " + colors.line, zIndex: 100 }}>
            <span style={{ fontWeight: "900", fontSize: "14px", letterSpacing: "3px" }}>{(activeAgent as any).name} // {(activeAgent as any).subheading}</span>
            <button onClick={() => setActiveAgent(null)} style={{ background: "none", border: "none", color: colors.text, fontSize: "10px", fontWeight: "900", letterSpacing: "3px" }}>RETURN_TO_CORE</button>
          </nav>
          <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "160px 4vw" }}>
            <ChatInterface agent={activeAgent} darkMode={darkMode} />
          </div>
        </main>
      ) : (
        <main style={{ background: colors.bg, color: colors.text, display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>
          
          {editingAgent && <EditModal editingAgent={editingAgent} updateAgentDetail={updateAgentDetail} deleteAgent={deleteAgent} setEditingAgent={setEditingAgent} colors={colors} />}
          {showAuth && <AuthModal setShowAuth={setShowAuth} colors={colors} />}

          <div className={animating ? "glitch-out" : ""} style={{ width: "100%" }}>
            
            {/* PAGE 1: HEADER & TITLE */}
            <header 
              className="page-header" 
              style={{ 
                opacity: headerLoaded ? 1 : 0,
                minHeight: "100vh", 
                padding: "3rem 4vw",
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                <h2 style={{ fontSize: "12px", letterSpacing: "4px", fontWeight: "900", color: colors.sub }}>// CORE_SYSTEM</h2>
                
                <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
                  <button onClick={() => setShowAuth(true)} style={{ background: "transparent", border: "none", color: colors.text, fontSize: "11px", fontWeight: "900", letterSpacing: "3px" }}>SIGN_UP</button>
                  <button onClick={() => setDarkMode(!darkMode)} style={{ background: colors.text, color: colors.bg, border: "none", padding: "12px 24px", fontSize: "11px", fontWeight: "900", letterSpacing: "3px" }}>
                    {darkMode ? "GO_LIGHT" : "GO_DARK"}
                  </button>
                </div>
              </div>

              <div style={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                <h1 
                  className="void-trigger-title"
                  onClick={triggerVoid}
                  style={{ 
                    fontFamily: "'Audiowide', sans-serif", /* AUDIOWIDE FONT APPLIED HERE */
                    fontSize: "clamp(60px, 12vw, 200px)", 
                    fontWeight: "400", /* Set to 400 so the font renders sharp and clean */
                    letterSpacing: "-4px", 
                    lineHeight: "0.85", 
                    margin: 0, 
                    textTransform: "uppercase",
                    textAlign: "center"
                  }}
                >
                  UNREAL<br/>PEOPLE
                </h1>
              </div>
            </header>
            
            {/* PAGE 2: WIDE PREMIUM LAYOUT (Models) */}
            <section style={{ padding: "10rem 4vw", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", borderTop: `1px solid ${colors.line}` }}>
              
              <div style={{ width: "100%", maxWidth: "1200px" }}> 
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "2rem", borderBottom: `1px solid ${colors.line}`, marginBottom: "5rem" }}>
                  <h3 style={{ fontSize: "12px", letterSpacing: "4px", fontWeight: "900", color: colors.sub }}>// SYSTEM_MODELS</h3>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors.text }} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "3rem", width: "100%" }}>
                  
                  <div className="model-btn-card" style={{ padding: "4rem", display: "flex", flexDirection: "column", gap: "2rem", cursor: "pointer", background: "transparent", height: "100%" }}>
                    <div>
                      <span style={{ fontSize: "10px", fontWeight: "800", color: colors.sub, letterSpacing: "3px" }}>CORE_ARCHITECTURE</span>
                      <h2 style={{ fontSize: "clamp(28px, 3vw, 42px)", fontWeight: "300", letterSpacing: "-1px", marginTop: "1rem" }}>RAG Model</h2>
                    </div>
                    <p style={{ fontSize: "14px", color: colors.sub, lineHeight: "1.6" }}>
                      Retrieval-Augmented Generation. Active database synthesis and dynamic contextualization protocols.
                    </p>
                    <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "1rem", paddingTop: "2rem" }}>
                      <div style={{ width: "30px", height: "1px", background: colors.text }} />
                      <span style={{ fontSize: "10px", fontWeight: "900", letterSpacing: "2px" }}>INITIALIZE</span>
                    </div>
                  </div>

                  <div className="model-btn-card" style={{ padding: "4rem", display: "flex", flexDirection: "column", gap: "2rem", cursor: "pointer", background: "transparent", height: "100%" }}>
                    <div>
                      <span style={{ fontSize: "10px", fontWeight: "800", color: colors.sub, letterSpacing: "3px" }}>CUSTOM_WEIGHTS</span>
                      <h2 style={{ fontSize: "clamp(28px, 3vw, 42px)", fontWeight: "300", letterSpacing: "-1px", marginTop: "1rem" }}>Trained Model</h2>
                    </div>
                    <p style={{ fontSize: "14px", color: colors.sub, lineHeight: "1.6" }}>
                      Fine-tuned local neural network. Optimized for low-latency engine logic and pattern recognition.
                    </p>
                    <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "1rem", paddingTop: "2rem" }}>
                      <div style={{ width: "30px", height: "1px", background: colors.text }} />
                      <span style={{ fontSize: "10px", fontWeight: "900", letterSpacing: "2px" }}>INITIALIZE</span>
                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* PAGE 3: DYNAMIC SCROLL VIDEO SECTION (Self-Healing) */}
            <section className="dynamic-video-container" ref={videoContainerRef}>
              <div className="video-wrapper" ref={videoWrapperRef}>
                {currentVideo && (
                  <video 
                    key={currentVideo} 
                    src={currentVideo}
                    className="dynamic-video"
                    autoPlay 
                    muted 
                    playsInline 
                    onEnded={() => setVideoIndex((prev) => prev + 1)}
                    onError={() => {
                      if (darkMode) {
                        setDarkPlaylist(prev => prev.filter(v => v !== currentVideo));
                      } else {
                        setLightPlaylist(prev => prev.filter(v => v !== currentVideo));
                      }
                    }}
                  />
                )}
              </div>
            </section>

            {/* PAGE 4: AGENTS LIST & ADD AGENT SECTION */}
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