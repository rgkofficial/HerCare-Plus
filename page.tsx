"use client";

import BottomNav from "@/components/BottomNav";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { Mic, Send, X, Heart, Loader2, Stethoscope } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

type Language = "en" | "hi" | "ta" | "te" | "bn" | "mr";

const LANGUAGES: Record<
  Language,
  { name: string; label: string; greeting: string }
> = {
  en: {
    name: "English",
    label: "English",
    greeting: "How are you feeling today?",
  },
  hi: {
    name: "Hindi",
    label: "हिंदी",
    greeting: "आज आप कैसा महसूस कर रही हैं?",
  },
  ta: { name: "Tamil", label: "தமிழ்", greeting: "என்ன பிரச்சனை?" },
  te: { name: "Telugu", label: "తెలుగు", greeting: "ఏమి సమస్య?" },
  bn: { name: "Bengali", label: "বাংলা", greeting: "কী समस्या?" },
  mr: { name: "Marathi", label: "मराठी", greeting: "काय त्रास आहे?" },
};

const WARM_INITIAL_MESSAGES = [
  "You're safe here. Share only what you're comfortable with.",
  "I'm here with you. No judgment. No rush.",
  "This is your space. Take all the time you need.",
];

const SYMPTOM_SUGGESTIONS_YOUNG = [
  "💭 First period questions",
  "💭 Period pain",
  "💭 Changing body",
];

const SYMPTOM_SUGGESTIONS_ADULT = [
  "💭 Irregular periods",
  "💭 Pain or cramps",
  "💭 Pregnancy questions",
];

const SYMPTOM_SUGGESTIONS_MATURE = [
  "💭 Menopause symptoms",
  "💭 Heavy bleeding",
  "💭 Bone health",
];

type AnalysisResult = {
  conversation: string;
  show_doctor_choice: boolean;
  reasoning?: any;
};

type Message = {
  id: string;
  sender: "user" | "ai";
  text?: string;
  analysis?: AnalysisResult;
};

export default function SymptomChecker() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedLang, setSelectedLang] = useState<Language>("en");
  const [loading, setLoading] = useState(false);
  const [nickname, setNickname] = useState("friend");
  const [age, setAge] = useState<string>("25");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isFindingDoctor, setIsFindingDoctor] = useState(false);

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    setTranscript,
  } = useVoiceInput();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedName = localStorage.getItem("hercare_nickname");
    const savedAge = localStorage.getItem("hercare_age");
    if (savedName) setNickname(savedName);
    if (savedAge) setAge(savedAge);

    // Initial message personalization
    const ageNum = savedAge ? parseInt(savedAge) : 25;
    let welcomeText =
      WARM_INITIAL_MESSAGES[
        Math.floor(Math.random() * WARM_INITIAL_MESSAGES.length)
      ];

    if (ageNum < 18) {
      welcomeText = `Hey ${savedName || "friend"} 🌸, you're safe here. I can help you understand what's happening with your body. What's on your mind?`;
    } else if (ageNum > 45) {
      welcomeText = `Hello ${savedName || "there"} 🌸. Health at every stage is important. How can I support your wellbeing today?`;
    } else {
      welcomeText = `Hi ${savedName || "friend"} 💜. This is your private space. Tell me what's been on your mind lately?`;
    }

    setMessages([
      {
        id: "1",
        sender: "ai",
        text: welcomeText,
      },
    ]);
  }, []);

  const getSuggestions = () => {
    const ageNum = parseInt(age);
    if (ageNum < 18) return SYMPTOM_SUGGESTIONS_YOUNG;
    if (ageNum > 45) return SYMPTOM_SUGGESTIONS_MATURE;
    return SYMPTOM_SUGGESTIONS_ADULT;
  };

  useEffect(() => {
    if (transcript) {
      setInputText((prev) => (prev ? prev + " " + transcript : transcript));
      setTranscript("");
    }
  }, [transcript, setTranscript]);

  // Manual scroll helper
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 100);
  };

  const isInitialLoad = useRef(true);

  // Only scroll automatically for the very first welcome message
  useEffect(() => {
    if (isInitialLoad.current && messages.length > 0) {
      scrollToBottom();
      isInitialLoad.current = false;
    }
  }, [messages.length]);

  const handleSend = async (text?: string) => {
    const messageToSend = typeof text === "string" ? text : inputText;
    if (!messageToSend.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: messageToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);
    setShowSuggestions(false);

    // Scroll to bottom when user sends
    scrollToBottom();

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: age,
          symptoms: userMsg.text,
          language: LANGUAGES[selectedLang].name,
          nickname,
        }),
      });

      if (!response.ok) throw new Error("AI Failed");

      const data: AnalysisResult = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          analysis: data,
        },
      ]);

      // Scroll to bottom when AI responds
      scrollToBottom();
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "I am having trouble connecting right now. But you are not alone - please try again in a moment, or reach out to a trusted doctor.",
        },
      ]);
      // Scroll to bottom on error message too
      scrollToBottom();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#FFF5F7] relative overflow-hidden font-nunito">
      {/* Optimized Background - Lightweight CSS Gradients */}
      <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-pink-100/40 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-[300px] bg-gradient-to-t from-purple-100/40 to-transparent pointer-events-none" />

      {/* Header - Optimized Glassmorphism */}
      <div className="pt-12 pb-4 px-6 bg-white/90 backdrop-blur-md border-b border-gray-100 flex justify-between items-center z-10 sticky top-0 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            HerCare
            <span className="text-pink-500 text-3xl leading-none">⁺</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
             Women&apos;s Health Support
            </p>
          </div>
        </div>

        {/* Enhanced Language Selector */}
        <div className="relative group">
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value as Language)}
            className="bg-white/80 backdrop-blur-md border border-gray-200 text-gray-700 text-xs font-bold rounded-2xl pl-4 pr-8 py-2.5 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all appearance-none cursor-pointer hover:bg-white shadow-sm hover:shadow-md"
          >
            {Object.entries(LANGUAGES).map(([code, lang]) => (
              <option key={code} value={code} className="text-base py-1">
                {lang.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-pink-500 transition-colors">
            <svg
              width="10"
              height="6"
              viewBox="0 0 10 6"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 1L5 5L9 1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 pb-8 space-y-6">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.text ? (
                <div
                  className={`max-w-[85%] p-5 rounded-3xl text-sm font-medium leading-relaxed shadow-sm ${
                    msg.sender === "user"
                      ? "bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-br-none shadow-pink-200"
                      : "bg-white text-gray-600 border border-gray-100 rounded-bl-none shadow-gray-100"
                  }`}
                >
                  {msg.text}
                </div>
              ) : msg.analysis ? (
                <div className="max-w-[95%] w-full bg-white rounded-[2rem] rounded-bl-none border border-white shadow-xl shadow-purple-900/5 overflow-hidden">
                  <div className="p-6">
                    <p className="text-gray-600 text-sm leading-7 font-medium">
                      <Heart
                        size={16}
                        className="inline mr-2 text-pink-500 mb-0.5"
                        fill="currentColor"
                      />
                      {msg.analysis.conversation}
                    </p>

                    {msg.analysis.show_doctor_choice && (
                      <div className="mt-6 pt-4 border-t border-gray-50 animate-fade-in">
                        <p className="text-[10px] font-black uppercase tracking-widest text-center text-gray-400 mb-4">
                          Recommended Next Step
                        </p>
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={() => setIsFindingDoctor(true)}
                            className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wide shadow-lg shadow-pink-200 hover:shadow-xl hover:scale-105 transition-all"
                          >
                            Find a Doctor
                          </button>
                          <button className="bg-gray-50 text-gray-500 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wide hover:bg-gray-100 transition-all">
                            Maybe Later
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 p-4 rounded-3xl rounded-bl-none flex items-center gap-3 shadow-sm">
              <Loader2 className="animate-spin text-pink-400" size={20} />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                HerCare is thinking...
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-56 shrink-0" />
      </div>

      <AnimatePresence>
        {showSuggestions && messages.length === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 pb-2 flex flex-wrap gap-2 justify-center"
          >
            {getSuggestions().map((suggestion, i) => (
              <button
                key={i}
                onClick={() => handleSend(suggestion.replace("💭 ", ""))}
                className="bg-white border border-gray-50 text-gray-600 px-5 py-3 rounded-2xl text-xs font-bold shadow-sm hover:shadow-md hover:scale-105 transition-all flex items-center gap-2"
              >
                <Stethoscope size={16} className="text-pink-500" />
                {suggestion.replace("💭 ", "")}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFindingDoctor && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFindingDoctor(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6 shadow-2xl max-w-md mx-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">
                  Find a doctor perfect for you
                </h3>
                <button
                  onClick={() => setIsFindingDoctor(false)}
                  className="p-2 bg-gray-50 rounded-full"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">Are you looking for:</p>

              <div className="space-y-3">
                <Link href="/care?filter=women" className="block">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-pink-50 border border-pink-100 hover:bg-pink-100 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-pink-200 flex items-center justify-center text-xl">
                      👩‍⚕️
                    </div>
                    <div>
                      <h4 className="font-bold text-pink-900">
                        Women&apos;s Health Specialist
                      </h4>
                      <p className="text-xs text-pink-700">
                        Gynecologists & OB-GYNs
                      </p>
                    </div>
                  </div>
                </Link>

                <Link href="/care?filter=general" className="block">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-purple-50 border border-purple-100 hover:bg-purple-100 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-xl">
                      🩺
                    </div>
                    <div>
                      <h4 className="font-bold text-purple-900">
                        General Doctor
                      </h4>
                      <p className="text-xs text-purple-700">
                        For fever, flu, general checkups
                      </p>
                    </div>
                  </div>
                </Link>

                <Link href="/care?filter=free" className="block">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-green-50 border border-green-100 hover:bg-green-100 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-xl">
                      🏥
                    </div>
                    <div>
                      <h4 className="font-bold text-green-900">
                        Free / Low-Cost Clinic
                      </h4>
                      <p className="text-xs text-green-700">
                        NGOs and government hospitals
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Input Pill - Fixed above Nav */}
      <div className="fixed bottom-[5.5rem] left-0 right-0 px-4 z-30 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-xl p-1.5 pl-2 rounded-[2.5rem] shadow-2xl shadow-purple-900/10 border border-white/60 flex items-center transition-all focus-within:shadow-pink-300/40 focus-within:scale-[1.01] focus-within:bg-white">
            <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center text-xl shrink-0 animate-bounce-slow">
              🌸
            </div>
            <input
              type="text"
              className="flex-1 bg-transparent border-none outline-none px-3 py-3 text-gray-700 placeholder-gray-400 font-bold text-sm"
              placeholder={
                isListening ? "Listening..." : "Tell me how you feel..."
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />

            <button
              onClick={isListening ? stopListening : startListening}
              className={`p-3 rounded-2xl transition-all ${
                isListening
                  ? "bg-red-50 text-red-500 animate-pulse"
                  : "bg-gray-50 text-gray-400 hover:bg-gray-100"
              }`}
            >
              {isListening ? <X size={20} /> : <Mic size={20} />}
            </button>

            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim()}
              className="p-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl shadow-lg shadow-pink-200 hover:shadow-xl hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100 transition-all"
            >
              <Send size={20} />
            </button>
          </div>
          <div className="flex justify-center mt-3 px-2 text-center">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              Health support • AI-generated guidance
            </span>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
