"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  Calendar,
  Check,
  X as CloseIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Users,
  Grid,
  Sparkles,
  UserCheck,
  Activity,
  Smile,
  AlertCircle,
  FileText,
  BadgeAlert,
} from "lucide-react";
import { useStore, AttendanceRecordInput } from "@/store/useStore";

interface Employee {
  _id: string;
  name: string;
  phone: string;
  employeeType: "staff" | "worker";
  department: string;
  salary: number;
  shift?: string;
}

type AttendanceStatus = "present" | "absent" | "half_day" | "leave" | "holiday";

interface AttendanceRecord {
  employee: Employee;
  attendance: {
    status: AttendanceStatus;
    otHours: number;
    notes: string;
    isNew?: boolean;
  };
}

export default function AttendancePage() {
  const { isOnline, selectedDate, setSelectedDate, addAttendanceToQueue, activeShift } = useStore();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Roster categories
  const [staffRecords, setStaffRecords] = useState<AttendanceRecord[]>([]);
  const [workerRecords, setWorkerRecords] = useState<AttendanceRecord[]>([]);
  
  // Mobile View Swipe categories
  const [mobileTab, setMobileTab] = useState<"staff" | "worker">("staff");
  const [staffSwipeIndex, setStaffSwipeIndex] = useState(0);
  const [workerSwipeIndex, setWorkerSwipeIndex] = useState(0);

  // Mark states in memory before saving
  const [markedRecords, setMarkedRecords] = useState<Record<string, AttendanceRecordInput>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  
  // Device viewport height/width detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Framer motion drag setup
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);
  const presentOpacity = useTransform(x, [0, 100], [0, 1]);
  const absentOpacity = useTransform(x, [-100, 0], [1, 0]);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?date=${selectedDate}&shift=${activeShift}`);
      if (res.ok) {
        const data = await res.json();
        const loadedRecords = data.records || [];
        setRecords(loadedRecords);
        
        // Split records into Staff vs Workers
        const staff = loadedRecords.filter((r: AttendanceRecord) => r.employee.employeeType === "staff");
        const workers = loadedRecords.filter((r: AttendanceRecord) => r.employee.employeeType === "worker");
        setStaffRecords(staff);
        setWorkerRecords(workers);
        
        // Initialize markedRecords with existing database values if any
        const initialMarked: Record<string, AttendanceRecordInput> = {};
        loadedRecords.forEach((r: AttendanceRecord) => {
          if (!r.attendance.isNew) {
            initialMarked[r.employee._id] = {
              employeeId: r.employee._id,
              status: r.attendance.status,
              otHours: r.attendance.otHours,
              notes: r.attendance.notes || "",
            };
          }
        });
        setMarkedRecords(initialMarked);
        setStaffSwipeIndex(0);
        setWorkerSwipeIndex(0);
      }
    } catch (err) {
      console.error("Fetch attendance error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, activeShift]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Keyboard shortcuts listener for high-speed desktop swiper if used
  useEffect(() => {
    if (!isMobile) return;
    const activeRecords = mobileTab === "staff" ? staffRecords : workerRecords;
    const currentIndex = mobileTab === "staff" ? staffSwipeIndex : workerSwipeIndex;
    
    if (activeRecords.length === 0 || currentIndex >= activeRecords.length) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        handleSwipe("right");
      } else if (e.key === "ArrowLeft") {
        handleSwipe("left");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, mobileTab, staffSwipeIndex, workerSwipeIndex, staffRecords, workerRecords]);

  const handleMark = (empId: string, status: AttendanceStatus | null, otHours?: number, notes?: string) => {
    const current = markedRecords[empId] || {
      employeeId: empId,
      status: "present",
      otHours: 0,
      notes: "",
    };

    setMarkedRecords((prev) => ({
      ...prev,
      [empId]: {
        employeeId: empId,
        status: status ?? current.status,
        otHours: otHours !== undefined ? otHours : current.otHours,
        notes: notes !== undefined ? notes : current.notes,
      },
    }));
  };

  // Navigating card swiper (Mobile exclusive)
  function handleSwipe(direction: "left" | "right") {
    const activeRecords = mobileTab === "staff" ? staffRecords : workerRecords;
    const currentIndex = mobileTab === "staff" ? staffSwipeIndex : workerSwipeIndex;
    const setSwipeIndex = mobileTab === "staff" ? setStaffSwipeIndex : setWorkerSwipeIndex;

    if (activeRecords.length === 0 || currentIndex >= activeRecords.length) return;
    
    const currentEmp = activeRecords[currentIndex].employee;
    const status = direction === "right" ? "present" : "absent";
    
    handleMark(currentEmp._id, status);

    // Go to next employee card
    if (currentIndex < activeRecords.length) {
      setSwipeIndex((prev) => prev + 1);
    }
  }

  // Submit attendance sheet
  const handleSubmitAttendance = async () => {
    const finalRecords = records.map((r) => {
      const marked = markedRecords[r.employee._id];
      return (
        marked || {
          employeeId: r.employee._id,
          status: "present", // default to present if untouched
          otHours: 0,
          notes: "",
        }
      );
    });

    setSaving(true);
    setMessage("");

    try {
      if (isOnline) {
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: selectedDate,
            records: finalRecords,
          }),
        });

        if (res.ok) {
          setMessage("Attendance committed successfully to cloud!");
          fetchAttendance();
        } else {
          setMessage("Failed to save attendance.");
        }
      } else {
        // Offline mode: push to Zustand store queue
        addAttendanceToQueue(selectedDate, finalRecords);
        setMessage("No connection. Attendance saved to offline queue!");
      }
    } catch (err) {
      setMessage("Error saving attendance records.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  // Bulk actions separately for Staff/Workers
  const handleBulkMark = (type: "staff" | "worker", status: AttendanceStatus) => {
    const targets = type === "staff" ? staffRecords : workerRecords;
    const bulk: Record<string, AttendanceRecordInput> = { ...markedRecords };
    targets.forEach((r) => {
      bulk[r.employee._id] = {
        employeeId: r.employee._id,
        status,
        otHours: bulk[r.employee._id]?.otHours || 0,
        notes: bulk[r.employee._id]?.notes || "",
      };
    });
    setMarkedRecords(bulk);
  };

  const markedCount = Object.keys(markedRecords).length;

  return (
    <div className="space-y-6 w-full pb-12">
      
      {/* Date Picker Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-3xl shadow-sm gap-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3 text-white px-1">
          <Calendar className="w-5 h-5 text-blue-500" />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Roster Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm font-bold bg-transparent focus:outline-none border-none cursor-pointer text-white scheme-dark"
            />
          </div>
        </div>

        {/* Global Shift Summary Pill */}
        <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-900 px-4 py-2 rounded-2xl">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <div className="text-[10px]">
            <span className="text-slate-450 block font-semibold uppercase tracking-wider">Active Shift Filter</span>
            <span className="text-white font-bold">{activeShift === "all" ? "All Shifts active" : activeShift}</span>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-3.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-2xl text-xs font-semibold text-center animate-pulse max-w-lg mx-auto">
          {message}
        </div>
      )}

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <span className="text-xs text-slate-500 font-semibold tracking-wide">Compiling shift rosters...</span>
        </div>
      ) : records.length === 0 ? (
        <div className="p-12 text-center border border-slate-900 bg-slate-900/10 rounded-3xl max-w-xl mx-auto">
          <Users className="w-12 h-12 text-slate-550 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-300">No active employees found matching filters.</p>
          <p className="text-xs text-slate-500 mt-1">Please ensure employees are registered and assigned to this shift.</p>
        </div>
      ) : !isMobile ? (
        
        /* ------------------------------------------------------------- */
        /* DESKTOP VIEW: Split Columns for Staff & Workers (Professional) */
        /* ------------------------------------------------------------- */
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* STAFF CARD COLUMN */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-900 rounded-3xl">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-500" /> Executive Staff ({staffRecords.length})
                </h2>
                <p className="text-[10px] text-slate-550">Salaried personnel tracking</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkMark("staff", "present")}
                  className="px-2.5 py-1 text-[9px] font-bold tracking-wider uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-900/20 hover:bg-emerald-950/80 rounded-lg transition"
                >
                  All Present
                </button>
                <button
                  onClick={() => handleBulkMark("staff", "absent")}
                  className="px-2.5 py-1 text-[9px] font-bold tracking-wider uppercase bg-red-950/40 text-red-400 border border-red-900/20 hover:bg-red-950/80 rounded-lg transition"
                >
                  All Absent
                </button>
              </div>
            </div>

            {staffRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/30 border border-slate-900/50 rounded-2xl">
                No staff profiles found for this selection.
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                {staffRecords.map((r) => {
                  const marked = markedRecords[r.employee._id] || { status: "present", otHours: 0, notes: "" };
                  return (
                    <motion.div
                      whileHover={{ y: -1 }}
                      key={r.employee._id}
                      className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] px-1.5 py-0.5 font-bold uppercase rounded bg-indigo-950/50 text-indigo-400 border border-indigo-900/20">
                            {r.employee.department}
                          </span>
                          <h3 className="font-bold text-white mt-1 text-sm">{r.employee.name}</h3>
                          <span className="text-[9px] text-slate-500 font-medium block mt-0.5">{r.employee.phone}</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                          {r.employee.shift || "General Shift"}
                        </span>
                      </div>

                      {/* Horizontal Toggle Pills */}
                      <div className="grid grid-cols-5 gap-1 text-[9px] font-bold uppercase tracking-wider text-center shrink-0">
                        {([
                          { status: "present", label: "Present", color: "bg-emerald-600 border-emerald-600 text-white" },
                          { status: "absent", label: "Absent", color: "bg-red-600 border-red-600 text-white" },
                          { status: "half_day", label: "Half Day", color: "bg-amber-600 border-amber-600 text-white" },
                          { status: "leave", label: "Leave", color: "bg-purple-600 border-purple-600 text-white" },
                          { status: "holiday", label: "Holiday", color: "bg-slate-700 border-slate-700 text-white" },
                        ] as const).map((st) => (
                          <button
                            key={st.status}
                            onClick={() => handleMark(r.employee._id, st.status)}
                            className={`py-1.5 rounded-lg border transition duration-150 cursor-pointer ${
                              marked.status === st.status
                                ? st.color
                                : "border-slate-800 hover:bg-slate-800 text-slate-500 hover:text-slate-300 bg-slate-950/30"
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>

                      {/* Quick notes */}
                      <div className="flex gap-2 items-center">
                        <span className="text-[9px] uppercase font-bold text-slate-500 shrink-0">Note:</span>
                        <input
                          type="text"
                          placeholder="Add description..."
                          value={marked.notes}
                          onChange={(e) => handleMark(r.employee._id, null, undefined, e.target.value)}
                          className="w-full px-2.5 py-1 text-[10px] bg-slate-950/40 border border-slate-900 rounded-lg text-slate-350 focus:outline-none focus:border-slate-800"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* WORKERS CARD COLUMN */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-900 rounded-3xl">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-500" /> Ground Force Workers ({workerRecords.length})
                </h2>
                <p className="text-[10px] text-slate-550">Daily wage operations & OT tracking</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkMark("worker", "present")}
                  className="px-2.5 py-1 text-[9px] font-bold tracking-wider uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-900/20 hover:bg-emerald-950/80 rounded-lg transition"
                >
                  All Present
                </button>
                <button
                  onClick={() => handleBulkMark("worker", "absent")}
                  className="px-2.5 py-1 text-[9px] font-bold tracking-wider uppercase bg-red-950/40 text-red-400 border border-red-900/20 hover:bg-red-950/80 rounded-lg transition"
                >
                  All Absent
                </button>
              </div>
            </div>

            {workerRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/30 border border-slate-900/50 rounded-2xl">
                No worker profiles found for this selection.
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                {workerRecords.map((r) => {
                  const marked = markedRecords[r.employee._id] || { status: "present", otHours: 0, notes: "" };
                  return (
                    <motion.div
                      whileHover={{ y: -1 }}
                      key={r.employee._id}
                      className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] px-1.5 py-0.5 font-bold uppercase rounded bg-amber-950/50 text-amber-400 border border-amber-900/20">
                            {r.employee.department}
                          </span>
                          <h3 className="font-bold text-white mt-1 text-sm">{r.employee.name}</h3>
                          <span className="text-[9px] text-slate-500 font-medium block mt-0.5">{r.employee.phone}</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                          {r.employee.shift || "General Shift"}
                        </span>
                      </div>

                      {/* Toggle status */}
                      <div className="grid grid-cols-5 gap-1 text-[9px] font-bold uppercase tracking-wider text-center shrink-0">
                        {([
                          { status: "present", label: "Present", color: "bg-emerald-600 border-emerald-600 text-white" },
                          { status: "absent", label: "Absent", color: "bg-red-600 border-red-600 text-white" },
                          { status: "half_day", label: "Half Day", color: "bg-amber-600 border-amber-600 text-white" },
                          { status: "leave", label: "Leave", color: "bg-purple-600 border-purple-600 text-white" },
                          { status: "holiday", label: "Holiday", color: "bg-slate-700 border-slate-700 text-white" },
                        ] as const).map((st) => (
                          <button
                            key={st.status}
                            onClick={() => handleMark(r.employee._id, st.status)}
                            className={`py-1.5 rounded-lg border transition duration-150 cursor-pointer ${
                              marked.status === st.status
                                ? st.color
                                : "border-slate-800 hover:bg-slate-800 text-slate-500 hover:text-slate-300 bg-slate-950/30"
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>

                      {/* Overtime stepper and Notes */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center bg-slate-950/30 p-2.5 rounded-xl border border-slate-900/60">
                        
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase font-bold text-slate-450 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500" /> OT Hours
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const ot = marked.otHours || 0;
                                handleMark(r.employee._id, null, Math.max(0, ot - 1));
                              }}
                              className="w-5.5 h-5.5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-bold text-xs text-white min-w-[15px] text-center">
                              {marked.otHours || 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const ot = marked.otHours || 0;
                                handleMark(r.employee._id, null, ot + 1);
                              }}
                              className="w-5.5 h-5.5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-1.5 items-center">
                          <span className="text-[9px] uppercase font-bold text-slate-500 shrink-0">Note:</span>
                          <input
                            type="text"
                            placeholder="Reason..."
                            value={marked.notes}
                            onChange={(e) => handleMark(r.employee._id, null, undefined, e.target.value)}
                            className="w-full px-2 py-0.5 text-[10px] bg-slate-950/40 border border-slate-900 rounded-lg text-slate-350 focus:outline-none"
                          />
                        </div>

                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      ) : (
        
        /* ------------------------------------------------------------- */
        /* MOBILE VIEW: High-end Gesture Swiper deck (Swipe Alone)       */
        /* ------------------------------------------------------------- */
        <div className="space-y-5 max-w-md mx-auto w-full px-2">
          
          {/* Roster Type Tabs */}
          <div className="grid grid-cols-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
            <button
              onClick={() => setMobileTab("staff")}
              className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition ${
                mobileTab === "staff"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-450 hover:bg-slate-850"
              }`}
            >
              Staff ({staffRecords.length})
            </button>
            <button
              onClick={() => setMobileTab("worker")}
              className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition ${
                mobileTab === "worker"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-450 hover:bg-slate-850"
              }`}
            >
              Workers ({workerRecords.length})
            </button>
          </div>

          {/* Swipe view state logger */}
          <div className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-900/30 border border-slate-900/60 py-1.5 rounded-xl">
            {mobileTab === "staff" ? (
              <span>Swiping Staff: {Math.min(staffSwipeIndex + 1, staffRecords.length)} / {staffRecords.length}</span>
            ) : (
              <span>Swiping Workers: {Math.min(workerSwipeIndex + 1, workerRecords.length)} / {workerRecords.length}</span>
            )}
          </div>

          {/* Swiper Deck view */}
          {(() => {
            const activeList = mobileTab === "staff" ? staffRecords : workerRecords;
            const activeIndex = mobileTab === "staff" ? staffSwipeIndex : workerSwipeIndex;
            const currentItem = activeList[activeIndex];
            const hasCompleted = activeIndex >= activeList.length;

            return (
              <div className="space-y-6">
                <div className="relative h-[300px] w-full flex items-center justify-center select-none overflow-visible">
                  
                  {hasCompleted ? (
                    <motion.div
                      initial={{ scale: 0.96, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-full max-w-[340px] h-[280px] bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col justify-center items-center text-center space-y-3.5"
                    >
                      <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                        <Smile className="w-8 h-8 animate-bounce" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">All Swipes Completed!</h3>
                        <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                          You have marked all {mobileTab === "staff" ? "Staff" : "Worker"} members. Click "Submit" below to sync with database.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (mobileTab === "staff") setStaffSwipeIndex(0);
                          else setWorkerSwipeIndex(0);
                        }}
                        className="px-3.5 py-1.5 border border-slate-800 text-[10px] uppercase font-bold text-slate-400 hover:text-white rounded-xl active:scale-95 transition"
                      >
                        Reset Swiper
                      </button>
                    </motion.div>
                  ) : (
                    <>
                      {/* Underneath Preview Card */}
                      {activeIndex + 1 < activeList.length && (
                        <div
                          className="absolute w-full max-w-[340px] h-[280px] bg-slate-900 border border-slate-800/50 rounded-3xl p-6 shadow flex flex-col justify-between opacity-30"
                          style={{
                            transform: "scale(0.95) translateY(16px)",
                            zIndex: 10,
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[9px] uppercase font-bold text-slate-500">
                                {activeList[activeIndex + 1].employee.department}
                              </span>
                              <h2 className="text-lg font-bold text-slate-650 mt-1.5">
                                {activeList[activeIndex + 1].employee.name}
                              </h2>
                            </div>
                          </div>
                          <div className="h-10 bg-slate-800/10 rounded-xl" />
                        </div>
                      )}

                      {/* Active Card */}
                      <AnimatePresence mode="popLayout">
                        <motion.div
                          key={currentItem.employee._id}
                          style={{ x, rotate, opacity, zIndex: 20 }}
                          drag="x"
                          dragConstraints={{ left: 0, right: 0 }}
                          onDragEnd={(e, info) => {
                            if (info.offset.x > 100) {
                              handleSwipe("right");
                            } else if (info.offset.x < -100) {
                              handleSwipe("left");
                            }
                          }}
                          className="absolute w-full max-w-[340px] h-[280px] bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between cursor-grab active:cursor-grabbing overflow-hidden"
                        >
                          {/* Gesture Overlays */}
                          <motion.div
                            style={{ opacity: presentOpacity }}
                            className="absolute inset-0 bg-emerald-950/90 border-2 border-emerald-500 rounded-3xl flex items-center justify-center pointer-events-none z-50 animate-pulse"
                          >
                            <span className="text-3xl font-black text-emerald-400 tracking-wider uppercase rotate-[-12deg]">
                              PRESENT
                            </span>
                          </motion.div>

                          <motion.div
                            style={{ opacity: absentOpacity }}
                            className="absolute inset-0 bg-red-950/90 border-2 border-red-500 rounded-3xl flex items-center justify-center pointer-events-none z-50 animate-pulse"
                          >
                            <span className="text-3xl font-black text-red-400 tracking-wider uppercase rotate-[12deg]">
                              ABSENT
                            </span>
                          </motion.div>

                          {/* Card Header */}
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="px-2 py-0.5 rounded-md bg-slate-850 text-[9px] uppercase font-bold text-slate-400">
                                {currentItem.employee.department}
                              </span>
                              <h2 className="text-lg font-bold text-white mt-1.5">
                                {currentItem.employee.name}
                              </h2>
                              <p className="text-[10px] text-slate-500 mt-0.5">{currentItem.employee.phone}</p>
                            </div>
                            <span className="text-[9px] font-semibold text-blue-400 bg-blue-950/20 px-2 py-0.5 rounded">
                              {currentItem.employee.shift || "General Shift"}
                            </span>
                          </div>

                          {/* Workers specific OT stepper */}
                          {currentItem.employee.employeeType === "worker" && (
                            <div className="py-2 border-t border-b border-slate-850/60 flex items-center justify-between">
                              <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-amber-500" /> OT Hours
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const ot = markedRecords[currentItem.employee._id]?.otHours || 0;
                                    handleMark(currentItem.employee._id, null, Math.max(0, ot - 1));
                                  }}
                                  className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold cursor-pointer active:scale-95 transition"
                                >
                                  -
                                </button>
                                <span className="font-bold text-sm text-white min-w-[20px] text-center">
                                  {markedRecords[currentItem.employee._id]?.otHours || 0}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const ot = markedRecords[currentItem.employee._id]?.otHours || 0;
                                    handleMark(currentItem.employee._id, null, ot + 1);
                                  }}
                                  className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold cursor-pointer active:scale-95 transition"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Quick Notes */}
                          <div>
                            <label className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                              Reason / Note
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Machine downtime, late entry..."
                              value={markedRecords[currentItem.employee._id]?.notes || ""}
                              onChange={(e) => handleMark(currentItem.employee._id, null, undefined, e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-slate-950/40 border border-slate-850 rounded-xl focus:outline-none text-white placeholder:text-slate-750"
                            />
                          </div>

                          {/* Active Marked Status Indicator */}
                          <div className="flex justify-between items-center text-[10px] pt-1">
                            <span className="text-[9px] text-slate-500">Currently marked:</span>
                            <span className={`font-bold capitalize ${
                              markedRecords[currentItem.employee._id]?.status === "present"
                                ? "text-emerald-400"
                                : markedRecords[currentItem.employee._id]?.status === "absent"
                                ? "text-red-400"
                                : "text-amber-400"
                            }`}>
                              {markedRecords[currentItem.employee._id]?.status || "present"}
                            </span>
                          </div>

                        </motion.div>
                      </AnimatePresence>
                    </>
                  )}
                </div>

                {/* Gesture Swipe action triggers */}
                {!hasCompleted && (
                  <div className="flex justify-center gap-3.5 items-center">
                    <button
                      onClick={() => handleSwipe("left")}
                      className="flex items-center justify-center w-11 h-11 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg shadow-red-500/10 cursor-pointer active:scale-95 transition"
                      title="Mark Absent"
                    >
                      <CloseIcon className="w-5 h-5" />
                    </button>

                    <div className="flex border border-slate-800 rounded-xl overflow-hidden text-[9px] font-bold uppercase tracking-wider">
                      <button
                        onClick={() => handleMark(currentItem.employee._id, "half_day")}
                        className={`px-3 py-2 border-r border-slate-800 transition ${
                          markedRecords[currentItem.employee._id]?.status === "half_day"
                            ? "bg-amber-600 text-white"
                            : "text-slate-400 hover:bg-slate-850 bg-slate-950/20"
                        }`}
                      >
                        Half
                      </button>
                      <button
                        onClick={() => handleMark(currentItem.employee._id, "leave")}
                        className={`px-3 py-2 border-r border-slate-800 transition ${
                          markedRecords[currentItem.employee._id]?.status === "leave"
                            ? "bg-purple-600 text-white"
                            : "text-slate-400 hover:bg-slate-850 bg-slate-950/20"
                        }`}
                      >
                        Leave
                      </button>
                      <button
                        onClick={() => handleMark(currentItem.employee._id, "holiday")}
                        className={`px-3 py-2 transition ${
                          markedRecords[currentItem.employee._id]?.status === "holiday"
                            ? "bg-slate-700 text-white"
                            : "text-slate-400 hover:bg-slate-850 bg-slate-950/20"
                        }`}
                      >
                        Hol
                      </button>
                    </div>

                    <button
                      onClick={() => handleSwipe("right")}
                      className="flex items-center justify-center w-11 h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-500/10 cursor-pointer active:scale-95 transition"
                      title="Mark Present"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Swiper deck navigation buttons */}
                <div className="flex justify-between items-center px-2.5 pt-2">
                  <button
                    onClick={() => {
                      if (mobileTab === "staff") setStaffSwipeIndex((prev) => Math.max(0, prev - 1));
                      else setWorkerSwipeIndex((prev) => Math.max(0, prev - 1));
                    }}
                    disabled={activeIndex === 0}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-white disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <span className="text-[8px] text-slate-600 font-extrabold uppercase tracking-widest">
                    Swipe gestured active
                  </span>
                  <button
                    onClick={() => {
                      if (mobileTab === "staff") setStaffSwipeIndex((prev) => Math.min(staffRecords.length, prev + 1));
                      else setWorkerSwipeIndex((prev) => Math.min(workerRecords.length, prev + 1));
                    }}
                    disabled={hasCompleted}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-white disabled:opacity-30 cursor-pointer"
                  >
                    Skip <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            );
          })()}

        </div>
      )}

      {/* Sheet Confirmation Footer Button */}
      <div className="pt-6 border-t border-slate-900 max-w-7xl mx-auto w-full">
        <button
          onClick={handleSubmitAttendance}
          disabled={saving || records.length === 0}
          className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-500/15 hover:shadow-blue-500/30 cursor-pointer transition active:scale-[0.98] disabled:opacity-40"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Commit Daily Shift Attendance ({markedCount} / {records.length} processed)
            </>
          )}
        </button>
      </div>

    </div>
  );
}
