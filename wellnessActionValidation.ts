import { isWellnessCategory } from "@/lib/wellness/wellnessValidation";

const UNITS: Record<string, string> = { hydration: "ml", nutrition: "meals", activity: "minutes", sleep: "hours", mood: "score" };
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export type WellnessAction = "entry" | "journal" | "goal" | "habit" | "completion" | "preferences";

export function validateWellnessAction(body: unknown): { valid: true; action: WellnessAction; data: Record<string, unknown> } | { valid: false; errors: string[] } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { valid: false, errors: ["A JSON object is required."] };
  const data = body as Record<string, unknown>;
  const action = data.action;
  if (!["entry", "journal", "goal", "habit", "completion", "preferences"].includes(String(action))) return { valid: false, errors: ["Invalid wellness action."] };
  const errors: string[] = [];
  if (action === "entry") {
    if (!isWellnessCategory(data.category)) errors.push("Invalid wellness category.");
    if (typeof data.date !== "string" || !DATE.test(data.date) || Number.isNaN(Date.parse(`${data.date}T00:00:00Z`))) errors.push("Date must be YYYY-MM-DD.");
    if (typeof data.value !== "number" || !Number.isFinite(data.value) || data.value < 0) errors.push("Value must be a non-negative finite number.");
    if (isWellnessCategory(data.category) && data.unit !== UNITS[data.category]) errors.push(`Unit must be ${UNITS[data.category]}.`);
    if (data.notes !== undefined && (typeof data.notes !== "string" || data.notes.length > 1000)) errors.push("Notes must be at most 1000 characters.");
  }
  if (action === "journal") {
    if (typeof data.date !== "string" || !DATE.test(data.date)) errors.push("Date must be YYYY-MM-DD.");
    for (const key of ["mood", "stress"]) if (!Number.isInteger(data[key]) || Number(data[key]) < 1 || Number(data[key]) > 5) errors.push(`${key} must be an integer from 1 to 5.`);
    if (data.notes !== undefined && (typeof data.notes !== "string" || data.notes.length > 1000)) errors.push("Notes must be at most 1000 characters.");
  }
  if (action === "goal") {
    if (!isWellnessCategory(data.category)) errors.push("Invalid goal category.");
    if (typeof data.target !== "number" || !Number.isFinite(data.target) || data.target <= 0) errors.push("Goal target must be positive.");
    if (isWellnessCategory(data.category) && data.unit !== UNITS[data.category]) errors.push(`Unit must be ${UNITS[data.category]}.`);
  }
  if (action === "habit") {
    if (typeof data.title !== "string" || data.title.trim().length < 1 || data.title.length > 100) errors.push("Habit title must be 1–100 characters.");
    if (data.description !== undefined && (typeof data.description !== "string" || data.description.length > 500)) errors.push("Habit description must be at most 500 characters.");
    if (data.frequency !== "daily" && data.frequency !== "weekly") errors.push("Frequency must be daily or weekly.");
  }
  if (action === "completion") {
    if (typeof data.habitId !== "string" || !data.habitId) errors.push("A habit ID is required.");
    if (typeof data.date !== "string" || !DATE.test(data.date)) errors.push("Date must be YYYY-MM-DD.");
    if (data.completed !== undefined && typeof data.completed !== "boolean") errors.push("Completed must be boolean.");
  }
  if (action === "preferences") {
    if (typeof data.notificationsEnabled !== "boolean") errors.push("notificationsEnabled must be boolean.");
    if (typeof data.cycleIntegrationConsent !== "boolean") errors.push("cycleIntegrationConsent must be boolean.");
    if (data.reminderTime !== undefined && data.reminderTime !== null && (typeof data.reminderTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.reminderTime))) errors.push("reminderTime must be HH:MM.");
  }
  return errors.length ? { valid: false, errors } : { valid: true, action: action as WellnessAction, data };
}
