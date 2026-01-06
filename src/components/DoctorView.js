"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function DoctorView({ isActive }) {
    const [isListening, setIsListening] = useState(false);
    const [sentences, setSentences] = useState([]);
    const [currentSentence, setCurrentSentence] = useState("");
    const recognitionRef = useRef(null);
    const lastResultTimeRef = useRef(Date.now());
    const pauseCheckIntervalRef = useRef(null);
    const currentSentenceRef = useRef(""); // Keep a ref for the interval callback
    const PAUSE_THRESHOLD = 3000; // 3 seconds

    // Keep ref in sync with state
    useEffect(() => {
        currentSentenceRef.current = currentSentence;
    }, [currentSentence]);

    // Helper to finalize a sentence with punctuation
    const finalizeSentence = useCallback(() => {
        const sentence = currentSentenceRef.current.trim();
        if (sentence) {
            let finalSentence = sentence;
            // Capitalize first letter
            finalSentence = finalSentence.charAt(0).toUpperCase() + finalSentence.slice(1);
            // Add period if no punctuation at end
            if (!/[.!?]$/.test(finalSentence)) {
                finalSentence += ".";
            }
            setSentences(prev => [...prev, finalSentence]);
            setCurrentSentence("");
            currentSentenceRef.current = "";
        }
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) return;

            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "en-US";

            recognition.onstart = () => {
                setIsListening(true);
                lastResultTimeRef.current = Date.now();

                // Start a timer to check for pauses
                pauseCheckIntervalRef.current = setInterval(() => {
                    const now = Date.now();
                    const timeSinceLastResult = now - lastResultTimeRef.current;

                    if (timeSinceLastResult > PAUSE_THRESHOLD && currentSentenceRef.current.trim()) {
                        finalizeSentence();
                        lastResultTimeRef.current = now; // Reset timer after finalizing
                    }
                }, 500); // Check every 500ms
            };

            recognition.onend = () => {
                setIsListening(false);
                // Clear the pause check interval
                if (pauseCheckIntervalRef.current) {
                    clearInterval(pauseCheckIntervalRef.current);
                    pauseCheckIntervalRef.current = null;
                }
                // Finalize any remaining sentence
                finalizeSentence();
            };

            recognition.onresult = (event) => {
                lastResultTimeRef.current = Date.now();

                let finalTranscript = "";

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const text = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += text;
                    }
                }

                if (finalTranscript) {
                    setCurrentSentence(prev => {
                        const newText = prev.trim() ? prev + " " + finalTranscript.trim() : finalTranscript.trim();
                        return newText;
                    });
                }
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (pauseCheckIntervalRef.current) {
                clearInterval(pauseCheckIntervalRef.current);
            }
        };
    }, [finalizeSentence]);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            lastResultTimeRef.current = Date.now();
            recognitionRef.current?.start();
        }
    };

    const clearTranscript = () => {
        setSentences([]);
        setCurrentSentence("");
        currentSentenceRef.current = "";
    };

    // Combined display: completed sentences + current sentence
    const displayText = [...sentences];
    if (currentSentence.trim()) {
        displayText.push(currentSentence);
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto"
        >
            <div className="w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 min-h-[400px] flex flex-col relative overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium uppercase tracking-wider">
                        <Activity size={16} />
                        Live Transcription
                    </div>
                    <button
                        onClick={clearTranscript}
                        className="text-xs text-red-400 hover:text-red-500 font-bold border border-red-200 px-2 py-1 rounded"
                    >
                        CLEAR
                    </button>
                </div>

                {isListening && (
                    <div className="flex gap-1 mb-4">
                        {[1, 2, 3].map(i => (
                            <motion.div
                                key={i}
                                animate={{ height: [4, 16, 4] }}
                                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                                className="w-1 bg-red-500 rounded-full"
                            />
                        ))}
                    </div>
                )}

                {/* Transcript Display */}
                <div className="flex-1 text-lg leading-relaxed text-slate-800 font-light overflow-y-auto">
                    {displayText.length > 0 ? (
                        displayText.map((sentence, idx) => {
                            const isCurrentUnfinished = idx === displayText.length - 1 && currentSentence.trim();
                            return (
                                <p
                                    key={idx}
                                    className={`mb-3 ${isCurrentUnfinished ? 'text-slate-500 italic' : 'text-slate-800'}`}
                                >
                                    {sentence}
                                </p>
                            );
                        })
                    ) : (
                        <span className="text-slate-300">Tap the microphone and start speaking...</span>
                    )}
                </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-4">
                <button
                    onClick={toggleListening}
                    className={`
                        group relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300
                        ${isListening ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-900 text-white hover:bg-slate-800'}
                    `}
                >
                    {isListening && (
                        <span className="absolute inset-0 rounded-full animate-pulse-ring border-2 border-red-500 opacity-50"></span>
                    )}
                    {isListening ? <MicOff size={32} /> : <Mic size={32} />}
                </button>
                <p className="text-slate-400 font-medium">
                    {isListening ? "Listening..." : "Tap to Speak"}
                </p>
            </div>
        </motion.div>
    );
}
