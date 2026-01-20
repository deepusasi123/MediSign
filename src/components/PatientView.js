"use client";

import { useState, useRef } from "react";
import { Send, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SignDetector from "@/components/SignDetector";

// Constants
const DEBOUNCE_TIME = 1500;

export default function PatientView({ isActive }) {
    const [currentPrediction, setCurrentPrediction] = useState(null);
    const [detectedWords, setDetectedWords] = useState([]);
    const [generatedSentence, setGeneratedSentence] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [lastWordTime, setLastWordTime] = useState(0);

    const handlePrediction = (pred) => {
        setCurrentPrediction(pred);
        const now = Date.now();

        // Filter out "no_gesture" and other noise classes
        const ignoredClasses = ["No_gesture", "no_gesture", "neutral", "background", "Neutral", "Background"];
        if (ignoredClasses.includes(pred.className)) return;

        if (now - lastWordTime > DEBOUNCE_TIME) {
            setDetectedWords(prev => {
                if (!prev.includes(pred.className)) {
                    return [...prev, pred.className];
                }
                return prev;
            });
            setLastWordTime(now);
        }
    };

    const generateSentence = async () => {
        if (detectedWords.length === 0) return;
        setIsGenerating(true);
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words: detectedWords })
            });
            const data = await response.json();
            if (data.sentence) {
                setGeneratedSentence(data.sentence);
                setDetectedWords([]);
                speak(data.sentence);
            }
        } catch (e) {
            console.error("Generation failed:", e);
        } finally {
            setIsGenerating(false);
        }
    };

    const speak = async (text) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col lg:flex-row gap-8 h-full max-w-6xl mx-auto items-start"
        >
            {/* Scripts moved to layout */}

            {/* Left Column: Camera */}
            <section className="w-full lg:w-1/2 flex flex-col items-center">
                <div className="w-full max-w-md bg-neutral-900 rounded-3xl overflow-hidden aspect-square relative shadow-2xl shadow-teal-900/20 border-4 border-white/20 group">
                    <SignDetector onPrediction={handlePrediction} />
                </div>

                {/* Detected Sign Display (Moved Below) */}
                <div className="w-full max-w-md glass bg-white/50 rounded-2xl p-4 flex items-center justify-between shadow-lg border border-white/60">
                    <div>
                        <span className="text-slate-500 text-[10px] uppercase tracking-widest font-bold block mb-1">Detected Sign</span>
                        <span className="text-teal-600 text-3xl font-bold tracking-tight">
                            {currentPrediction ? currentPrediction.className : "..."}
                        </span>
                    </div>
                    {currentPrediction && (
                        <div className="h-12 w-12 flex items-center justify-center rounded-full bg-teal-500 text-white text-sm font-bold shadow-md shadow-teal-500/30">
                            {(currentPrediction.probability * 100).toFixed(0)}%
                        </div>
                    )}
                </div>
                <p className="mt-4 text-slate-400 text-sm text-center max-w-xs mx-auto">
                    Ensure you are in a well-lit environment and your hands are clearly visible.
                </p>
            </section>

            {/* Right Column: Output */}
            <section className="w-full lg:w-1/2 flex flex-col gap-6">
                <div className="glass bg-white/60 p-6 rounded-3xl shadow-xl border border-white/60 flex flex-col backdrop-blur-xl relative overflow-hidden">
                    {/* Decorative gradient blob */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <div className="w-2 h-8 bg-teal-500 rounded-full" />
                            Detected words
                        </h2>
                        <button
                            onClick={() => setDetectedWords([])}
                            className="text-xs font-semibold text-slate-500 hover:text-red-500 bg-slate-100 hover:bg-red-50 px-3 py-1 rounded-full transition-colors"
                        >
                            Reset
                        </button>
                    </div>

                    <div className="flex-1 flex flex-wrap content-start gap-2 mb-8 min-h-[120px] bg-white/50 rounded-2xl p-4 border border-slate-100 shadow-inner">
                        <AnimatePresence>
                            {detectedWords.map((word, idx) => (
                                <motion.span
                                    key={`${word}-${idx}`}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700 shadow-sm font-medium text-sm flex items-center animate-in fade-in zoom-in"
                                >
                                    {word}
                                </motion.span>
                            ))}
                        </AnimatePresence>
                        {detectedWords.length === 0 && (
                            <span className="text-slate-400 text-sm italic w-full text-center mt-8">Waiting for input...</span>
                        )}
                    </div>

                    <button
                        onClick={generateSentence}
                        disabled={detectedWords.length === 0 || isGenerating}
                        className={`btn-primary w-full py-4 text-lg rounded-xl font-bold shadow-lg shadow-teal-500/20 flex items-center justify-center gap-3 transition-all active:scale-95 text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 ${isGenerating ? 'opacity-80 cursor-wait' : 'hover:-translate-y-1'}`}
                    >
                        {isGenerating ? "Processing..." : (
                            <>
                                <Send size={20} /> Convert to Speech
                            </>
                        )}
                    </button>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-slate-900 text-white p-8 rounded-3xl shadow-2xl border border-slate-700/50 relative overflow-hidden group min-h-[200px] flex flex-col justify-center`}
                >
                    <div className="absolute top-0 right-0 p-40 bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="flex justify-between items-start mb-4 relative z-10 w-full">
                        <h3 className="text-teal-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                            Assistant Output
                        </h3>
                        {generatedSentence && (
                            <button onClick={() => speak(generatedSentence)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white" title="Replay">
                                <Volume2 size={18} />
                            </button>
                        )}
                    </div>
                    <p className="text-2xl font-light leading-relaxed relative z-10 text-slate-100">
                        {generatedSentence ? (
                            <span className="fadeIn">{generatedSentence}</span>
                        ) : (
                            <span className="text-slate-600">The generated sentence will appear here...</span>
                        )}
                    </p>
                </motion.div>
            </section>
        </motion.div>
    );
}
