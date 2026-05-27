import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { Attendance } from "@/models/Attendance";
import { Payroll } from "@/models/Payroll";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const shiftFilter = searchParams.get("shift"); // "all" or specific shift name

    await connectToDatabase();
    const companyId = session.user.companyId;

    // 1. Total Employees count (filtered by shift)
    const query: any = { companyId, status: "active" };
    if (shiftFilter && shiftFilter !== "all") {
      query.shift = shiftFilter;
    }
    const totalEmployees = await Employee.countDocuments(query);

    // 2. Attendance Stats - Today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const attendanceQuery: any = {
      companyId,
      date: { $gte: todayStart, $lte: todayEnd },
    };

    if (shiftFilter && shiftFilter !== "all") {
      const shiftEmployees = await Employee.find({ companyId, shift: shiftFilter }).select("_id");
      const employeeIds = shiftEmployees.map((e) => e._id);
      attendanceQuery.employeeId = { $in: employeeIds };
    }

    const attendancesToday = await Attendance.find(attendanceQuery);

    let presentToday = 0;
    let absentToday = 0;
    let halfDayToday = 0;
    let otWorkersToday = 0;

    attendancesToday.forEach((att) => {
      if (att.status === "present") presentToday++;
      else if (att.status === "absent") absentToday++;
      else if (att.status === "half_day") halfDayToday++;
      
      if (att.otHours > 0) {
        otWorkersToday++;
      }
    });

    const activeCheckedIn = presentToday + halfDayToday + absentToday;
    const attendancePercentage = totalEmployees > 0 
      ? Math.round(((presentToday + halfDayToday * 0.5) / totalEmployees) * 100) 
      : 0;

    // 3. Salary Payable & Payroll Summary (Latest month)
    const latestPayrolls = await Payroll.find({ companyId })
      .sort({ year: -1, month: -1 })
      .limit(100);

    const salaryPayable = latestPayrolls.reduce((sum, curr) => sum + curr.netSalary, 0);

    // 4. Chart 1: Attendance Trends (Last 7 Days)
    const last7DaysData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const dEnd = new Date(d);
      dEnd.setHours(23, 59, 59, 999);

      const dayQuery: any = {
        companyId,
        date: { $gte: d, $lte: dEnd },
      };

      if (shiftFilter && shiftFilter !== "all") {
        const shiftEmployees = await Employee.find({ companyId, shift: shiftFilter }).select("_id");
        const employeeIds = shiftEmployees.map((e) => e._id);
        dayQuery.employeeId = { $in: employeeIds };
      }

      const dayRecords = await Attendance.find(dayQuery);

      let pres = 0;
      let half = 0;
      let otHrs = 0;

      dayRecords.forEach((r) => {
        if (r.status === "present") pres++;
        else if (r.status === "half_day") half++;
        otHrs += r.otHours || 0;
      });

      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const rate = totalEmployees > 0 ? Math.round(((pres + half * 0.5) / totalEmployees) * 100) : 0;

      last7DaysData.push({
        day: dayName,
        rate,
        otHours: otHrs,
      });
    }

    // 5. Chart 2: Salary Trends (Last 6 Months)
    const monthlySalaryData = [];
    const monthsName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = targetMonth.getMonth() + 1;
      const y = targetMonth.getFullYear();

      const payRecords = await Payroll.find({
        companyId,
        month: m,
        year: y,
      });

      const totalSpent = payRecords.reduce((sum, p) => sum + p.netSalary, 0);

      monthlySalaryData.push({
        month: `${monthsName[m - 1]} ${y.toString().slice(-2)}`,
        payout: totalSpent,
      });
    }

    // 6. Department Distribution Aggregation
    const matchStage: any = { companyId: new mongoose.Types.ObjectId(companyId), status: "active" };
    if (shiftFilter && shiftFilter !== "all") {
      matchStage.shift = shiftFilter;
    }
    const departments = await Employee.aggregate([
      { $match: matchStage },
      { $group: { _id: "$department", count: { $sum: 1 } } }
    ]);
    const departmentDistribution = departments.map(d => ({
      name: d._id || "Unassigned",
      count: d.count
    }));

    // 7. Recent Activity Feed (dynamic database event log)
    const recentEmployees = await Employee.find({ companyId })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    const recentAttendance = await Attendance.find({ companyId })
      .sort({ updatedAt: -1 })
      .limit(3)
      .populate("employeeId", "name")
      .lean();

    const recentActivity: Array<{ id: string; type: string; title: string; description: string; time: string }> = [];

    recentEmployees.forEach((emp: any) => {
      recentActivity.push({
        id: `emp-${emp._id}`,
        type: "employee",
        title: "Employee Added",
        description: `${emp.name} was registered under ${emp.department || "Operations"}.`,
        time: emp.createdAt.toISOString(),
      });
    });

    recentAttendance.forEach((att: any) => {
      const empName = att.employeeId?.name || "A worker";
      const statusLabel = att.status.replace("_", " ").toUpperCase();
      recentActivity.push({
        id: `att-${att._id}`,
        type: "attendance",
        title: "Attendance Recorded",
        description: `Swipe entry for ${empName} was marked as ${statusLabel}.`,
        time: att.updatedAt.toISOString(),
      });
    });

    // Sort descending by time
    recentActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return NextResponse.json({
      totalEmployees,
      presentToday,
      absentToday,
      halfDayToday,
      otWorkersToday,
      attendancePercentage,
      salaryPayable,
      attendanceTrends: last7DaysData,
      salaryTrends: monthlySalaryData,
      departments: departmentDistribution,
      recentActivity: recentActivity.slice(0, 5)
    });
  } catch (error: any) {
    console.error("Dashboard stats aggregation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
