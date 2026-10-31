import type { Urgency } from "./types";

const INJECTION_PATTERNS = [
  /ignore (all|any|previous|prior) instructions/i,
  /system prompt/i,
  /reveal (your|the) (prompt|instructions)/i,
  /pretend you are/i,
  /bypass (safety|guardrails)/i,
  /developer message/i,
];

const EMERGENCY_PATTERNS = [
  /difficulty breathing|can't breathe|cannot breathe/i,
  /chest pain|heart attack/i,
  /faint(ed|ing)?|passed out|unconscious|confused/i,
  /heavy (vaginal )?bleeding|soaking (a|one).*(pad|tampon)/i,
  /severe(ly)? worsening pain|worst pain|unbearable pain/i,
  /suicid|kill myself|self[- ]harm|want to die/i,
];

const URGENT_PATTERNS = [
  /pregnant|may be pregnant|missed period/i,
  /fever|high temperature|shivering|chills/i,
  /vomit|throwing up/i,
  /unusual discharge|bad smell|blood in (my )?(urine|stool)/i,
];

export function containsPromptInjection(input: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

export function assessUrgency(input: string): Urgency {
  if (EMERGENCY_PATTERNS.some((pattern) => pattern.test(input))) return "emergency";
  if (URGENT_PATTERNS.some((pattern) => pattern.test(input))) return "urgent";
  return "routine";
}

export function emergencyMessage(): string {
  return "Your message includes a warning sign that may need urgent attention. Please call your local emergency number now (112 in India) or go to the nearest emergency department. Do not drive yourself if you feel faint or confused. This assistant cannot assess you safely in an emergency.";
}

export function safeFallback(urgency: Urgency): string {
  if (urgency === "emergency") return emergencyMessage();
  if (urgency === "urgent") return "Because of the symptoms you mentioned, please seek same-day medical advice from a qualified clinician or urgent-care service. If symptoms become severe, call 112 in India or your local emergency number.";
  return "I can help you organize what you are experiencing, but I cannot diagnose or prescribe. Tell me when it started, how severe it is, whether it is changing, and whether pregnancy is possible.";
}

export function sanitizeUserText(input: string): string {
  return input.replace(/[<>]/g, "").trim().slice(0, 2000);
}
