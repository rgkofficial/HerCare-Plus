"use client";

import { FormEvent, useState } from "react";

type Result = {
  modelVersion: string;
  riskBand: string;
  confidence: string;
  abstained: boolean;
  outOfDistribution?: boolean;
  probability?: number | null;
  factors: string[];
  nextSteps: string[];
  limitation: string;
};

export default function HealthRiskPage() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pregnancyPossible, setPregnancyPossible] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      age: Number(form.get("age")),
      symptomDurationDays: Number(form.get("symptomDurationDays")),
      painSeverity: Number(form.get("painSeverity")),
      heavyBleeding: form.get("heavyBleeding") === "on",
      faintingOrSevereDizziness: form.get("faintingOrSevereDizziness") === "on",
      pregnancyPossible,
    };
    if (pregnancyPossible) {
      Object.assign(payload, {
        maternalVitals: {
          age: Number(form.get("maternalAge")),
          systolicBP: Number(form.get("systolicBP")),
          diastolicBP: Number(form.get("diastolicBP")),
          bloodSugar: Number(form.get("bloodSugar")),
          bodyTemperature: Number(form.get("bodyTemperature")),
          heartRate: Number(form.get("heartRate")),
        },
      });
    }
    try {
      const response = await fetch("/api/health-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Screening request failed.");
      setResult(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Screening request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FFF9FB] px-5 py-20 text-gray-800">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-black">Health risk screening</h1>
        <p className="mt-3 rounded-xl border border-pink-200 bg-pink-50 p-4 text-sm">
          This is a screening risk indicator, not a diagnosis; not clinically validated.
          It cannot replace a qualified clinician.
        </p>
        <form onSubmit={submit} className="mt-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <label>Age<input name="age" type="number" min="13" max="120" defaultValue="28" required className="mt-1 w-full rounded-lg border p-3" /></label>
          <label>Symptom duration (days)<input name="symptomDurationDays" type="number" min="0" max="365" defaultValue="2" required className="mt-1 w-full rounded-lg border p-3" /></label>
          <label>Pain severity (0–10)<input name="painSeverity" type="number" min="0" max="10" defaultValue="0" required className="mt-1 w-full rounded-lg border p-3" /></label>
          <label><input name="heavyBleeding" type="checkbox" className="mr-2" />Heavy bleeding</label>
          <label><input name="faintingOrSevereDizziness" type="checkbox" className="mr-2" />Fainting or severe dizziness</label>
          <label><input name="pregnancyPossible" type="checkbox" checked={pregnancyPossible} onChange={(event) => setPregnancyPossible(event.target.checked)} className="mr-2" />Pregnancy may be possible</label>
          {pregnancyPossible && <fieldset className="grid gap-3 rounded-xl border border-pink-100 bg-pink-50 p-4">
            <legend className="font-semibold">Maternal vitals (use the stated units)</legend>
            <label>Maternal age<input name="maternalAge" type="number" min="10" max="70" defaultValue="28" required className="mt-1 w-full rounded-lg border p-3" /></label>
            <label>Systolic BP (mmHg)<input name="systolicBP" type="number" min="70" max="160" defaultValue="120" required className="mt-1 w-full rounded-lg border p-3" /></label>
            <label>Diastolic BP (mmHg)<input name="diastolicBP" type="number" min="49" max="100" defaultValue="80" required className="mt-1 w-full rounded-lg border p-3" /></label>
            <label>Blood sugar (mmol/L)<input name="bloodSugar" type="number" min="6" max="19" step="any" defaultValue="7" required className="mt-1 w-full rounded-lg border p-3" /></label>
            <label>Body temperature (°F)<input name="bodyTemperature" type="number" min="98" max="103" step="any" defaultValue="98.6" required className="mt-1 w-full rounded-lg border p-3" /></label>
            <label>Heart rate (bpm)<input name="heartRate" type="number" min="7" max="90" defaultValue="75" required className="mt-1 w-full rounded-lg border p-3" /></label>
          </fieldset>}
          <button type="submit" disabled={loading} className="rounded-xl bg-pink-600 px-4 py-3 font-bold text-white disabled:opacity-50">
            {loading ? "Checking…" : "Review screening indicator"}
          </button>
        </form>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
        <section aria-live="polite" className="mt-6">
          {result && (
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold">{result.riskBand}</h2>
              <p className="mt-2 text-sm">Confidence: {result.confidence}. {result.abstained ? "The tool is abstaining because the result is uncertain." : ""}</p>
              {result.outOfDistribution && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-900">These inputs are outside the range this tool was built for; no model prediction was returned.</p>}
              <ul className="mt-4 list-disc pl-5 text-sm">{result.factors.map((factor) => <li key={factor}>{factor}</li>)}</ul>
              <div className="mt-4 text-sm"><strong>Next steps:</strong><ul className="list-disc pl-5">{result.nextSteps.map((step) => <li key={step}>{step}</li>)}</ul></div>
              <p className="mt-4 text-xs text-gray-500">Model version: {result.modelVersion}. {result.limitation}</p>
              <a href="/privacy-safety" className="mt-3 inline-block text-sm font-bold text-pink-700 underline">Read safety and privacy limitations</a>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
