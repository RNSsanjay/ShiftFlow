"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  Bot,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Zap,
  CheckCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  actionExecuted?: boolean;
}

export default function AIChatWidget() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hi! I am your AttendMind Co-Pilot. You can ask me conversational metrics questions or tell me to perform actions (e.g. 'Mark Ramesh Kumar present' or 'Show weekly insights').",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    const userMsgId = `user-${Date.now()}`;
    const newMsg: Message = {
      id: userMsgId,
      sender: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: "ai",
            text: data.reply || "I've processed your message.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            actionExecuted: data.actionExecuted,
          },
        ]);

        // Handle quick page navigations
        if (data.navigate) {
          setTimeout(() => {
            router.push(data.navigate);
            setIsOpen(false);
          }, 1500);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-err-${Date.now()}`,
            sender: "ai",
            text: data.error || "Sorry, I could not execute that operation. Please double check organization data.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-net-err-${Date.now()}`,
          sender: "ai",
          text: "Network error. AI services are temporarily offline.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(message);
  };

  const suggestionChips = [
    "What is our active headcount?",
    "Mark Rajesh Kumar present",
    "Add 500 bonus to Anjali Sharma",
    "Calculate payroll for May 2026",
  ];

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 cursor-pointer border border-blue-500/30"
          title="AttendMind AI Assistant"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
              >
                <X className="w-6 h-6" />
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="relative"
              >
                <MessageSquare className="w-6 h-6" />
                {/* Glowing status ring */}
                <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Floating Chat Drawer Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-[360px] sm:w-[380px] h-[520px] bg-slate-950/90 border border-slate-900 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-xl z-55 flex flex-col"
          >
            
            {/* Chat Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-950 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white border border-blue-500/20">
                  <Bot className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                    Co-Pilot Assistant <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  </h3>
                  <span className="text-[9px] text-slate-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Node Online
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMessages([
                  {
                    id: "welcome",
                    sender: "ai",
                    text: "Hi! I am your AttendMind Co-Pilot. You can ask me conversational metrics questions or tell me to perform actions (e.g. 'Mark Ramesh Kumar present' or 'Show weekly insights').",
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  },
                ])}
                className="p-1.5 border border-slate-950 hover:bg-slate-950/60 rounded-xl text-slate-500 hover:text-white transition"
                title="Reset Thread"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Chat Body & Suggestion list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
              
              {/* Message log */}
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[8px] text-slate-500 font-bold uppercase font-mono">
                      <span>{msg.sender === "user" ? "Manager" : "Co-Pilot"}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div
                      className={`p-3 max-w-[85%] rounded-2xl border text-slate-205 leading-relaxed font-semibold ${
                        msg.sender === "user"
                          ? "bg-blue-600/90 border-blue-500 text-white rounded-tr-none shadow-md shadow-blue-500/10"
                          : "bg-slate-900 border-slate-900 rounded-tl-none shadow-md shadow-slate-900/10 text-slate-200"
                      }`}
                    >
                      {msg.text}

                      {/* Transaction execution outcome indicator */}
                      {msg.actionExecuted && (
                        <div className="mt-2 flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-lg w-fit">
                          <CheckCircle className="w-3.5 h-3.5" /> Database Action Committed
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1.5 mb-1 text-[8px] text-slate-500 font-bold uppercase font-mono">
                      <span>Co-Pilot</span>
                      <span>•</span>
                      <span>Thinking...</span>
                    </div>
                    <div className="p-3.5 bg-slate-900 border border-slate-900 rounded-2xl rounded-tl-none flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggestion Chips */}
              {messages.length === 1 && !loading && (
                <div className="pt-4 space-y-2 shrink-0">
                  <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    Quick shortcut commands
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestionChips.map((chip) => (
                      <button
                        key={chip}
                        onClick={() => sendMessage(chip)}
                        className="px-3 py-2 text-left border border-slate-900 bg-slate-950 hover:bg-slate-900 text-slate-350 hover:text-white rounded-2xl text-[10px] font-semibold flex items-center justify-between gap-2.5 transition active:scale-95 duration-100 cursor-pointer"
                      >
                        <span>{chip}</span>
                        <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input form */}
            <form
              onSubmit={handleFormSubmit}
              className="p-4 bg-slate-900 border-t border-slate-950 flex gap-2 items-center shrink-0"
            >
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask Co-Pilot or type updates..."
                className="flex-1 px-4 py-2.5 text-xs bg-slate-950 border border-slate-900 focus:border-slate-800 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-blue-600/30"
              />
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center transition active:scale-95 disabled:opacity-40 shrink-0 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
