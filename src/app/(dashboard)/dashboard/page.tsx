"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  Users,
  CalendarDays,
  Clock,
  CircleDollarSign,
  BrainCircuit,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  Sparkles,
  WifiOff,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useStore } from "@/store/useStore";

interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  halfDayToday: number;
  otWorkersToday: number;
  attendancePercentage: number;
  salaryPayable: number;
  attendanceTrends: Array<{ day: string; rate: number; otHours: number }>;
  salaryTrends: Array<{ month: string; payout: number }>;
  departments?: Array<{ name: string; count: number }>;
  recentActivity?: Array<{ id: string; type: string; title: string; description: string; time: string }>;
}

interface AIInsights {
  summary: string;
  insights: string[];
  alerts: string[];
  forecasting: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { isOnline } = useStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);

  // Fetch metrics
  useEffect(() => {
    const loadStats = async () => {
      if (!isOnline) {
        setStatsLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [isOnline]);

  // Fetch AI insights
  useEffect(() => {
    const loadAIInsights = async () => {
      if (!isOnline) {
        setAiLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/ai/insights");
        if (res.ok) {
          const data = await res.json();
          setAiInsights(data);
        }
      } catch (err) {
        console.error("Error fetching AI insights:", err);
      } finally {
        setAiLoading(false);
      }
    };

    loadAIInsights();
  }, [isOnline]);

  if (statsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500">Compiling dashboard analytics...</span>
        </div>
      </div>
    );
  }

  const companyCurrency = ((session?.user as { currency?: string })?.currency) ?? "INR";
  const currencySymbol = companyCurrency === "USD" ? "$" : companyCurrency === "EUR" ? "€" : "₹";

  return (
    <div className="space-y-6">
      
      {/* Offline Alert */}
      {!isOnline && (
        <div className="flex items-center gap-3 p-4 border border-amber-900/30 bg-amber-950/15 rounded-2xl text-amber-400">
          <WifiOff className="w-5 h-5 animate-bounce shrink-0 text-amber-500" />
          <div className="text-xs">
            <p className="font-semibold">Offline Mode Active</p>
            <p className="opacity-90">Showing cached local state. You can still mark attendance via the Swipe tab; records will queue and auto-sync when connection is restored.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome back, {session?.user?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Here&apos;s what&apos;s happening with your workforce today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-900 px-3.5 py-2 border border-slate-850 rounded-xl font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          Today: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Card 1: Total Employees */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-sm"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Active Staff</span>
            <div className="p-2 rounded-xl bg-blue-950/40 text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white">{stats?.totalEmployees || 0}</h3>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              Active workforce profiles
            </p>
          </div>
        </motion.div>

        {/* Card 2: Present Today */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-sm"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance Rate</span>
            <div className="p-2 rounded-xl bg-emerald-950/40 text-emerald-400">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white">{stats?.attendancePercentage || 0}%</h3>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              Present: {stats?.presentToday || 0} | Half Day: {stats?.halfDayToday || 0} | Absent: {stats?.absentToday || 0}
            </p>
          </div>
        </motion.div>

        {/* Card 3: OT Workers */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-sm"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overtime Today</span>
            <div className="p-2 rounded-xl bg-amber-950/40 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white">{stats?.otWorkersToday || 0} Workers</h3>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              Active overtime hours logged
            </p>
          </div>
        </motion.div>

        {/* Card 4: Estimated Payroll */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-sm"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Latest Month Payout</span>
            <div className="p-2 rounded-xl bg-indigo-950/40 text-indigo-400">
              <CircleDollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white">
              {currencySymbol}{stats?.salaryPayable?.toLocaleString() || 0}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              Calculated payroll summary total
            </p>
          </div>
        </motion.div>

      </div>

      {/* Main Charts & AI Insights Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Left Side: Charts (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Chart 1: Attendance & OT trends */}
          <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-semibold">Weekly Attendance & Overtime Trends</h3>
                <p className="text-[10px] text-slate-400">Attendance percentages and overtime hours</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.attendanceTrends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#334155", fontSize: "11px", borderRadius: "10px", color: "#f8fafc" }} />
                  <Area type="monotone" dataKey="rate" name="Attendance Rate (%)" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRate)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            
            {/* Chart 2: Overtime Bar Chart */}
            <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl">
              <h3 className="text-xs font-semibold mb-3">Total Overtime Hours worked</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.attendanceTrends || []} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#334155", fontSize: "10px", borderRadius: "8px", color: "#f8fafc" }} />
                    <Bar dataKey="otHours" name="OT Hours" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Payroll Expenditure Line Chart */}
            <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl">
              <h3 className="text-xs font-semibold mb-3">Monthly Payout Trends</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.salaryTrends || []} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <Tooltip formatter={(value: any) => [`${currencySymbol}${value.toLocaleString()}`, "Payout"]} contentStyle={{ background: "#0f172a", borderColor: "#334155", fontSize: "10px", borderRadius: "8px", color: "#f8fafc" }} />
                    <Line type="monotone" dataKey="payout" stroke="#6366f1" strokeWidth={2} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Department Distribution Progress Bars */}
          <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl">
            <h3 className="text-sm font-semibold mb-1">Workforce Allocation by Department</h3>
            <p className="text-[10px] text-slate-400 mb-4">Distribution of active staff members across departments</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats?.departments && stats.departments.length > 0 ? (
                stats.departments.map((dept) => {
                  const percentage = stats.totalEmployees > 0 
                    ? Math.round((dept.count / stats.totalEmployees) * 100) 
                    : 0;
                  return (
                    <div key={dept.name} className="space-y-1.5 p-3 rounded-xl border border-slate-850/50 bg-slate-900/20">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-350">{dept.name}</span>
                        <span className="font-mono text-slate-400">{dept.count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 py-4 text-center text-xs text-slate-500">
                  No department statistics found. Please register employees.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Side: AI Intelligence Panel & Activity Feed (Span 1) */}
        <div className="space-y-6">
          
          {/* AI Workforce Insights */}
          <div className="relative overflow-hidden p-5 border border-blue-900/30 bg-gradient-to-b from-blue-950/20 to-slate-900/60 rounded-2xl">
            <div className="absolute top-0 right-0 p-3 opacity-15">
              <BrainCircuit className="w-20 h-20 text-blue-600" />
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                AI Workforce Intelligence
              </h3>
            </div>

            {aiLoading ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-[10px] text-slate-400">Analysing attendance patterns...</span>
              </div>
            ) : aiInsights ? (
              <div className="space-y-4 text-xs">
                
                {/* Summary */}
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80">
                  <p className="font-semibold text-slate-200 leading-relaxed">
                    {aiInsights.summary}
                  </p>
                </div>

                {/* Smart Alerts */}
                {aiInsights.alerts?.length > 0 && (
                  <div className="space-y-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Smart Alerts
                    </span>
                    {aiInsights.alerts.map((alert, idx) => (
                      <div key={idx} className="flex gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                        <span>{alert}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Key Insights */}
                {aiInsights.insights?.length > 0 && (
                  <div className="space-y-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Key Observations
                    </span>
                    <ul className="space-y-1.5 list-disc pl-4 text-slate-350">
                      {aiInsights.insights.map((ins, idx) => (
                        <li key={idx} className="leading-relaxed">{ins}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Forecasting */}
                {aiInsights.forecasting && (
                  <div className="space-y-2 border-t border-slate-800/80 pt-3">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      AI Cost Forecasting
                    </span>
                    <p className="text-slate-300 leading-relaxed italic bg-indigo-500/5 p-2 rounded-lg border border-indigo-500/10">
                      &quot;{aiInsights.forecasting}&quot;
                    </p>
                  </div>
                )}

              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Could not load AI Insights. Please verify network or credentials.
              </div>
            )}
          </div>

          {/* Recent Operations Activity Log */}
          <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-200">
                Recent Operations Log
              </h3>
              <p className="text-[9px] text-slate-500">Live system events and updates</p>
            </div>
            
            <div className="space-y-3.5">
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-2.5 text-xs">
                    <div className="mt-1">
                      {activity.type === "employee" ? (
                        <span className="flex w-2 h-2 rounded-full bg-blue-500" />
                      ) : (
                        <span className="flex w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-300 text-[11px] leading-tight">
                        {activity.title}
                      </p>
                      <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                        {activity.description}
                      </p>
                      <span className="block text-[8px] text-slate-650 font-mono mt-1">
                        {new Date(activity.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-2 text-[10px] text-slate-500">
                  No logs recorded in the current session.
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Panel */}
          <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-xs font-semibold text-slate-200">
              Quick Shortcut Options
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <a href="/attendance" className="flex items-center justify-between p-3 border border-slate-800 hover:bg-slate-800/50 rounded-xl transition">
                <span>Mark Swipe</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
              </a>
              <a href="/ai-terminal" className="flex items-center justify-between p-3 border border-slate-800 hover:bg-slate-800/50 rounded-xl transition">
                <span>Voice Portal</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
              </a>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
