"use client";

import React, { useState, useEffect } from "react";
import { Bot, Mic, MicOff, Send, Terminal, HelpCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onresult: ((event: { results: Array<Array<{ transcript: string }>> }) => void) | null;
  start: () => void;
  stop: () => void;
}

export default function AITerminalPage() {
  const router = useRouter();
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognitionLike | null>(null);
  const [voiceSupport, setVoiceSupport] = useState(false);

  // Command result log
  const [logs, setLogs] = useState<Array<{ text: string; type: "user" | "system" | "success" | "error"; date: string }>>([
    {
      text: "AttendMind AI Command Portal initialized. Standby for queries.",
      type: "system",
      date: new Date().toLocaleTimeString(),
    },
  ]);

  useEffect(() => {
    // Initialize Web Speech API if supported
    const SpeechRecognition = ((window as unknown) as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    }).SpeechRecognition || ((window as unknown) as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    }).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        addLog("Voice input activated. Listening...", "system");
      };

      rec.onerror = (event: { error: string }) => {
        console.error("Speech recognition error:", event.error);
        addLog(`Voice input error: ${event.error}. Please try typing instead.`, "error");
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: { results: Array<Array<{ transcript: string }>> }) => {
        const transcript = event.results[0][0].transcript;
        setCommand(transcript);
        addLog(`Recognized: "${transcript}"`, "user");
        executeAICommand(transcript);
      };

      setRecognition(rec);
      setVoiceSupport(true);
    }
  }, []);

  // Soundwave canvas animation when listening
  useEffect(() => {
    if (!isListening) return;

    const canvas = document.getElementById("voice-wave") as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 300;
      canvas.height = 40;
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
      ctx.lineWidth = 1.5;

      const numLines = 5;
      const midY = canvas.height / 2;
      
      for (let i = 0; i < numLines; i++) {
        ctx.beginPath();
        const amplitude = (12 - i * 2) * (0.5 + Math.sin(phase * 2) * 0.15);
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.9 - i * 0.18})`;
        ctx.lineWidth = 1.5 - i * 0.2;

        for (let x = 0; x < canvas.width; x++) {
          const angle = (x / canvas.width) * Math.PI * 4 + phase + i * 0.5;
          const y = midY + Math.sin(angle) * amplitude * Math.sin(x / canvas.width * Math.PI);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      phase += 0.12;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, [isListening]);

  function addLog(text: string, type: "user" | "system" | "success" | "error") {
    setLogs((prev) => [
      ...prev,
      {
        text,
        type,
        date: new Date().toLocaleTimeString(),
      },
    ]);
  }

  const handleToggleVoice = () => {
    if (!voiceSupport || !recognition) {
      addLog("Voice Speech Recognition is not supported by your current browser. Please use Chrome/Safari or type commands.", "error");
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  async function executeAICommand(cmdText: string) {
    const trimmed = cmdText.trim();
    if (!trimmed) return;

    setLoading(true);
    if (cmdText !== command) {
      addLog(`Executing: "${trimmed}"`, "user");
    }

    try {
      const res = await fetch("/api/ai/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: trimmed,
          date: new Date().toISOString().split("T")[0],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.action === "navigate_payroll") {
          addLog(`${data.message}`, "success");
          setTimeout(() => {
            router.push(`/payroll?month=${data.month}&year=${data.year}`);
          }, 1500);
        } else {
          addLog(data.message || "Action executed successfully.", "success");
        }
        setCommand("");
      } else {
        addLog(data.error || "Failed to execute instruction.", "error");
      }
    } catch (err) {
      addLog("Network communication error with AI service.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeAICommand(command);
  };

  const sampleCommands = [
    "Mark Rajesh Kumar present",
    "Mark all Yard workers present",
    "Kumar present with 2 hours OT",
    "Mark all HR staff present",
    "Add 1000 bonus to Anjali Sharma",
    "Calculate payroll for May 2026",
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Bot className="w-6 h-6 text-blue-500 animate-bounce" /> AI Portal Command Terminal
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Perform administrative workforce updates using voice inputs or natural language text strings.
        </p>
      </div>

      {/* Terminal Shell Panel */}
      <div className="bg-slate-950 text-slate-200 border border-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[400px]">
        {/* Terminal Header */}
        <div className="bg-slate-900 px-5 py-3.5 border-b border-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5" /> attendmind_terminal_console.sh
            </span>
          </div>

          {voiceSupport && (
            <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">
              Voice ready
            </span>
          )}
        </div>

        {/* Logs viewport */}
        <div className="flex-1 p-5 overflow-y-auto font-mono text-[10px] space-y-2.5">
          {logs.map((log, idx) => {
            let badge = "SYS";
            let badgeStyle = "text-slate-500 bg-slate-900/60 border-slate-800";
            if (log.type === "user") {
              badge = "USER";
              badgeStyle = "text-blue-400 bg-blue-950/40 border-blue-900/30";
            } else if (log.type === "success") {
              badge = "SUCC";
              badgeStyle = "text-emerald-400 bg-emerald-950/40 border-emerald-900/30";
            } else if (log.type === "error") {
              badge = "ERRO";
              badgeStyle = "text-red-400 bg-red-950/40 border-red-900/30";
            }

            return (
              <div key={idx} className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center text-[8px]">
                  <span className={`px-1.5 py-0.5 border rounded uppercase font-extrabold ${badgeStyle}`}>
                    {badge}
                  </span>
                  <span className="text-slate-655">{log.date}</span>
                </div>
                <div className="pl-0.5 text-slate-300 leading-relaxed font-mono">
                  {log.type === "user" && <span className="text-blue-500 mr-1.5">$</span>}
                  {log.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Voice Wave Visualizer Bar */}
        <div className="relative bg-slate-950 border-t border-slate-900 h-10 flex items-center justify-center overflow-hidden shrink-0">
          {isListening ? (
            <canvas id="voice-wave" className="w-full h-full" />
          ) : (
            <span className="text-[9px] text-slate-700 font-mono tracking-wider">AUDIO CONSOLE STANDBY</span>
          )}
        </div>

        {/* Terminal Input Bar */}
        <form onSubmit={handleFormSubmit} className="bg-slate-900 border-t border-slate-950 p-4 flex gap-2.5 items-center shrink-0">
          
          {/* Mic Button */}
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`p-3 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer ${
              isListening
                ? "bg-red-500 text-white animate-pulse"
                : "bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            }`}
            title={isListening ? "Stop Listening" : "Start Voice Input"}
          >
            {isListening ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
          </button>

          <div className="relative flex-1">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder={isListening ? "Listening... Speak your command now" : "Type command e.g., Mark Rajesh present..."}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 text-white font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !command}
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition active:scale-95 disabled:opacity-40 disabled:scale-100 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Send className="w-4.5 h-4.5" />}
          </button>

        </form>
      </div>

      {/* Examples & Help */}
      <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3.5">
        <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <HelpCircle className="w-4.5 h-4.5 text-blue-500" /> Natural Commands Examples
        </h3>
        <p className="text-[10px] text-slate-405">
          The AI matches names, departments, and dates fuzzy-mode. Simply click an example to copy it to the input bar:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono">
          {sampleCommands.map((cmd) => (
            <button
              key={cmd}
              type="button"
              onClick={() => setCommand(cmd)}
              className="p-2.5 text-left border border-slate-800 hover:bg-slate-850 rounded-xl transition cursor-pointer text-slate-300"
            >
              &quot;{cmd}&quot;
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
