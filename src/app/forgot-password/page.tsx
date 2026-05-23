"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2, AlertTriangle, ShieldCheck, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setDevResetUrl("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to process recovery request.");
      } else {
        setSuccess(data.message);
        if (data.debugResetUrl) {
          setDevResetUrl(data.debugResetUrl);
        }
      }
    } catch (err: any) {
      setError("A connection error occurred. Please verify your network status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 relative overflow-hidden font-sans">
      {/* Background Decoratives */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none z-0" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full filter blur-[150px] opacity-10 pointer-events-none z-0" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-3xl border border-slate-900 bg-slate-950/80 p-8 shadow-2xl backdrop-blur-lg z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-500 mb-3 border border-blue-500/20">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Recover Access Keys
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
            Request an encrypted password reset link
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-3.5 mb-6 text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl"
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3 p-4 mb-6 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
              <span>{success}</span>
            </div>
            
            {devResetUrl && (
              <div className="mt-2 pt-2 border-t border-emerald-900/20 flex flex-col gap-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  Development Mode Helper:
                </span>
                <Link
                  href={devResetUrl}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-center py-2 px-3 rounded-lg transition active:scale-95 text-[11px]"
                >
                  Jump to Reset Password page
                </Link>
              </div>
            )}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Identity Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="administrator@company.com"
                className="w-full pl-11 pr-4 py-3 text-xs bg-slate-900/40 border border-slate-900 focus:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600/30 text-white font-medium transition placeholder:text-slate-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3.5 rounded-xl shadow-lg shadow-blue-500/10 active:scale-[0.98] transition disabled:opacity-50 disabled:scale-100 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
            ) : (
              "Generate Recovery Token"
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500 border-t border-slate-900 pt-6">
          <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
