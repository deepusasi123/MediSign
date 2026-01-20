"use client";

import { useState, useEffect } from "react";
import { HandMetal, Stethoscope, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PatientView from "@/components/PatientView";
import DoctorView from "@/components/DoctorView";

export default function Home() {
  const [activeTab, setActiveTab] = useState("patient");

  // Warm up the model on mount
  useEffect(() => {
    fetch('/api/generate', {
      method: 'POST',
      body: JSON.stringify({ words: ["warmup"] })
    }).catch(() => { }); // Ignore response, just triggering cold start
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-teal-500/10 to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <header className="sticky top-0 z-50 glass border-b border-white/20 px-3 sm:px-6 py-2 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-gradient-to-tr from-teal-500 to-blue-600 text-white p-1.5 sm:p-2 rounded-lg shadow-lg">
            <Sparkles size={16} className="sm:w-5 sm:h-5" />
          </div>
          <h1 className="text-base sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-blue-600">
            MediSign
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-200/50 p-0.5 sm:p-1 rounded-lg sm:rounded-xl flex gap-0.5 sm:gap-1 relative">
          <button
            onClick={() => setActiveTab("patient")}
            className={`relative z-10 px-3 sm:px-6 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2 ${activeTab === 'patient' ? 'text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <HandMetal size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden xs:inline sm:inline">Patient</span>
          </button>
          <button
            onClick={() => setActiveTab("doctor")}
            className={`relative z-10 px-3 sm:px-6 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2 ${activeTab === 'doctor' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Stethoscope size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden xs:inline sm:inline">Doctor</span>
          </button>

          {/* Sliding Indicator */}
          <motion.div
            layoutId="activeTab"
            className="absolute inset-y-0.5 sm:inset-y-1 bg-white rounded-md sm:rounded-lg shadow-sm"
            initial={false}
            animate={{
              x: activeTab === 'patient' ? 2 : '100%',
              width: 'calc(50% - 2px)',
              left: 0
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 container mx-auto p-4 md:p-8 max-w-7xl">
        <AnimatePresence mode="wait">
          {activeTab === 'patient' ? (
            <PatientView key="patient" isActive={true} />
          ) : (
            <DoctorView key="doctor" isActive={true} />
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-slate-400 text-xs">
        <p>© 2026 MediSign</p>
      </footer>
    </main>
  );
}
