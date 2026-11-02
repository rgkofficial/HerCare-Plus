"use client";

import { Menu, X } from "lucide-react";
import Logo from "./Logo";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { icon: "🏠", label: "Home", href: "/" },
    { icon: "💖", label: "About HerCare⁺", href: "/about" },
    { icon: "👤", label: "My Profile", href: "/profile" },
    { icon: "🔐", label: "Privacy & Safety", href: "/privacy-safety" },
  ];

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-40 bg-white/95 px-6 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] backdrop-blur-md md:inset-y-0 md:right-auto md:w-64 md:border-r md:border-pink-50 md:px-5 md:py-7">
        <div className="flex justify-between items-center">
           {/* Premium Logo */}
           <Logo />

           <button 
             onClick={() => setIsOpen(!isOpen)} 
             className="text-gray-500 hover:text-purple-500 transition-colors rounded-lg p-2.5 hover:bg-gray-50"
           >
             <Menu size={22} />
           </button>
        </div>
        <div className="mt-8 hidden space-y-2 md:block">
          {menuItems.map((item) => <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-600 hover:bg-pink-50 hover:text-pink-700"><span>{item.icon}</span>{item.label}</Link>)}
          <Link href="/medical-records" className="flex items-center gap-3 rounded-xl bg-pink-50 px-3 py-3 text-sm font-semibold text-pink-700"><span>🩺</span>Medical history</Link>
        </div>
      </nav>

      {/* Premium Menu Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
            />
            
            {/* Menu Content */}
            <motion.div 
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-40 w-[85%] max-w-sm bg-white shadow-2xl"
            >
              {/* Menu Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Your Space</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Everything you need</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Menu Items */}
              <div className="px-4 py-6 space-y-1">
                {menuItems.map((item, idx) => (
                  <Link
                    key={idx}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 transition-all group"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {item.label}
                    </span>
                  </Link>
                ))}

                {/* Divider */}
                <div className="h-px bg-gray-100 my-4"></div>

                {/* Sign in (Optional) */}
                <Link
                  href="/signin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-100 hover:border-purple-200 transition-all group"
                >
                  <span className="text-xl">🔑</span>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-purple-700 block">
                      Sign in (Optional)
                    </span>
                    <span className="text-xs text-purple-600">
                      Save your data across devices
                    </span>
                  </div>
                </Link>
              </div>

              {/* Menu Footer */}
              <div className="absolute bottom-0 left-0 right-0 px-6 py-5 border-t border-gray-100 bg-gray-50">
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="font-medium">Anonymous Mode: ON</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🇮🇳</span>
                    <span>Made in India</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>❤️</span>
                    <span>Built with care</span>
                  </div>
                </div>
              </div>

              {/* Medical Disclaimer (subtle) */}
              <div className="absolute bottom-32 left-0 right-0 px-6">
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
                  <p className="text-xs text-yellow-800 leading-relaxed">
                    <span className="font-semibold">⚠️ Medical Tool:</span> HerCare⁺ is a support tool, not a doctor. In emergencies, call <strong>108</strong>.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
