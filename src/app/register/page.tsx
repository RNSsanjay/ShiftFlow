"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Loader2,
  Building,
  Wrench,
  User,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  Coins,
  Percent,
} from "lucide-react";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifyParam = searchParams.get("verify") === "true";
  const emailParam = searchParams.get("email") || "";

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [verificationEmail, setVerificationEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState("");

  React.useEffect(() => {
    if (verifyParam && emailParam) {
      setVerificationEmail(emailParam);
      setStep(4);
    }
  }, [verifyParam, emailParam]);

  // Form State
  const [formData, setFormData] = useState({
    companyName: "",
    companyEmail: "",
    phone: "",
    address: "",
    pfEnabled: false,
    esiEnabled: false,
    pfPercentage: 12,
    esiPercentage: 0.75,
    salaryCycle: "monthly",
    otType: "normal",
    fixedOtRate: 0,
    workingHours: 8,
    currency: "INR",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.companyName || !formData.companyEmail) {
        setError("Company Name and Email parameters are required.");
        return;
      }
      setError("");
      setStep(2);
    } else if (step === 2) {
      setError("");
      setStep(3);
    }
  };

  const handleBack = () => {
    setError("");
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.adminName || !formData.adminEmail || !formData.adminPassword) {
      setError("Administrator access parameters are required.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/company/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Organization onboarding failed.");
      } else {
        setVerificationEmail(formData.adminEmail);
        setStep(4);
      }
    } catch (err: any) {
      setError("Database server communication failure.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP code.");
      return;
    }
    setVerifying(true);
    setError("");
    setVerifySuccess("");

    try {
      const res = await fetch("/api/company/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "OTP verification failed.");
      } else {
        setVerifySuccess(data.message);
        setTimeout(() => {
          router.push("/login?registered=true");
        }, 2000);
      }
    } catch (err) {
      setError("Failed to establish server communication.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 relative overflow-hidden font-sans">
      
      {/* Background Decoratives */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none z-0" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-blue-600 rounded-full filter blur-[150px] opacity-10 pointer-events-none z-0" />

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl rounded-3xl border border-slate-900 bg-slate-950/85 p-8 shadow-2xl backdrop-blur-lg z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Onboard Organisation
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
            Setup new AttendMind Tenant profiles
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { stepNum: 1, label: "Profile", icon: Building },
            { stepNum: 2, label: "Rules", icon: Wrench },
            { stepNum: 3, label: "Admin", icon: User },
            { stepNum: 4, label: "Verify", icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            const active = step >= item.stepNum;
            const current = step === item.stepNum;
            return (
              <div key={item.stepNum} className="flex items-center gap-1.5">
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-semibold border transition ${
                    current
                      ? "bg-blue-600 border-blue-600 text-white"
                      : active
                      ? "bg-blue-950/40 border-blue-900/50 text-blue-400"
                      : "bg-slate-900 border-slate-800 text-slate-600"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider hidden sm:inline ${
                    current ? "text-slate-200" : "text-slate-500"
                  }`}
                >
                  {item.label}
                </span>
                {item.stepNum < 3 && (
                  <div
                    className={`w-4 h-0.5 sm:w-8 bg-slate-900 ${
                      step > item.stepNum ? "bg-blue-900" : ""
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3.5 mb-6 text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -5 }}
              onSubmit={handleNext}
              className="space-y-4"
            >
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  name="companyName"
                  required
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Acme Logistics Ltd"
                  className="w-full px-4 py-2.5 text-xs bg-slate-900/40 border border-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600/30 text-white placeholder:text-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Company Email
                </label>
                <input
                  type="email"
                  name="companyEmail"
                  required
                  value={formData.companyEmail}
                  onChange={handleChange}
                  placeholder="admin@acme.com"
                  className="w-full px-4 py-2.5 text-xs bg-slate-900/40 border border-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600/30 text-white placeholder:text-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    Phone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-2.5 text-xs bg-slate-900/40 border border-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600/30 text-white placeholder:text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-xs bg-slate-900/40 border border-slate-900 rounded-xl focus:outline-none text-white"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Registered Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Plot 45, Phase 2, Industrial Area"
                  className="w-full px-4 py-2.5 text-xs bg-slate-900/40 border border-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600/30 text-white placeholder:text-slate-700"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer transition active:scale-[0.98]"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.form>
          )}

          {step === 2 && (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -5 }}
              onSubmit={handleNext}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    Salary Cycle
                  </label>
                  <select
                    name="salaryCycle"
                    value={formData.salaryCycle}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-xs bg-slate-900/40 border border-slate-900 rounded-xl focus:outline-none text-white"
                  >
                    <option value="monthly">Monthly Cycle</option>
                    <option value="weekly">Weekly Cycle</option>
                    <option value="bi-weekly">Bi-Weekly Cycle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    Std Daily Working Hours
                  </label>
                  <input
                    type="number"
                    name="workingHours"
                    min={4}
                    max={16}
                    value={formData.workingHours}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-xs bg-slate-900/40 border border-slate-900 rounded-xl focus:outline-none text-white"
                  />
                </div>
              </div>

              {/* Overtime */}
              <div className="p-4 border border-slate-900 rounded-xl bg-slate-950/40 space-y-3">
                <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-blue-500" /> Overtime Settings
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">OT Calculation Mode</label>
                    <select
                      name="otType"
                      value={formData.otType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-900 rounded-lg text-white"
                    >
                      <option value="normal">Normal (Salary Hourly rate)</option>
                      <option value="fixed">Fixed Rate (Custom rate)</option>
                    </select>
                  </div>
                  {formData.otType === "fixed" && (
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Hourly OT Rate ({formData.currency})</label>
                      <input
                        type="number"
                        name="fixedOtRate"
                        value={formData.fixedOtRate}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-900 rounded-lg text-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Statutory */}
              <div className="p-4 border border-slate-900 rounded-xl bg-slate-950/40 space-y-4">
                <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-blue-500" /> Statutory Deductions
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-300">Provident Fund (PF)</span>
                      <span className="text-[9px] text-slate-500">Calculate and deduct employee PF contribution</span>
                    </div>
                    <input
                      type="checkbox"
                      name="pfEnabled"
                      checked={formData.pfEnabled}
                      onChange={handleChange}
                      className="w-4 h-4 accent-blue-600 rounded bg-slate-900 border-slate-800"
                    />
                  </div>

                  {formData.pfEnabled && (
                    <div className="grid grid-cols-2 gap-3 pl-3 border-l border-blue-600">
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Employee Share (%)</label>
                        <input
                          type="number"
                          name="pfPercentage"
                          step={0.1}
                          value={formData.pfPercentage}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs bg-slate-900 border border-slate-800 text-white rounded"
                        />
                      </div>
                    </div>
                  )}

                  <hr className="border-slate-900" />

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-300">State Insurance (ESI)</span>
                      <span className="text-[9px] text-slate-500">Deduct employee medical insurance contribution</span>
                    </div>
                    <input
                      type="checkbox"
                      name="esiEnabled"
                      checked={formData.esiEnabled}
                      onChange={handleChange}
                      className="w-4 h-4 accent-blue-600 rounded bg-slate-900 border-slate-800"
                    />
                  </div>

                  {formData.esiEnabled && (
                    <div className="grid grid-cols-2 gap-3 pl-3 border-l border-blue-600">
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Employee Share (%)</label>
                        <input
                          type="number"
                          name="esiPercentage"
                          step={0.01}
                          value={formData.esiPercentage}
                          onChange={handleChange}
                          className="w-full px-2 py-1 text-xs bg-slate-900 border border-slate-800 text-white rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.form>
          )}

          {step === 3 && (
            <motion.form
              key="step3"
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -5 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Administrator Full Name
                </label>
                <input
                  type="text"
                  name="adminName"
                  required
                  value={formData.adminName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 text-xs bg-slate-900/40 border border-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600/30 text-white placeholder:text-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Administrator Email
                </label>
                <input
                  type="email"
                  name="adminEmail"
                  required
                  value={formData.adminEmail}
                  onChange={handleChange}
                  placeholder="admin@acme.com"
                  className="w-full px-4 py-2.5 text-xs bg-slate-900/40 border border-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600/30 text-white placeholder:text-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Portal Access Password
                </label>
                <input
                  type="password"
                  name="adminPassword"
                  required
                  value={formData.adminPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 text-xs bg-slate-900/40 border border-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600/30 text-white placeholder:text-slate-700"
                />
              </div>

              <div className="p-3.5 border border-blue-900/40 rounded-xl bg-blue-950/10 text-[10px] text-blue-400 flex items-start gap-2.5 leading-relaxed">
                <ShieldCheck className="w-4.5 h-4.5 shrink-0 text-blue-500" />
                <span>
                  This account will be created with <strong>Company Admin</strong> privileges. You will have full access to billing, settings, and employee records.
                </span>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg cursor-pointer transition disabled:opacity-50 disabled:scale-100"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Complete Setup <ShieldCheck className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          )}

          {step === 4 && (
            <motion.form
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerifyOtp}
              className="space-y-6"
            >
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                  Verify Administrator Email
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  We have dispatched a 6-digit OTP code to <strong className="text-slate-200">{verificationEmail}</strong>. Enter the code below to activate your organization profiles.
                </p>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.5em] text-xl font-bold py-3.5 bg-slate-900/40 border border-slate-900 focus:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600/30 text-white transition placeholder:text-slate-700"
                  />
                </div>
              </div>

              {verifySuccess ? (
                <div className="p-4 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-center font-semibold">
                  {verifySuccess}
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={verifying}
                  className="flex items-center justify-center w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3.5 rounded-xl shadow-lg active:scale-[0.98] transition disabled:opacity-50 disabled:scale-100 cursor-pointer"
                >
                  {verifying ? (
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  ) : (
                    "Activate Enterprise Account"
                  )}
                </button>
              )}
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-8 text-center text-xs text-slate-500 border-t border-slate-900 pt-6">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-blue-400 hover:text-blue-300 transition">
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
