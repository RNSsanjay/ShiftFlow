"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  CreditCard,
  Calendar,
  Sparkles,
  Printer,
  CheckCircle,
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
  Plus,
  Coins,
  ChevronRight,
  TrendingUp,
  X,
  Calculator,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function PayrollPage() {
  const { data: session } = useSession();
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDraft, setIsDraft] = useState(true);
  const [message, setMessage] = useState("");

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const years = [2025, 2026, 2027];

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Adjustment Modal State
  const [adjModalOpen, setAdjModalOpen] = useState(false);
  const [activePayrollIdx, setActivePayrollIdx] = useState<number | null>(null);
  const [bonusInput, setBonusInput] = useState(0);
  const [incentiveInput, setIncentiveInput] = useState(0);

  // Audit Drawer State
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);
  const [activeAuditIdx, setActiveAuditIdx] = useState<number | null>(null);

  // Fetch Payroll Sheet
  const fetchPayroll = async (forceDraft = false) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/payroll?month=${selectedMonth}&year=${selectedYear}&draft=${forceDraft}`
      );
      if (res.ok) {
        const data = await res.json();
        setPayrolls(data.payrolls || []);
        setIsDraft(data.isDraft);
      }
    } catch (err) {
      console.error(err);
      setMessage("Failed to retrieve payroll information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [selectedMonth, selectedYear]);

  // Adjust Bonus / Incentive in memory
  const handleOpenAdjustment = (idx: number) => {
    setActivePayrollIdx(idx);
    setBonusInput(payrolls[idx].bonus || 0);
    setIncentiveInput(payrolls[idx].incentives || 0);
    setAdjModalOpen(true);
  };

  const handleSaveAdjustment = () => {
    if (activePayrollIdx === null) return;

    setPayrolls((prev) => {
      const copy = [...prev];
      const p = copy[activePayrollIdx];
      p.bonus = Number(bonusInput) || 0;
      p.incentives = Number(incentiveInput) || 0;

      // Re-calculate net salary: earned + ot + bonus + incentive - pf - esi - advance
      const earned = p.employeeId.employeeType === "staff"
        ? Math.max(0, p.baseSalary - ((p.workingDays - p.presentDays - (p.halfDays * 0.5)) * (p.baseSalary / p.workingDays)))
        : (p.presentDays + (p.halfDays * 0.5)) * p.baseSalary;

      const totalDeductions = p.pfDeduction + p.esiDeduction + p.advanceDeduction;
      p.netSalary = Math.max(0, earned + p.otAmount + p.bonus + p.incentives - totalDeductions);
      p.netSalary = Math.round(p.netSalary * 100) / 100;
      
      return copy;
    });

    setAdjModalOpen(false);
  };

  // Commit current calculations to database
  const handleCommitPayroll = async (status: "draft" | "approved" | "paid") => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          payrolls: payrolls.map((p) => ({
            employeeId: p.employeeId._id || p.employeeId,
            baseSalary: p.baseSalary,
            workingDays: p.workingDays,
            presentDays: p.presentDays,
            absentDays: p.absentDays,
            halfDays: p.halfDays,
            otHours: p.otHours,
            otAmount: p.otAmount,
            pfDeduction: p.pfDeduction,
            esiDeduction: p.esiDeduction,
            pfEmployerShare: p.pfEmployerShare,
            esiEmployerShare: p.esiEmployerShare,
            advanceDeduction: p.advanceDeduction,
            bonus: p.bonus,
            incentives: p.incentives,
            netSalary: p.netSalary,
            status,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`Payroll successfully locked as ${status}!`);
        fetchPayroll();
      } else {
        setMessage(data.error || "Failed to commit payroll sheet.");
      }
    } catch (err) {
      setMessage("Network error occurred.");
    } finally {
      setSaving(false);
    }
  };

  // Export payroll registry to Excel
  const handleExportExcel = () => {
    if (payrolls.length === 0) return;

    const data = payrolls.map((p, idx) => ({
      "S.No": idx + 1,
      Name: p.employeeId.name,
      Type: p.employeeId.employeeType.toUpperCase(),
      Department: p.employeeId.department,
      "Base Rate / Salary": p.baseSalary,
      "Days Tracked": p.workingDays,
      "Days Worked": p.presentDays + (p.halfDays * 0.5),
      "OT Hours": p.otHours,
      "OT Pay": p.otAmount,
      "PF Deduction": p.pfDeduction,
      "ESI Deduction": p.esiDeduction,
      "Advance Salary Deducted": p.advanceDeduction,
      Bonus: p.bonus,
      Incentives: p.incentives,
      "Net Salary": p.netSalary,
      Status: p.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Payroll ${months[selectedMonth - 1]}`);
    XLSX.writeFile(workbook, `payroll_registry_${months[selectedMonth - 1]}_${selectedYear}.xlsx`);
  };

  const currencySymbol = (session?.user as any)?.currency === "USD" ? "$" : (session?.user as any)?.currency === "EUR" ? "€" : "₹";
  const grandTotalPayout = payrolls.reduce((sum, curr) => sum + curr.netSalary, 0);

  return (
    <div className="space-y-6">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" /> Payroll Registry
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review automatically computed monthly salaries, adjustments, and PF/ESI contributions.
          </p>
        </div>

        <div className="flex gap-2">
          {payrolls.length > 0 && (
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/60 text-xs font-semibold px-3 py-2 rounded-xl transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-500" /> Export Excel
            </button>
          )}
          <button
            onClick={() => fetchPayroll(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-md cursor-pointer transition active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 animate-spin-slow" /> Re-Calculate Draft
          </button>
        </div>
      </div>

      {/* Selector Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2 text-xs flex-1">
          <Calendar className="w-4.5 h-4.5 text-slate-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
          >
            {months.map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {isDraft && payrolls.length > 0 && (
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase">
              Draft Mode
            </span>
          </div>
        )}
      </div>

      {message && (
        <div className="p-3.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl text-xs font-semibold text-center">
          {message}
        </div>
      )}

      {/* Main Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <span className="text-xs text-slate-500">Calculating monthly payroll sheets...</span>
        </div>
      ) : payrolls.length === 0 ? (
        <div className="p-12 text-center border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/10">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No attendance reports recorded for this month.</p>
          <p className="text-xs text-slate-400 mt-1">Please mark daily attendance in the Swipe screen first to compile payroll summaries.</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Summary Banner */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 rounded-2xl">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Total Net Salary Payable</span>
              <strong className="text-xl mt-1 block">{currencySymbol}{grandTotalPayout.toLocaleString()}</strong>
            </div>
            <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 rounded-2xl">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Employees Listed</span>
              <strong className="text-xl mt-1 block">{payrolls.length} Members</strong>
            </div>
            <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 rounded-2xl">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Registry Status</span>
              <strong className={`text-xl mt-1 block uppercase ${isDraft ? "text-amber-500" : "text-emerald-500"}`}>
                {isDraft ? "Draft calculations" : "Finalized Sheet"}
              </strong>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/10">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Employee</th>
                  <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Days Worked</th>
                  <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">OT hours</th>
                  <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">OT pay</th>
                  <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">PF/ESI Deductions</th>
                  <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Salary Advances</th>
                  <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Bonus/Inc.</th>
                  <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 font-bold">Net Salary</th>
                  <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {payrolls.map((p, idx) => {
                  const emp = p.employeeId;
                  const totalDeduct = p.pfDeduction + p.esiDeduction;
                  const activeAdjust = p.bonus + p.incentives;

                  return (
                    <tr key={emp._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-900 dark:text-white block">{emp.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{emp.employeeType} | {emp.department}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {p.presentDays + (p.halfDays * 0.5)} <span className="text-[10px] text-slate-400">/ {p.workingDays}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{p.otHours} hrs</td>
                      <td className="px-4 py-3.5">{currencySymbol}{p.otAmount.toLocaleString()}</td>
                      <td className="px-4 py-3.5 space-y-0.5 text-[10px] text-slate-500">
                        {p.pfDeduction > 0 && <span className="block">PF: {currencySymbol}{p.pfDeduction}</span>}
                        {p.esiDeduction > 0 && <span className="block">ESI: {currencySymbol}{p.esiDeduction}</span>}
                        {totalDeduct === 0 && <span className="text-slate-400">None</span>}
                      </td>
                      <td className="px-4 py-3.5 text-red-500">
                        {p.advanceDeduction > 0 ? `-${currencySymbol}${p.advanceDeduction.toLocaleString()}` : <span className="text-slate-400">None</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {activeAdjust > 0 ? (
                          <span className="text-emerald-600 font-semibold block">
                            +{currencySymbol}{activeAdjust.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                        {currencySymbol}{p.netSalary.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1">
                        <button
                          onClick={() => {
                            setActiveAuditIdx(idx);
                            setAuditDrawerOpen(true);
                          }}
                          className="p-1.5 border border-slate-800 hover:bg-slate-800 rounded-lg text-emerald-500 hover:text-emerald-400 transition cursor-pointer inline-block"
                          title="Calculation Audit Trail"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                        </button>
                        {isDraft ? (
                          <button
                            onClick={() => handleOpenAdjustment(idx)}
                            className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-blue-500 transition cursor-pointer inline-block"
                            title="Add Adjustment"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <Link
                            href={`/payroll/slip/${p._id}`}
                            className="p-1.5 inline-block border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-slate-500 hover:text-blue-500 transition"
                            title="Print Slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Saver Controls */}
          {isDraft && (
            <div className="flex justify-end gap-2.5 pt-4 shrink-0">
              <button
                onClick={() => handleCommitPayroll("draft")}
                disabled={saving}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Save as Draft
              </button>
              <button
                onClick={() => handleCommitPayroll("paid")}
                disabled={saving}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition active:scale-[0.98]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve and Pay Salaries"}
              </button>
            </div>
          )}

        </div>
      )}

      {/* Modal: Adjustment Editor */}
      <AnimatePresence>
        {adjModalOpen && activePayrollIdx !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 text-xs"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-500" /> Apply Adjustments
                </h3>
                <button onClick={() => setAdjModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Employee Profile:</span>
                <span className="font-bold text-slate-800 dark:text-white text-sm">
                  {payrolls[activePayrollIdx].employeeId.name}
                </span>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-slate-500 mb-1">Bonus Payout ({currencySymbol})</label>
                  <input
                    type="number"
                    value={bonusInput}
                    onChange={(e) => setBonusInput(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Performance Incentives ({currencySymbol})</label>
                  <input
                    type="number"
                    value={incentiveInput}
                    onChange={(e) => setIncentiveInput(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjModalOpen(false)}
                  className="border border-slate-200 dark:border-slate-800 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAdjustment}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1.5 rounded-xl shadow-md cursor-pointer transition"
                >
                  Apply adjustments
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Calculation Audit Drawer */}
      <AnimatePresence>
        {auditDrawerOpen && activeAuditIdx !== null && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs transition-opacity"
              onClick={() => setAuditDrawerOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-slate-950 border-l border-slate-900 p-6 z-50 shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              {(() => {
                const p = payrolls[activeAuditIdx];
                const emp = p.employeeId;
                
                // Formula math values
                const daysWorked = p.presentDays + (p.halfDays * 0.5);
                const earnedSalary = emp.employeeType === "staff"
                  ? Math.max(0, p.baseSalary - ((p.workingDays - daysWorked) * (p.baseSalary / p.workingDays)))
                  : daysWorked * p.baseSalary;
                const roundedEarned = Math.round(earnedSalary * 100) / 100;
                const grossSalary = roundedEarned + p.otAmount + p.bonus + p.incentives;
                const totalDeductions = p.pfDeduction + p.esiDeduction + p.advanceDeduction;

                return (
                  <div className="space-y-6 text-xs text-slate-300">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-900">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <Calculator className="w-4 h-4 text-emerald-400" /> Calculation Audit
                        </h3>
                        <p className="text-[10px] text-slate-500">Step-by-step verification ledger</p>
                      </div>
                      <button 
                        onClick={() => setAuditDrawerOpen(false)} 
                        className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Profile */}
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                      <span className="text-[10px] text-slate-505 uppercase tracking-wider font-semibold">Employee Ledger</span>
                      <strong className="text-sm text-white block">{emp.name}</strong>
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">
                        {emp.employeeType} | {emp.department} | Joining Date: {new Date(emp.joiningDate).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Section 1: Attendance inputs */}
                    <div className="space-y-2">
                      <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">1. Attendance Ledger Inputs</span>
                      <div className="grid grid-cols-2 gap-2 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
                        <div>
                          <span className="text-slate-505">Tracked Calendar Days:</span>
                          <p className="font-bold text-white font-mono">{p.workingDays} days</p>
                        </div>
                        <div>
                          <span className="text-slate-505">Days Present / Worked:</span>
                          <p className="font-bold text-emerald-400 font-mono">{p.presentDays} days</p>
                        </div>
                        <div>
                          <span className="text-slate-505">Half Day Swipes:</span>
                          <p className="font-bold text-amber-400 font-mono">{p.halfDays} days</p>
                        </div>
                        <div>
                          <span className="text-slate-505">Absent / Unmarked:</span>
                          <p className="font-bold text-red-400 font-mono">{p.absentDays} days</p>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-slate-800/40 mt-1 flex justify-between">
                          <span className="text-slate-505">Net Calculated Shift Duty Days:</span>
                          <span className="font-bold text-white font-mono">{daysWorked} days</span>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Algebra steps */}
                    <div className="space-y-3">
                      <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">2. Arithmetic Derivations</span>
                      
                      {/* Step A: Base Earned */}
                      <div className="space-y-1.5 p-3.5 bg-slate-900/20 border border-slate-850 rounded-xl">
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-200">Step A: Base Salary Earned</span>
                          <span className="text-white font-mono">{currencySymbol}{roundedEarned}</span>
                        </div>
                        {emp.employeeType === "staff" ? (
                          <div className="text-[10px] text-slate-400 leading-relaxed space-y-1">
                            <p>Formula: Base Fixed Salary - (Absent Days * (Base Salary / Tracked Days))</p>
                            <p className="bg-slate-950 p-1.5 rounded font-mono text-[9px]">
                              {p.baseSalary} - ({p.workingDays - daysWorked} * ({p.baseSalary} / {p.workingDays})) = {roundedEarned}
                            </p>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 leading-relaxed space-y-1">
                            <p>Formula: Net Shift Days Worked * Daily Wage Rate</p>
                            <p className="bg-slate-950 p-1.5 rounded font-mono text-[9px]">
                              {daysWorked} days * {p.baseSalary} = {roundedEarned}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Step B: OT hours */}
                      {p.otHours > 0 && (
                        <div className="space-y-1.5 p-3.5 bg-slate-900/20 border border-slate-850 rounded-xl">
                          <div className="flex justify-between font-semibold">
                            <span className="text-slate-200">Step B: Overtime Earnings</span>
                            <span className="text-white font-mono">+{currencySymbol}{p.otAmount}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 space-y-1">
                            <p>Calculated hours logged: {p.otHours} hours</p>
                            <p className="bg-slate-950 p-1.5 rounded font-mono text-[9px]">
                              OT Rate Formula: (Daily Rate / 8) * 1.5 multiplier. Compiled sum: {p.otAmount}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Step C: Adjustments */}
                      {(p.bonus > 0 || p.incentives > 0) && (
                        <div className="space-y-1 p-3.5 bg-slate-900/20 border border-slate-850 rounded-xl text-[10px]">
                          <span className="text-slate-200 font-semibold block mb-1">Step C: Applied Adjustments</span>
                          <div className="flex justify-between font-mono">
                            <span>Performance Bonus:</span>
                            <span className="text-emerald-400 font-bold">+{currencySymbol}{p.bonus}</span>
                          </div>
                          <div className="flex justify-between font-mono">
                            <span>Special Incentives:</span>
                            <span className="text-emerald-400 font-bold">+{currencySymbol}{p.incentives}</span>
                          </div>
                        </div>
                      )}

                      {/* Gross Earnings */}
                      <div className="flex justify-between p-2.5 bg-slate-800/40 rounded-xl text-slate-200 font-bold">
                        <span>Total Gross Payout:</span>
                        <span className="font-mono text-white">{currencySymbol}{grossSalary}</span>
                      </div>

                      {/* Step D: Deductions */}
                      <div className="space-y-1.5 p-3.5 bg-slate-900/20 border border-slate-850 rounded-xl">
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-200">Step D: Deductions Summary</span>
                          <span className="text-red-400 font-mono">-{currencySymbol}{totalDeductions}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 space-y-1.5 pt-1">
                          {p.pfDeduction > 0 && (
                            <div className="flex justify-between font-mono">
                              <span>PF (Employee Share 12%):</span>
                              <span>{currencySymbol}{p.pfDeduction}</span>
                            </div>
                          )}
                          {p.pfEmployerShare > 0 && (
                            <div className="flex justify-between font-mono text-slate-500 text-[9px]">
                              <span>PF (Employer Share 13%):</span>
                              <span>{currencySymbol}{p.pfEmployerShare}</span>
                            </div>
                          )}
                          {p.esiDeduction > 0 && (
                            <div className="flex justify-between font-mono">
                              <span>ESI (Employee Share 0.75%):</span>
                              <span>{currencySymbol}{p.esiDeduction}</span>
                            </div>
                          )}
                          {p.esiEmployerShare > 0 && (
                            <div className="flex justify-between font-mono text-slate-505 text-[9px]">
                              <span>ESI (Employer Share 3.25%):</span>
                              <span>{currencySymbol}{p.esiEmployerShare}</span>
                            </div>
                          )}
                          {p.advanceDeduction > 0 && (
                            <div className="flex justify-between font-mono text-red-400 font-bold">
                              <span>Salary Advance Recovered:</span>
                              <span>{currencySymbol}{p.advanceDeduction}</span>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Section 3: Net Total */}
                    <div className="p-4 bg-emerald-950/30 border border-emerald-900/50 rounded-2xl space-y-1">
                      <div className="flex justify-between text-white font-black text-sm">
                        <span>Net Salary Disbursed</span>
                        <span className="font-mono">{currencySymbol}{p.netSalary}</span>
                      </div>
                      <p className="text-[9px] text-emerald-450">
                        Formula: Gross Earnings ({grossSalary}) - Total Deductions ({totalDeductions}) = Net Salary
                      </p>
                    </div>

                    <button
                      onClick={() => setAuditDrawerOpen(false)}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-center rounded-xl cursor-pointer transition"
                    >
                      Close Audit Ledger
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
