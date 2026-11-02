"use client";

import { Home, Stethoscope, Calendar, MapPin } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Checker", href: "/checker", icon: Stethoscope },
    { name: "Tracker", href: "/cycle", icon: Calendar },
    { name: "Help", href: "/care", icon: MapPin },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 mx-auto max-w-[480px] px-6 pointer-events-none md:hidden">
      <div className="bg-white/80 backdrop-blur-xl backdrop-saturate-150 rounded-[32px] shadow-2xl shadow-purple-900/10 flex justify-between items-center px-6 h-20 border border-white/60 pointer-events-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.name} href={item.href}>
              <motion.div 
                whileTap={{ scale: 0.9 }}
                className="relative flex flex-col items-center justify-center w-12 h-12"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-gradient-to-tr from-pink-100 via-pink-50 to-purple-50 rounded-2xl shadow-inner shadow-white/50"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  >
                    <div className="absolute inset-0 bg-pink-400/10 blur-md rounded-2xl"></div>
                  </motion.div>
                )}
                <Icon 
                  size={24} 
                  className={`relative z-10 transition-colors duration-300 ${isActive ? 'text-pink-600 drop-shadow-sm' : 'text-gray-400 group-hover:text-gray-600'}`}
                  strokeWidth={isActive ? 2.5 : 2}
                  fill={isActive ? "currentColor" : "none"}
                  fillOpacity={isActive ? 0.15 : 0}
                />
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
