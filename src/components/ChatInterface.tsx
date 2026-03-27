"use client"; import React, { useState, useEffect, useRef } from "react";

export default function ChatInterface({ agent, darkMode }: { agent: any, darkMode: boolean }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // ISOLATED FONT LOGIC
  const chatFont = agent.font === "MONO" ? "'Courier New', monospace" : "Inter, sans-serif";

  useEffect(() => {
    const saved = localStorage.getItem(`chat_${agent.id}`);
    if (saved) setMessages(JSON.parse(saved));
  }, [agent.id]);

  useEffect(() => {
    localStorage.setItem(`chat_${agent.id}`, JSON.stringify(messages));
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [...messages, userMsg], agentId: agent.id, protocol: agent.desc }),
    });
    const data = await res.json();
    setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
  };

  return (
    <div style={{ fontFamily: chatFont, height: "70vh", display: "flex", flexDirection: "column" }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: "30px", textAlign: m.role === "user" ? "right" : "left" }}>
            <p style={{ fontSize: "10px", color: "#888", marginBottom: "5px" }}>{m.role.toUpperCase()}</p>
            <div style={{ fontSize: "15px", lineHeight: "1.6", color: darkMode ? "#fff" : "#000" }}>{m.content}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "20px", display: "flex", gap: "15px" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="MESSAGE" style={{ flex: 1, background: "none", border: "none", borderBottom: "1px solid #ccc", outline: "none", color: darkMode ? "#fff" : "#000" }} />
        <button onClick={sendMessage} style={{ background: "none", border: "none", fontWeight: "bold", cursor: "pointer", color: darkMode ? "#fff" : "#000" }}>SEND</button>
      </div>
    </div>
  );
}
