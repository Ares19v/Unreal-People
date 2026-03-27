import React from "react";

export default function Sidebar({ triggerVoid, setShowAuth, darkMode, setDarkMode, colors }: any) {
  return (
    <aside style={{ width: "35vw", height: "100vh", position: "fixed", padding: "4vw", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: "1px solid " + colors.line }}>
      <div onClick={triggerVoid} style={{ cursor: "pointer" }}>
        <h1 style={{ fontSize: "5.5vw", fontWeight: "900", lineHeight: "0.85", letterSpacing: "-0.05em", margin: 0 }}>UNREAL<br/>PEOPLE</h1>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <button onClick={() => setShowAuth(true)} style={{ background: colors.text, color: colors.bg, border: "none", padding: "18px 0", fontSize: "10px", fontWeight: "900", letterSpacing: "4px", cursor: "pointer" }}>SIGN_UP</button>
        <button onClick={() => setDarkMode(!darkMode)} style={{ background: "none", border: "1px solid " + colors.line, color: colors.text, padding: "15px 0", fontSize: "9px", fontWeight: "900", letterSpacing: "4px", cursor: "pointer" }}>{darkMode ? "GO_LIGHT" : "GO_DARK"}</button>
      </div>
    </aside>
  );
}
