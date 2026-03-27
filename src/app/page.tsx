"use client"; 
import React, { useState, useEffect } from "react"; 
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
  
  const [newName, setNewName] = useState("");
  const [newSubheading, setNewSubheading] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const [agents, setAgents] = useState([
    { id: "real-estate", name: "REAL ESTATE", subheading: "STRATEGIC ASSET ANALYTICS", desc: "You are a highly analytical real estate intelligence. Be concise and data-driven.", type: "RealEstate", font: "SANS" },
    { id: "medical", name: "MEDICAL", subheading: "HEALTH INTELLIGENCE", desc: "You are a clinical health AI. Provide precise, medical-grade analysis.", type: "Medical", font: "SANS" },
    { id: "coding", name: "CODING", subheading: "ENGINE ARCHITECTURE", desc: "You are a senior software architect. Provide highly optimized code.", type: "Coding", font: "SANS" }
  ]);

  useEffect(() => {
    const saved = localStorage.getItem("up_agents");
    if (saved) setAgents(JSON.parse(saved));
  }, []);

  useEffect(() => { localStorage.setItem("up_agents", JSON.stringify(agents)); }, [agents]);

  const addAgent = () => {
    if (!newName) return;
    const id = "agent-" + Date.now();
    setAgents([...agents, { id, name: newName.toUpperCase(), subheading: newSubheading.toUpperCase() || "CLASSIFIED_ENTITY", desc: newDesc || "You are a helpful AI.", type: "User", font: "SANS" }]);
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

  const triggerVoid = () => {
    setAnimating(true);
    setTimeout(() => { setIsVoid(true); setAnimating(false); }, 400);
  };

  const colors = { bg: darkMode ? "#000" : "#fff", text: darkMode ? "#fff" : "#000", line: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", sub: "#888" };

  return (
    <>
      <style global jsx>{` * { cursor: none !important; } `}</style>
      <GlobalCursor darkMode={darkMode} />
      
      {isVoid ? (
        <VoidInterface setIsVoid={setIsVoid} />
      ) : activeAgent ? (
        <main style={{ background: colors.bg, minHeight: "100vh", color: colors.text, fontFamily: "Inter, sans-serif" }}>
          <nav style={{ padding: "30px 4vw", display: "flex", justifyContent: "space-between", position: "fixed", top: 0, width: "100%", background: colors.bg + "cc", backdropFilter: "blur(15px)", borderBottom: "1px solid " + colors.line, zIndex: 100 }}>
            <span style={{ fontWeight: "700", fontSize: "11px", letterSpacing: "2px" }}>{(activeAgent as any).name}</span>
            <button onClick={() => setActiveAgent(null)} style={{ background: "none", border: "none", color: colors.text, cursor: "pointer", fontSize: "10px", fontWeight: "900", letterSpacing: "2px" }}>BACK_TO_LIST</button>
          </nav>
          <div style={{ maxWidth: "800px", margin: "0 auto", padding: "140px 4vw" }}>
            <ChatInterface agent={activeAgent} darkMode={darkMode} />
          </div>
        </main>
      ) : (
        <main style={{ background: colors.bg, color: colors.text, minHeight: "100vh", display: "flex", fontFamily: "Inter, sans-serif" }}>
          <style>{` .glitch-out { animation: glitch 0.4s forwards; } @keyframes glitch { 0% { filter: brightness(1) blur(0px); } 100% { filter: brightness(15) blur(20px); } } `}</style>
          
          {editingAgent && <EditModal editingAgent={editingAgent} updateAgentDetail={updateAgentDetail} deleteAgent={deleteAgent} setEditingAgent={setEditingAgent} colors={colors} />}
          {showAuth && <AuthModal setShowAuth={setShowAuth} colors={colors} />}

          <div className={animating ? "glitch-out" : ""} style={{ display: "flex", width: "100%" }}>
            <Sidebar triggerVoid={triggerVoid} setShowAuth={setShowAuth} darkMode={darkMode} setDarkMode={setDarkMode} colors={colors} />
            <AgentList agents={agents} setActiveAgent={setActiveAgent} setEditingAgent={setEditingAgent} colors={colors} newName={newName} setNewName={setNewName} newSubheading={newSubheading} setNewSubheading={setNewSubheading} newDesc={newDesc} setNewDesc={setNewDesc} addAgent={addAgent} />
          </div>
        </main>
      )}
    </>
  );
}
