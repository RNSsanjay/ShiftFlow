"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Settings,
  Building,
  Coins,
  Wrench,
  Percent,
  CheckCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    pfEnabled: false,
    esiEnabled: false,
    pfPercentage: 12,
    esiPercentage: 0.75,
    pfEmployerPercentage: 13,
    esiEmployerPercentage: 3.25,
    salaryCycle: "monthly",
    otType: "normal",
    fixedOtRate: 0,
    workingHours: 8,
    currency: "INR",
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/company/settings");
        if (res.ok) {
          const data = await res.json();
          const comp = data.company;
          if (comp) {
            setFormData({
              name: comp.name || "",
              phone: comp.phone || "",
              address: comp.address || "",
              pfEnabled: !!comp.pfEnabled,
              esiEnabled: !!comp.esiEnabled,
              pfPercentage: comp.pfPercentage ?? 12,
              esiPercentage: comp.esiPercentage ?? 0.75,
              pfEmployerPercentage: comp.pfEmployerPercentage ?? 13,
              esiEmployerPercentage: comp.esiEmployerPercentage ?? 3.25,
              salaryCycle: comp.salaryCycle || "monthly",
              otType: comp.otType || "normal",
              fixedOtRate: comp.fixedOtRate ?? 0,
              workingHours: comp.workingHours ?? 8,
              currency: comp.currency || "INR",
            });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/company/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Company configurations updated successfully!");
        
        // Update credentials session cache if needed
        if (session) {
          await update({
            ...session,
            user: {
              ...session.user,
              currency: formData.currency,
            }
          });
        }
      } else {
        setError(data.error || "Failed to update configurations.");
      }
    } catch (err) {
      setError("Network error occurred.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-xs text-slate-500">Retrieving system configurations...</span>
        </div>
      </div>
    );
  }

  const role = (session?.user as any)?.role;
  const isEditable = role === "COMPANY_ADMIN" || role === "HR";

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" /> Company Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure baseline metrics, PF/ESI parameters, currency rules, and overtime hourly modes.
        </p>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200/50 text-red-600 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        
        {/* Section 1: Company Profile */}
        <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 rounded-2xl space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Building className="w-4 h-4 text-blue-500" /> Company Profile
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-slate-500 mb-1">Company Registered Name</label>
              <input
                type="text"
                name="name"
                disabled={!isEditable}
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent disabled:opacity-50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Contact Phone</label>
              <input
                type="text"
                name="phone"
                disabled={!isEditable}
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent disabled:opacity-50 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Registered Address</label>
            <input
              type="text"
              name="address"
              disabled={!isEditable}
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent disabled:opacity-50 focus:outline-none"
            />
          </div>
        </div>

        {/* Section 2: General Calculations */}
        <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 rounded-2xl space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Wrench className="w-4 h-4 text-blue-500" /> Calculation Controls
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-slate-500 mb-1">Salary Cycle</label>
              <select
                name="salaryCycle"
                disabled={!isEditable}
                value={formData.salaryCycle}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-Weekly</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Std Daily Hours</label>
              <input
                type="number"
                name="workingHours"
                disabled={!isEditable}
                value={formData.workingHours}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent disabled:opacity-50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">App Currency</label>
              <select
                name="currency"
                disabled={!isEditable}
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Overtime Rules */}
        <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 rounded-2xl space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Coins className="w-4 h-4 text-blue-500" /> Overtime Settings
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-slate-500 mb-1">OT Rate Mode</label>
              <select
                name="otType"
                disabled={!isEditable}
                value={formData.otType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none"
              >
                <option value="normal">Normal Hourly Rate (Based on salary)</option>
                <option value="fixed">Fixed Rate (Custom rate per hour)</option>
              </select>
            </div>

            {formData.otType === "fixed" && (
              <div>
                <label className="block text-slate-500 mb-1">Fixed Hourly rate ({formData.currency})</label>
                <input
                  type="number"
                  name="fixedOtRate"
                  disabled={!isEditable}
                  value={formData.fixedOtRate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Benefits Deductions */}
        <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 rounded-2xl space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Percent className="w-4 h-4 text-blue-500" /> Statutory Deductions
          </h3>

          <div className="space-y-4">
            
            {/* PF */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Enable Provident Fund (PF)</span>
                <input
                  type="checkbox"
                  name="pfEnabled"
                  disabled={!isEditable}
                  checked={formData.pfEnabled}
                  onChange={handleChange}
                  className="w-4 h-4 accent-blue-600"
                />
              </div>
              {formData.pfEnabled && (
                <div className="grid grid-cols-2 gap-4 pl-3 border-l-2 border-blue-500">
                  <div>
                    <label className="block text-slate-500 mb-1">Employee Contribution (%)</label>
                    <input
                      type="number"
                      name="pfPercentage"
                      step={0.1}
                      disabled={!isEditable}
                      value={formData.pfPercentage}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Employer Contribution (%)</label>
                    <input
                      type="number"
                      name="pfEmployerPercentage"
                      step={0.1}
                      disabled={!isEditable}
                      value={formData.pfEmployerPercentage}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <hr className="border-slate-100 dark:border-slate-800/80" />

            {/* ESI */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Enable State Insurance (ESI)</span>
                <input
                  type="checkbox"
                  name="esiEnabled"
                  disabled={!isEditable}
                  checked={formData.esiEnabled}
                  onChange={handleChange}
                  className="w-4 h-4 accent-blue-600"
                />
              </div>
              {formData.esiEnabled && (
                <div className="grid grid-cols-2 gap-4 pl-3 border-l-2 border-blue-500">
                  <div>
                    <label className="block text-slate-500 mb-1">Employee Share (%)</label>
                    <input
                      type="number"
                      name="esiPercentage"
                      step={0.01}
                      disabled={!isEditable}
                      value={formData.esiPercentage}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Employer Share (%)</label>
                    <input
                      type="number"
                      name="esiEmployerPercentage"
                      step={0.01}
                      disabled={!isEditable}
                      value={formData.esiEmployerPercentage}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Submit */}
        {isEditable && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition cursor-pointer active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Company Rules"}
            </button>
          </div>
        )}

      </form>

    </div>
  );
}
