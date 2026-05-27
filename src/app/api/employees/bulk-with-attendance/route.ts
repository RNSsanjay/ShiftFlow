import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { Attendance } from "@/models/Attendance";
import { UserRole } from "@/models/User";

export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== UserRole.COMPANY_ADMIN && role !== UserRole.HR) {
      return NextResponse.json({ error: "Forbidden: HR or Admin access required" }, { status: 403 });
    }

    const { employees, date } = await req.json(); // employees array, date is optional YYYY-MM-DD
    if (!Array.isArray(employees)) {
      return NextResponse.json({ error: "Invalid data format. Expected 'employees' array." }, { status: 400 });
    }

    await connectToDatabase();
    const companyId = session.user.companyId;

    // Use selected date or default to today (in local/server date)
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Fetch all existing employee phone numbers in the company to find duplicates/matches
    const existingEmployees = await Employee.find({ companyId });
    const existingEmpMap = new Map<string, string>(); // phone -> _id
    existingEmployees.forEach((emp) => {
      existingEmpMap.set(emp.phone.trim(), emp._id.toString());
    });

    let newCreatedCount = 0;
    let existingMatchedCount = 0;
    const attendanceOps: any[] = [];

    // Process employees
    for (const empData of employees) {
      const name = empData.name?.toString().trim();
      const phone = empData.phone?.toString().trim();
      const employeeType = empData.employeeType || "worker";
      const department = empData.department?.toString().trim() || "Operations";
      const salary = Number(empData.salary) || 0;
      const shift = empData.shift || "General Shift (09:00 AM - 05:00 PM)";
      const attendanceStatus = empData.attendanceStatus === "absent" ? "absent" : "present";

      if (!name || !phone) continue; // Skip incomplete items

      let empId = existingEmpMap.get(phone);

      if (!empId) {
        // Create new employee since they don't exist
        const newEmp = new Employee({
          name,
          phone,
          employeeType,
          department,
          salary,
          shift,
          companyId,
          joiningDate: new Date(),
          status: "active",
          otEligible: true,
          pfEnabled: false, // Default to false (optional taxes)
          esiEnabled: false,
        });
        const saved = await newEmp.save();
        empId = saved._id.toString();
        newCreatedCount++;
        // Add to map to handle duplicate entries in the uploaded sheet
        existingEmpMap.set(phone, empId);
      } else {
        existingMatchedCount++;
      }

      // Prepare Attendance record upsert
      attendanceOps.push({
        updateOne: {
          filter: { employeeId: empId, date: targetDate },
          update: {
            $set: {
              companyId,
              status: attendanceStatus,
              otHours: 0,
              markedBy: session.user.id,
              notes: "Logged via AI Roster Scanner Upload",
            },
          },
          upsert: true,
        },
      });
    }

    // Execute bulk write for attendance
    if (attendanceOps.length > 0) {
      await Attendance.bulkWrite(attendanceOps);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${attendanceOps.length} roster entries.`,
      newEmployeesCount: newCreatedCount,
      existingEmployeesCount: existingMatchedCount,
      attendanceLoggedCount: attendanceOps.length,
    });
  } catch (error: any) {
    console.error("Bulk upload with attendance error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
