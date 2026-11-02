export type TriageLevel = "none" | "advisory" | "emergency";
export type ChatSession = { id: string; title: string; createdAt: string; updatedAt: string; messages: ChatMessage[] };
export type ChatMessage = { id: string; role: "user" | "assistant"; content: string; triage?: TriageLevel; citations?: string[]; createdAt: string };

export function detectTriage(input: string): { level: TriageLevel; reason?: string } {
  const text = input.toLowerCase();
  const emergency = [
    /chest pain|difficulty breathing|can't breathe|cannot breathe/,
    /heavy bleeding|soaking (?:a )?(pad|tampon) every hour|bleeding heavily/,
    /passed out|fainted|unconscious|seizure/,
    /suicid|self[- ]harm|want to die/,
    /severe .* pain.*(pregnan|pregnancy)|pregnan.*severe pain/,
  ].some((pattern) => pattern.test(text));
  if (emergency) return { level: "emergency", reason: "Some symptoms need urgent medical assessment." };
  const advisory = [
    /persistent|worsening|unusual|recurrent/,
    /fever|vomit|dizzy|lightheaded|pain|cramp|irregular bleeding|missed period/,
  ].some((pattern) => pattern.test(text));
  return advisory ? { level: "advisory", reason: "Consider speaking with a qualified healthcare professional." } : { level: "none" };
}

export function buildSafeResponse(input: string, triage: TriageLevel): string {
  if (triage === "emergency") return "### Please seek urgent care now\n\nYour message includes symptoms that can require immediate assessment. **Call 112 in India or your local emergency number now.** Do not drive yourself if you feel faint, and ask someone you trust to stay with you. This chat is not a substitute for emergency care.\n\n> If you are in immediate danger, stop chatting and contact emergency services.\n\nI can help you prepare questions for a clinician after you are safe.";
  const lower = input.toLowerCase();
  if (lower.includes("period") || lower.includes("cramp")) return "### Understanding period symptoms\n\nPeriod discomfort is common, but you do not have to simply tolerate severe or disruptive pain.\n\n- Note when symptoms start and how long they last\n- Rest, hydrate, and try gentle warmth if it feels comfortable\n- Seek care for worsening pain, faintness, fever, or unusually heavy bleeding\n\n| Track | Example |\n| --- | --- |\n| Timing | Day of cycle |\n| Severity | 0–10 |\n| Associated symptoms | Fever, nausea, dizziness |\n\nThis is educational guidance, not a diagnosis.";
  if (lower.includes("pcos")) return "### PCOS questions\n\nPCOS can involve irregular ovulation, acne, excess hair growth, or metabolic changes, but symptoms overlap with other conditions. A clinician may ask about your cycle history, medicines, and family history and may order tests.\n\n> Avoid self-diagnosing from a single symptom.\n\nWould you like help preparing a concise appointment question list?";
  return "### I’m listening\n\nThank you for sharing that. I can help organize your symptoms, explain general health information, or prepare questions for a clinician.\n\n- What changed, and when did it start?\n- Is it getting better, worse, or staying the same?\n- What medicines or relevant conditions should a clinician know about?\n\nIf symptoms are severe, rapidly worsening, or feel unsafe, seek in-person medical care.";
}
