import type { Appointment, AppointmentAction, AvailabilitySlot } from "./types";
import { providerById } from "./providers";

const SLOT_MINUTES = 30;
const activeStatuses = new Set(["held", "confirmed", "rescheduled"]);

function pad(value: number) { return String(value).padStart(2, "0"); }
function dateAtLocalUtc(date: Date, hours: number, minutes: number): Date {
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function generateSlots(providerId: string, from = new Date(), days = 14): AvailabilitySlot[] {
  const provider = providerById(providerId);
  if (!provider) return [];
  const slots: AvailabilitySlot[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(from);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    const schedule = provider.availability.find((item) => item.day === date.getDay());
    if (!schedule) continue;
    const [startHour, startMinute] = schedule.start.split(":").map(Number);
    const [endHour, endMinute] = schedule.end.split(":").map(Number);
    for (let minute = startHour * 60 + startMinute; minute + SLOT_MINUTES <= endHour * 60 + endMinute; minute += SLOT_MINUTES) {
      const start = dateAtLocalUtc(date, Math.floor(minute / 60), minute % 60);
      const end = new Date(start.getTime() + SLOT_MINUTES * 60_000);
      if (start <= new Date()) continue;
      slots.push({ id: `${providerId}-${start.toISOString()}`, providerId, startsAt: start.toISOString(), endsAt: end.toISOString(), timezone: provider.timezone, available: true });
    }
  }
  return slots;
}

export function canAccessAppointment(appointment: Appointment, actorId: string, actorRole: "patient" | "provider"): boolean {
  return actorRole === "patient" ? appointment.patientId === actorId : appointment.providerId === actorId;
}

function isFutureSlot(providerId: string, slotId: string): boolean {
  const prefix = `${providerId}-`;
  if (!slotId.startsWith(prefix)) return false;
  const timestamp = new Date(slotId.slice(prefix.length));
  return !Number.isNaN(timestamp.getTime()) && timestamp.getTime() > Date.now();
}

export function applyAppointmentAction(action: AppointmentAction, appointments: Appointment[], now = new Date()): { appointment?: Appointment; error?: string } {
  if (action.action === "hold") {
    if (!action.consentAccepted) return { error: "Care consent is required before booking." };
    if (!action.reason.trim()) return { error: "Please share a short reason for the visit." };
    if (!providerById(action.providerId)) return { error: "Provider not found." };
    if (!isFutureSlot(action.providerId, action.slotId)) return { error: "That appointment slot is invalid or has expired." };
    if (appointments.some((item) => item.slotId === action.slotId && activeStatuses.has(item.status))) return { error: "That appointment time was just taken. Please choose another slot." };
    const appointment: Appointment = { id: `apt-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`, patientId: action.patientId, providerId: action.providerId, slotId: action.slotId, mode: action.mode, status: "held", reason: action.reason.trim().slice(0, 500), patientNotes: action.patientNotes?.trim().slice(0, 1000), consentAcceptedAt: now.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString() };
    appointments.push(appointment);
    return { appointment };
  }

  const appointment = appointments.find((item) => item.id === action.appointmentId);
  if (!appointment) return { error: "Appointment not found." };
  const actorRole = action.actorRole;
  if (!canAccessAppointment(appointment, action.actorId, actorRole)) return { error: "You are not authorized to change this appointment." };
  if (appointment.status === "cancelled" || appointment.status === "completed") return { error: "This appointment can no longer be changed." };

  if (action.action === "confirm") { appointment.status = "confirmed"; appointment.updatedAt = now.toISOString(); return { appointment }; }
  if (action.action === "cancel") { appointment.status = "cancelled"; appointment.cancellationReason = action.reason.trim().slice(0, 300); appointment.updatedAt = now.toISOString(); return { appointment }; }
  if (action.action === "reschedule") {
    if (!isFutureSlot(appointment.providerId, action.newSlotId)) return { error: "That new appointment slot is invalid or has expired." };
    if (appointments.some((item) => item.id !== appointment.id && item.slotId === action.newSlotId && activeStatuses.has(item.status))) return { error: "That new appointment time is no longer available." };
    appointment.slotId = action.newSlotId; appointment.status = "rescheduled"; appointment.updatedAt = now.toISOString(); return { appointment };
  }
  if (action.action === "complete" && actorRole === "provider") { appointment.status = "completed"; appointment.updatedAt = now.toISOString(); return { appointment }; }
  return { error: "Unsupported appointment action." };
}

export function formatSlot(slot: AvailabilitySlot, locale = "en-IN"): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(slot.startsAt));
}
