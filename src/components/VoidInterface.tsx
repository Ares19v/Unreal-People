"use client";
import React, { useState, useEffect, useRef } from "react";

export default function VoidInterface({ setIsVoid }: { setIsVoid: (v: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [voidMode, setVoidMode] = useState("VORTEX");
  const [visualEngine, setVisualEngine] = useState("ACOUSTIC_SAND");
  const [vInput, setVInput] = useState("");
  const mouse = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    if (voidMode !== "VORTEX" || visualEngine !== "ACOUSTIC_SAND") return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    
    let frame: number;
    let nanites: any[] = [];
    
    let chladniN = 3;
    let chladniM = 2;
    let lastChange = Date.now();

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    const handleMouseMove = (e: MouseEvent) => { mouse.current = { x: e.clientX, y: e.clientY }; };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    resize();

    // Initialize Nanites with Base (x,y) and Offset (ox,oy)
    for (let i = 0; i < 7000; i++) {
      nanites.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: 0, vy: 0,
        ox: 0, oy: 0, // Elastic visual offset for cursor repulsion
        size: Math.random() * 1.2 + 0.5
      });
    }

    const render = () => {
      // Auto-Change Acoustic Frequency Every 5 Seconds
      if (Date.now() - lastChange > 5000) {
        chladniN = Math.floor(Math.random() * 5) + 1;
        chladniM = Math.floor(Math.random() * 5) + 1;
        if (chladniN === chladniM) chladniM = (chladniM % 5) + 1;
        lastChange = Date.now();
      }

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const cx = canvas.width / 2; 
      const cy = canvas.height / 2;
      const scale = 0.005; 

      nanites.forEach(p => {
        // 1. BASE MATH: Chladni Resonance Pattern
        const nx = (p.x - cx) * scale;
        const ny = (p.y - cy) * scale;

        const v = Math.sin(chladniN * nx) * Math.sin(chladniM * ny) + Math.sin(chladniM * nx) * Math.sin(chladniN * ny);
        const dx = chladniN * Math.cos(chladniN * nx) * Math.sin(chladniM * ny) + chladniM * Math.cos(chladniM * nx) * Math.sin(chladniN * ny);
        const dy = chladniM * Math.sin(chladniN * nx) * Math.cos(chladniM * ny) + chladniN * Math.sin(chladniM * nx) * Math.cos(chladniN * ny);

        p.vx += -v * dx * 0.8;
        p.vy += -v * dy * 0.8;
        p.vx += (cx - p.x) * 0.0001; // Keep them centered
        p.vy += (cy - p.y) * 0.0001;

        p.vx *= 0.85; // High friction
        p.vy *= 0.85;
        p.x += p.vx;
        p.y += p.vy;

        // 2. ELASTIC INTERACTION: Cursor Repulsion
        const mdx = (p.x + p.ox) - mouse.current.x;
        const mdy = (p.y + p.oy) - mouse.current.y;
        const dist = Math.sqrt(mdx * mdx + mdy * mdy);
        
        let targetOx = 0;
        let targetOy = 0;

        if (dist < 100 && dist > 0) {
          const force = (100 - dist) / 100;
          targetOx = (mdx / dist) * force * 80; // Pushes up to 80px away
          targetOy = (mdy / dist) * force * 80;
        }

        // Spring smoothly back to target offset (0 when mouse leaves)
        p.ox += (targetOx - p.ox) * 0.15;
        p.oy += (targetOy - p.oy) * 0.15;

        // 3. RENDER (At Base + Offset)
        ctx.fillStyle = "#000";
        ctx.globalAlpha = 0.8;
        ctx.fillRect(p.x + p.ox, p.y + p.oy, p.size, p.size);
      });

      frame = requestAnimationFrame(render);
    };
    
    render();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); window.removeEventListener("mousemove", handleMouseMove); };
  }, [voidMode, visualEngine]);

  return (
    <main style={{ height: "100vh", width: "100vw", background: "#fff", position: "fixed", inset: 0, zIndex: 1500 }}>
      {/* TOP RIGHT NAV */}
      <div style={{ position: "fixed", top: "40px", right: "4vw", display: "flex", flexDirection: "column", gap: "12px", alignItems: "flex-end", zIndex: 4000 }}>
         <button onClick={() => setIsVoid(false)} style={{ background: "none", border: "none", color: "#000", fontSize: "10px", fontWeight: "900", letterSpacing: "3px", cursor: "pointer", marginBottom: "30px" }}>BACK_TO_DASHBOARD</button>
         <button onClick={() => setVoidMode("KACIM")} style={{ background: voidMode === "KACIM" ? "#000" : "none", color: voidMode === "KACIM" ? "#fff" : "#000", border: "1px solid #000", padding: "12px 25px", fontSize: "9px", fontWeight: "900", letterSpacing: "4px", cursor: "pointer", width: "180px" }}>RAG MODEL</button>
         <button onClick={() => setVoidMode("MOLOCH")} style={{ background: voidMode === "MOLOCH" ? "#000" : "none", color: voidMode === "MOLOCH" ? "#fff" : "#000", border: "1px solid #000", padding: "12px 25px", fontSize: "9px", fontWeight: "900", letterSpacing: "4px", cursor: "pointer", width: "180px" }}>TRAINED MODEL</button>
         <button onClick={() => setVoidMode("VORTEX")} style={{ marginTop: "10px", background: "none", border: "none", color: "#aaa", fontSize: "8px", fontWeight: "900", cursor: "pointer", letterSpacing: "2px", opacity: voidMode === "VORTEX" ? 0 : 1 }}>SHOW_DISPLAY</button>
      </div>

      {/* BOTTOM LEFT NAV (MODULE SWITCHER) */}
      {voidMode === "VORTEX" && (
        <div style={{ position: "fixed", bottom: "40px", left: "4vw", display: "flex", flexDirection: "column", gap: "10px", zIndex: 4000 }}>
          <p style={{ fontSize: "9px", letterSpacing: "4px", color: "#888", fontWeight: "900", margin: 0 }}>DISPLAY_MODULE</p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setVisualEngine("ACOUSTIC_SAND")} style={{ background: visualEngine === "ACOUSTIC_SAND" ? "#000" : "none", color: visualEngine === "ACOUSTIC_SAND" ? "#fff" : "#000", border: "1px solid #000", padding: "10px 15px", fontSize: "9px", fontWeight: "900", cursor: "pointer" }}>NANITE_RESONANCE</button>
            <button onClick={() => setVisualEngine("MODULE_2")} style={{ background: visualEngine === "MODULE_2" ? "#000" : "none", color: visualEngine === "MODULE_2" ? "#fff" : "#aaa", border: "1px solid " + (visualEngine === "MODULE_2" ? "#000" : "#eee"), padding: "10px 15px", fontSize: "9px", fontWeight: "900", cursor: "pointer" }}>FLUID_DYNAMICS (LOCKED)</button>
          </div>
        </div>
      )}

      {/* VISUAL CANVASES */}
      {voidMode === "VORTEX" && visualEngine === "ACOUSTIC_SAND" && <canvas ref={canvasRef} style={{ display: "block", filter: "contrast(1.2)" }} />}
      {voidMode === "VORTEX" && visualEngine === "MODULE_2" && <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", fontSize: "12px", letterSpacing: "10px" }}>// SECONDARY_MODULE_OFFLINE //</div>}

      {/* KACIM INTERFACE */}
      {voidMode === "KACIM" && (
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 15vw" }}>
          <div style={{ width: "100%", maxWidth: "700px", animation: "slideUp 0.6s ease" }}>
            <h3 style={{ fontSize: "10px", letterSpacing: "12px", color: "#888", marginBottom: "50px", fontWeight: "900" }}>PROTOCOL // KACIM</h3>
            <input value={vInput} onChange={e => setVInput(e.target.value)} placeholder="INJECT_QUERY..." style={{ width: "100%", background: "none", border: "none", borderBottom: "3px solid #000", color: "#000", fontSize: "32px", outline: "none", padding: "20px 0", fontWeight: "100" }} />
            <button onClick={() => {alert("QUERY_SENT"); setVInput("");}} style={{ marginTop: "50px", background: "#000", color: "#fff", border: "none", padding: "18px 50px", fontSize: "10px", fontWeight: "900", cursor: "pointer", letterSpacing: "3px" }}>EXECUTE</button>
          </div>
        </div>
      )}

      {/* MOLOCH INTERFACE */}
      {voidMode === "MOLOCH" && (
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 15vw", background: "#fcfcfc" }}>
          <div style={{ width: "100%", maxWidth: "700px", animation: "slideUp 0.6s ease" }}>
            <h3 style={{ fontSize: "10px", letterSpacing: "12px", color: "#ff4444", marginBottom: "50px", fontWeight: "900" }}>SYSTEM // MOLOCH</h3>
            <input value={vInput} onChange={e => setVInput(e.target.value)} placeholder="NEURAL_OVERRIDE..." style={{ width: "100%", background: "none", border: "none", borderBottom: "3px solid #ff4444", color: "#000", fontSize: "32px", outline: "none", padding: "20px 0", fontWeight: "100" }} />
            <button onClick={() => {alert("SIGNAL_LOST"); setVInput("");}} style={{ marginTop: "50px", background: "#ff4444", color: "#fff", border: "none", padding: "18px 50px", fontSize: "10px", fontWeight: "900", cursor: "pointer", letterSpacing: "3px" }}>ACTIVATE</button>
          </div>
        </div>
      )}
      <style>{` @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } } `}</style>
    </main>
  );
}
