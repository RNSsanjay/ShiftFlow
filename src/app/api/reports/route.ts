import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { Attendance } from "@/models/Attendance";
import { Payroll } from "@/models/Payroll";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // attendance, payroll, ot, pf, esi, employee
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));
    const department = searchParams.get("department");

    if (!type) {
      return NextResponse.json({ error: "Report type is required" }, { status: 400 });
    }

    await connectToDatabase();

    const companyId = session.user.companyId;

    // Filter query for employees
    const empQuery: any = { companyId };
    if (department && department !== "all") {
      empQuery.department = department;
    }

    const employees = await Employee.find(empQuery).select("name phone department employeeType status salary");
    const employeeIds = employees.map((e) => e._id);

    if (type === "employee") {
      return NextResponse.json({ data: employees });
    }

    if (!month || !year || isNaN(month) || isNaN(year)) {
      return NextResponse.json({ error: "Month and Year parameters are required for this report" }, { status: 400 });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    if (type === "attendance") {
      const records = await Attendance.find({
        companyId,
        employeeId: { $in: employeeIds },
        date: { $gte: startDate, $lte: endDate },
      }).populate("employeeId", "name department");

      return NextResponse.json({ data: records });
    }

    if (type === "payroll") {
      const records = await Payroll.find({
        companyId,
        employeeId: { $in: employeeIds },
        month,
        year,
      }).populate("employeeId", "name department employeeType");

      const totals = records.reduce(
        (acc, curr) => {
          acc.baseSalary += curr.baseSalary;
          acc.otAmount += curr.otAmount;
          acc.pfDeduction += curr.pfDeduction;
          acc.esiDeduction += curr.esiDeduction;
          acc.advanceDeduction += curr.advanceDeduction;
          acc.bonus += curr.bonus;
          acc.incentives += curr.incentives;
          acc.netSalary += curr.netSalary;
          return acc;
        },
        { baseSalary: 0, otAmount: 0, pfDeduction: 0, esiDeduction: 0, advanceDeduction: 0, bonus: 0, incentives: 0, netSalary: 0 }
      );

      return NextResponse.json({ data: records, totals });
    }

    if (type === "ot") {
      const records = await Payroll.find({
        companyId,
        employeeId: { $in: employeeIds },
        month,
        year,
        otHours: { $gt: 0 },
      }).populate("employeeId", "name department employeeType");

      const totals = records.reduce(
        (acc, curr) => {
          acc.otHours += curr.otHours;
          acc.otAmount += curr.otAmount;
          return acc;
        },
        { otHours: 0, otAmount: 0 }
      );

      return NextResponse.json({ data: records, totals });
    }

    if (type === "pf") {
      const records = await Payroll.find({
        companyId,
        employeeId: { $in: employeeIds },
        month,
        year,
      }).populate("employeeId", "name department");

      const filteredRecords = records.filter(r => r.pfDeduction > 0 || r.pfEmployerShare > 0);

      const totals = filteredRecords.reduce(
        (acc, curr) => {
          acc.employeePf += curr.pfDeduction;
          acc.employerPf += curr.pfEmployerShare;
          acc.totalPf += curr.pfDeduction + curr.pfEmployerShare;
          return acc;
        },
        { employeePf: 0, employerPf: 0, totalPf: 0 }
      );

      return NextResponse.json({ data: filteredRecords, totals });
    }

    if (type === "esi") {
      const records = await Payroll.find({
        companyId,
        employeeId: { $in: employeeIds },
        month,
        year,
      }).populate("employeeId", "name department");

      const filteredRecords = records.filter(r => r.esiDeduction > 0 || r.esiEmployerShare > 0);

      const totals = filteredRecords.reduce(
        (acc, curr) => {
          acc.employeeEsi += curr.esiDeduction;
          acc.employerEsi += curr.esiEmployerShare;
          acc.totalEsi += curr.esiDeduction + curr.esiEmployerShare;
          return acc;
        },
        { employeeEsi: 0, employerEsi: 0, totalEsi: 0 }
      );

      return NextResponse.json({ data: filteredRecords, totals });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error: any) {
    console.error("Fetch report error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
