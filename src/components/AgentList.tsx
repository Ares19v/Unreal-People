import React, { useState } from "react";
import { Icons } from "./Icons";

export default function AgentList({ agents, setActiveAgent, setEditingAgent, colors, newName, setNewName, newSubheading, setNewSubheading, newDesc, setNewDesc, addAgent }: any) {
  const [hoverId, setHoverId] = useState(null);

  return (
    <section style={{ marginLeft: "35vw", width: "65vw", padding: "0 0 160px 0" }}>
      <div style={{ padding: "0 4vw" }}>
        {agents.map((agent: any, i: number) => {
          const IconComp = Icons[agent.type as keyof typeof Icons] || Icons.User;
          return (
            <div key={agent.id} onClick={() => setActiveAgent(agent)} onMouseEnter={() => setHoverId(agent.id as any)} onMouseLeave={() => setHoverId(null)} style={{ borderBottom: "1px solid " + colors.line, padding: "90px 0", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "0.4s", paddingLeft: hoverId === agent.id ? "30px" : "0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "45px" }}>
                <span style={{ fontSize: "11px", fontWeight: "900", color: colors.line }}>0{i+1}</span>
                <IconComp /><h2 style={{ fontSize: "3.2vw", fontWeight: "300", margin: 0, letterSpacing: "-1px" }}>{agent.name}</h2>
              </div>
              <div style={{ textAlign: "right" }}>
                {/* DISPLAY PUBLIC SUBHEADING */}
                <p style={{ color: colors.sub, fontSize: "10px", letterSpacing: "3px", fontWeight: "900", marginBottom: "15px" }}>{agent.subheading || "CLASSIFIED_PROTOCOL"}</p>
                <button onClick={(e) => { e.stopPropagation(); setEditingAgent(agent); }} style={{ background: "none", border: "1px solid #888", color: colors.text, padding: "6px 20px", fontSize: "9px", fontWeight: "900", cursor: "pointer", opacity: hoverId === agent.id ? 1 : 0, transition: "0.3s" }}>EDIT_PROTOCOL</button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ position: "fixed", bottom: 0, right: 0, width: "65vw", background: colors.bg, borderTop: "2px solid " + colors.line, padding: "40px 4vw", display: "flex", gap: "20px", alignItems: "flex-end", zIndex: 100 }}>
        <div style={{ flex: 1 }}><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="NAME" style={{ background: "none", border: "none", borderBottom: "1px solid " + colors.line, color: colors.text, width: "100%", padding: "12px 0", outline: "none", fontSize: "11px" }} /></div>
        <div style={{ flex: 1 }}><input value={newSubheading} onChange={e => setNewSubheading(e.target.value)} placeholder="SUBHEADING (PUBLIC)" style={{ background: "none", border: "none", borderBottom: "1px solid " + colors.line, color: colors.text, width: "100%", padding: "12px 0", outline: "none", fontSize: "11px" }} /></div>
        <div style={{ flex: 2 }}><input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="PROTOCOL (HIDDEN INSTRUCTIONS)" style={{ background: "none", border: "none", borderBottom: "1px solid " + colors.line, color: colors.text, width: "100%", padding: "12px 0", outline: "none", fontSize: "11px" }} /></div>
        <button onClick={addAgent} style={{ background: colors.text, color: colors.bg, border: "none", padding: "15px 40px", fontSize: "10px", fontWeight: "900", cursor: "pointer", letterSpacing: "3px" }}>INJECT</button>
      </div>
    </section>
  );
}
