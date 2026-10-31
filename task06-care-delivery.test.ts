import { afterEach, describe, expect, it, vi } from "vitest";
import { applyAppointmentAction, canAccessAppointment, generateSlots } from "@/lib/care/appointments";
import type { Appointment } from "@/lib/care/types";

describe("Task 6 care delivery", () => {
  afterEach(() => vi.useRealTimers());
  const futureSlot = "provider-anjali-2099-11-02T10:00:00.000Z";

  it("generates future half-hour slots in the provider timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T00:00:00.000Z"));
    const slots = generateSlots("provider-anjali", new Date("2026-11-01T00:00:00.000Z"), 14);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].timezone).toBe("Asia/Kolkata");
    expect(new Date(slots[1].startsAt).getTime() - new Date(slots[0].startsAt).getTime()).toBe(30 * 60 * 1000);
  });

  it("requires care consent and prevents double booking", () => {
    const appointments: Appointment[] = [];
    const base = { action: "hold" as const, patientId: "patient-a", providerId: "provider-anjali", slotId: futureSlot, mode: "video" as const, reason: "Period pain", consentAccepted: false };
    expect(applyAppointmentAction(base, appointments).error).toContain("consent");
    const first = applyAppointmentAction({ ...base, consentAccepted: true }, appointments);
    expect(first.appointment?.status).toBe("held");
    const second = applyAppointmentAction({ ...base, patientId: "patient-b", consentAccepted: true }, appointments);
    expect(second.error).toContain("taken");
  });

  it("allows only the patient or assigned provider to access an appointment", () => {
    const appointment = { patientId: "patient-a", providerId: "provider-anjali" } as Appointment;
    expect(canAccessAppointment(appointment, "patient-a", "patient")).toBe(true);
    expect(canAccessAppointment(appointment, "provider-anjali", "provider")).toBe(true);
    expect(canAccessAppointment(appointment, "patient-b", "patient")).toBe(false);
    expect(canAccessAppointment(appointment, "provider-other", "provider")).toBe(false);
  });

  it("blocks cross-account cancellation and preserves the appointment", () => {
    const appointments: Appointment[] = [];
    const created = applyAppointmentAction({ action: "hold", patientId: "patient-a", providerId: "provider-anjali", slotId: "provider-anjali-2099-11-03T10:00:00.000Z", mode: "clinic", reason: "Follow-up", consentAccepted: true }, appointments);
    const result = applyAppointmentAction({ action: "cancel", appointmentId: created.appointment!.id, actorId: "patient-b", actorRole: "patient", reason: "not mine" }, appointments);
    expect(result.error).toContain("authorized");
    expect(appointments[0].status).toBe("held");
  });

  it("supports provider completion after patient confirmation", () => {
    const appointments: Appointment[] = [];
    const created = applyAppointmentAction({ action: "hold", patientId: "patient-a", providerId: "provider-anjali", slotId: "provider-anjali-2099-11-04T10:00:00.000Z", mode: "video", reason: "Consultation", consentAccepted: true }, appointments);
    applyAppointmentAction({ action: "confirm", appointmentId: created.appointment!.id, actorId: "patient-a", actorRole: "patient" }, appointments);
    const completed = applyAppointmentAction({ action: "complete", appointmentId: created.appointment!.id, actorId: "provider-anjali", actorRole: "provider" }, appointments);
    expect(completed.appointment?.status).toBe("completed");
  });
});
