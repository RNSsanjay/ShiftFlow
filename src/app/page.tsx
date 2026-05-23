"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  const jsonMock = `{
  "api": "POST /api/attendance",
  "payload": {
    "companyId": "tenant_01j8m4",
    "timestamp": "2026-05-23T22:31:00Z",
    "records": [
      { "employeeId": "emp_9401", "status": "PRESENT", "otHours": 2.5 }
    ]
  },
  "response": {
    "status": "QUEUED_SYNCED",
    "dbLatencyMs": 14
  }
}`;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white relative overflow-hidden">
      
      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      {/* Decorative Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-blue-600 rounded-full filter blur-[150px] opacity-10 pointer-events-none z-0" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-600 rounded-full filter blur-[150px] opacity-5 pointer-events-none z-0" />

      {/* Header */}
      <header className="px-6 md:px-12 py-5 flex items-center justify-between border-b border-slate-900 bg-slate-950/40 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-2">
          {/* Logo is purely text-only for an ultra-professional, clean brand identity */}
          <span className="font-sans font-extrabold text-xl tracking-tight text-white select-none">
            Attend<span className="text-blue-500 font-light tracking-[0.1em] uppercase ml-0.5">mind</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
          <a href="#architecture" className="hover:text-white transition">Core Architecture</a>
          <a href="#specification" className="hover:text-white transition">Engine Specs</a>
        </nav>

        <div className="flex items-center gap-4 text-xs">
          <Link href="/login" className="font-semibold text-slate-400 hover:text-white transition">
            Console Login
          </Link>
          <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl transition active:scale-95 shadow-md shadow-blue-500/10 hover:shadow-blue-500/20">
            Register Tenant
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-5xl mx-auto z-10">
        
        {/* Release Tag */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg text-[9px] font-bold tracking-widest uppercase mb-8"
        >
          Unified Enterprise Operations Release v1.2
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.05]"
        >
          Workforce Logistics &<br />
          <span className="bg-gradient-to-r from-blue-500 via-indigo-400 to-slate-200 bg-clip-text text-transparent">
            Payroll Compilation
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm sm:text-base text-slate-400 mt-6 max-w-3xl leading-relaxed"
        >
          High-performance multi-tenant platform for managing worker rosters, shift logs, and payroll calculations. Operates with local offline queuing during network interruptions and integrates Groq Llama AI transaction parsing.
        </motion.p>

        {/* Action CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center"
        >
          <Link
            href="/register"
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-8 py-4 rounded-xl shadow-xl shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition cursor-pointer"
          >
            Provision New Tenant <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center border border-slate-800 hover:border-slate-700 bg-slate-900/30 hover:bg-slate-900/50 backdrop-blur-sm text-slate-300 font-bold text-xs px-8 py-4 rounded-xl transition active:scale-[0.98] cursor-pointer"
          >
            Access Core Console
          </Link>
        </motion.div>

        {/* Technical Showcase Dashboard (Code vs Specs) */}
        <div id="specification" className="mt-20 w-full grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          
          {/* Code Container */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-slate-900 bg-slate-950/80 p-5 font-mono text-[10px] leading-relaxed shadow-xl relative"
          >
            <div className="absolute top-4 right-4 flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-800" />
              <span className="w-2 h-2 rounded-full bg-slate-800" />
              <span className="w-2 h-2 rounded-full bg-slate-800" />
            </div>
            <p className="text-slate-500 mb-3">// Raw Ingest Webhook Payload</p>
            <pre className="text-blue-400 whitespace-pre-wrap">{jsonMock}</pre>
          </motion.div>

          {/* Engine Technical Specifications */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col justify-center space-y-6"
          >
            <h2 className="text-xl font-bold text-white tracking-tight">
              Engine Performance Metrics
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              AttendMind's computing core handles shift allocations, tax compliance parameters (PF/ESI schedules), and overtime logs with atomic write guarantees inside isolated collections.
            </p>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40">
                <span className="block font-bold text-lg text-white">12ms</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Write Latency</span>
              </div>
              <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40">
                <span className="block font-bold text-lg text-white">100%</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Tenant Isolation</span>
              </div>
              <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40">
                <span className="block font-bold text-lg text-white">Offline Queue</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Auto-Resync</span>
              </div>
              <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40">
                <span className="block font-bold text-lg text-white">Groq Core</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Llama-3 Parsing</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Feature Index */}
        <div id="architecture" className="mt-28 w-full border-t border-slate-900 pt-16 text-left">
          <h2 className="text-sm font-bold tracking-widest uppercase text-slate-500 mb-8">
            Platform Capabilities Directory
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="space-y-2">
              <span className="text-white text-xs font-bold font-mono">01 / SHIFT LOGISTICS</span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Record daily logs using mobile swipe cards. Features interactive OT adjustments, custom notes, and auto-sync background queues matching network status.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-white text-xs font-bold font-mono">02 / COMPLIANCE CALCULATION</span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Calculates PF configurations, ESI shares, fixed OT rates, and salary cycles. Compiles complete payroll registries and downloads payslip documentation sheets.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-white text-xs font-bold font-mono">03 / AI INGESTION CHANNEL</span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Process voice notes or unstructured text instructions. The API converts statements into records automatically with full mathematical trace logging.
              </p>
            </div>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 backdrop-blur-sm z-10 shrink-0">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between text-[10px] text-slate-500 gap-4">
          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()} AttendMind Technologies.</span>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              All Systems Operational (99.98%)
            </div>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-300">Uptime Details</a>
            <a href="#" className="hover:text-slate-300">Tenant Agreements</a>
            <a href="#" className="hover:text-slate-300">API Documentation</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
