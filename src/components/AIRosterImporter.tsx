"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Upload,
  X,
  UserCheck,
  Calendar,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Trash2,
  CheckCircle,
  FileSpreadsheet,
  Activity,
  ArrowRight,
  Image as ImageIcon,
} from "lucide-react";

interface ExtractedEmployee {
  name: string;
  phone: string;
  employeeType: "staff" | "worker" | "";
  department: string;
  salary: number;
  shift: string;
  attendanceStatus: "present" | "absent";
}

interface AIRosterImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function AIRosterImporter({ isOpen, onClose, onImportComplete }: AIRosterImporterProps) {
  const [step, setStep] = useState<"upload" | "scanning" | "wizard" | "review" | "success">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedList, setExtractedList] = useState<ExtractedEmployee[]>([]);
  const [wizardIndex, setWizardIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // Verification inputs
  const [currentMember, setCurrentMember] = useState<ExtractedEmployee>({
    name: "",
    phone: "",
    employeeType: "",
    department: "",
    salary: 0,
    shift: "General Shift (09:00 AM - 05:00 PM)",
    attendanceStatus: "present",
  });

  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [loadingText, setLoadingText] = useState("Uploading sheet...");
  const [errorText, setErrorText] = useState("");
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorText("Invalid file type. Please upload an image (PNG, JPG, JPEG).");
      return;
    }
    setErrorText("");
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Triggers Groq Vision extraction
  const startScanning = async () => {
    if (!imagePreview) return;
    setStep("scanning");
    setErrorText("");

    const phases = [
      "Compressing roster visual assets...",
      "Analyzing layout vectors...",
      "Initializing Llama 3.2 Vision engine...",
      "Running text line parsing...",
      "Mapping staff/worker categories...",
      "Extracting daily attendance columns...",
    ];

    let phaseIndex = 0;
    setLoadingText(phases[0]);
    const timer = setInterval(() => {
      phaseIndex = (phaseIndex + 1) % phases.length;
      setLoadingText(phases[phaseIndex]);
    }, 2500);

    try {
      const res = await fetch("/api/ai/extract-roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imagePreview }),
      });

      clearInterval(timer);
      const data = await res.json();

      if (res.ok) {
        const list: ExtractedEmployee[] = (data.employees || []).map((e: any) => ({
          name: e.name || "",
          phone: e.phone || "",
          employeeType: e.employeeType === "staff" || e.employeeType === "worker" ? e.employeeType : "",
          department: e.department || "",
          salary: Number(e.salary) || 0,
          shift: e.shift || "General Shift (09:00 AM - 05:00 PM)",
          attendanceStatus: e.attendanceStatus === "absent" ? "absent" : "present",
        }));

        if (list.length === 0) {
          setErrorText("AI was unable to extract any employee records. Please try a clearer image.");
          setStep("upload");
        } else {
          setExtractedList(list);
          setWizardIndex(0);
          loadWizardMember(list[0]);
          setStep("wizard");
        }
      } else {
        setErrorText(data.error || "Vision parser encountered an error.");
        setStep("upload");
      }
    } catch (err) {
      clearInterval(timer);
      setErrorText("Connection error during image extraction.");
      setStep("upload");
    }
  };

  const loadWizardMember = (member: ExtractedEmployee) => {
    setCurrentMember({
      name: member.name,
      phone: member.phone,
      employeeType: member.employeeType,
      department: member.department,
      salary: member.salary || (member.employeeType === "staff" ? 25000 : 600),
      shift: member.shift || "General Shift (09:00 AM - 05:00 PM)",
      attendanceStatus: member.attendanceStatus,
    });
  };

  // Stepper triggers
  const handleWizardNext = () => {
    // Validate current entries
    if (!currentMember.name.trim()) return;

    const updatedList = [...extractedList];
    updatedList[wizardIndex] = { ...currentMember };
    setExtractedList(updatedList);

    if (wizardIndex + 1 < updatedList.length) {
      setWizardIndex(prev => prev + 1);
      loadWizardMember(updatedList[wizardIndex + 1]);
    } else {
      setStep("review");
    }
  };

  const handleWizardSkip = () => {
    // Discard current member and move to next
    const updatedList = extractedList.filter((_, idx) => idx !== wizardIndex);
    setExtractedList(updatedList);

    if (updatedList.length === 0) {
      setStep("upload");
    } else if (wizardIndex < updatedList.length) {
      loadWizardMember(updatedList[wizardIndex]);
    } else {
      setWizardIndex(updatedList.length - 1);
      loadWizardMember(updatedList[updatedList.length - 1]);
    }
  };

  const commitToWorkspace = async () => {
    setSaving(true);
    setErrorText("");
    try {
      const res = await fetch("/api/employees/bulk-with-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employees: extractedList,
          date: attendanceDate,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStep("success");
      } else {
        setErrorText(data.error || "Failed to commit roster data.");
      }
    } catch (err) {
      setErrorText("Network error saving roster records.");
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setExtractedList([]);
    setWizardIndex(0);
    setStep("upload");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] flex flex-col overflow-hidden text-slate-100 font-sans"
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-3.5 border-b border-slate-850 shrink-0">
          <div>
            <h3 className="font-sans font-extrabold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-blue-500 animate-pulse" />
              <span>AI Roster Document Scanner</span>
            </h3>
            <span className="block text-[9px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">
              Powered by Llama 3.2 Vision
            </span>
          </div>
          <button
            onClick={() => {
              resetAll();
              onClose();
            }}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorText && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs flex gap-2 shrink-0 animate-pulse">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorText}</span>
          </div>
        )}

        {/* Dynamic Step Viewports */}
        <div className="flex-1 overflow-y-auto pr-1 select-none min-h-[280px]">
          
          {/* UPLOAD PHASE */}
          {step === "upload" && (
            <div className="space-y-5">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition duration-300 min-h-[220px] bg-slate-950/20 ${
                  dragActive
                    ? "border-blue-500 bg-blue-500/5"
                    : "border-slate-800 hover:border-slate-700 hover:bg-slate-950/40"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                
                {imagePreview ? (
                  <div className="relative group max-w-xs rounded-2xl overflow-hidden border border-slate-800">
                    <img src={imagePreview} alt="Preview" className="max-h-[160px] object-contain mx-auto" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-200">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-slate-950 border border-slate-850 text-blue-500 rounded-full mb-3 shadow shadow-blue-500/10">
                      <Upload className="w-6 h-6 animate-bounce" />
                    </div>
                    <p className="text-xs font-bold text-slate-300">
                      Upload Roster Roster / Attendance Document
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-sm text-center">
                      PNG, JPG, or JPEG list grids. Llama Vision automatically parses rows, headers, and checkmarks.
                    </p>
                  </>
                )}
              </div>

              {imagePreview && (
                <button
                  onClick={startScanning}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-500/15 cursor-pointer active:scale-[0.98] transition"
                >
                  <Sparkles className="w-4 h-4 animate-spin" /> Scan Document with Llama AI
                </button>
              )}
            </div>
          )}

          {/* SCANNING LASER PHASE */}
          {step === "scanning" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-6">
              <div className="relative w-full max-w-[280px] h-[180px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/60 flex items-center justify-center">
                {imagePreview && (
                  <img src={imagePreview} alt="Scanning" className="w-full h-full object-contain opacity-40" />
                )}
                {/* Horizontal Sweeper Scanning Laser */}
                <motion.div
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_12px_rgba(59,130,246,0.9)]"
                  style={{ top: "0%" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-blue-500/20 animate-pulse" />
                </div>
              </div>

              <div className="text-center space-y-1.5">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                <h4 className="text-xs font-bold text-white tracking-wide">Processing Document OCR</h4>
                <p className="text-[10px] text-slate-500 italic max-w-sm px-4 animate-pulse">
                  {loadingText}
                </p>
              </div>
            </div>
          )}

          {/* STEP-BY-STEP VERIFICATION WIZARD */}
          {step === "wizard" && (
            <div className="space-y-4">
              
              {/* Stepper Progress Bar */}
              <div className="space-y-1.5 shrink-0">
                <div className="flex justify-between text-[9px] uppercase font-extrabold tracking-widest text-slate-450">
                  <span>Roster Member Onboarding</span>
                  <span>
                    Member {wizardIndex + 1} of {extractedList.length}
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-900">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${((wizardIndex + 1) / extractedList.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start p-4 bg-slate-950/40 border border-slate-850 rounded-2xl">
                
                {/* Visual Thumbnail */}
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-900 border border-slate-850 rounded-xl text-blue-500">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Review Profile Details</h4>
                      <p className="text-[9px] text-slate-500 leading-relaxed">
                        Verify and supplement missing information parsed from the sheet.
                      </p>
                    </div>
                  </div>

                  {/* Highlight warning if crucial fields are empty */}
                  {(!currentMember.employeeType || !currentMember.phone || !currentMember.department) && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-[10px] leading-relaxed flex gap-2 font-semibold animate-pulse">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="block font-bold">Incomplete Data extracted:</span>
                        Please supplement missing values highlighted in amber below.
                      </div>
                    </div>
                  )}

                  <div className="p-3 border border-slate-850 bg-slate-900/40 rounded-xl space-y-2">
                    <span className="block text-[9px] text-slate-500 uppercase tracking-wider font-extrabold">
                      Statutory Benefits baseline
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-850 text-slate-400">
                        PF Contributions: <span className="text-slate-500 font-bold block mt-0.5">Optional (Off)</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-850 text-slate-400">
                        ESI Insurance: <span className="text-slate-500 font-bold block mt-0.5">Optional (Off)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-3.5 text-[10px] text-slate-400">
                  
                  {/* Name field */}
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold uppercase tracking-wide">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={currentMember.name}
                      onChange={e => setCurrentMember(prev => ({ ...prev, name: e.target.value }))}
                      required
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-3 py-2 border border-slate-800 bg-slate-900/60 rounded-xl focus:outline-none focus:border-slate-700 text-white"
                    />
                  </div>

                  {/* Phone field - highlighted if empty */}
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold uppercase tracking-wide flex justify-between">
                      <span>Phone Number</span>
                      {!currentMember.phone && <span className="text-amber-500 text-[8px] font-bold">Required</span>}
                    </label>
                    <input
                      type="text"
                      value={currentMember.phone}
                      onChange={e => setCurrentMember(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="e.g. 9876543210"
                      className={`w-full px-3 py-2 border bg-slate-900/60 rounded-xl focus:outline-none text-white transition ${
                        !currentMember.phone
                          ? "border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.1)] focus:border-amber-500"
                          : "border-slate-800 focus:border-slate-700"
                      }`}
                    />
                  </div>

                  {/* Classification Type - highlighted if empty */}
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold uppercase tracking-wide flex justify-between">
                      <span>Employee Classification</span>
                      {!currentMember.employeeType && <span className="text-amber-500 text-[8px] font-bold font-mono">Missing in image</span>}
                    </label>
                    <select
                      value={currentMember.employeeType}
                      onChange={e => setCurrentMember(prev => ({ ...prev, employeeType: e.target.value as any }))}
                      className={`w-full px-3 py-2 border bg-slate-900 rounded-xl focus:outline-none text-white transition ${
                        !currentMember.employeeType
                          ? "border-amber-500/60 focus:border-amber-500"
                          : "border-slate-800 focus:border-slate-700"
                      }`}
                    >
                      <option value="">-- Choose Classification --</option>
                      <option value="worker">Worker (Daily wage rate)</option>
                      <option value="staff">Staff (Fixed Monthly salary)</option>
                    </select>
                  </div>

                  {/* Department - highlighted if empty */}
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold uppercase tracking-wide flex justify-between">
                      <span>Department</span>
                      {!currentMember.department && <span className="text-amber-500 text-[8px] font-bold">Missing</span>}
                    </label>
                    <input
                      type="text"
                      value={currentMember.department}
                      onChange={e => setCurrentMember(prev => ({ ...prev, department: e.target.value }))}
                      placeholder="e.g. Production, Packing, Sales"
                      className={`w-full px-3 py-2 border bg-slate-900/60 rounded-xl focus:outline-none text-white transition ${
                        !currentMember.department
                          ? "border-amber-500/60 focus:border-amber-500"
                          : "border-slate-800 focus:border-slate-700"
                      }`}
                    />
                  </div>

                  {/* Shift Selection */}
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold uppercase tracking-wide">
                      Shift timings
                    </label>
                    <select
                      value={currentMember.shift}
                      onChange={e => setCurrentMember(prev => ({ ...prev, shift: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-800 bg-slate-900 rounded-xl focus:outline-none text-white"
                    >
                      <option value="General Shift (09:00 AM - 05:00 PM)">General Shift (09:00 AM - 05:00 PM)</option>
                      <option value="Shift 1 (06:00 AM - 02:00 PM)">Shift 1 (06:00 AM - 02:00 PM)</option>
                      <option value="Shift 2 (02:00 PM - 10:00 PM)">Shift 2 (02:00 PM - 10:00 PM)</option>
                      <option value="Shift 3 (10:00 PM - 06:00 AM)">Shift 3 (10:00 PM - 06:00 AM)</option>
                    </select>
                  </div>

                  {/* Base Salary */}
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold uppercase tracking-wide">
                      Salary Baseline ({currentMember.employeeType === "staff" ? "Monthly" : "Daily"})
                    </label>
                    <input
                      type="number"
                      value={currentMember.salary || ""}
                      onChange={e => setCurrentMember(prev => ({ ...prev, salary: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-slate-800 bg-slate-900/60 rounded-xl focus:outline-none focus:border-slate-700 text-white font-semibold"
                    />
                  </div>

                  {/* Attendance status mapping */}
                  <div>
                    <label className="block text-slate-500 mb-2.5 font-semibold uppercase tracking-wide">
                      Attendance mapped from image
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-center text-[9px] font-bold uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => setCurrentMember(prev => ({ ...prev, attendanceStatus: "present" }))}
                        className={`py-2 border rounded-lg transition duration-150 cursor-pointer ${
                          currentMember.attendanceStatus === "present"
                            ? "bg-emerald-600 border-emerald-600 text-white shadow shadow-emerald-500/10"
                            : "border-slate-800 text-slate-550 hover:bg-slate-900"
                        }`}
                      >
                        Present (Checkmarked)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentMember(prev => ({ ...prev, attendanceStatus: "absent" }))}
                        className={`py-2 border rounded-lg transition duration-150 cursor-pointer ${
                          currentMember.attendanceStatus === "absent"
                            ? "bg-red-600 border-red-600 text-white shadow shadow-red-500/10"
                            : "border-slate-800 text-slate-550 hover:bg-slate-900"
                        }`}
                      >
                        Absent / Not marked
                      </button>
                    </div>
                  </div>

                </div>

              </div>

              {/* Wizard Action controls */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-850 shrink-0">
                <button
                  type="button"
                  onClick={handleWizardSkip}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400 border border-slate-800 hover:border-red-900/30 hover:bg-red-950/25 px-4 py-2.5 rounded-2xl cursor-pointer transition active:scale-95 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Discard entry
                </button>

                <button
                  type="button"
                  onClick={handleWizardNext}
                  disabled={!currentMember.name.trim() || !currentMember.phone.trim() || !currentMember.employeeType || !currentMember.department.trim()}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white font-bold text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-2xl shadow-lg cursor-pointer transition duration-150 active:scale-95"
                >
                  {wizardIndex + 1 === extractedList.length ? "Finish & Review" : "Approve & Next"} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}

          {/* FINAL REVIEW GRID */}
          {step === "review" && (
            <div className="space-y-4">
              
              <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-950 border border-slate-850 rounded-2xl gap-3.5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-850 text-blue-500">
                    <Calendar className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Daily Attendance Sync Date</h4>
                    <p className="text-[9px] text-slate-500">
                      Roster logs and daily status updates will be synchronized for this target date.
                    </p>
                  </div>
                </div>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={e => setAttendanceDate(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none font-bold scheme-dark shrink-0 cursor-pointer"
                />
              </div>

              {/* Review Employee Listing Table */}
              <div className="border border-slate-850 rounded-2xl bg-slate-950/40 overflow-hidden text-[10px]">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-slate-950 text-slate-450 uppercase tracking-wider font-extrabold border-b border-slate-850">
                    <tr>
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Phone</th>
                      <th className="px-4 py-2.5">Department</th>
                      <th className="px-4 py-2.5 text-center">Type</th>
                      <th className="px-4 py-2.5 text-right">Baseline Rate</th>
                      <th className="px-4 py-2.5 text-right">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60">
                    {extractedList.map((emp, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/35">
                        <td className="px-4 py-2.5 font-bold text-white">{emp.name}</td>
                        <td className="px-4 py-2.5 text-slate-500">{emp.phone}</td>
                        <td className="px-4 py-2.5 text-slate-400">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-850 font-semibold">
                            {emp.department}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center uppercase tracking-wider font-bold">
                          <span className={emp.employeeType === "staff" ? "text-indigo-400" : "text-amber-400"}>
                            {emp.employeeType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold">
                          {emp.salary} <span className="text-[8px] text-slate-550 font-sans">{emp.employeeType === "staff" ? "/mo" : "/day"}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[8px] border ${
                            emp.attendanceStatus === "present"
                              ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/30"
                              : "bg-red-950/40 text-red-400 border-red-900/30"
                          }`}>
                            {emp.attendanceStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-850 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setWizardIndex(0);
                    loadWizardMember(extractedList[0]);
                    setStep("wizard");
                  }}
                  className="border border-slate-800 hover:bg-slate-800 font-semibold px-4.5 py-2.5 rounded-2xl transition cursor-pointer text-xs"
                >
                  Back to edits
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={commitToWorkspace}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-6 py-2.5 rounded-2xl shadow-lg cursor-pointer transition active:scale-95 text-xs"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Commit Roster & daily logs ({extractedList.length} members)
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* SUCCESS SCREEN */}
          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-5 text-center">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full shadow-lg shadow-emerald-500/5">
                <CheckCircle className="w-10 h-10 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-white">Roster Committed Successfully!</h4>
                <p className="text-[10px] text-slate-500 max-w-sm leading-relaxed mx-auto">
                  All extracted members have been registered in the database, and their daily attendance status has been logged for {new Date(attendanceDate).toLocaleDateString()}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetAll();
                  onImportComplete();
                  onClose();
                }}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-750 px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-2xl cursor-pointer active:scale-95 transition"
              >
                Close Scanner
              </button>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}
