export type LogLevel = "info" | "warn" | "error";

function redact(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/AIza[\w-]{20,}/g, "[REDACTED_API_KEY]")
      .replace(/Bearer\s+[\w.-]+/gi, "Bearer [REDACTED]");
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        const sensitive = /token|secret|password|authorization|cookie|api[-_]?key|medical|symptom|record/i.test(key);
        return [key, sensitive ? "[REDACTED]" : redact(entry)];
      }),
    );
  }
  return value;
}

export function logEvent(
  level: LogLevel,
  event: string,
  context: Record<string, unknown> = {},
): void {
  const redactedContext = redact(context) as Record<string, unknown>;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...redactedContext,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export function requestId(request?: Request): string {
  return request?.headers.get("x-request-id") || crypto.randomUUID();
}
