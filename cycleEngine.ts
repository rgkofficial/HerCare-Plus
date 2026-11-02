/**
 * HerCare+ Cycle Intelligence Engine
 * 
 * This module contains the core prediction and analytics algorithms
 * that transform raw cycle data into personalized health insights.
 */

export type FlowType = "light" | "medium" | "heavy" | "spotting";
export type MoodType = "happy" | "anxious" | "sad" | "irritable" | "energetic" | "tired" | "neutral" | "calm";
export type PhaseType = "Menstrual" | "Follicular" | "Ovulation" | "Luteal" | "Unknown";

export interface CycleEntry {
  id: string;
  date: string; // ISO format YYYY-MM-DD
  flow: FlowType;
  symptoms: string[];
  mood?: MoodType;
  notes?: string;
  // Enhanced tracking
  symptomIntensity?: {
    cramps?: number; // 1-5 scale
    headache?: number;
    bloating?: number;
    fatigue?: number;
    backPain?: number;
  };
  energyLevel?: number; // 1-5
  sleepQuality?: number; // 1-5
}

export interface CycleMetrics {
  averageCycleLength: number;
  averagePeriodLength: number;
  cycleVariability: number; // Standard deviation
  lastPeriodStart: string;
  predictedNextPeriod: string;
  currentPhase: PhaseType;
  daysUntilNextPeriod: number;
  confidenceScore: number; // 0-100, based on data quality
}

export interface CyclePattern {
  start: Date;
  end?: Date;
  periodLength: number;
  cycleLength?: number;
  totalDays: number;
}

export interface AnalyticsSummary {
  metrics: CycleMetrics;
  patterns: {
    cycles: CyclePattern[];
    commonSymptoms: Array<{ name: string; frequency: number; avgIntensity?: number }>;
    moodPatterns: Array<{ mood: string; phase: PhaseType; frequency: number }>;
  };
  insights: {
    regularity: "very-regular" | "regular" | "irregular" | "very-irregular";
    symptomTrends: string[];
    recommendations: string[];
  };
  flowDistribution: {
    light: number;
    medium: number;
    heavy: number;
    spotting: number;
  };
}

/**
 * Core Prediction Engine
 * Uses rolling average with outlier filtering for accurate predictions
 */
export class CyclePredictionEngine {
  private entries: CycleEntry[];

  constructor(entries: CycleEntry[]) {
    this.entries = entries.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  /**
   * Identifies distinct menstrual cycles from entry data
   */
  private identifyCycles(): CyclePattern[] {
    if (this.entries.length === 0) return [];

    const cycles: CyclePattern[] = [];
    let currentPeriodStart = new Date(this.entries[0].date);
    let periodDays = 1;

    for (let i = 1; i < this.entries.length; i++) {
      const currentDate = new Date(this.entries[i].date);
      const prevDate = new Date(this.entries[i - 1].date);
      const daysDiff = Math.round(
        (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // If gap > 2 days, it's a new cycle
      if (daysDiff > 2) {
        // Calculate cycle length from previous cycle start
        if (cycles.length > 0) {
          const prevCycleStart = cycles[cycles.length - 1].start;
          const cycleLength = Math.round(
            (currentPeriodStart.getTime() - prevCycleStart.getTime()) / 
            (1000 * 60 * 60 * 24)
          );
          cycles[cycles.length - 1].cycleLength = cycleLength;
          cycles[cycles.length - 1].end = new Date(
            currentPeriodStart.getTime() - 24 * 60 * 60 * 1000
          );
        }

        cycles.push({
          start: currentPeriodStart,
          periodLength: periodDays,
          totalDays: periodDays,
        });

        currentPeriodStart = currentDate;
        periodDays = 1;
      } else {
        periodDays++;
      }
    }

    // Handle last cycle
    if (cycles.length > 0) {
      const prevCycleStart = cycles[cycles.length - 1].start;
      const cycleLength = Math.round(
        (currentPeriodStart.getTime() - prevCycleStart.getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      cycles[cycles.length - 1].cycleLength = cycleLength;
    }
    cycles.push({
      start: currentPeriodStart,
      periodLength: periodDays,
      totalDays: periodDays,
    });

    return cycles;
  }

  /**
   * Calculates comprehensive cycle metrics
   */
  calculateMetrics(): CycleMetrics {
    const cycles = this.identifyCycles();
    
    if (cycles.length === 0) {
      return {
        averageCycleLength: 28,
        averagePeriodLength: 5,
        cycleVariability: 0,
        lastPeriodStart: new Date().toISOString().split('T')[0],
        predictedNextPeriod: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0],
        currentPhase: "Unknown",
        daysUntilNextPeriod: 28,
        confidenceScore: 0,
      };
    }

    // Filter valid cycles (15-50 days to remove outliers)
    const validCycles = cycles.filter(
      (c) => c.cycleLength && c.cycleLength >= 15 && c.cycleLength <= 50
    );

    // Calculate averages
    const avgCycleLength = validCycles.length > 0
      ? Math.round(
          validCycles.reduce((sum, c) => sum + (c.cycleLength || 0), 0) / 
          validCycles.length
        )
      : 28;

    const avgPeriodLength = Math.round(
      cycles.reduce((sum, c) => sum + c.periodLength, 0) / cycles.length
    );

    // Calculate variability (standard deviation)
    const cycleLengths = validCycles.map((c) => c.cycleLength || 0);
    const variance = cycleLengths.length > 1
      ? cycleLengths.reduce((sum, len) => 
          sum + Math.pow(len - avgCycleLength, 2), 0
        ) / cycleLengths.length
      : 0;
    const cycleVariability = Math.sqrt(variance);

    // Prediction
    const lastCycle = cycles[cycles.length - 1];
    const lastPeriodStart = lastCycle.start.toISOString().split('T')[0];
    
    const predictedNextPeriodDate = new Date(
      lastCycle.start.getTime() + avgCycleLength * 24 * 60 * 60 * 1000
    );
    const predictedNextPeriod = predictedNextPeriodDate.toISOString().split('T')[0];

    // Calculate days until next period
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilNextPeriod = Math.max(
      0,
      Math.ceil(
        (predictedNextPeriodDate.getTime() - today.getTime()) / 
        (1000 * 60 * 60 * 24)
      )
    );

    // Determine current phase
    const daysSinceLastPeriod = Math.floor(
      (today.getTime() - lastCycle.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const currentPhase = this.determinePhase(daysSinceLastPeriod, avgCycleLength);

    // Confidence score (based on data quantity and regularity)
    const dataQualityScore = Math.min(100, (validCycles.length / 6) * 50);
    const regularityScore = Math.max(0, 50 - cycleVariability * 5);
    const confidenceScore = Math.round(dataQualityScore + regularityScore);

    return {
      averageCycleLength: avgCycleLength,
      averagePeriodLength: avgPeriodLength,
      cycleVariability: Math.round(cycleVariability * 10) / 10,
      lastPeriodStart,
      predictedNextPeriod,
      currentPhase,
      daysUntilNextPeriod,
      confidenceScore: Math.min(100, Math.max(0, confidenceScore)),
    };
  }

  /**
   * Determines cycle phase based on day in cycle
   */
  private determinePhase(dayInCycle: number, avgCycleLength: number): PhaseType {
    if (dayInCycle <= 0) return "Menstrual";
    if (dayInCycle <= 5) return "Menstrual";
    if (dayInCycle <= Math.floor(avgCycleLength * 0.5)) return "Follicular";
    if (dayInCycle <= Math.floor(avgCycleLength * 0.5) + 3) return "Ovulation";
    if (dayInCycle < avgCycleLength) return "Luteal";
    return "Menstrual"; // Overdue, likely starting soon
  }

  /**
   * Generates comprehensive analytics summary
   */
  generateAnalytics(): AnalyticsSummary {
    const cycles = this.identifyCycles();
    const metrics = this.calculateMetrics();

    // Symptom analysis
    const symptomCounts: Record<string, { count: number; totalIntensity: number }> = {};
    this.entries.forEach((entry) => {
      entry.symptoms?.forEach((symptom) => {
        if (!symptomCounts[symptom]) {
          symptomCounts[symptom] = { count: 0, totalIntensity: 0 };
        }
        symptomCounts[symptom].count++;
        
        // Add intensity if available
        const intensityKey = symptom.toLowerCase().replace(/\s+/g, '') as keyof typeof entry.symptomIntensity;
        if (entry.symptomIntensity && entry.symptomIntensity[intensityKey]) {
          symptomCounts[symptom].totalIntensity += entry.symptomIntensity[intensityKey]!;
        }
      });
    });

    const commonSymptoms = Object.entries(symptomCounts)
      .map(([name, data]) => ({
        name,
        frequency: Math.round((data.count / this.entries.length) * 100),
        avgIntensity: data.totalIntensity > 0 
          ? Math.round((data.totalIntensity / data.count) * 10) / 10 
          : undefined,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    // Mood patterns
    const moodCounts: Record<string, Record<PhaseType, number>> = {};
    this.entries.forEach((entry) => {
      if (entry.mood) {
        if (!moodCounts[entry.mood]) {
          moodCounts[entry.mood] = {
            Menstrual: 0,
            Follicular: 0,
            Ovulation: 0,
            Luteal: 0,
            Unknown: 0,
          };
        }
        // Determine phase for this entry
        const entryDate = new Date(entry.date);
        const lastPeriod = new Date(metrics.lastPeriodStart);
        const daysSince = Math.floor(
          (entryDate.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24)
        );
        const phase = this.determinePhase(daysSince, metrics.averageCycleLength);
        moodCounts[entry.mood][phase]++;
      }
    });

    const moodPatterns = Object.entries(moodCounts).flatMap(([mood, phases]) =>
      Object.entries(phases)
        .filter(([_, count]) => count > 0)
        .map(([phase, count]) => ({
          mood,
          phase: phase as PhaseType,
          frequency: count,
        }))
    );

    // Flow distribution
    const flowCounts = { light: 0, medium: 0, heavy: 0, spotting: 0 };
    this.entries.forEach((entry) => {
      if (entry.flow) flowCounts[entry.flow]++;
    });
    const totalFlows = this.entries.length || 1;
    const flowDistribution = {
      light: Math.round((flowCounts.light / totalFlows) * 100),
      medium: Math.round((flowCounts.medium / totalFlows) * 100),
      heavy: Math.round((flowCounts.heavy / totalFlows) * 100),
      spotting: Math.round((flowCounts.spotting / totalFlows) * 100),
    };

    // Regularity assessment
    let regularity: AnalyticsSummary['insights']['regularity'] = "regular";
    if (metrics.cycleVariability < 2) regularity = "very-regular";
    else if (metrics.cycleVariability > 7) regularity = "very-irregular";
    else if (metrics.cycleVariability > 4) regularity = "irregular";

    // Generate insights
    const symptomTrends: string[] = [];
    const recommendations: string[] = [];

    if (commonSymptoms.length > 0 && commonSymptoms[0].frequency > 50) {
      symptomTrends.push(
        `You experience ${commonSymptoms[0].name.toLowerCase()} in over half of your logged days.`
      );
    }

    if (regularity === "very-irregular") {
      recommendations.push(
        "Your cycles show high variability. Consider tracking stress levels and sleep to identify patterns."
      );
    }

    if (flowCounts.heavy / totalFlows > 0.5) {
      recommendations.push(
        "You frequently log heavy flow. If this causes concern, discuss with your healthcare provider."
      );
    }

    return {
      metrics,
      patterns: {
        cycles,
        commonSymptoms,
        moodPatterns,
      },
      insights: {
        regularity,
        symptomTrends,
        recommendations,
      },
      flowDistribution,
    };
  }
}

/**
 * Daily Insight Generator
 * Provides personalized, phase-specific health tips
 */
export class DailyInsightGenerator {
  private phase: PhaseType;
  private symptoms: string[];
  private age?: number;

  constructor(phase: PhaseType, symptoms: string[], age?: number) {
    this.phase = phase;
    this.symptoms = symptoms;
    this.age = age;
  }

  /**
   * Generates a personalized daily insight
   */
  generate(): string {
    // Phase-specific base insights
    const phaseInsights: Record<PhaseType, string[]> = {
      Menstrual: [
        "Your body is shedding the uterine lining. Rest is healing—don't push yourself too hard. 🌸",
        "Iron-rich foods like spinach and lentils can help replenish what you lose during menstruation. 🥬",
        "Gentle movement like yoga or walking can ease cramps and boost your mood. 🧘‍♀️",
      ],
      Follicular: [
        "Your energy is rising! This is a great time to start new projects or tackle challenging tasks. 🚀",
        "Estrogen is increasing, which can boost your mood and creativity. Embrace it! ✨",
        "Your body is preparing for ovulation. Stay hydrated and nourish yourself well. 💧",
      ],
      Ovulation: [
        "You're in your fertile window. If tracking fertility, this is key! 🌟",
        "Peak energy and confidence—perfect for important meetings or social events. 💪",
        "Your body is releasing an egg. Some may feel mild cramping (mittelschmerz). 🥚",
      ],
      Luteal: [
        "Progesterone is rising. You might feel more introspective—that's normal. 🌙",
        "Magnesium-rich foods (dark chocolate, nuts) can help with PMS symptoms. 🍫",
        "Your period is approaching. Stock up on supplies and practice self-care. 🛁",
      ],
      Unknown: [
        "Keep logging your cycle to unlock personalized insights! 📊",
      ],
    };

    let insight = phaseInsights[this.phase][
      Math.floor(Math.random() * phaseInsights[this.phase].length)
    ];

    // Symptom-specific modifications
    if (this.symptoms.includes("Cramps") || this.symptoms.includes("Back pain")) {
      insight = "Experiencing cramps? Try a heating pad, gentle stretches, or magnesium supplements. Heat increases blood flow and relaxes muscles. 🔥";
    } else if (this.symptoms.includes("Headache")) {
      insight = "Headaches can be hormonal. Stay hydrated, avoid caffeine crashes, and rest in a dark room if needed. 💧";
    } else if (this.symptoms.includes("Mood swings") || this.symptoms.includes("Fatigue")) {
      insight = "Feeling low energy or moody? Hormonal shifts are real. Be gentle with yourself—this will pass. 💜";
    }

    // Age-specific adjustments
    if (this.age && this.age < 18) {
      insight += " Remember, irregular cycles are common in your teens as your body adjusts. 🌸";
    } else if (this.age && this.age > 45) {
      insight += " Perimenopause can bring changes. Track patterns to discuss with your doctor. 🩺";
    }

    return insight;
  }
}
