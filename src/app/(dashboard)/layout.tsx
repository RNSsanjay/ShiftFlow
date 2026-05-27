"use client";

import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/components/Providers";
import { useStore } from "@/store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CreditCard,
  BarChart3,
  Bot,
  Settings,
  LogOut,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  RefreshCw,
  Menu,
  X,
  User as UserIcon,
  Circle,
  Clock,
} from "lucide-react";
import AIChatWidget from "@/components/AIChatWidget";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  
  // Zustand State
  const { isOnline, setIsOnline, attendanceQueue, removeAttendanceFromQueue, activeShift, setActiveShift } = useStore();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pingTime, setPingTime] = useState<number | null>(null);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setIsOnline]);

  // Simulate server latency pings (Pro SaaS detail)
  useEffect(() => {
    if (!isOnline) {
      setPingTime(null);
      return;
    }
    const interval = setInterval(() => {
      const start = Date.now();
      fetch("/api/auth/csrf", { method: "HEAD" })
        .then(() => setPingTime(Date.now() - start))
        .catch(() => setPingTime(null));
    }, 15000);

    // Initial ping
    const start = Date.now();
    fetch("/api/auth/csrf", { method: "HEAD" })
      .then(() => setPingTime(Date.now() - start))
      .catch(() => setPingTime(null));

    return () => clearInterval(interval);
  }, [isOnline]);

  // Auto sync queue when online
  useEffect(() => {
    const syncOfflineQueue = async () => {
      if (isOnline && attendanceQueue.length > 0 && !syncing) {
        setSyncing(true);
        try {
          for (const item of attendanceQueue) {
            const res = await fetch("/api/attendance", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                date: item.date,
                records: item.records,
              }),
            });
            if (res.ok) {
              removeAttendanceFromQueue(item.date);
            }
          }
        } catch (error) {
          console.error("Failed to sync offline attendance queue:", error);
        } finally {
          setSyncing(false);
        }
      }
    };

    syncOfflineQueue();
  }, [isOnline, attendanceQueue, syncing, removeAttendanceFromQueue]);

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Initialising Workspace...</span>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const user = session.user as any;

  const navLinks = [
    { name: "Console Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Swipe Deck", href: "/attendance", icon: CalendarCheck },
    { name: "Staff Directory", href: "/employees", icon: Users },
    { name: "Payroll Engine", href: "/payroll", icon: CreditCard },
    { name: "Audit Reports", href: "/reports", icon: BarChart3 },
    { name: "Voice Console", href: "/ai-terminal", icon: Bot },
    { name: "System Config", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-900 bg-slate-950 sticky top-0 h-screen shrink-0 z-30">
        
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-900">
          <div>
            <span className="font-sans font-extrabold text-md tracking-tight text-white select-none">
              Attend<span className="text-blue-500 font-light tracking-[0.1em] uppercase ml-0.5">mind</span>
            </span>
            <span className="block text-[8px] text-slate-600 font-bold tracking-widest uppercase -mt-0.5">Control Centre</span>
          </div>
        </div>

        {/* Server & Node Status Widget */}
        <div className="px-4 py-3 mx-4 my-4 rounded-xl border border-slate-900 bg-slate-900/10 text-[10px]">
          <div className="flex flex-col gap-1.5 font-semibold">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Circle className={`w-2 h-2 ${isOnline ? "fill-emerald-500 text-emerald-500" : "fill-amber-500 text-amber-500 animate-pulse"}`} />
                {isOnline ? "Node Online" : "Disconnected"}
              </span>
              {pingTime !== null && <span className="text-slate-600 font-mono">{pingTime}ms</span>}
            </div>

            {attendanceQueue.length > 0 && (
              <div className="flex items-center justify-between mt-1 text-amber-500">
                <span className="flex items-center gap-1">
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                  Queue Syncing
                </span>
                <span className="font-mono bg-amber-500/10 px-1.5 py-0.5 rounded text-[9px]">{attendanceQueue.length} records</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer ${
                  active
                    ? "bg-slate-900 text-white border-l-2 border-blue-500 rounded-l-none"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                }`}
              >
                <Icon className={`w-4.5 h-4.5 shrink-0 ${active ? "text-blue-500" : "text-slate-500"}`} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Block */}
        <div className="p-4 border-t border-slate-900 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-900 text-slate-400">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 text-[10px]">
              <p className="font-bold truncate text-slate-200">
                {user.name}
              </p>
              <p className="text-[9px] text-slate-600 truncate uppercase tracking-widest font-extrabold mt-0.5">
                {user.role?.replace("_", " ")}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2.5">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-900 hover:bg-slate-900 transition cursor-pointer text-slate-400 hover:text-white"
              title="Toggle Theme"
            >
              {theme === "light" ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex-1 flex items-center justify-center gap-2 h-9 text-[10px] font-bold text-red-500 hover:bg-red-950/20 border border-slate-900 hover:border-red-900/30 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Terminate Session
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header & Bottom Tab bar */}
      <div className="flex flex-col flex-1 min-h-screen bg-slate-950">
        
        {/* Mobile Header Bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-900 sticky top-0 z-45 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-sans font-extrabold text-md tracking-tight text-white select-none">
              Attend<span className="text-blue-500 font-light tracking-[0.1em] uppercase ml-0.5">mind</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!isOnline && (
              <span className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                Offline
              </span>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 border border-slate-900 rounded-xl bg-slate-900/30 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Sidebar overlay menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: "-100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "-100%" }}
              className="lg:hidden fixed inset-0 top-[53px] bg-slate-950 z-40 flex flex-col p-4 border-r border-slate-900"
            >
              <nav className="flex-1 space-y-1.5 pt-2">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-xs font-semibold transition ${
                        active
                          ? "bg-slate-900 text-white"
                          : "text-slate-500 hover:bg-slate-900/30 hover:text-slate-350"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{link.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-slate-900 pt-4 pb-20 space-y-4">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-slate-400 flex items-center justify-center">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="text-[10px]">
                    <p className="font-bold text-slate-200">{user.name}</p>
                    <p className="text-[9px] text-slate-600 uppercase font-extrabold">{user.role?.replace("_", " ")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleTheme}
                    className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-900"
                  >
                    {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex-1 flex items-center justify-center gap-2 h-10 text-[10px] font-bold text-red-500 border border-slate-900 rounded-xl"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 overflow-y-auto pb-24 lg:pb-8">
          {/* Global Roster Top Navbar (Shift Switcher) */}
          <div className="hidden lg:flex items-center justify-between pb-4 mb-6 border-b border-slate-900 shrink-0">
            <div>
              <span className="text-[9px] uppercase tracking-widest text-slate-600 font-extrabold">Active Session</span>
              <h2 className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                Shift Roster Control Centre
              </h2>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Shift Switcher Dropdown */}
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-850 px-3.5 py-1.5 rounded-xl">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] uppercase font-bold text-slate-400">Roster Shift:</span>
                <select
                  value={activeShift}
                  onChange={(e) => setActiveShift(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none border-none cursor-pointer pr-1"
                >
                  <option value="all">All Shifts</option>
                  <option value="General Shift (09:00 AM - 05:00 PM)">General Shift (09:00 AM - 05:00 PM)</option>
                  <option value="Shift 1 (06:00 AM - 02:00 PM)">Shift 1 (06:00 AM - 02:00 PM)</option>
                  <option value="Shift 2 (02:00 PM - 10:00 PM)">Shift 2 (02:00 PM - 10:00 PM)</option>
                  <option value="Shift 3 (10:00 PM - 06:00 AM)">Shift 3 (10:00 PM - 06:00 AM)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mobile Shift Switcher (renders right under header) */}
          <div className="lg:hidden flex items-center justify-between pb-3 mb-4 border-b border-slate-900 shrink-0">
            <span className="text-[9px] uppercase font-bold text-slate-550">Roster Shift:</span>
            <select
              value={activeShift}
              onChange={(e) => setActiveShift(e.target.value)}
              className="bg-slate-900 border border-slate-850 text-xs font-bold text-white px-2.5 py-1 rounded-xl focus:outline-none"
            >
              <option value="all">All Shifts</option>
              <option value="General Shift (09:00 AM - 05:00 PM)">General Shift</option>
              <option value="Shift 1 (06:00 AM - 02:00 PM)">Shift 1</option>
              <option value="Shift 2 (02:00 PM - 10:00 PM)">Shift 2</option>
              <option value="Shift 3 (10:00 PM - 06:00 AM)">Shift 3</option>
            </select>
          </div>
          
          {children}
          <AIChatWidget />
        </main>

        {/* Mobile Navigation bar at bottom */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-slate-900 bg-slate-950/95 backdrop-blur-md flex items-center justify-around px-2 z-45">
          {[
            { name: "Home", href: "/dashboard", icon: LayoutDashboard },
            { name: "Swipe", href: "/attendance", icon: CalendarCheck },
            { name: "Staff", href: "/employees", icon: Users },
            { name: "Pay", href: "/payroll", icon: CreditCard },
            { name: "Voice", href: "/ai-terminal", icon: Bot },
          ].map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg text-slate-500 ${
                  active ? "text-blue-500 font-semibold" : ""
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                <span className="text-[9px] font-semibold uppercase tracking-wider">{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
