"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Loader2, Lock, Mail, AlertTriangle, ShieldCheck } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const authError = searchParams.get("error");
  const registered = searchParams.get("registered");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  const getFriendlyErrorMessage = (errorType: string): string => {
    if (!errorType) return "";
    const cleanType = errorType.toLowerCase();
    
    if (cleanType.includes("credentialssignin")) {
      return "Invalid email or password. Please verify your credentials and try again.";
    }
    
    if (cleanType.includes("callbackrouteerror")) {
      return "Database Connection Refused. Please check if your MongoDB server is online and reachable.";
    }
    
    return `Authentication failed: ${errorType}`;
  };

  useEffect(() => {
    if (authError) {
      setError(getFriendlyErrorMessage(authError));
    }

    if (registered === "true") {
      setSuccess("Account registered successfully. You can now sign in.");
    }
  }, [authError, registered]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setUnverifiedEmail("");

    try {
      // 1. Run Pre-authentication check on email verification
      const checkRes = await fetch("/api/auth/pre-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const checkData = await checkRes.json();
      if (!checkRes.ok) {
        setError(checkData.error);
        if (checkData.unverified) {
          setUnverifiedEmail(checkData.email);
        }
        setLoading(false);
        return;
      }

      // 2. Perform credential authentication session validation
      const res = await signIn("credentials", {
        redirect: false,
        email: email.toLowerCase().trim(),
        password,
        callbackUrl,
      });

      if (res?.error) {
        setError(getFriendlyErrorMessage(res.error));
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err: any) {
      setError("An unexpected network or connection error occurred.");
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
          <h1 className="font-sans font-extrabold text-2xl tracking-tight text-white select-none">
            Attend<span className="text-blue-500 font-light tracking-[0.1em] uppercase ml-0.5">mind</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
            Enterprise Identity Manager
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-2.5 p-3.5 mb-6 text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
            {unverifiedEmail && (
              <Link
                href={`/register?verify=true&email=${encodeURIComponent(unverifiedEmail)}`}
                className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold text-center py-1.5 px-3 rounded-lg text-[10px] transition active:scale-95 self-start"
              >
                Verify Email Now
              </Link>
            )}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-3.5 mb-6 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 rounded-xl"
          >
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
            <span>{success}</span>
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

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Password
              </label>
              <Link href="/forgot-password" className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold transition">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
              "Authenticate Session"
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500 border-t border-slate-900 pt-6">
          Register new organization tenant?{" "}
          <Link href="/register" className="font-semibold text-blue-400 hover:text-blue-300 transition">
            Onboard Company
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
