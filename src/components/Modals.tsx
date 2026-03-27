import React from "react";
import { Icons } from "./Icons";

export const EditModal = ({ editingAgent, updateAgentDetail, deleteAgent, setEditingAgent, colors }: any) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", backdropFilter: "blur(20px)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: "550px", padding: "60px", background: colors.bg, border: "1px solid " + colors.line }}>
      <p style={{ fontSize: "10px", letterSpacing: "4px", color: colors.sub, marginBottom: "40px", fontWeight: "900" }}>RECONFIGURING: {editingAgent.name}</p>
      
      <label style={{ fontSize: "9px", fontWeight: "900", color: colors.sub, display: "block", marginBottom: "8px" }}>NAME</label>
      <input value={editingAgent.name} onChange={e => updateAgentDetail(editingAgent.id, "name", e.target.value.toUpperCase())} style={{ background: "none", border: "none", borderBottom: "1px solid " + colors.line, color: colors.text, width: "100%", padding: "10px 0", marginBottom: "20px", outline: "none" }} />
      
      <label style={{ fontSize: "9px", fontWeight: "900", color: colors.sub, display: "block", marginBottom: "8px" }}>SUBHEADING (PUBLIC)</label>
      <input value={editingAgent.subheading || ""} onChange={e => updateAgentDetail(editingAgent.id, "subheading", e.target.value.toUpperCase())} style={{ background: "none", border: "none", borderBottom: "1px solid " + colors.line, color: colors.text, width: "100%", padding: "10px 0", marginBottom: "20px", outline: "none" }} />

      <label style={{ fontSize: "9px", fontWeight: "900", color: "#ffaa00", display: "block", marginBottom: "8px" }}>PROTOCOL (HIDDEN AI INSTRUCTIONS)</label>
      <textarea value={editingAgent.desc} onChange={e => updateAgentDetail(editingAgent.id, "desc", e.target.value)} style={{ background: "none", border: "1px solid " + colors.line, color: colors.text, width: "100%", padding: "15px", height: "80px", marginBottom: "20px", outline: "none", fontSize: "12px" }} />
      
      <label style={{ fontSize: "9px", fontWeight: "900", color: colors.sub, display: "block", marginBottom: "8px" }}>DOC_FEED</label>
      <input type="file" accept=".txt,.docx,.pdf" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            const { readLocalFile } = await import("@/utils/documentFeeder");
            try {
              const text = await readLocalFile(file);
              updateAgentDetail(editingAgent.id, "desc", editingAgent.desc + "\n\n[INJECTION]: " + text);
              alert("SUCCESS");
            } catch (err) { alert("FAILED"); }
          }
        }} 
        style={{ fontSize: "11px", marginBottom: "25px", color: colors.text, width: "100%" }} 
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          {Object.keys(Icons).map((type) => {
            const IconItem = Icons[type as keyof typeof Icons];
            return <button key={type} onClick={() => updateAgentDetail(editingAgent.id, "type", type)} style={{ background: editingAgent.type === type ? colors.line : "none", border: "1px solid " + (editingAgent.type === type ? colors.text : "transparent"), padding: "12px", cursor: "pointer", color: colors.text }}><IconItem /></button>;
          })}
        </div>
        <div style={{ display: "flex", gap: "5px" }}>
          <button onClick={() => updateAgentDetail(editingAgent.id, "font", "SANS")} style={{ padding: "12px 20px", background: editingAgent.font === "SANS" ? colors.text : "none", color: editingAgent.font === "SANS" ? colors.bg : colors.text, border: "1px solid " + colors.line, fontSize: "10px", fontWeight: "900", cursor: "pointer" }}>SANS</button>
          <button onClick={() => updateAgentDetail(editingAgent.id, "font", "MONO")} style={{ padding: "12px 20px", background: editingAgent.font === "MONO" ? colors.text : "none", color: editingAgent.font === "MONO" ? colors.bg : colors.text, border: "1px solid " + colors.line, fontSize: "10px", fontWeight: "900", cursor: "pointer" }}>MONO</button>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => deleteAgent(editingAgent.id)} style={{ color: "#ff4444", background: "none", border: "none", fontSize: "10px", fontWeight: "900", cursor: "pointer", letterSpacing: "2px" }}>DELETE</button>
        <button onClick={() => setEditingAgent(null)} style={{ background: colors.text, color: colors.bg, border: "none", padding: "15px 40px", fontSize: "10px", fontWeight: "900", cursor: "pointer", letterSpacing: "2px" }}>SAVE_AND_SYNC</button>
      </div>
    </div>
  </div>
);

export const AuthModal = ({ setShowAuth, colors }: any) => (
  // AuthModal code remains untouched
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: "450px", padding: "70px", background: colors.bg, border: "1px solid " + colors.line, position: "relative" }}>
      <button onClick={() => setShowAuth(false)} style={{ position: "absolute", top: "25px", right: "25px", background: "none", border: "none", color: colors.sub, cursor: "pointer" }}>[X]</button>
      <h2 style={{ fontSize: "12px", fontWeight: "900", letterSpacing: "6px", marginBottom: "50px", textAlign: "center", color: colors.text }}>INITIALIZE_ID</h2>
      <input placeholder="EMAIL" style={{ width: "100%", background: "none", border: "none", borderBottom: "1px solid " + colors.line, color: colors.text, padding: "15px 0", marginBottom: "25px", outline: "none" }} />
      <input type="password" placeholder="KEY" style={{ width: "100%", background: "none", border: "none", borderBottom: "1px solid " + colors.line, color: colors.text, padding: "15px 0", marginBottom: "50px", outline: "none" }} />
      <button style={{ width: "100%", background: colors.text, color: colors.bg, border: "none", padding: "18px", fontSize: "10px", fontWeight: "900", letterSpacing: "3px" }}>AUTHENTICATE</button>
    </div>
  </div>
);
