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
  FileText,
  Loader2,
  Users,
  Grid,
  CreditCard,
  CheckCircle,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { useStore, AttendanceRecordInput } from "@/store/useStore";

interface Employee {
  _id: string;
  name: string;
  phone: string;
  employeeType: "staff" | "worker";
  department: string;
  salary: number;
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
  const { isOnline, selectedDate, setSelectedDate, addAttendanceToQueue } = useStore();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"swipe" | "list">("swipe");
  const [currentIndex, setCurrentIndex] = useState(0);

  // Mark states in memory before saving
  const [markedRecords, setMarkedRecords] = useState<Record<string, AttendanceRecordInput>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Framer motion drag setup
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);
  const presentOpacity = useTransform(x, [0, 100], [0, 1]);
  const absentOpacity = useTransform(x, [-100, 0], [1, 0]);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        
        // Initialize markedRecords with existing database values if any
        const initialMarked: Record<string, AttendanceRecordInput> = {};
        (data.records || []).forEach((r: AttendanceRecord) => {
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
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error("Fetch attendance error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Keyboard shortcuts listener for high-speed desktop entries
  useEffect(() => {
    if (viewMode !== "swipe" || records.length === 0 || currentIndex >= records.length) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        handleSwipe("right");
      } else if (e.key === "ArrowLeft") {
        handleSwipe("left");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, currentIndex, records, markedRecords]);

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

  // Navigating card swiper
  function handleSwipe(direction: "left" | "right") {
    if (records.length === 0) return;
    const currentEmp = records[currentIndex].employee;
    const status = direction === "right" ? "present" : "absent";
    
    handleMark(currentEmp._id, status);

    // Go to next employee card
    if (currentIndex < records.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }

  const handleNext = () => {
    if (currentIndex < records.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

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
          setMessage("Attendance saved successfully to cloud!");
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

  const markedCount = Object.keys(markedRecords).length;
  const currentRecord = records[currentIndex];

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-12">
      
      {/* Date Picker Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 text-white">
          <Calendar className="w-5 h-5 text-blue-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm font-bold bg-transparent focus:outline-none border-none cursor-pointer text-white scheme-dark"
          />
        </div>

        {/* View Toggle */}
        <div className="flex border border-slate-800 rounded-xl overflow-hidden text-xs">
          <button
            onClick={() => setViewMode("swipe")}
            className={`px-3 py-1.5 font-semibold cursor-pointer ${
              viewMode === "swipe" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-850"
            }`}
          >
            Swipe Cards
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 font-semibold cursor-pointer ${
              viewMode === "list" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-850"
            }`}
          >
            List View
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-xs flex gap-2 font-semibold justify-center text-center animate-bounce">
          {message}
        </div>
      )}

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <span className="text-xs text-slate-500">Loading daily employee roster...</span>
        </div>
      ) : records.length === 0 ? (
        <div className="p-8 text-center border border-slate-800 rounded-2xl">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No active employees found. Please register employees first.</p>
        </div>
      ) : viewMode === "swipe" ? (
        
        /* Swipe Mode UI */
        <div className="space-y-6">
          <div className="text-center text-xs text-slate-400 font-medium">
            Marking employee {currentIndex + 1} of {records.length}
          </div>

          {/* Card Area */}
          <div className="relative h-[320px] w-full flex items-center justify-center select-none overflow-visible">
            
            {/* Tucked Underneath Card (Preview of next card) */}
            {currentIndex + 1 < records.length && (
              <div
                className="absolute w-full max-w-[340px] h-[300px] bg-slate-900 border border-slate-800/60 rounded-3xl p-6 shadow-md flex flex-col justify-between opacity-35"
                style={{
                  transform: "scale(0.94) translateY(18px)",
                  zIndex: 10,
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] uppercase font-bold text-slate-500">
                      {records[currentIndex + 1].employee.department}
                    </span>
                    <h2 className="text-xl font-bold text-slate-500 mt-1.5">
                      {records[currentIndex + 1].employee.name}
                    </h2>
                    <p className="text-xs text-slate-650 mt-0.5">{records[currentIndex + 1].employee.phone}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 bg-slate-800 px-2 py-0.5 rounded">
                    {records[currentIndex + 1].employee.employeeType}
                  </span>
                </div>
                <div className="h-[1px] bg-slate-800/40 w-full" />
                <div className="h-10 w-full bg-slate-800/20 rounded-xl" />
                <div className="h-6 w-1/3 bg-slate-800/20 rounded-xl" />
              </div>
            )}

            {/* Active Card */}
            <AnimatePresence mode="popLayout">
              {currentIndex < records.length && (
                <motion.div
                  key={currentRecord.employee._id}
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
                  className="absolute w-full max-w-[340px] h-[300px] bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between cursor-grab active:cursor-grabbing overflow-hidden"
                >
                  {/* Drag overlays */}
                  <motion.div 
                    style={{ opacity: presentOpacity }} 
                    className="absolute inset-0 bg-emerald-950/90 border-2 border-emerald-500 rounded-3xl flex items-center justify-center pointer-events-none z-50"
                  >
                    <span className="text-3xl font-black text-emerald-400 tracking-wider uppercase rotate-[-12deg]">
                      PRESENT
                    </span>
                  </motion.div>

                  <motion.div 
                    style={{ opacity: absentOpacity }} 
                    className="absolute inset-0 bg-red-950/90 border-2 border-red-500 rounded-3xl flex items-center justify-center pointer-events-none z-50"
                  >
                    <span className="text-3xl font-black text-red-400 tracking-wider uppercase rotate-[12deg]">
                      ABSENT
                    </span>
                  </motion.div>

                  {/* Card Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="px-2 py-0.5 rounded-md bg-slate-850 text-[10px] uppercase font-bold text-slate-400">
                        {currentRecord.employee.department}
                      </span>
                      <h2 className="text-xl font-bold text-white mt-1.5">
                        {currentRecord.employee.name}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">{currentRecord.employee.phone}</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-400 bg-blue-950/30 px-2 py-0.5 rounded">
                      {currentRecord.employee.employeeType}
                    </span>
                  </div>

                  {/* Overtime Incrementor */}
                  {currentRecord.employee.employeeType === "worker" && (
                    <div className="py-2.5 border-t border-b border-slate-850 flex items-center justify-between">
                      <span className="text-xs text-slate-450 flex items-center gap-1">
                        <Clock className="w-4 h-4 text-amber-500" /> Overtime Hours
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const ot = (markedRecords[currentRecord.employee._id]?.otHours || 0);
                            handleMark(currentRecord.employee._id, null, Math.max(0, ot - 1));
                          }}
                          className="w-7 h-7 flex items-center justify-center bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-750 active:scale-95 transition cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-bold text-sm min-w-[20px] text-center text-white">
                          {markedRecords[currentRecord.employee._id]?.otHours || 0}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const ot = (markedRecords[currentRecord.employee._id]?.otHours || 0);
                            handleMark(currentRecord.employee._id, null, ot + 1);
                          }}
                          className="w-7 h-7 flex items-center justify-center bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-750 active:scale-95 transition cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Quick Notes Selector */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                      Quick Notes / Reason
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Late by 15 mins, Machine failure..."
                      value={markedRecords[currentRecord.employee._id]?.notes || ""}
                      onChange={(e) => handleMark(currentRecord.employee._id, null, undefined, e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-950/40 border border-slate-800 rounded-xl focus:outline-none text-white"
                    />
                  </div>

                  {/* Status Indicator inside Card */}
                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-[10px] text-slate-500">Current status marked:</span>
                    <span className={`font-bold capitalize ${
                      markedRecords[currentRecord.employee._id]?.status === "present"
                        ? "text-emerald-400"
                        : markedRecords[currentRecord.employee._id]?.status === "absent"
                        ? "text-red-400"
                        : "text-amber-400"
                    }`}>
                      {markedRecords[currentRecord.employee._id]?.status || "present"}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Swipe UI controls */}
          <div className="flex justify-center gap-3">
            <button
              onClick={() => handleSwipe("left")}
              className="flex items-center justify-center w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg shadow-red-500/10 cursor-pointer active:scale-95 transition"
              title="Swipe Left - Absent"
            >
              <CloseIcon className="w-6 h-6" />
            </button>

            {/* Middle Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleMark(currentRecord.employee._id, "half_day")}
                className={`px-3.5 py-2.5 rounded-xl border text-[11px] font-semibold cursor-pointer active:scale-95 transition ${
                  markedRecords[currentRecord.employee._id]?.status === "half_day"
                    ? "bg-amber-600 text-white border-amber-600"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850"
                }`}
              >
                Half Day
              </button>
              <button
                onClick={() => handleMark(currentRecord.employee._id, "leave")}
                className={`px-3.5 py-2.5 rounded-xl border text-[11px] font-semibold cursor-pointer active:scale-95 transition ${
                  markedRecords[currentRecord.employee._id]?.status === "leave"
                    ? "bg-purple-600 text-white border-purple-600"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850"
                }`}
              >
                Leave
              </button>
              <button
                onClick={() => handleMark(currentRecord.employee._id, "holiday")}
                className={`px-3.5 py-2.5 rounded-xl border text-[11px] font-semibold cursor-pointer active:scale-95 transition ${
                  markedRecords[currentRecord.employee._id]?.status === "holiday"
                    ? "bg-slate-700 text-white border-slate-700"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850"
                }`}
              >
                Holiday
              </button>
            </div>

            <button
              onClick={() => handleSwipe("right")}
              className="flex items-center justify-center w-12 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-500/10 cursor-pointer active:scale-95 transition"
              title="Swipe Right - Present"
            >
              <Check className="w-6 h-6" />
            </button>
          </div>

          {/* Previous/Next Navigator */}
          <div className="flex justify-between items-center px-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Prev Card
            </button>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {currentIndex === records.length - 1 ? "End of list" : "Use swipe gestures"}
            </span>
            <button
              onClick={handleNext}
              disabled={currentIndex === records.length - 1}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
            >
              Next Card <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        
        /* List View Mode */
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Bulk Actions</h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const bulk: Record<string, AttendanceRecordInput> = {};
                  records.forEach((r) => {
                    bulk[r.employee._id] = { employeeId: r.employee._id, status: "present", otHours: 0, notes: "" };
                  });
                  setMarkedRecords(bulk);
                }}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl text-[10px] font-bold transition"
              >
                Mark All Present
              </button>
              <button
                onClick={() => {
                  const bulk: Record<string, AttendanceRecordInput> = {};
                  records.forEach((r) => {
                    bulk[r.employee._id] = { employeeId: r.employee._id, status: "absent", otHours: 0, notes: "" };
                  });
                  setMarkedRecords(bulk);
                }}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl text-[10px] font-bold transition"
              >
                Mark All Absent
              </button>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-900/20 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {records.map((r) => {
              const marked = markedRecords[r.employee._id] || { status: "present", otHours: 0, notes: "" };
              return (
                <div key={r.employee._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold block text-slate-800 dark:text-slate-200">{r.employee.name}</span>
                    <span className="text-[10px] text-slate-400 capitalize">{r.employee.department} | {r.employee.employeeType}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 items-center">
                    {/* Status selectors */}
                    {(["present", "absent", "half_day", "leave", "holiday"] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleMark(r.employee._id, st)}
                        className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition ${
                          marked.status === st
                            ? st === "present"
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : st === "absent"
                              ? "bg-red-600 text-white border-red-600"
                              : st === "half_day"
                              ? "bg-amber-600 text-white border-amber-600"
                              : "bg-purple-600 text-white border-purple-600"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
                        }`}
                      >
                        {st.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sheet Confirmation Footer Button */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <button
          onClick={handleSubmitAttendance}
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 cursor-pointer transition active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Submit Attendance Sheet ({markedCount}/{records.length})
            </>
          )}
        </button>
      </div>

    </div>
  );
}
