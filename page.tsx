"use client";

import BottomNav from "@/components/BottomNav";
import CycleAnalytics from "@/components/CycleAnalytics";
import ReproductiveInsights from "@/components/ReproductiveInsights";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  TrendingUp, 
  Droplets, 
  Sparkles,
  Calendar as CalendarIcon,
  Info,
  Clock,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { storage } from "@/lib/storage";
import { CyclePredictionEngine, DailyInsightGenerator } from "@/lib/cycleEngine";
import type { CycleEntry, FlowType, MoodType } from "@/lib/cycleEngine";

const SYMPTOMS = [
  "Cramps", "Headache", "Bloating", "Mood swings", 
  "Fatigue", "Tender breasts", "Acne", "Back pain"
];

const PHASE_COLORS = {
  Follicular: "from-blue-400 to-cyan-500 shadow-blue-200",
  Ovulation: "from-purple-400 to-fuchsia-500 shadow-purple-200",
  Luteal: "from-amber-400 to-orange-500 shadow-orange-200",
  Menstrual: "from-rose-500 to-pink-600 shadow-rose-200",
  Unknown: "from-gray-400 to-gray-500"
};

export default function CyclePage() {
  const [entries, setEntries] = useState<CycleEntry[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Logging State
  const [selectedFlow, setSelectedFlow] = useState<FlowType | "">("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [nickname, setNickname] = useState("friend");
  const [age, setAge] = useState<number | null>(null);
  
  // Load data from IndexedDB and LocalStorage
  useEffect(() => {
    storage.getCycleEntries().then((data) => setEntries(data || []));
    const savedName = localStorage.getItem("hercare_nickname");
    const savedAge = localStorage.getItem("hercare_age");
    if (savedName) setNickname(savedName);
    if (savedAge) setAge(parseInt(savedAge));
  }, []);

  const handleSaveLog = async () => {
    if (!selectedFlow) return;
    
    // Convert mood to lower case for consistency with MoodType
    const validMood = selectedMood ? selectedMood.toLowerCase() as MoodType : undefined;
    
    // Create new entry
    const newEntry: CycleEntry = {
      id: Date.now().toString(),
      date: selectedDate,
      flow: selectedFlow,
      symptoms: selectedSymptoms,
      mood: validMood,
      notes: notes
    };

    await storage.addCycleEntry(newEntry);
    const updated = await storage.getCycleEntries();
    setEntries(updated || []);
    setShowLogModal(false);
    
    // Reset form
    setSelectedFlow("");
    setSelectedSymptoms([]);
    setSelectedMood("");
    setNotes("");
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom) 
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  // Intelligent Predictions using the Cycle Engine
  const stats = useMemo(() => {
    if (entries.length === 0) {
      return { 
        daysUntilPeriod: null, 
        currentPhase: "Unknown", 
        nextDate: null,
        confidenceScore: 0,
        dailyInsight: "Start logging your cycle to unlock personalized insights! 📊",
        avgCycleLength: 28
      };
    }
    
    // Initialize prediction engine - generic type satisfies the requirement if matching structure
    const engine = new CyclePredictionEngine(entries);
    const metrics = engine.calculateMetrics();
    
    // Generate daily insight
    const recentSymptoms = entries.slice(-3).flatMap(e => e.symptoms || []);
    const insightGenerator = new DailyInsightGenerator(
      metrics.currentPhase,
      recentSymptoms,
      age || undefined
    );
    const dailyInsight = insightGenerator.generate();
    
    return { 
      daysUntilPeriod: metrics.daysUntilNextPeriod, 
      currentPhase: metrics.currentPhase,
      nextDate: new Date(metrics.predictedNextPeriod).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      confidenceScore: metrics.confidenceScore,
      dailyInsight,
      avgCycleLength: metrics.averageCycleLength,
    };
  }, [entries, age]);

  const { daysUntilPeriod, currentPhase, nextDate, confidenceScore, dailyInsight } = stats;

  // Calendar logic
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const navigateMonth = (direction: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1));
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFE] pt-16 pb-24 font-nunito">
      {/* Header - Premium Glassmorphism */}
      <div className="px-6 py-8 relative overflow-hidden bg-gradient-to-br from-[#FFF5F7] to-[#F3F0FF] border-b border-white/50 shadow-sm">
        <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-pink-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-40 h-40 bg-purple-200/20 rounded-full blur-3xl"></div>
        
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative z-10"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-400 mb-2 block">Personal Wellness</span>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">
             {nickname !== "friend" ? `${nickname}'s Cycle` : "Your Cycle"}
          </h1>
          <div className="flex items-center gap-2 mt-3 bg-white/40 backdrop-blur-sm w-fit px-3 py-1.5 rounded-full border border-white/60">
            <Clock size={12} className="text-purple-500" />
            <p className="text-[10px] font-bold text-gray-500">
              {entries.length > 0 ? `Tracking for ${entries.length} days` : "Just started tracking"}
            </p>
          </div>
        </motion.div>
      </div>

      <main className="flex-1 p-6 space-y-8">
        {/* Simplified Status Hero - Flashy Sisterly Premium */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-white via-[#FFF0F5] to-[#F3E8FF] rounded-[2.5rem] p-8 shadow-2xl shadow-purple-900/10 border border-white/80 relative overflow-hidden"
        >
           {/* Soft Glow overlay */}
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-pink-400/10 to-purple-400/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

           <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl ${PHASE_COLORS[currentPhase as keyof typeof PHASE_COLORS]} opacity-10 rounded-bl-full`}></div>
           
           <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-pink-200/50 bg-gradient-to-r ${PHASE_COLORS[currentPhase as keyof typeof PHASE_COLORS]}`}>
                  {currentPhase} Phase
                </span>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Next Cycle</p>
                <div className="bg-white/60 backdrop-blur-md px-3 py-1 rounded-xl border border-white inline-block">
                   <p className="text-sm font-bold text-gray-600">{nextDate || "Need data"}</p>
                </div>
              </div>
           </div>

           <div className="flex items-center gap-8 relative z-10">
              <div className="relative group">
                <div className="absolute inset-0 bg-pink-400 blur-xl opacity-20 group-hover:opacity-30 transition-opacity rounded-full"></div>
                <div className={`relative w-28 h-28 rounded-full border-[6px] border-white flex items-center justify-center bg-gradient-to-br from-[#FF8FAB] via-[#FB7185] to-[#E11D48] shadow-2xl shadow-rose-300/50`}>
                  {/* Inner shine */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/0 via-white/20 to-white/40 opacity-50"></div>
                  
                  <span className="text-4xl font-black text-white drop-shadow-md relative z-10">
                    {daysUntilPeriod !== null ? daysUntilPeriod : "--"}
                  </span>
                </div>
                {/* Micro animation ring */}
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }} 
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="absolute inset-[-8px] rounded-full border-2 border-pink-200 opacity-50"
                ></motion.div>
              </div>
              <div>
                 <h2 className="text-xl font-black bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">Days to go</h2>
                 <p className="text-sm font-medium text-gray-500 leading-tight">until your next cycle begins</p>
                 {confidenceScore > 0 && (
                   <div className="flex items-center gap-1 mt-2">
                     <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                       <div className="h-full bg-gradient-to-r from-green-400 to-emerald-400" style={{ width: `${confidenceScore}%` }}></div>
                     </div>
                     <span className="text-[10px] text-gray-400 font-bold">{confidenceScore}% confident</span>
                   </div>
                 )}
              </div>
           </div>
        </motion.div>

        {/* Action Buttons - Easy for users */}
        <div className="grid grid-cols-2 gap-4">
           <button 
            onClick={() => setShowLogModal(true)}
            className="group bg-gradient-to-br from-pink-50 to-rose-50 p-6 rounded-[2rem] border border-pink-100 shadow-lg shadow-pink-200/50 hover:shadow-xl hover:shadow-pink-300/50 flex flex-col items-center gap-3 transition-all hover:scale-105 active:scale-95"
           >
              <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-pink-300/50 group-hover:shadow-xl transition-all">
                <Plus size={26} strokeWidth={2.5} />
              </div>
              <span className="text-xs font-black bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent uppercase tracking-widest">Log Period</span>
           </button>
           <button 
            onClick={() => setShowAnalytics(true)}
            className="group bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-[2rem] border border-purple-100 shadow-lg shadow-purple-200/50 hover:shadow-xl hover:shadow-purple-300/50 flex flex-col items-center gap-3 transition-all hover:scale-105 active:scale-95"
           >
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-300/50 group-hover:shadow-xl transition-all">
                <TrendingUp size={26} strokeWidth={2.5} />
              </div>
              <span className="text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent uppercase tracking-widest">Analytics</span>
           </button>
        </div>

        {/* Insight Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-[2.5rem] p-6 border border-pink-100 shadow-lg shadow-pink-100/50 relative overflow-hidden"
        >
          <div className="absolute right-[-5%] top-[-10%] opacity-5">
            <Sparkles size={100} className="text-pink-300" />
          </div>
          
          <div className="flex gap-4 items-start">
             <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center shrink-0">
               <Info size={20} className="text-pink-500" />
             </div>
             <div>
                <h3 className="font-bold text-xs uppercase tracking-wider mb-2 text-pink-500">
                  {age && age < 18 ? "Teen Health Tip" : age && age > 45 ? "Perimenopause Insight" : "Daily Insight"}
                </h3>
                <p className="text-sm font-medium leading-relaxed text-gray-700">
                  {dailyInsight}
                </p>
             </div>
          </div>
        </motion.div>

        {/* Calendar */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-purple-900/5 border border-gray-50">
          <div className="flex justify-between items-center mb-6 px-2">
            <h3 className="text-lg font-black text-gray-800">{monthName}</h3>
            <div className="flex gap-2">
              <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                <ChevronLeft size={20} className="text-gray-400" />
              </button>
              <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                <ChevronRight size={20} className="text-gray-400" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest mb-4">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
          </div>
          
          <div className="grid grid-cols-7 gap-y-2 text-center">
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`empty-${i}`} className="h-10"></div>
            ))}
            
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const entry = entries.find(e => e.date === dateStr);
              const isToday = dateStr === new Date().toISOString().split('T')[0];

              return (
                <div key={day} className="flex flex-col items-center justify-center h-12 relative group cursor-pointer">
                  <div 
                    className={`
                      w-10 h-10 flex items-center justify-center rounded-2xl text-sm font-bold transition-all duration-300
                      ${entry ? 'bg-gradient-to-br from-pink-500 via-pink-500 to-rose-500 text-white shadow-xl shadow-pink-300/60 scale-110 hover:scale-115' : ''}
                      ${isToday && !entry ? 'bg-gradient-to-br from-purple-100 to-pink-100 text-purple-700 ring-2 ring-purple-300 ring-offset-2' : ''}
                      ${!entry && !isToday ? 'text-gray-600 hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 hover:scale-110' : ''}
                    `}
                  >
                    {day}
                  </div>
                  {entry && entry.flow && (
                    <div className="absolute bottom-0.5 w-1.5 h-1.5 bg-white rounded-full shadow-sm"></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-8 p-4 bg-gray-50/50 rounded-2xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-pink-500"></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Period</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-200"></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Today</span>
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="space-y-4">
          <h3 className="text-lg font-black text-gray-800 px-2 tracking-tight">Quick Self-Care</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-[2rem] border border-gray-50 shadow-sm">
              <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mb-3">
                <Droplets size={20} />
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Hydration</p>
              <p className="text-[11px] font-bold text-gray-600 leading-tight">Drink extra water to reduce bloating.</p>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-gray-50 shadow-sm">
              <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 mb-3">
                <Sparkles size={20} />
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Deep Rest</p>
              <p className="text-[11px] font-bold text-gray-600 leading-tight">Aim for 8h sleep during luteal phase.</p>
            </div>
          </div>
        </div>

        {/* Recent Symptoms */}
        {entries.some(e => e.symptoms?.length > 0) && (
          <div className="space-y-4">
             <div className="flex items-center justify-between px-2">
               <h3 className="text-lg font-black text-gray-800 tracking-tight text-center">Recent Insights</h3>
             </div>
             <div className="space-y-3">
                {entries.filter(e => e.symptoms?.length > 0).slice(-2).reverse().map((entry, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-[2rem] border border-gray-50 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-400">
                      <CalendarIcon size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      <div className="flex flex-wrap gap-2">
                        {entry.symptoms.map((s, i) => (
                          <span key={i} className="text-[10px] bg-gray-50 text-gray-600 px-3 py-1 rounded-full font-bold">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}
        <ReproductiveInsights entries={entries} />
      </main>

      {/* Analytics Modal */}
      <AnimatePresence>
        {showAnalytics && (
          <CycleAnalytics 
            entries={entries} 
            onClose={() => setShowAnalytics(false)}
            onStartTracking={() => {
              setShowAnalytics(false);
              setShowLogModal(true);
            }} 
          />
        )}
      </AnimatePresence>

      {/* Log Modal - Premium Feel */}
      <AnimatePresence>
        {showLogModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-[60]"
              onClick={() => setShowLogModal(false)}
            />
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-8 z-[60] max-w-md mx-auto shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-6"></div>
              
              <h3 className="text-3xl font-black text-gray-800 mb-2">How&apos;s your flow?</h3>
              <p className="text-sm font-medium text-gray-400 mb-6 flex items-center gap-2">
                <CalendarIcon size={14} />
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <label htmlFor="cycle-entry-date" className="block text-xs font-black text-gray-400 uppercase tracking-[0.15em] mb-2">Entry date</label>
              <input id="cycle-entry-date" type="date" value={selectedDate} max={new Date().toISOString().split('T')[0]} onChange={(e) => setSelectedDate(e.target.value)} className="mb-6 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-300" />
              
              <div className="space-y-6">
                {/* Flow Level */}
                <div>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { id: 'light', label: 'Spotting', gradient: 'from-pink-100 to-pink-200', text: 'text-pink-600', border: 'border-pink-200' },
                      { id: 'medium', label: 'Medium', gradient: 'from-pink-400 to-rose-400', text: 'text-white', border: 'border-pink-400' },
                      { id: 'heavy', label: 'Heavy', gradient: 'from-rose-600 to-red-600', text: 'text-white', border: 'border-rose-600' }
                    ] as const).map((level) => (
                      <button
                        key={level.id}
                        onClick={() => setSelectedFlow(level.id as FlowType)}
                        className={`
                          py-5 rounded-[1.5rem] border-2 transition-all duration-200 flex flex-col items-center gap-2 relative overflow-hidden group
                          ${selectedFlow === level.id 
                            ? `bg-gradient-to-b ${level.gradient} ${level.id === 'light' ? 'text-pink-700' : 'text-white'} shadow-lg scale-105 border-transparent` 
                            : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                          }
                        `}
                      >
                        {/* Interactive Wave Background (Hidden unless selected or hover) */}
                        {selectedFlow === level.id && (
                           <div className="absolute inset-0 bg-white/10 opacity-30 animate-pulse"></div>
                        )}
                        
                        <Droplets 
                          size={24} 
                          className={`z-10 transition-colors ${selectedFlow === level.id ? 'fill-current' : 'fill-none'}`} 
                          strokeWidth={2.5}
                        />
                        <span className="text-[11px] font-black uppercase tracking-widest z-10">{level.label}</span>
                      </button>
                    ))}
                  </div>

                </div>

                {/* Mood Picker */}
                <div>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.15em] mb-4">How are you feeling?</h4>
                  <div className="flex justify-between bg-gradient-to-br from-gray-50 to-gray-100/50 p-5 rounded-3xl border border-gray-100">
                    {[
                      { emoji: "⚡", label: "Energetic" },
                      { emoji: "😊", label: "Happy" },
                      { emoji: "😐", label: "Neutral" },
                      { emoji: "😢", label: "Sad" },
                      { emoji: "😡", label: "Irritable" },
                    ].map((m) => (
                      <button
                        key={m.label}
                        onClick={() => setSelectedMood(m.label)}
                        className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${
                          selectedMood === m.label 
                            ? 'scale-125 drop-shadow-lg' 
                            : 'opacity-50 hover:opacity-100 hover:scale-110'
                        }`}
                      >
                        <span className="text-3xl">{m.emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Symptoms */}
                <div>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.15em] mb-4">Any symptoms?</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {SYMPTOMS.map((symptom) => (
                      <button
                        key={symptom}
                        onClick={() => toggleSymptom(symptom)}
                        className={`
                          px-4 py-2.5 rounded-full text-xs font-bold transition-all duration-300 border-2
                          ${selectedSymptoms.includes(symptom)
                            ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-purple-400 shadow-lg shadow-purple-300/50 scale-105'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-purple-200 hover:bg-purple-50/50 hover:text-purple-600'
                          }
                        `}
                      >
                        {symptom}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                   <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.15em] mb-4">Private notes (optional)</h4>
                   <textarea
                     value={notes}
                     onChange={(e) => setNotes(e.target.value)}
                     placeholder="How are you feeling today? Any thoughts to remember..."
                     className="w-full bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200 rounded-3xl p-5 text-sm font-medium text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent resize-none h-24 transition-all"
                   />
                </div>

                {/* Confirm Button */}
                <button 
                  onClick={handleSaveLog}
                  disabled={!selectedFlow && !selectedMood && selectedSymptoms.length === 0}
                  className="group relative w-full bg-gradient-to-r from-pink-500 via-pink-600 to-rose-500 text-white py-6 rounded-3xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-pink-300/60 disabled:opacity-30 disabled:shadow-none transition-all hover:shadow-3xl hover:shadow-pink-400/70 active:scale-98 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Check size={20} strokeWidth={3} />
                    Save Entry
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
