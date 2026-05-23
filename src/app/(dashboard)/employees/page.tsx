"use client";

import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Users,
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Trash2,
  Edit,
  Upload,
  X,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface EmployeeType {
  _id: string;
  name: string;
  phone: string;
  employeeType: "staff" | "worker";
  department: string;
  salary: number;
  joiningDate: string;
  status: "active" | "inactive";
  otEligible: boolean;
  pfEnabled: boolean;
  esiEnabled: boolean;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filters
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [departments, setDepartments] = useState<string[]>([]);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // Form State
  const [formEmployee, setFormEmployee] = useState({
    _id: "",
    name: "",
    phone: "",
    employeeType: "worker",
    department: "",
    salary: 0,
    joiningDate: new Date().toISOString().split("T")[0],
    otEligible: true,
    pfEnabled: true,
    esiEnabled: true,
    status: "active",
  });

  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Bulk Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const [bulkHasErrors, setBulkHasErrors] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");

  // Fetch Employees
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedDept !== "all") params.append("department", selectedDept);
      if (selectedStatus !== "all") params.append("status", selectedStatus);

      const res = await fetch(`/api/employees?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
        
        // Extract unique departments
        const depts = new Set<string>();
        (data.employees || []).forEach((e: any) => {
          if (e.department) depts.add(e.department);
        });
        setDepartments(Array.from(depts));
      }
    } catch (err) {
      console.error("Fetch employees error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, selectedDept, selectedStatus]);

  // Download Sample Excel
  const downloadSampleExcel = () => {
    const headers = ["name", "phone", "employeeType", "department", "salary", "joiningDate"];
    const sampleRows = [
      { name: "Rajesh Kumar", phone: "9876543210", employeeType: "worker", department: "Yard", salary: 600, joiningDate: "2026-05-01" },
      { name: "Anjali Sharma", phone: "9876543211", employeeType: "staff", department: "HR", salary: 30000, joiningDate: "2026-04-15" },
    ];
    const worksheet = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sample Import");
    XLSX.writeFile(workbook, "attendmind_sample_employees.xlsx");
  };

  // Trigger Local XLSX read
  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFile(file);
    setBulkLoading(true);
    setBulkError("");

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const binaryStr = evt.target?.result;
        const workbook = XLSX.read(binaryStr, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        // Call backend for dry-run verification
        const res = await fetch("/api/employees/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employees: json,
            commit: false,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setBulkPreview(data.previewRows || []);
          setBulkHasErrors(data.hasErrors || false);
        } else {
          setBulkError(data.error || "Failed to parse bulk file.");
        }
      } catch (err) {
        setBulkError("Error reading spreadsheet file.");
      } finally {
        setBulkLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Commit Excel upload to database
  const handleCommitBulk = async () => {
    if (bulkHasErrors || bulkPreview.length === 0) return;
    setBulkLoading(true);
    try {
      const records = bulkPreview.map((p) => p.row);
      const res = await fetch("/api/employees/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employees: records,
          commit: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBulkModalOpen(false);
        setBulkPreview([]);
        setBulkFile(null);
        fetchEmployees();
      } else {
        setBulkError(data.error || "Failed to save records.");
      }
    } catch (err) {
      setBulkError("Network error occurred.");
    } finally {
      setBulkLoading(false);
    }
  };

  // Handle Create / Update Employee
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    const isEdit = !!formEmployee._id;
    const url = isEdit ? `/api/employees/${formEmployee._id}` : "/api/employees";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formEmployee),
      });

      const data = await res.json();
      if (res.ok) {
        setAddModalOpen(false);
        setEditModalOpen(false);
        fetchEmployees();
      } else {
        setFormError(data.error || "Failed to save employee profile.");
      }
    } catch (err) {
      setFormError("Network error occurred.");
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Delete Employee
  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee profile? This action will break past attendance references.")) return;
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchEmployees();
      } else {
        const d = await res.json();
        alert(d.error || "Delete failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAddModal = () => {
    setFormEmployee({
      _id: "",
      name: "",
      phone: "",
      employeeType: "worker",
      department: "",
      salary: 0,
      joiningDate: new Date().toISOString().split("T")[0],
      otEligible: true,
      pfEnabled: true,
      esiEnabled: true,
      status: "active",
    });
    setFormError("");
    setAddModalOpen(true);
  };

  const openEditModal = (emp: EmployeeType) => {
    setFormEmployee({
      _id: emp._id,
      name: emp.name,
      phone: emp.phone,
      employeeType: emp.employeeType,
      department: emp.department,
      salary: emp.salary,
      joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      otEligible: emp.otEligible,
      pfEnabled: emp.pfEnabled,
      esiEnabled: emp.esiEnabled,
      status: emp.status,
    });
    setFormError("");
    setEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> Employee Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your company roster, add workers, staff, or import in bulk.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setBulkModalOpen(true)}
            className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/60 text-xs font-semibold px-3 py-2 rounded-xl transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Bulk Import
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-md cursor-pointer transition active:scale-[0.98]"
          >
            <Plus className="w-4.5 h-4.5" /> Add Employee
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 p-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex flex-wrap gap-2.5">
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Profiles</option>
            <option value="inactive">Inactive Profiles</option>
          </select>
        </div>
      </div>

      {/* Employee List Grid/Table */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
          <span className="text-[10px] text-slate-400">Loading directory...</span>
        </div>
      ) : employees.length === 0 ? (
        <div className="p-8 text-center border border-slate-200/50 dark:border-slate-800/40 rounded-2xl bg-white dark:bg-slate-900/10">
          <p className="text-sm text-slate-400">No employee records match the search filter criteria.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-900/20">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">Name</th>
                <th className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">Phone</th>
                <th className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">Department</th>
                <th className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">Classification</th>
                <th className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">Salary Baseline</th>
                <th className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">Deductions</th>
                <th className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {employees.map((emp) => (
                <tr key={emp._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-slate-900 dark:text-white block">{emp.name}</span>
                    <span className="text-[10px] text-slate-400">Joined {new Date(emp.joiningDate).toLocaleDateString()}</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{emp.phone}</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold">{emp.department}</span>
                  </td>
                  <td className="px-5 py-3.5 uppercase tracking-wider font-bold">
                    <span className={emp.employeeType === "staff" ? "text-indigo-600 dark:text-indigo-400" : "text-amber-600 dark:text-amber-400"}>
                      {emp.employeeType}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-semibold">{emp.salary}</span>
                    <span className="text-[10px] text-slate-400 block">{emp.employeeType === "staff" ? "/month" : "/day"}</span>
                  </td>
                  <td className="px-5 py-3.5 text-[10px] text-slate-400 space-y-0.5">
                    {emp.pfEnabled && <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-1 rounded mr-1">PF</span>}
                    {emp.esiEnabled && <span className="bg-teal-500/10 text-teal-500 border border-teal-500/20 px-1 rounded mr-1">ESI</span>}
                    {emp.otEligible && <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 rounded">OT</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-1.5">
                    <button
                      onClick={() => openEditModal(emp)}
                      className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-500 transition cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(emp._id)}
                      className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-500 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add/Edit Employee Form */}
      <AnimatePresence>
        {(addModalOpen || editModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {editModalOpen ? "Modify Profile" : "Add New Employee"}
                </h3>
                <button
                  onClick={() => {
                    setAddModalOpen(false);
                    setEditModalOpen(false);
                  }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200/50 text-red-600 rounded-xl text-xs flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveEmployee} className="space-y-4 text-xs">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1">Employee Full Name</label>
                    <input
                      type="text"
                      required
                      value={formEmployee.name}
                      onChange={(e) => setFormEmployee((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Jane Doe"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={formEmployee.phone}
                      onChange={(e) => setFormEmployee((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="9876543210"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1">Department</label>
                    <input
                      type="text"
                      required
                      value={formEmployee.department}
                      onChange={(e) => setFormEmployee((prev) => ({ ...prev, department: e.target.value }))}
                      placeholder="Production, HR, Sales..."
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Classification Type</label>
                    <select
                      value={formEmployee.employeeType}
                      onChange={(e) => setFormEmployee((prev) => ({ ...prev, employeeType: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none"
                    >
                      <option value="worker">Worker (Daily Salary rate)</option>
                      <option value="staff">Staff (Fixed Monthly salary)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1">Salary Baseline</label>
                    <input
                      type="number"
                      required
                      value={formEmployee.salary}
                      onChange={(e) => setFormEmployee((prev) => ({ ...prev, salary: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Joining Date</label>
                    <input
                      type="date"
                      required
                      value={formEmployee.joiningDate}
                      onChange={(e) => setFormEmployee((prev) => ({ ...prev, joiningDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-950/20">
                  <span className="block font-semibold">Enable Statutory Benefits</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formEmployee.pfEnabled}
                        onChange={(e) => setFormEmployee((prev) => ({ ...prev, pfEnabled: e.target.checked }))}
                      />
                      <span>Provident Fund (PF)</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formEmployee.esiEnabled}
                        onChange={(e) => setFormEmployee((prev) => ({ ...prev, esiEnabled: e.target.checked }))}
                      />
                      <span>State Insurance (ESI)</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formEmployee.otEligible}
                        onChange={(e) => setFormEmployee((prev) => ({ ...prev, otEligible: e.target.checked }))}
                      />
                      <span>Overtime (OT)</span>
                    </label>
                  </div>
                </div>

                {editModalOpen && (
                  <div>
                    <label className="block text-slate-500 mb-1">Status</label>
                    <select
                      value={formEmployee.status}
                      onChange={(e) => setFormEmployee((prev) => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddModalOpen(false);
                      setEditModalOpen(false);
                    }}
                    className="border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-xl shadow-md transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Bulk Excel Importer & Verification Preview */}
      <AnimatePresence>
        {bulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-2xl space-y-5 my-8 max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> Excel Bulk Importer
                </h3>
                <button
                  onClick={() => {
                    setBulkModalOpen(false);
                    setBulkPreview([]);
                    setBulkFile(null);
                  }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Instructions / Template Download */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-blue-200/40 dark:border-blue-900/20 bg-blue-50/20 dark:bg-blue-950/10 rounded-xl gap-3 shrink-0">
                <div className="text-[11px] text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Spreadsheet Upload Requirements:</p>
                  <p>Columns required: <code className="bg-slate-100 dark:bg-slate-850 px-1 py-0.5 rounded text-blue-600">name, phone, employeeType, department, salary</code></p>
                  <p>employeeType must be either: <code className="text-indigo-500">staff</code> or <code className="text-amber-500">worker</code>.</p>
                </div>
                <button
                  onClick={downloadSampleExcel}
                  className="flex items-center gap-1 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" /> Template XLSX
                </button>
              </div>

              {/* File Upload Selector */}
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500/50 p-6 rounded-xl cursor-pointer bg-slate-50/30 dark:bg-slate-950/10 transition shrink-0 relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleBulkFileChange}
                  accept=".xlsx, .xls"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {bulkFile ? bulkFile.name : "Select Employee XLSX Spreadsheet"}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Click or drag spreadsheet file to upload</p>
              </div>

              {bulkLoading && (
                <div className="py-6 flex flex-col items-center justify-center shrink-0">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                  <span className="text-[10px] text-slate-400">Verifying records validity...</span>
                </div>
              )}

              {bulkError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200/50 text-red-600 rounded-xl text-xs flex gap-2 shrink-0">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{bulkError}</span>
                </div>
              )}

              {/* Verification Preview Grid */}
              {bulkPreview.length > 0 && (
                <div className="flex-1 overflow-y-auto min-h-[150px] border border-slate-100 dark:border-slate-800 rounded-xl text-[11px]">
                  <table className="w-full border-collapse text-left">
                    <thead className="bg-slate-50 dark:bg-slate-950 sticky top-0 font-semibold border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-3 py-2 text-slate-400">Line</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Department</th>
                        <th className="px-3 py-2">Salary</th>
                        <th className="px-3 py-2 text-right">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {bulkPreview.map((item) => {
                        const hasRowErrors = item.errors.length > 0;
                        return (
                          <tr key={item.index} className={hasRowErrors ? "bg-red-500/5 dark:bg-red-500/10" : ""}>
                            <td className="px-3 py-2 text-slate-400">{item.index}</td>
                            <td className="px-3 py-2 font-medium">{item.row.name || <span className="text-red-500">Missing</span>}</td>
                            <td className="px-3 py-2">{item.row.phone || <span className="text-red-500">Missing</span>}</td>
                            <td className="px-3 py-2 uppercase font-semibold">{item.row.employeeType || <span className="text-red-500">Missing</span>}</td>
                            <td className="px-3 py-2">{item.row.department || <span className="text-red-500">Missing</span>}</td>
                            <td className="px-3 py-2">{item.row.salary}</td>
                            <td className="px-3 py-2 text-right font-medium">
                              {hasRowErrors ? (
                                <div className="flex items-center justify-end gap-1 text-red-500" title={item.errors.join(", ")}>
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span className="text-[10px] hidden md:inline truncate max-w-[120px]">{item.errors[0]}</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1 text-emerald-500">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span className="text-[10px] hidden md:inline">Ok</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <span className="text-[10px] text-slate-400">
                  {bulkPreview.length > 0 ? (
                    bulkHasErrors ? (
                      <span className="text-red-500 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Errors detected. Resolve files issues before saving.
                      </span>
                    ) : (
                      <span className="text-emerald-500 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> All {bulkPreview.length} rows verified. Ready to save.
                      </span>
                    )
                  ) : ""}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkModalOpen(false);
                      setBulkPreview([]);
                      setBulkFile(null);
                    }}
                    className="border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-semibold px-3 py-1.5 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={bulkHasErrors || bulkPreview.length === 0 || bulkLoading}
                    onClick={handleCommitBulk}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-[11px] px-4 py-1.5 rounded-xl shadow-md transition cursor-pointer"
                  >
                    {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Import Roster"}
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
