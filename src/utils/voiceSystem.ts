export const speakAgentResponse = (text: string, agentType: string) => {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();

  // THE SEARCH FOR QUALITY:
  // We look for 'Neural', 'Natural', or 'Google' which are high-fidelity.
  const naturalVoice = voices.find(v => 
    (v.name.includes("Neural") || v.name.includes("Natural") || v.name.includes("Google")) && 
    v.lang.startsWith("en")
  ) || voices.find(v => v.lang.startsWith("en"));

  if (naturalVoice) utterance.voice = naturalVoice;

  // Personality Tuning
  if (agentType === "Medical") {
    utterance.pitch = 0.95; utterance.rate = 0.88; // Calm, clinical
  } else if (agentType === "RealEstate") {
    utterance.pitch = 1.05; utterance.rate = 1.0; // Polished, professional
  } else {
    utterance.pitch = 1.0; utterance.rate = 1.0; // Friendly, neutral
  }

  window.speechSynthesis.speak(utterance);
};

export const stopVoice = () => {
  if (typeof window !== "undefined") window.speechSynthesis.cancel();
};
