"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Activity,
  Calendar,
  Droplets,
  Heart,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Info
} from "lucide-react";
import { useState, useEffect } from "react";

interface CycleEntry {
  date: string;
  flow: string;
  symptoms: string[];
  mood?: string;
  notes?: string;
}

interface CycleAnalyticsProps {
  entries: CycleEntry[];
  onClose: () => void;
  onStartTracking?: () => void;
}

type RegularityType = "very-regular" | "sometimes-irregular" | "very-irregular" | "not-sure";

export default function CycleAnalytics({ entries, onClose, onStartTracking }: CycleAnalyticsProps) {
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);
  const [lastPeriodDate, setLastPeriodDate] = useState("");
  const [regularity, setRegularity] = useState<RegularityType | null>(null);
  const [hasQuickSetup, setHasQuickSetup] = useState(false);

  // Real-time feel
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showShimmer, setShowShimmer] = useState(false);

  // Trigger shimmer and update timestamp when entries change
  useEffect(() => {
    if (entries.length > 0) {
      setLastUpdate(new Date());
      setShowShimmer(true);
      const timer = setTimeout(() => setShowShimmer(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [entries.length]);

  const regularityOptions = [
    { value: "very-regular", label: "Very Regular", sublabel: "±2 days variation", color: "from-green-400 to-emerald-500" },
    { value: "sometimes-irregular", label: "Sometimes Irregular", sublabel: "±5 days variation", color: "from-yellow-400 to-orange-500" },
    { value: "very-irregular", label: "Very Irregular", sublabel: "\u003e7 days variation", color: "from-orange-400 to-red-500" },
    { value: "not-sure", label: "Not Sure", sublabel: "Still learning", color: "from-gray-300 to-gray-400" },
  ];

  const handleQuickSetup = () => {
    setHasQuickSetup(true);
    setShowOnboarding(false);
    
    const quickSetupData = {
      last_period_start: lastPeriodDate,
      cycle_regularness: regularity,
      avg_cycle_guess: 28,
      source: "user_input_light"
    };
    
    // In a real app, this would be saved to a persistent store
    // localStorage.setItem("hercare_quick_setup", JSON.stringify(quickSetupData));
  };

  // Calculate analytics from entries
  const stats = entries.length > 0 ? (() => {
    const totalLogs = entries.length;

    // Data confidence based on log count (HONEST METRIC)
    const dataConfidence = totalLogs < 3 ? "Low" : totalLogs <= 5 ? "Medium" : "High";
    const statusText = totalLogs < 3 ? "Just started" : totalLogs <= 5 ? "Building insights" : "Stable";

    // Flow distribution
    const flowCounts = { light: 0, medium: 0, heavy: 0 };
    entries.forEach(e => {
      if (e.flow === "light") flowCounts.light++;
      else if (e.flow === "medium") flowCounts.medium++;
      else if (e.flow === "heavy") flowCounts.heavy++;
    });

    const flowDistribution = {
      light: Math.round((flowCounts.light / totalLogs) * 100),
      medium: Math.round((flowCounts.medium / totalLogs) * 100),
      heavy: Math.round((flowCounts.heavy / totalLogs) * 100),
    };

    // Mood patterns
    const moodCounts: Record<string, number> = {};
    entries.forEach(e => {
      if (e.mood) {
        moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
      }
    });
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];

    // Symptom analysis
    const symptomCounts: Record<string, number> = {};
    entries.forEach(e => {
      e.symptoms?.forEach(s => {
        symptomCounts[s] = (symptomCounts[s] || 0) + 1;
      });
    });
    const topSymptoms = Object.entries(symptomCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Cycle length estimation (simple)
    const dates = entries.map(e => new Date(e.date).getTime()).sort((a, b) => a - b);
    let avgCycleLength = 28;
    if (dates.length >= 2) {
      const gaps = [];
      for (let i = 1; i < dates.length; i++) {
        const gap = Math.round((dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24));
        if (gap > 2) gaps.push(gap); // Only count gaps > 2 days (new cycles)
      }
      if (gaps.length > 0) {
        avgCycleLength = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
      }
    }

    // Smart Insight Generation
    let insight = {
      title: "Building Your Profile",
      description: "Keep logging to unlock personalized health tips.",
      action: "Learn More",
      color: "bg-blue-50 border-blue-100 text-blue-700"
    };

    if (totalLogs > 2) {
      if (topSymptoms.length > 0) {
        const s = topSymptoms[0][0].toLowerCase();
        if (s.includes('cramp') || s.includes('pain') || s.includes('back')) {
          insight = {
            title: "Managing Discomfort",
            description: "Pain is your most frequent symptom. Heat therapy and magnesium-rich foods might help.",
            action: "Pain Relief Guide",
            color: "bg-orange-50 border-orange-100 text-orange-700"
          };
        } else if (s.includes('fatigue') || s.includes('tired')) {
          insight = {
            title: "Energy Management",
            description: "You often feel tired. Try prioritizing sleep and iron-rich foods during your flow.",
            action: "Boost Energy",
            color: "bg-purple-50 border-purple-100 text-purple-700"
          };
        } else if (s.includes('acne') || s.includes('skin')) {
          insight = {
            title: "Skin Care Focus",
            description: "Hormonal changes are affecting your skin. Hydration and gentle cleansing can help.",
            action: "Skin Tips",
            color: "bg-pink-50 border-pink-100 text-pink-700"
          };
        }
      } else if (topMood && ['sad', 'anxious', 'irritable'].includes(topMood[0].toLowerCase())) {
        insight = {
          title: "Emotional Wellness",
          description: "Your cycle seems to impact your mood. Mindfulness or journaling might provide relief.",
          action: "Self Care",
          color: "bg-teal-50 border-teal-100 text-teal-700"
        };
      } else {
        insight = {
          title: "Steady Rhythm",
          description: "Your cycle appears consistent. You're doing a great job tracking!",
          action: "View Trends",
          color: "bg-green-50 border-green-100 text-green-700"
        };
      }
    }

    return {
      totalLogs,
      dataConfidence,
      statusText,
      flowDistribution,
      topMood: topMood ? { name: topMood[0], count: topMood[1] } : null,
      topSymptoms,
      avgCycleLength,
      insight
    };
  })() : null;

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed inset-4 sm:inset-6 md:inset-8 lg:inset-12 bg-white rounded-2xl sm:rounded-3xl md:rounded-[3rem] z-50 shadow-2xl flex flex-col overflow-hidden max-h-[92vh]"
      >
        {/* Onboarding Modal (Preserved as is) */}
        <AnimatePresence>
          {showOnboarding && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10"
                onClick={() => setShowOnboarding(false)}
              />
              <motion.div
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-6 md:p-8 z-20 shadow-2xl max-h-[85vh] overflow-y-auto"
              >
                <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-6"></div>
                
                {onboardingStep === 1 ? (
                  <>
                    <h3 className="text-xl md:text-2xl font-black text-gray-800 mb-2">When was your last period?</h3>
                    <p className="text-sm text-gray-400 mb-6">This helps us understand your cycle better.</p>
                    
                    <div className="mb-6">
                      <input 
                        type="date"
                        value={lastPeriodDate}
                        onChange={(e) => setLastPeriodDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full p-4 border-2 border-gray-100 rounded-2xl text-gray-700 font-bold focus:border-pink-300 outline-none transition-all"
                      />
                    </div>

                    <button 
                      onClick={() => setOnboardingStep(2)}
                      disabled={!lastPeriodDate}
                      className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-4 rounded-2xl font-black uppercase tracking-wide shadow-lg shadow-pink-200 disabled:opacity-30 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                      Continue
                      <ChevronRight size={20} />
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl md:text-2xl font-black text-gray-800 mb-2">How regular are your periods?</h3>
                    <p className="text-sm text-gray-400 mb-6">No right or wrong answer—just your experience.</p>
                    
                    <div className="space-y-3 mb-6">
                      {regularityOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setRegularity(option.value as RegularityType)}
                          className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                            regularity === option.value
                              ? 'border-pink-300 bg-pink-50'
                              : 'border-gray-100 bg-white hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${option.color}`}></div>
                            <div className="flex-1">
                              <p className="font-bold text-gray-800">{option.label}</p>
                              <p className="text-xs text-gray-400">{option.sublabel}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={handleQuickSetup}
                      disabled={!regularity}
                      className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-4 rounded-2xl font-black uppercase tracking-wide shadow-lg shadow-pink-200 disabled:opacity-30 disabled:shadow-none transition-all"
                    >
                      Save & Analyze
                    </button>
                  </>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* MAIN CONTENT */}
        {!stats && !hasQuickSetup ? (
          // INITIAL EMPTY STATE
          <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
              <Sparkles className="text-pink-500" size={32} />
            </div>
            <h3 className="text-2xl font-black text-gray-800 mb-3">Let&apos;s Understand Your Cycle</h3>
            <p className="text-gray-500 text-sm mb-8 max-w-xs leading-relaxed">
              We need a little more info to provide personalized insights.
            </p>
            <button 
              onClick={() => setShowOnboarding(true)}
              className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-wide shadow-lg hover:bg-black transition-all flex items-center gap-2"
            >
              Get Started
              <ChevronRight size={20} />
            </button>
          </div>
        ) : !stats && hasQuickSetup ? (
          // SETUP COMPLETE STATE
          <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8 text-center overflow-y-auto">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 relative">
              <Activity className="text-green-600" size={32} />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-800 mb-3">Setup Complete!</h3>
            <p className="text-gray-600 text-sm mb-6 max-w-sm leading-relaxed">
              We&apos;ve created your baseline. Start logging periods to unlock detailed insights.
            </p>
             <div className="bg-gray-50 p-6 rounded-2xl mb-6 max-w-sm border border-gray-100">
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Early Estimate</p>
               <div className="flex items-baseline gap-2 mb-4">
                 <span className="text-4xl font-black text-gray-800">
                   {regularity === "very-regular" ? "28" : "28–30"}
                 </span>
                 <span className="text-sm font-bold text-gray-400">days</span>
               </div>
               <p className="text-xs text-gray-500 leading-relaxed">
                 {regularity === "very-regular" 
                   ? "Your cycles are typically consistent. Insights will improve as you log."
                   : regularity === "sometimes-irregular"
                   ? "Your cycle may vary slightly month to month. This is common."
                   : regularity === "very-irregular"
                   ? "We'll help you track patterns even with irregular cycles."
                   : "Keep logging to discover your unique patterns."}
               </p>
             </div>
            <button 
              onClick={() => {
                if (onStartTracking) {
                  onStartTracking();
                } else {
                  onClose();
                }
              }}
              className="px-6 py-3 bg-gray-900 rounded-2xl text-xs font-bold uppercase tracking-widest text-white hover:bg-black transition-all"
            >
              Start Tracking
            </button>
          </div>
        ) : (
          // HAS DATA - SHOW ANALYTICS (NEW CALM MEDIC UI)
          <>
            {/* Header */}
            <div className="px-4 sm:px-5 py-4 sm:py-5 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-10 shrink-0">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight">Cycle Insights</h2>
                <div className="flex items-center gap-2">
                   <p className="text-xs text-gray-400">
                    {stats?.totalLogs} Entries
                  </p>
                  {lastUpdate && (
                     <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium animate-pulse">
                       Updated just now
                     </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors shrink-0"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5 pb-24">
              
              {/* 1️⃣ PRIMARY INSIGHT CARD (Refined & Actionable) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-5 rounded-[2rem] border ${stats.insight.color.replace('text-', 'border-').split(' ')[1]} ${stats.insight.color.split(' ')[0]} relative overflow-hidden`}
              >
                 <div className="flex justify-between items-start relative z-10">
                   <div>
                     <h3 className={`text-sm font-black uppercase tracking-widest mb-2 ${stats.insight.color.split(' ').pop()}`}>
                       {stats.insight.title}
                     </h3>
                     <p className="text-gray-700 font-medium leading-relaxed text-sm mb-4">
                       {stats.insight.description}
                     </p>
                     
                     <button className="bg-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:scale-105 transition-transform flex items-center gap-2">
                        {stats.insight.action}
                        <ChevronRight size={14} />
                     </button>
                   </div>
                   <div className="bg-white/40 p-3 rounded-full backdrop-blur-sm">
                      <Sparkles size={20} className={stats.insight.color.split(' ').pop()} />
                   </div>
                 </div>
              </motion.div>

              {/* 2️⃣ KEY NUMBERS (Side-by-Side, Soft Cards) */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Avg Cycle */}
                <div className="bg-gray-50 p-4 sm:p-5 rounded-2xl border border-gray-100 flex flex-col justify-between h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">Avg Cycle</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-auto">
                    <span className="text-2xl sm:text-3xl font-bold text-gray-800">{stats?.avgCycleLength}</span>
                    <span className="text-xs sm:text-sm font-medium text-gray-500">days</span>
                  </div>
                </div>

                {/* Data Confidence (Replaces Regularity %) */}
                <div className="bg-gray-50 p-4 sm:p-5 rounded-2xl border border-gray-100 flex flex-col justify-between h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Info size={14} className="text-gray-400" />
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">Confidence</span>
                  </div>
                  <div className="mt-auto">
                    <div className={`text-base sm:text-lg font-bold ${
                      stats.dataConfidence === 'Low' ? 'text-orange-500' :
                      stats.dataConfidence === 'Medium' ? 'text-blue-500' : 'text-green-500'
                    }`}>
                      {stats.dataConfidence}
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">
                      {stats.statusText}
                    </div>
                  </div>
                </div>
              </div>

               {/* 3️⃣ ACTION PROMPT (Only if low data) */}
               {stats.totalLogs < 3 && (
                <div className="bg-blue-50 p-4 sm:p-5 rounded-2xl border border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                   <div>
                     <p className="text-sm font-bold text-gray-700 mb-1">Help improve basic accuracy</p>
                     <p className="text-xs text-gray-500">Log at least 3 cycles for better insights.</p>
                   </div>
                   <button 
                     onClick={() => {
                        if (onStartTracking) onStartTracking();
                        else onClose();
                     }}
                     className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-blue-700 transition whitespace-nowrap w-full sm:w-auto"
                   >
                     Log Period
                   </button>
                </div>
              )}

              {/* 4️⃣ FLOW & SYMPTOMS (Softened) */}
              
              {/* Flow Patterns */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Droplets size={16} className="text-blue-400" />
                  <h3 className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-wide">Flow Patterns</h3>
                </div>

                {stats.totalLogs >= 3 ? (
                  <div className="space-y-3 sm:space-y-4">
                   {/* Real bars show only when enough data exists */}
                    {[
                      { label: "Light", percent: stats.flowDistribution.light, color: "bg-blue-400", icon: "💧" },
                      { label: "Medium", percent: stats.flowDistribution.medium, color: "bg-pink-500", icon: "🩸" },
                      { label: "Heavy", percent: stats.flowDistribution.heavy, color: "bg-purple-600", icon: "🌊" },
                    ].map((flow) => (
                      <div key={flow.label}>
                        <div className="flex justify-between mb-1 text-xs font-medium text-gray-500">
                          <span className="flex items-center gap-2">
                            {flow.label}
                          </span>
                          <span>{flow.percent}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${flow.percent}%` }}
                            className={`h-full rounded-full ${flow.color}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                   /* Placeholder for low data */
                   <div className="py-2">
                     <div className="flex justify-between items-center mb-2">
                        <div className="h-2 bg-gray-100 rounded-full w-full max-w-[200px]"></div>
                     </div>
                     <p className="text-xs text-gray-400 italic">Flow patterns will appear after a few more logs.</p>
                   </div>
                )}
              </div>

              {/* Mood & Symptoms Combined Row */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                 {/* Mood */}
                 {stats.topMood && (
                   <div className="bg-white p-5 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-2 mb-3">
                        <Heart size={16} className="text-pink-400" />
                        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Recent Mood</h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        You’ve mostly felt <span className="font-bold text-gray-800 capitalize">{stats.topMood.name}</span> lately.
                      </p>
                   </div>
                 )}

                 {/* Symptoms */}
                 {stats.topSymptoms && stats.topSymptoms.length > 0 && (
                   <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle size={14} className="text-orange-400" />
                        <h3 className="text-[10px] sm:text-xs font-bold text-gray-800 uppercase tracking-wide">Common Symptoms</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {stats.topSymptoms.map(([symptom]) => (
                          <span key={symptom} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] sm:text-xs font-medium">
                            {symptom}
                          </span>
                        ))}
                      </div>
                   </div>
                 )}
               </div>

              {/* 5️⃣ PERSONAL INSIGHT (Only Gradient Element) */}
              <div className="mt-4">
                <motion.div
                  className={`relative p-6 rounded-3xl text-white overflow-hidden shadow-lg ${
                    showShimmer ? 'ring-2 ring-pink-300 ring-offset-2' : ''
                  }`}
                  style={{
                    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)"
                  }}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-20">
                    <Sparkles size={48} />
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="font-bold text-xs uppercase tracking-widest mb-3 opacity-90 flex items-center gap-2">
                       <Sparkles size={14} />
                       Daily Insight
                    </h3>
                    <p className="text-base font-medium leading-relaxed">
                      {stats.totalLogs < 3 
                        ? "Learning your patterns... Every entry helps us understand your unique cycle better."
                        : "Your tracking data is building a clear picture. You typically have stable phases, which is a great sign of health."}
                    </p>
                  </div>

                  {/* Shimmer Effect */}
                  {showShimmer && (
                    <motion.div
                      className="absolute inset-0 bg-white/20 -skew-x-12"
                      initial={{ x: "-100%" }}
                      animate={{ x: "200%" }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                    />
                  )}
                </motion.div>
              </div>

            </div>
          </>
        )}
      </motion.div>
    </>
  );
}
