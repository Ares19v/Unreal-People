"use client"; import React, { useState, useEffect } from "react"; 
import ChatInterface from "@/components/ChatInterface";
import { Icons } from "@/components/Icons";

export default function Home() {
  const [activeAgent, setActiveAgent] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [hoverId, setHoverId] = useState(null);
  const [editingAgent, setEditingAgent] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [agents, setAgents] = useState([
    { id: "real-estate", name: "REAL ESTATE", desc: "STRATEGIC ASSET ANALYTICS", type: "RealEstate", font: "SANS" },
    { id: "medical", name: "MEDICAL", desc: "HEALTH INTELLIGENCE", type: "Medical", font: "SANS" },
    { id: "coding", name: "CODING", desc: "ENGINE ARCHITECTURE", type: "Coding", font: "SANS" }
  ]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("up_agents");
    if (saved) setAgents(JSON.parse(saved));
  }, []);

  useEffect(() => { localStorage.setItem("up_agents", JSON.stringify(agents)); }, [agents]);

  const addAgent = () => {
    if (!newName) return;
    const id = "agent-" + Date.now();
    setAgents([...agents, { id, name: newName.toUpperCase(), desc: newDesc.toUpperCase(), type: "User", font: "SANS" }]);
    setNewName(""); setNewDesc("");
  };

  const updateAgentDetail = (id, key, value) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, [key]: value } : a));
    if (editingAgent?.id === id) setEditingAgent(prev => ({ ...prev, [key]: value }));
  };

  const deleteAgent = (id) => {
    if (window.confirm("CRITICAL: PERMANENTLY DELETE THIS AGENT?")) {
      setAgents(prev => prev.filter(a => a.id !== id));
      setEditingAgent(null);
    }
  };

  const colors = { bg: darkMode ? "#000" : "#fff", text: darkMode ? "#fff" : "#000", line: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", sub: "#888" };

  const EditModal = () => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      <div style={{ width: "500px", padding: "50px", background: colors.bg, border: "1px solid " + colors.line }}>
        <p style={{ fontSize: "10px", letterSpacing: "3px", color: colors.sub, marginBottom: "30px" }}>RECONFIGURING: {editingAgent.name}</p>
        <label style={{ fontSize: "9px", fontWeight: "900", color: colors.sub, display: "block", marginBottom: "10px" }}>NAME</label>
        <input value={editingAgent.name} onChange={e => updateAgentDetail(editingAgent.id, "name", e.target.value.toUpperCase())} style={{ background: "none", border: "none", borderBottom: "1px solid " + colors.line, color: colors.text, width: "100%", padding: "10px 0", marginBottom: "20px", outline: "none" }} />
        <label style={{ fontSize: "9px", fontWeight: "900", color: colors.sub, display: "block", marginBottom: "10px" }}>PROTOCOL</label>
        <textarea value={editingAgent.desc} onChange={e => updateAgentDetail(editingAgent.id, "desc", e.target.value)} style={{ background: "none", border: "1px solid " + colors.line, color: colors.text, width: "100%", padding: "10px", height: "60px", marginBottom: "20px", outline: "none", fontSize: "11px" }} />
        
        <label style={{ fontSize: "9px", fontWeight: "900", color: colors.sub, display: "block", marginBottom: "10px" }}>DOC_KNOWLEDGE_FEED (.TXT, .DOCX, .PDF)</label>
        <input type="file" accept=".txt,.docx,.pdf" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              const { readLocalFile } = await import("@/utils/documentFeeder");
              try {
                const text = await readLocalFile(file);
                updateAgentDetail(editingAgent.id, "desc", editingAgent.desc + "\n\n[KNOWLEDGE_INJECTION]: " + text);
                alert("INJECTION_SUCCESS");
              } catch (err) { alert("INJECTION_FAILED"); }
            }
          }} 
          style={{ fontSize: "10px", marginBottom: "20px", color: colors.text, width: "100%" }} 
        />

        <label style={{ fontSize: "9px", fontWeight: "900", color: colors.sub, display: "block", marginBottom: "10px" }}>ICON / FONT</label>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "25px" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            {Object.keys(Icons).map((type) => {
              const IconItem = Icons[type as keyof typeof Icons];
              return (
                <button key={type} onClick={() => updateAgentDetail(editingAgent.id, "type", type)} style={{ background: editingAgent.type === type ? colors.line : "none", border: "1px solid " + (editingAgent.type === type ? colors.text : "transparent"), padding: "8px", cursor: "pointer", color: colors.text }}><IconItem /></button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: "5px" }}>
            <button onClick={() => updateAgentDetail(editingAgent.id, "font", "SANS")} style={{ padding: "8px", background: editingAgent.font === "SANS" ? colors.text : "none", color: editingAgent.font === "SANS" ? colors.bg : colors.text, border: "1px solid " + colors.line, fontSize: "9px", cursor: "pointer" }}>SANS</button>
            <button onClick={() => updateAgentDetail(editingAgent.id, "font", "MONO")} style={{ padding: "8px", background: editingAgent.font === "MONO" ? colors.text : "none", color: editingAgent.font === "MONO" ? colors.bg : colors.text, border: "1px solid " + colors.line, fontSize: "9px", cursor: "pointer" }}>MONO</button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => deleteAgent(editingAgent.id)} style={{ color: "#ff4444", background: "none", border: "none", fontSize: "10px", fontWeight: "900", cursor: "pointer" }}>DELETE</button>
          <button onClick={() => setEditingAgent(null)} style={{ background: colors.text, color: colors.bg, border: "none", padding: "12px 25px", fontSize: "10px", fontWeight: "900", cursor: "pointer" }}>SAVE</button>
        </div>
      </div>
    </div>
  );

  if (activeAgent) return (
    <main style={{ background: colors.bg, minHeight: "100vh", color: colors.text, fontFamily: "Inter, sans-serif" }}>
      <nav style={{ padding: "30px 4vw", display: "flex", justifyContent: "space-between", position: "fixed", top: 0, width: "100%", background: colors.bg + "cc", backdropFilter: "blur(15px)", borderBottom: "1px solid " + colors.line, zIndex: 100 }}>
        <span style={{ fontWeight: "700", fontSize: "11px", letterSpacing: "2px" }}>{activeAgent.name}</span>
        <button onClick={() => setActiveAgent(null)} style={{ background: "none", border: "none", color: colors.text, cursor: "pointer", fontSize: "10px", fontWeight: "900", letterSpacing: "2px" }}>BACK</button>
      </nav>
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "140px 4vw" }}><ChatInterface agent={activeAgent} darkMode={darkMode} /></div>
    </main>
  );

  return (
    <main style={{ background: colors.bg, color: colors.text, minHeight: "100vh", display: "flex", fontFamily: "Inter, sans-serif" }}>
      {editingAgent && <EditModal />} {showAuth && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "400px", padding: "60px", background: colors.bg, border: "1px solid " + colors.line, position: "relative" }}>
            <button onClick={() => setShowAuth(false)} style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", color: colors.sub, cursor: "pointer" }}>[X]</button>
            <h2 style={{ fontSize: "12px", fontWeight: "900", letterSpacing: "5px", marginBottom: "40px", textAlign: "center" }}>INITIALIZE_ID</h2>
            <input placeholder="EMAIL" style={{ width: "100%", background: "none", border: "none", borderBottom: "1px solid " + colors.line, color: colors.text, padding: "10px 0", marginBottom: "20px", outline: "none" }} />
            <input type="password" placeholder="KEY" style={{ width: "100%", background: "none", border: "none", borderBottom: "1px solid " + colors.line, color: colors.text, padding: "10px 0", marginBottom: "40px", outline: "none" }} />
            <button style={{ width: "100%", background: colors.text, color: colors.bg, border: "none", padding: "15px", fontSize: "10px", fontWeight: "900" }}>AUTHENTICATE</button>
          </div>
        </div>
      )}
      <aside style={{ width: "35vw", height: "100vh", position: "fixed", padding: "4vw", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: "1px solid " + colors.line }}>
        <div><h1 style={{ fontSize: "5.5vw", fontWeight: "900", lineHeight: "0.85", letterSpacing: "-0.05em", margin: 0 }}>UNREAL<br/>PEOPLE</h1></div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button onClick={() => setShowAuth(true)} style={{ background: colors.text, color: colors.bg, border: "none", padding: "15px 0", fontSize: "10px", fontWeight: "900", letterSpacing: "3px", cursor: "pointer" }}>SIGN_UP</button>
          <button onClick={() => setDarkMode(!darkMode)} style={{ background: "none", border: "1px solid " + colors.line, color: colors.text, padding: "12px 0", fontSize: "9px", fontWeight: "900", letterSpacing: "3px", cursor: "pointer" }}>{darkMode ? "GO_LIGHT" : "GO_DARK"}</button>
        </div>
      </aside>

      <section style={{ marginLeft: "35vw", width: "65vw", padding: "0 4vw 150px 4vw" }}>
        {agents.map((agent, i) => {
          const IconComp = Icons[agent.type as keyof typeof Icons] || Icons.User;
          return (
            <div key={agent.id} onClick={() => setActiveAgent(agent)} onMouseEnter={() => setHoverId(agent.id)} onMouseLeave={() => setHoverId(null)} style={{ borderBottom: "1px solid " + colors.line, padding: "80px 0", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "0.3s", paddingLeft: hoverId === agent.id ? "20px" : "0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
                <span style={{ fontSize: "11px", fontWeight: "900", color: colors.line }}>0{i+1}</span>
                <IconComp />
                <h2 style={{ fontSize: "3vw", fontWeight: "300", margin: 0 }}>{agent.name}</h2>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: colors.sub, fontSize: "10px", letterSpacing: "2px", fontWeight: "700" }}>{agent.desc}</p>
                <button onClick={(e) => { e.stopPropagation(); setEditingAgent(agent); }} style={{ background: "none", border: "1px solid #888", color: colors.text, padding: "5px 15px", fontSize: "9px", cursor: "pointer", opacity: hoverId === agent.id ? 1 : 0 }}>EDIT</button>
              </div>
            </div>
          );
        })}
        <div style={{ padding: "80px 0", display: "flex", gap: "30px", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="NAME" style={{ background: "none", border: "none", borderBottom: "1px solid " + colors.line, color: colors.text, width: "100%", padding: "10px 0", outline: "none" }} /></div>
          <div style={{ flex: 1 }}><input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="PROTOCOL" style={{ background: "none", border: "none", borderBottom: "1px solid " + colors.line, color: colors.text, width: "100%", padding: "10px 0", outline: "none" }} /></div>
          <button onClick={addAgent} style={{ background: colors.text, color: colors.bg, border: "none", padding: "12px 30px", fontSize: "10px", fontWeight: "900", cursor: "pointer" }}>ADD</button>
        </div>
      </section>
    </main>
  );
}
