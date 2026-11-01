"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Droplets,
  Moon,
  Heart,
  Utensils,
} from "lucide-react";

import MoodStressJournal from "@/components/wellness/MoodStressJournal";
import HabitTracker from "@/components/wellness/HabitTracker";
import WellnessPreferences from "@/components/wellness/WellnessPreferences";

import { generateWellnessRecommendations } from "@/lib/wellness/wellnessRecommendations";
import { storage } from "@/lib/storage";

type WellnessCategory =
  | "hydration"
  | "nutrition"
  | "activity"
  | "sleep"
  | "mood";

interface WellnessMetric {
  category: WellnessCategory;
  label: string;
  value: number;
  goal: number;
  unit: string;
}

interface WellnessEntry {
  id: string;
  category: WellnessCategory;
  date: string;
  value: number;
  unit: string;
  created_at: string;
}

const initialMetrics: WellnessMetric[] = [
  {
    category: "hydration",
    label: "Hydration",
    value: 0,
    goal: 2000,
    unit: "ml",
  },
  {
    category: "nutrition",
    label: "Meals",
    value: 0,
    goal: 3,
    unit: "meals",
  },
  {
    category: "activity",
    label: "Activity",
    value: 0,
    goal: 30,
    unit: "minutes",
  },
  {
    category: "sleep",
    label: "Sleep",
    value: 0,
    goal: 8,
    unit: "hours",
  },
  {
    category: "mood",
    label: "Mood",
    value: 0,
    goal: 5,
    unit: "score",
  },
];

const icons = {
  hydration: Droplets,
  nutrition: Utensils,
  activity: Activity,
  sleep: Moon,
  mood: Heart,
};

const categories: WellnessCategory[] = [
  "hydration",
  "nutrition",
  "activity",
  "sleep",
  "mood",
];

function isWellnessCategory(
  value: unknown
): value is WellnessCategory {
  return categories.some((category) => category === value);
}

/**
 * Returns the date in the user's local timezone.
 *
 * Avoid using toISOString().slice(0, 10) here because
 * UTC can produce the wrong date near midnight.
 */
function getLocalDate(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Converts saved entries into today's dashboard totals.
 *
 * Hydration, meals, and activity are accumulated.
 * Sleep and mood use the most recently saved entry.
 */
function calculateDailyMetrics(
  entries: WellnessEntry[],
  date: string
): {
  values: Record<WellnessCategory, number>;
  recorded: WellnessCategory[];
} {
  const values: Record<WellnessCategory, number> = {
    hydration: 0,
    nutrition: 0,
    activity: 0,
    sleep: 0,
    mood: 0,
  };

  const recorded = new Set<WellnessCategory>();

  const latest: Partial<
    Record<WellnessCategory, string>
  > = {};

  for (const entry of entries) {
    if (
      entry.date !== date ||
      !isWellnessCategory(entry.category)
    ) {
      continue;
    }

    const value = Number(entry.value);

    if (!Number.isFinite(value)) {
      continue;
    }

    recorded.add(entry.category);

    if (
      entry.category === "sleep" ||
      entry.category === "mood"
    ) {
      const timestamp = entry.created_at ?? "";

      if (
        latest[entry.category] === undefined ||
        timestamp >= latest[entry.category]!
      ) {
        values[entry.category] = value;
        latest[entry.category] = timestamp;
      }
    } else {
      values[entry.category] += value;
    }
  }

  return {
    values,
    recorded: Array.from(recorded),
  };
}

export default function WellnessPage() {
  const [metrics, setMetrics] =
    useState<WellnessMetric[]>(initialMetrics);

  const [selectedCategory, setSelectedCategory] =
    useState<WellnessCategory>("hydration");

  const [inputValue, setInputValue] = useState("");

  const [selectedGoals, setSelectedGoals] = useState<
    WellnessCategory[]
  >(["hydration", "nutrition", "activity", "sleep", "mood"]);

  const [recordedCategories, setRecordedCategories] = useState<
    WellnessCategory[]
  >([]);

  const [journalStress, setJournalStress] = useState<
    number | null
  >(null);

  const [entries, setEntries] = useState<WellnessEntry[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [apiMessage, setApiMessage] = useState("");
  const [isAuthenticated, setIsAuthenticated] =
    useState(false);
  const [cycleEntriesCount, setCycleEntriesCount] = useState<number | null>(null);

  const selectedMetric = metrics.find(
    (metric) => metric.category === selectedCategory
  );

  /**
   * Load saved entries from the authenticated API.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadEntries() {
      setIsLoading(true);
      setApiMessage("");

      try {
        const response = await fetch("/api/wellness", {
          method: "GET",
          cache: "no-store",
        });

        if (cancelled) return;

        if (response.status === 401) {
          setIsAuthenticated(false);
          setApiMessage(
            "Please sign in to load and save wellness entries."
          );
          return;
        }

        if (!response.ok) {
          throw new Error(
            "Unable to load saved wellness entries."
          );
        }

        const result: {
          entries?: WellnessEntry[];
          goals?: Array<{ category: WellnessCategory; target: number }>;
          preferences?: { cycle_integration_consent?: boolean };
        } = await response.json();

        if (cancelled) return;

        const savedEntries = Array.isArray(result.entries)
          ? result.entries
          : [];

        if (Array.isArray(result.goals) && result.goals.length > 0) {
          setSelectedGoals(result.goals.map((goal) => goal.category));
          setMetrics((previous) => previous.map((metric) => {
            const goal = result.goals?.find((item) => item.category === metric.category);
            return goal ? { ...metric, goal: Number(goal.target) } : metric;
          }));
        }

        if (result.preferences?.cycle_integration_consent) {
          const cycleEntries = await storage.getCycleEntries();
          setCycleEntriesCount(cycleEntries.length);
        } else {
          setCycleEntriesCount(null);
        }

        const today = getLocalDate();

        const daily = calculateDailyMetrics(
          savedEntries,
          today
        );

        setEntries(savedEntries);

        setMetrics((previous) =>
          previous.map((metric) => ({
            ...metric,
            value: daily.values[metric.category],
          }))
        );

        setRecordedCategories(daily.recorded);
        setIsAuthenticated(true);
      } catch {
        if (!cancelled) {
          setApiMessage(
            "Unable to load saved wellness entries. Please try refreshing the page."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadEntries();

    return () => {
      cancelled = true;
    };
  }, []);

  function toggleGoal(category: WellnessCategory) {
    setSelectedGoals((previous) => {
      const next = previous.includes(category)
        ? previous.filter((item) => item !== category)
        : [...previous, category];
      if (next.includes(category)) {
        const metric = metrics.find((item) => item.category === category);
        if (metric) void fetch("/api/wellness", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "goal", category, target: metric.goal, unit: metric.unit }) });
      }
      return next;
    });
  }

  function updateGoal(
    category: WellnessCategory,
    newGoal: number
  ) {
    if (
      !Number.isFinite(newGoal) ||
      newGoal <= 0
    ) {
      return;
    }

    setMetrics((previous) =>
      previous.map((metric) =>
        metric.category === category
          ? { ...metric, goal: newGoal }
          : metric
      )
    );
    const metric = metrics.find((item) => item.category === category);
    if (metric) void fetch("/api/wellness", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "goal", category, target: newGoal, unit: metric.unit }) });
  }

  function getMetricValue(
    category: WellnessCategory
  ): number {
    return (
      metrics.find(
        (metric) => metric.category === category
      )?.value ?? 0
    );
  }

  function recordedValue(
    category: WellnessCategory
  ): number | null {
    return recordedCategories.includes(category)
      ? getMetricValue(category)
      : null;
  }

  const recommendations =
    generateWellnessRecommendations({
      goals: selectedGoals,
      hydrationMl: recordedValue("hydration"),
      activityMinutes: recordedValue("activity"),
      sleepHours: recordedValue("sleep"),
      moodScore: recordedValue("mood"),
      stressScore: journalStress,
      cycleEntriesCount,
    });

  /**
   * Save a wellness entry to Supabase through the API.
   */
  async function addEntry() {
    if (isSaving || isLoading) {
      return;
    }

    setApiMessage("");

    if (!isAuthenticated) {
      setApiMessage(
        "Please sign in before saving a wellness entry."
      );
      return;
    }

    if (!selectedMetric) {
      setApiMessage("Please select a valid category.");
      return;
    }

    const value = Number(inputValue);

    if (
      inputValue.trim() === "" ||
      !Number.isFinite(value) ||
      value <= 0
    ) {
      setApiMessage(
        "Please enter a valid positive value."
      );
      return;
    }

    if (
      selectedCategory === "mood" &&
      (!Number.isInteger(value) ||
        value < 1 ||
        value > 5)
    ) {
      setApiMessage(
        "Mood must be a whole number between 1 and 5."
      );
      return;
    }

    if (
      selectedCategory === "sleep" &&
      value > 24
    ) {
      setApiMessage(
        "Sleep must be between 0 and 24 hours."
      );
      return;
    }

    if (
      selectedCategory === "nutrition" &&
      !Number.isInteger(value)
    ) {
      setApiMessage(
        "Please enter a whole number of meals."
      );
      return;
    }

    const entryDate = getLocalDate();

    setIsSaving(true);

    try {
      const response = await fetch("/api/wellness", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "entry",
          category: selectedCategory,
          date: entryDate,
          value,
          unit: selectedMetric.unit,
        }),
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        setApiMessage(
          "Your session has expired. Please sign in again."
        );
        return;
      }

      const result: {
        entry?: WellnessEntry;
        error?: string;
        details?: unknown;
      } = await response.json();

      if (!response.ok || !result.entry) {
        if (response.status === 400) {
          setApiMessage(
            "The entry was rejected by validation. Please check the value and try again."
          );
        } else {
          setApiMessage(
            result.error ??
              "Unable to save wellness entry."
          );
        }

        return;
      }

      /**
       * Update the dashboard only after the API
       * confirms the entry was saved.
       */
      const updatedEntries = [
        result.entry,
        ...entries,
      ];

      const daily = calculateDailyMetrics(
        updatedEntries,
        getLocalDate()
      );

      setEntries(updatedEntries);

      setMetrics((previous) =>
        previous.map((metric) => ({
          ...metric,
          value: daily.values[metric.category],
        }))
      );

      setRecordedCategories(daily.recorded);
      setInputValue("");

      setApiMessage(
        "Wellness entry saved successfully!"
      );
    } catch {
      setApiMessage(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-purple-50 px-5 py-10 pb-32">
      <div className="mx-auto max-w-5xl">
        {/* Page header */}
        <header className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-pink-600">
            HerCare Plus
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            My Wellness Dashboard
          </h1>

          <p className="mt-3 text-gray-600">
            Track your daily habits and understand your
            wellness progress.
          </p>
        </header>

        {/* API status */}
        {isLoading && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"
          >
            Loading your saved wellness entries...
          </div>
        )}

        {apiMessage && (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900"
          >
            {apiMessage}
          </div>
        )}

        {/* Wellness goals */}
        <section className="mb-8 rounded-3xl border border-pink-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            My Wellness Goals
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Select the wellness areas you want to focus on.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {metrics.map((metric) => {
              const selected = selectedGoals.includes(
                metric.category
              );

              return (
                <button
                  key={metric.category}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    toggleGoal(metric.category)
                  }
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    selected
                      ? "border-pink-600 bg-pink-600 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-pink-400"
                  }`}
                >
                  {metric.label}
                  {selected ? " ✓" : ""}
                </button>
              );
            })}
          </div>

          {/* Editable targets */}
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {metrics
              .filter(
                (metric) =>
                  selectedGoals.includes(
                    metric.category
                  ) && metric.category !== "mood"
              )
              .map((metric) => (
                <div
                  key={metric.category}
                  className="rounded-2xl border border-gray-200 p-4"
                >
                  <label
                    htmlFor={`goal-${metric.category}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    {metric.label} Target (
                    {metric.unit})
                  </label>

                  <input
                    id={`goal-${metric.category}`}
                    type="number"
                    min="0.1"
                    step="any"
                    value={metric.goal}
                    onChange={(event) =>
                      updateGoal(
                        metric.category,
                        Number(event.target.value)
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                  />
                </div>
              ))}
          </div>
        </section>

        {/* Daily wellness overview */}
        <section
          aria-label="Daily wellness overview"
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {metrics.map((metric) => {
            const Icon = icons[metric.category];

            const progress =
              metric.category === "mood"
                ? 0
                : Math.min(
                    (metric.value / metric.goal) * 100,
                    100
                  );

            return (
              <article
                key={metric.category}
                className="rounded-3xl border border-pink-100 bg-white p-6 shadow-sm"
              >
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-pink-100 p-3 text-pink-600">
                    <Icon size={24} />
                  </div>

                  <h2 className="text-lg font-semibold text-gray-900">
                    {metric.label}
                  </h2>
                </div>

                <p className="text-2xl font-bold text-gray-900">
                  {metric.value}

                  <span className="ml-2 text-sm font-normal text-gray-500">
                    {metric.unit}
                  </span>
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  {metric.category === "mood"
                    ? "Self-reported mood (1–5)"
                    : `Personal goal: ${metric.goal} ${metric.unit}`}
                </p>

                {/* Mood is a score, not a progress goal */}
                {metric.category !== "mood" && (
                  <>
                    <div
                      className="mt-5 h-3 overflow-hidden rounded-full bg-gray-100"
                      role="progressbar"
                      aria-label={`${metric.label} progress`}
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full bg-pink-500 transition-all"
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>

                    <p className="mt-2 text-right text-sm text-gray-500">
                      {Math.round(progress)}% complete
                    </p>
                  </>
                )}
              </article>
            );
          })}
        </section>

        {/* Add wellness entry */}
        <section className="mt-10 rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Add Wellness Entry
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Record your daily wellness activities.
            Entries are saved to your account.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="wellness-category"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Category
              </label>

              <select
                id="wellness-category"
                value={selectedCategory}
                disabled={isSaving}
                onChange={(event) => {
                  setSelectedCategory(
                    event.target
                      .value as WellnessCategory
                  );

                  setInputValue("");
                  setApiMessage("");
                }}
                className="w-full rounded-xl border border-gray-300 p-3 text-gray-900 disabled:opacity-60"
              >
                {metrics.map((metric) => (
                  <option
                    key={metric.category}
                    value={metric.category}
                  >
                    {metric.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="wellness-value"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Value ({selectedMetric?.unit})
              </label>

              <input
                id="wellness-value"
                type="number"
                min={
                  selectedCategory === "mood"
                    ? "1"
                    : "0.01"
                }
                max={
                  selectedCategory === "mood"
                    ? "5"
                    : selectedCategory === "sleep"
                      ? "24"
                      : undefined
                }
                step={
                  selectedCategory === "mood" ||
                  selectedCategory === "nutrition"
                    ? "1"
                    : "any"
                }
                value={inputValue}
                disabled={isSaving}
                onChange={(event) =>
                  setInputValue(event.target.value)
                }
                placeholder="Enter value"
                className="w-full rounded-xl border border-gray-300 p-3 text-gray-900 disabled:opacity-60"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void addEntry()}
            disabled={
              isSaving ||
              isLoading ||
              !isAuthenticated
            }
            className="mt-6 rounded-xl bg-pink-600 px-6 py-3 font-semibold text-white transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving
              ? "Saving..."
              : "Save Wellness Entry"}
          </button>

          {!isLoading && !isAuthenticated && (
            <p className="mt-3 text-sm text-gray-600">
              Sign in to your HerCare Plus account
              to save entries.
            </p>
          )}
        </section>

        {/* Journal */}
        <section className="mt-10">
          <MoodStressJournal
            onStressChange={setJournalStress}
          />
        </section>

        {/* Habit tracker */}
        <section className="mt-10">
          <HabitTracker />
        </section>

        {/* Personalized recommendations */}
        <section
          aria-labelledby="wellness-recommendations-title"
          className="mt-10 rounded-3xl border border-pink-100 bg-white p-6 shadow-sm"
        >
          <h2
            id="wellness-recommendations-title"
            className="text-xl font-bold text-gray-900"
          >
            Personalized Wellness Recommendations
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Educational suggestions based on your
            selected goals and available wellness
            entries. No entry does not mean poor
            wellness.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {recommendations.map(
              (recommendation) => (
                <article
                  key={recommendation.id}
                  className="rounded-2xl border border-purple-100 bg-purple-50 p-5"
                >
                  <h3 className="font-semibold text-purple-900">
                    {recommendation.title}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-gray-700">
                    {recommendation.description}
                  </p>

                  <span className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-medium text-purple-700">
                    General wellness information
                  </span>
                </article>
              )
            )}
          </div>
        </section>

        <WellnessPreferences />
        {/* Disclaimer */}
        <aside className="mt-8 rounded-2xl bg-purple-100 p-5 text-sm text-purple-900">
          <strong>Wellness information only:</strong>{" "}
          This dashboard is intended for general
          wellness tracking and does not provide
          medical diagnosis or treatment advice.
        </aside>

        <p className="mt-4 text-sm text-gray-500">
          Wellness entries, journal entries, habits, and editable goal
          preferences are saved through the authenticated API when you are signed in.
          Default goals are demonstration values,
          not personalized medical targets.
        </p>
      </div>
    </main>
  );
}
