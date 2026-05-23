"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  FileSpreadsheet,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Table,
} from "lucide-react";
import { useSession } from "next-auth/react";

export default function ReportsPage() {
  const { data: session } = useSession();
  const [reportType, setReportType] = useState("attendance"); // attendance, payroll, ot, pf, esi
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDept, setSelectedDept] = useState("all");
  const [departments, setDepartments] = useState<string[]>([]);
  
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportTotals, setReportTotals] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const years = [2025, 2026, 2027];

  // Fetch departments list
  useEffect(() => {
    async function fetchDepartments() {
      try {
        const res = await fetch("/api/employees");
        if (res.ok) {
          const data = await res.json();
          const depts = new Set<string>();
          (data.employees || []).forEach((e: any) => {
            if (e.department) depts.add(e.department);
          });
          setDepartments(Array.from(depts));
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchDepartments();
  }, []);

  // Fetch Report Data
  const generateReport = async () => {
    setLoading(true);
    setError("");
    setReportData([]);
    setReportTotals(null);

    try {
      const params = new URLSearchParams({
        type: reportType,
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
        department: selectedDept,
      });

      const res = await fetch(`/api/reports?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setReportData(data.data || []);
        setReportTotals(data.totals || null);
      } else {
        setError(data.error || "Failed to generate report summaries.");
      }
    } catch (err) {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
  }, [reportType, selectedMonth, selectedYear, selectedDept]);

  // Export report to Excel
  const handleExport = () => {
    if (reportData.length === 0) return;

    let exportRows: any[] = [];

    if (reportType === "attendance") {
      exportRows = reportData.map((r, idx) => ({
        "S.No": idx + 1,
        Employee: r.employeeId?.name || "N/A",
        Department: r.employeeId?.department || "N/A",
        Date: new Date(r.date).toLocaleDateString(),
        Status: r.status.toUpperCase(),
        "OT Hours": r.otHours,
        Notes: r.notes || "",
      }));
    } else if (reportType === "payroll") {
      exportRows = reportData.map((r, idx) => ({
        "S.No": idx + 1,
        Employee: r.employeeId?.name || "N/A",
        Type: r.employeeId?.employeeType?.toUpperCase() || "N/A",
        Department: r.employeeId?.department || "N/A",
        "Base Salary/Wage": r.baseSalary,
        "Working Days": r.workingDays,
        "Present Days": r.presentDays,
        "OT Hours": r.otHours,
        "OT Amount": r.otAmount,
        "PF Deduction": r.pfDeduction,
        "ESI Deduction": r.esiDeduction,
        "Advance Deductions": r.advanceDeduction,
        Bonus: r.bonus,
        Incentives: r.incentives,
        "Net Salary Paid": r.netSalary,
        Status: r.status.toUpperCase(),
      }));
    } else if (reportType === "ot") {
      exportRows = reportData.map((r, idx) => ({
        "S.No": idx + 1,
        Employee: r.employeeId?.name || "N/A",
        Department: r.employeeId?.department || "N/A",
        Classification: r.employeeId?.employeeType?.toUpperCase() || "N/A",
        "Overtime Hours": r.otHours,
        "Overtime Pay": r.otAmount,
      }));
    } else if (reportType === "pf") {
      exportRows = reportData.map((r, idx) => ({
        "S.No": idx + 1,
        Employee: r.employeeId?.name || "N/A",
        Department: r.employeeId?.department || "N/A",
        "Employee Share (PF)": r.pfDeduction,
        "Employer Share (PF)": r.pfEmployerShare,
        "Total PF Deposited": r.pfDeduction + r.pfEmployerShare,
      }));
    } else if (reportType === "esi") {
      exportRows = reportData.map((r, idx) => ({
        "S.No": idx + 1,
        Employee: r.employeeId?.name || "N/A",
        Department: r.employeeId?.department || "N/A",
        "Employee Share (ESI)": r.esiDeduction,
        "Employer Share (ESI)": r.esiEmployerShare,
        "Total ESI Deposited": r.esiDeduction + r.esiEmployerShare,
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report Summary");
    XLSX.writeFile(workbook, `attendmind_${reportType}_report_${months[selectedMonth - 1]}_${selectedYear}.xlsx`);
  };

  const currencySymbol = (session?.user as any)?.currency === "USD" ? "$" : (session?.user as any)?.currency === "EUR" ? "€" : "₹";

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" /> Analytical Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Query statutory schedules and download auditing payroll or overtime logs.
          </p>
        </div>

        {reportData.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md transition cursor-pointer active:scale-95 shrink-0"
          >
            <Download className="w-4.5 h-4.5" /> Download Spreadsheet
          </button>
        )}
      </div>

      {/* Query Filters */}
      <div className="p-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row gap-3">
        <div className="flex-1 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Report Schedule</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
            >
              <option value="attendance">Daily Attendance Log</option>
              <option value="payroll">Payroll Registry</option>
              <option value="ot">Overtime Logs</option>
              <option value="pf">Provident Fund (PF) Report</option>
              <option value="esi">Medical Insurance (ESI) Report</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
            >
              {months.map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200/50 text-red-600 rounded-xl text-xs flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Report Summary Data Table */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <span className="text-xs text-slate-500">Compiling report data matrices...</span>
        </div>
      ) : reportData.length === 0 ? (
        <div className="p-12 text-center border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/10">
          <Table className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No records found for this selection.</p>
          <p className="text-xs text-slate-400 mt-1">Please verify payroll configurations or daily attendance sheets for this date range.</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Summary KPI section */}
          {reportTotals && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
              {reportType === "payroll" && (
                <>
                  <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 rounded-xl">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Net Payout Total</span>
                    <strong className="text-lg mt-1 block">{currencySymbol}{reportTotals.netSalary.toLocaleString()}</strong>
                  </div>
                  <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 rounded-xl">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Overtime Payout</span>
                    <strong className="text-lg mt-1 block">{currencySymbol}{reportTotals.otAmount.toLocaleString()}</strong>
                  </div>
                  <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 rounded-xl">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Statutory Deductions</span>
                    <strong className="text-lg mt-1 block">{currencySymbol}{(reportTotals.pfDeduction + reportTotals.esiDeduction).toLocaleString()}</strong>
                  </div>
                </>
              )}

              {reportType === "ot" && (
                <>
                  <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 rounded-xl">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Total Overtime Hours</span>
                    <strong className="text-lg mt-1 block">{reportTotals.otHours} hours</strong>
                  </div>
                  <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 rounded-xl">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Total Overtime Payout</span>
                    <strong className="text-lg mt-1 block">{currencySymbol}{reportTotals.otAmount.toLocaleString()}</strong>
                  </div>
                </>
              )}

              {reportType === "pf" && (
                <>
                  <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 rounded-xl">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Employee Share</span>
                    <strong className="text-lg mt-1 block">{currencySymbol}{reportTotals.employeePf.toLocaleString()}</strong>
                  </div>
                  <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 rounded-xl">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Employer Share</span>
                    <strong className="text-lg mt-1 block">{currencySymbol}{reportTotals.employerPf.toLocaleString()}</strong>
                  </div>
                  <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 rounded-xl">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Total PF Deposited</span>
                    <strong className="text-lg mt-1 block">{currencySymbol}{reportTotals.totalPf.toLocaleString()}</strong>
                  </div>
                </>
              )}

              {reportType === "esi" && (
                <>
                  <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 rounded-xl">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Employee Share</span>
                    <strong className="text-lg mt-1 block">{currencySymbol}{reportTotals.employeeEsi.toLocaleString()}</strong>
                  </div>
                  <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 rounded-xl">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Employer Share</span>
                    <strong className="text-lg mt-1 block">{currencySymbol}{reportTotals.employerEsi.toLocaleString()}</strong>
                  </div>
                  <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 rounded-xl">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Total ESI Deposited</span>
                    <strong className="text-lg mt-1 block">{currencySymbol}{reportTotals.totalEsi.toLocaleString()}</strong>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Data Grid table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-900/10">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 font-semibold text-slate-500 uppercase tracking-wider">
                
                {reportType === "attendance" && (
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Employee</th>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Department</th>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Date</th>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Marked Status</th>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">OT Hours</th>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Notes</th>
                  </tr>
                )}

                {reportType === "payroll" && (
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Employee</th>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Type</th>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Department</th>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Earnings</th>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Deductions</th>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 font-bold">Net Salary</th>
                  </tr>
                )}

                {reportType === "ot" && (
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Employee</th>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Department</th>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Type</th>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Hours Logged</th>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 font-bold">OT pay</th>
                  </tr>
                )}

                {(reportType === "pf" || reportType === "esi") && (
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Employee</th>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Department</th>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Employee Contribution</th>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Employer Contribution</th>
                    <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 font-bold">Total Deposited</th>
                  </tr>
                )}

              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {reportData.map((r, idx) => (
                  <tr key={r._id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    
                    {reportType === "attendance" && (
                      <>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">{r.employeeId?.name || "N/A"}</td>
                        <td className="px-4 py-3">{r.employeeId?.department || "N/A"}</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(r.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                            r.status === "present" ? "bg-emerald-500/10 text-emerald-500" : r.status === "absent" ? "bg-red-500/10 text-red-500" : "bg-slate-100 dark:bg-slate-850 text-slate-500"
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">{r.otHours} hrs</td>
                        <td className="px-4 py-3 text-slate-400 truncate max-w-[150px]">{r.notes || "—"}</td>
                      </>
                    )}

                    {reportType === "payroll" && (
                      <>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">{r.employeeId?.name || "N/A"}</td>
                        <td className="px-4 py-3 uppercase tracking-wider text-[10px] font-bold">{r.employeeId?.employeeType || "N/A"}</td>
                        <td className="px-4 py-3">{r.employeeId?.department || "N/A"}</td>
                        <td className="px-4 py-3 text-slate-500">
                          Earned: {currencySymbol}{r.baseSalary} | OT: {currencySymbol}{r.otAmount}
                        </td>
                        <td className="px-4 py-3 text-red-500">
                          -{currencySymbol}{(r.pfDeduction + r.esiDeduction + r.advanceDeduction).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{currencySymbol}{r.netSalary.toLocaleString()}</td>
                      </>
                    )}

                    {reportType === "ot" && (
                      <>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">{r.employeeId?.name || "N/A"}</td>
                        <td className="px-4 py-3">{r.employeeId?.department || "N/A"}</td>
                        <td className="px-4 py-3 uppercase text-[10px] font-bold text-slate-400">{r.employeeId?.employeeType || "N/A"}</td>
                        <td className="px-4 py-3">{r.otHours} hrs</td>
                        <td className="px-4 py-3 font-semibold text-amber-500">{currencySymbol}{r.otAmount.toLocaleString()}</td>
                      </>
                    )}

                    {(reportType === "pf" || reportType === "esi") && (
                      <>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">{r.employeeId?.name || "N/A"}</td>
                        <td className="px-4 py-3">{r.employeeId?.department || "N/A"}</td>
                        <td className="px-4 py-3">{currencySymbol}{(reportType === "pf" ? r.pfDeduction : r.esiDeduction).toLocaleString()}</td>
                        <td className="px-4 py-3">{currencySymbol}{(reportType === "pf" ? r.pfEmployerShare : r.esiEmployerShare).toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold">
                          {currencySymbol}{(reportType === "pf" ? r.pfDeduction + r.pfEmployerShare : r.esiDeduction + r.esiEmployerShare).toLocaleString()}
                        </td>
                      </>
                    )}

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
