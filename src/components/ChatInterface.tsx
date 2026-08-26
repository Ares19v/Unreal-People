"use client"; import React, { useState, useEffect, useRef } from "react";
import { speakAgentResponse, stopVoice } from "@/utils/voiceSystem";
import { startListening } from "@/utils/speechRecognition";

export default function ChatInterface({ agent, darkMode }: { agent: any, darkMode: boolean }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim()) return;
    const userMsg = { role: "user", content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [...messages, userMsg], agentId: agent.id, protocol: agent.desc }),
    });
    const data = await res.json();
    setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
  };

  const handleMicClick = () => {
    if (isListening) return;
    setIsListening(true);
    startListening((text) => { setInput(text); sendMessage(text); }, () => setIsListening(false));
  };

  return (
    <div style={{ height: "70vh", display: "flex", flexDirection: "column" }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }} className="hide-scrollbar">
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: "40px", textAlign: m.role === "user" ? "right" : "left" }}>
            <div style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
               <p style={{ fontSize: "9px", fontWeight: "900", letterSpacing: "2px", color: "#888", margin: 0 }}>{m.role.toUpperCase()}</p>
               {/* SPEAKER ICON FOR ASSISTANT ONLY */}
               {m.role === "assistant" && (
                 <button onClick={() => speakAgentResponse(m.content, agent.type)} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", padding: 0, display: "flex" }}>
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                 </button>
               )}
            </div>
            <div style={{ fontSize: "15px", lineHeight: "1.6", color: darkMode ? "#fff" : "#000", maxWidth: "85%", marginLeft: m.role === "user" ? "auto" : "0" }}>{m.content}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "20px", borderTop: "1px solid rgba(128,128,128,0.2)", paddingTop: "20px", display: "flex", gap: "15px", alignItems: "center" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder={isListening ? "LISTENING..." : "MESSAGE"} style={{ flex: 1, background: "none", border: "none", outline: "none", color: darkMode ? "#fff" : "#000", fontSize: "14px" }} />
        <button onClick={handleMicClick} style={{ background: "none", border: "none", cursor: "pointer", color: isListening ? "#ff4444" : "#888" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        </button>
        <button onClick={() => sendMessage()} style={{ background: "none", border: "none", fontWeight: "900", cursor: "pointer", color: darkMode ? "#fff" : "#000", fontSize: "11px", letterSpacing: "2px" }}>SEND</button>
      </div>
    </div>
  );
}
