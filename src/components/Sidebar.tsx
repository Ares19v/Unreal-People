import React from "react";

export default function Sidebar({ triggerVoid, setShowAuth, darkMode, setDarkMode, colors }: any) {
  return (
    <section style={{ height: "100vh", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", borderBottom: "1px solid " + colors.line, position: "relative" }}>
      
      {/* MASSIVE HERO LOGO */}
      <div onClick={triggerVoid} style={{ cursor: "pointer", textAlign: "center", marginBottom: "40px", transition: "transform 0.3s ease" }} onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"} onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>
        <h1 style={{ fontSize: "12vw", fontWeight: "900", lineHeight: "0.85", letterSpacing: "-0.05em", margin: 0, color: colors.text }}>
          UNREAL<br/>PEOPLE
        </h1>
      </div>

      {/* COMPACT AUTH / THEME CONTROLS */}
      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        <button onClick={() => setShowAuth(true)} style={{ background: colors.text, color: colors.bg, border: "none", padding: "12px 30px", fontSize: "10px", fontWeight: "900", letterSpacing: "4px", cursor: "pointer" }}>
          SIGN_UP
        </button>
        <button onClick={() => setDarkMode(!darkMode)} style={{ background: "none", border: "1px solid " + colors.line, color: colors.text, padding: "11px 30px", fontSize: "10px", fontWeight: "900", letterSpacing: "4px", cursor: "pointer" }}>
          {darkMode ? "GO_LIGHT" : "GO_DARK"}
        </button>
      </div>
      
      {/* SCROLL INDICATOR */}
      <div style={{ position: "absolute", bottom: "40px", fontSize: "10px", letterSpacing: "5px", color: colors.sub, fontWeight: "900", animation: "pulse 2s infinite" }}>
        SCROLL_DOWN
      </div>
      <style>{`@keyframes pulse { 0% { opacity: 0.3; transform: translateY(0); } 50% { opacity: 1; transform: translateY(5px); } 100% { opacity: 0.3; transform: translateY(0); } }`}</style>
    </section>
  );
}
