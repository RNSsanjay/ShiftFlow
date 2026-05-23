"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Printer, ArrowLeft, Loader2, Landmark, Check } from "lucide-react";

export default function SalarySlipPage() {
  const { id } = useParams();
  const router = useRouter();
  const [payroll, setPayroll] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await fetch(`/api/payroll/${id}`);
        if (res.ok) {
          const data = await res.json();
          setPayroll(data.payroll);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-xs text-slate-500">Retrieving payslip records...</span>
        </div>
      </div>
    );
  }

  if (!payroll) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 text-sm">Payslip record not found or access denied.</p>
        <button onClick={() => router.back()} className="mt-4 text-xs font-bold text-blue-600">
          Go Back
        </button>
      </div>
    );
  }

  const { employeeId: emp, companyId: comp } = payroll;
  const currencySymbol = comp.currency === "USD" ? "$" : comp.currency === "EUR" ? "€" : "₹";

  // Calculate gross earnings & gross deductions
  let grossSalary = 0;
  if (emp.employeeType === "staff") {
    // staff gross earned
    const unpaidDays = payroll.workingDays - payroll.presentDays - (payroll.halfDays * 0.5);
    const dailyRate = payroll.baseSalary / payroll.workingDays;
    grossSalary = Math.max(0, payroll.baseSalary - (unpaidDays * dailyRate));
  } else {
    // worker daily baseline gross
    grossSalary = (payroll.presentDays + (payroll.halfDays * 0.5)) * payroll.baseSalary;
  }
  const totalEarnings = grossSalary + payroll.otAmount + payroll.bonus + payroll.incentives;
  const totalDeductions = payroll.pfDeduction + payroll.esiDeduction + payroll.advanceDeduction;

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      
      {/* Top Header controls (hidden on print) */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Payroll
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md cursor-pointer transition active:scale-95"
        >
          <Printer className="w-4.5 h-4.5" /> Print Payslip
        </button>
      </div>

      {/* Slip sheet content */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-8 rounded-3xl shadow-lg print:border-none print:shadow-none print:bg-white print:text-black">
        
        {/* Company Info Header */}
        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white print:text-black">{comp.name}</h1>
            <p className="text-xs text-slate-400 mt-1">{comp.address || "Company Address Details"}</p>
            <p className="text-xs text-slate-400">Phone: {comp.phone || "N/A"}</p>
          </div>
          <div className="text-right">
            <span className="text-xs bg-emerald-100/50 dark:bg-emerald-950/30 text-emerald-600 px-2.5 py-1 rounded-full font-bold uppercase text-[10px] tracking-wider print:border print:border-emerald-500">
              {payroll.status}
            </span>
            <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mt-4">Salary Payslip</h2>
            <p className="text-sm font-bold text-slate-900 dark:text-white print:text-black mt-1">
              {new Date(payroll.year, payroll.month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Employee Profile grid */}
        <div className="grid grid-cols-2 gap-4 py-6 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div className="space-y-1">
            <p><span className="text-slate-400">Employee Name:</span> <strong className="text-slate-800 dark:text-slate-200 print:text-black">{emp.name}</strong></p>
            <p><span className="text-slate-400">Department:</span> <strong className="text-slate-800 dark:text-slate-200 print:text-black">{emp.department}</strong></p>
            <p><span className="text-slate-400">Job Classification:</span> <strong className="text-slate-800 dark:text-slate-200 print:text-black uppercase">{emp.employeeType}</strong></p>
          </div>
          <div className="space-y-1">
            <p><span className="text-slate-400">Phone Number:</span> <strong className="text-slate-800 dark:text-slate-200 print:text-black">{emp.phone}</strong></p>
            <p><span className="text-slate-400">Joining Date:</span> <strong className="text-slate-800 dark:text-slate-200 print:text-black">{new Date(emp.joiningDate).toLocaleDateString()}</strong></p>
            <p><span className="text-slate-400">Baseline Salary:</span> <strong className="text-slate-800 dark:text-slate-200 print:text-black">{currencySymbol}{payroll.baseSalary}{emp.employeeType === "staff" ? "/mo" : "/day"}</strong></p>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="py-4 border-b border-slate-100 dark:border-slate-800 text-xs">
          <h3 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-3">Attendance Summary</h3>
          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="p-2 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
              <span className="block text-[10px] text-slate-400">Working Days</span>
              <strong className="text-sm mt-0.5 block">{payroll.workingDays}</strong>
            </div>
            <div className="p-2 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
              <span className="block text-[10px] text-slate-400">Present</span>
              <strong className="text-sm mt-0.5 block text-emerald-500">{payroll.presentDays}</strong>
            </div>
            <div className="p-2 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
              <span className="block text-[10px] text-slate-400">Half Days</span>
              <strong className="text-sm mt-0.5 block text-amber-500">{payroll.halfDays}</strong>
            </div>
            <div className="p-2 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
              <span className="block text-[10px] text-slate-400">Absent</span>
              <strong className="text-sm mt-0.5 block text-red-500">{payroll.absentDays}</strong>
            </div>
            <div className="p-2 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
              <span className="block text-[10px] text-slate-400">OT Hours</span>
              <strong className="text-sm mt-0.5 block text-blue-500">{payroll.otHours} hrs</strong>
            </div>
          </div>
        </div>

        {/* Earnings & Deductions Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-slate-100 dark:border-slate-800 text-xs">
          
          {/* Earnings */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800 pb-2">Earnings</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Base Earned Salary</span>
                <span className="font-semibold">{currencySymbol}{grossSalary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Overtime (OT) Pay</span>
                <span className="font-semibold">{currencySymbol}{payroll.otAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bonus</span>
                <span className="font-semibold">{currencySymbol}{payroll.bonus.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Incentives</span>
                <span className="font-semibold">{currencySymbol}{payroll.incentives.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-dashed border-slate-200 dark:border-slate-850 pt-2 font-bold text-slate-800 dark:text-white print:text-black">
                <span>Total Earnings</span>
                <span>{currencySymbol}{totalEarnings.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800 pb-2">Deductions</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Provident Fund (PF)</span>
                <span className="font-semibold">{currencySymbol}{payroll.pfDeduction.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">State Insurance (ESI)</span>
                <span className="font-semibold">{currencySymbol}{payroll.esiDeduction.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Salary Advance Deducted</span>
                <span className="font-semibold">{currencySymbol}{payroll.advanceDeduction.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-dashed border-slate-200 dark:border-slate-850 pt-2 font-bold text-slate-800 dark:text-white print:text-black">
                <span>Total Deductions</span>
                <span>{currencySymbol}{totalDeductions.toLocaleString()}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Net Salary Summary Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-2xl mt-6 print:border print:border-black print:bg-white print:text-black">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">Net Salary Payable</span>
            <h4 className="text-xs text-slate-400 mt-0.5">Gross Earnings minus Gross Deductions</h4>
          </div>
          <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 print:text-black mt-2 sm:mt-0">
            {currencySymbol}{payroll.netSalary.toLocaleString()}
          </div>
        </div>

        {/* Signatures placeholders */}
        <div className="grid grid-cols-2 gap-4 pt-16 text-center text-[10px] text-slate-400 shrink-0">
          <div className="space-y-1">
            <div className="w-32 border-b border-slate-200 dark:border-slate-850 mx-auto" />
            <p>Employee Signature</p>
          </div>
          <div className="space-y-1">
            <div className="w-32 border-b border-slate-200 dark:border-slate-850 mx-auto" />
            <p>Authorized Administrator</p>
          </div>
        </div>

      </div>
    </div>
  );
}
