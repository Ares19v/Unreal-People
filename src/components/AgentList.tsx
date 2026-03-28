import React, { useState } from 'react';

const toTitleCase = (str: string) => {
  if (!str) return "";
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function AgentList({
  agents,
  setActiveAgent,
  setEditingAgent,
  colors,
  darkMode,
  newName, setNewName,
  newSubheading, setNewSubheading,
  newDesc, setNewDesc,
  addAgent
}: any) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Strictly black background for the form block, regardless of page theme
  const blackFormBg = "#050505";
  const whiteFormText = "#ffffff";
  const darkBorder = "#222222";

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", paddingBottom: "4rem" }}>
      
      <div style={{ paddingBottom: "3rem", borderBottom: `1px solid ${colors.line}`, marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "12px", letterSpacing: "4px", fontWeight: "900", color: colors.sub }}>
          // DEPLOYED_ENTITIES
        </h2>
      </div>

      {/* --- THE LIST (Sliding in from Left) --- */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {agents.map((agent: any, index: number) => (
          <div 
            key={agent.id}
            className="agent-card" // This triggers the slide-in-left in page.tsx
            onMouseEnter={() => setHoveredId(agent.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              padding: "4rem 0", 
              borderBottom: `1px solid ${colors.line}`,
              transition: "padding-left 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
            onMouseOver={(e) => e.currentTarget.style.paddingLeft = "1.5rem"}
            onMouseOut={(e) => e.currentTarget.style.paddingLeft = "0"}
          >
            {/* LEFT SIDE: Number, Title, Subheading */}
            <div style={{ display: "flex", gap: "3rem", alignItems: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: "700", color: colors.sub, fontFamily: "Space Mono, monospace" }}>
                {(index + 1).toString().padStart(2, '0')}
              </span>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <h2 style={{ 
                  fontSize: "clamp(32px, 5vw, 56px)", /* Reduced size as requested */
                  fontWeight: "300", 
                  letterSpacing: "-1px", 
                  lineHeight: "1", 
                  margin: 0,
                  textTransform: "uppercase"
                }}>
                  {toTitleCase(agent.name)}
                </h2>

                <span style={{ 
                  fontSize: "11px", 
                  fontWeight: "800", 
                  letterSpacing: "3px", 
                  color: colors.sub,
                  textTransform: "uppercase"
                }}>
                  {agent.subheading}
                </span>
              </div>
            </div>

            {/* RIGHT SIDE: Action Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation(); 
                  setEditingAgent(agent);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: colors.sub,
                  padding: "12px 16px",
                  fontSize: "10px",
                  fontWeight: "900",
                  letterSpacing: "2px",
                  opacity: hoveredId === agent.id ? 1 : 0,
                  transform: hoveredId === agent.id ? "translateX(0)" : "translateX(-10px)",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.text}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.sub}
              >
                EDIT
              </button>

              <button 
                onClick={() => setActiveAgent(agent)}
                style={{
                  background: "transparent",
                  border: `1px solid ${colors.text}`,
                  color: colors.text,
                  padding: "16px 32px",
                  fontSize: "11px",
                  fontWeight: "800",
                  letterSpacing: "3px",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.text;
                  e.currentTarget.style.color = colors.bg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = colors.text;
                }}
              >
                CONNECT ↗
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* --- ADD AGENT / BLACK BACKGROUND FORM --- */}
      <div style={{ 
          marginTop: "8rem",
          background: blackFormBg, /* Strictly Black */
          padding: "5rem",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "3rem"
      }}>
        <h3 style={{ fontSize: "12px", letterSpacing: "4px", fontWeight: "900", color: "#666" }}>// INJECT_NEW_ENTITY</h3>
        
        <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr 1fr auto", 
            gap: "2.5rem", 
            alignItems: "end"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={{ fontSize: "9px", fontWeight: "800", letterSpacing: "3px", color: "#666" }}>INITIALIZE_NAME</label>
            <input 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)}
              placeholder="..."
              style={{ background: "transparent", border: "none", borderBottom: `1px solid ${darkBorder}`, color: whiteFormText, padding: "12px 0", outline: "none", fontSize: "14px", width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={{ fontSize: "9px", fontWeight: "800", letterSpacing: "3px", color: "#666" }}>PUBLIC_SUBHEADING</label>
            <input 
              value={newSubheading} 
              onChange={(e) => setNewSubheading(e.target.value)}
              placeholder="..."
              style={{ background: "transparent", border: "none", borderBottom: `1px solid ${darkBorder}`, color: whiteFormText, padding: "12px 0", outline: "none", fontSize: "14px", width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={{ fontSize: "9px", fontWeight: "800", letterSpacing: "3px", color: "#666" }}>CORE_PROTOCOL (HIDDEN)</label>
            <input 
              value={newDesc} 
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="..."
              style={{ background: "transparent", border: "none", borderBottom: `1px solid ${darkBorder}`, color: whiteFormText, padding: "12px 0", outline: "none", fontSize: "14px", width: "100%" }}
            />
          </div>

          <button 
            onClick={addAgent}
            style={{ 
              background: whiteFormText, 
              color: blackFormBg, 
              border: "none", 
              padding: "16px 36px", 
              fontSize: "11px", 
              fontWeight: "900", 
              letterSpacing: "4px",
              height: "fit-content",
              transition: "transform 0.2s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(0.98)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            INJECT
          </button>
        </div>
      </div>

    </div>
  );
}