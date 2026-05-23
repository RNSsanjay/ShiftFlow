import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Employee, IEmployee } from "@/models/Employee";
import { Attendance, IAttendance } from "@/models/Attendance";
import { Company } from "@/models/Company";
import { Payroll } from "@/models/Payroll";
import { SalaryAdvance } from "@/models/SalaryAdvance";
import { UserRole } from "@/models/User";
import { sendSystemNotificationEmail } from "@/lib/email";

// Helper to get number of days in month
const getDaysInMonth = (month: number, year: number) => {
  return new Date(year, month, 0).getDate();
};

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = Number(searchParams.get("month")); // 1-12
    const year = Number(searchParams.get("year"));
    const generateDraft = searchParams.get("draft") === "true";

    if (!month || !year || isNaN(month) || isNaN(year)) {
      return NextResponse.json({ error: "Valid Month and Year parameters are required" }, { status: 400 });
    }

    await connectToDatabase();

    // Check if payroll already exists for this month/year
    const existingPayroll = await Payroll.find({
      companyId: session.user.companyId,
      month,
      year,
    }).populate("employeeId");

    if (existingPayroll.length > 0 && !generateDraft) {
      return NextResponse.json({ payrolls: existingPayroll, isDraft: false });
    }

    // Generate Draft Calculations
    const company = await Company.findById(session.user.companyId);
    if (!company) {
      return NextResponse.json({ error: "Company settings not found" }, { status: 404 });
    }

    const employees = await Employee.find({
      companyId: session.user.companyId,
      status: "active",
    });

    const daysInMonth = getDaysInMonth(month, year);
    
    // Start date and End date for query
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch all attendance for this period
    const attendanceRecords = await Attendance.find({
      companyId: session.user.companyId,
      date: { $gte: startDate, $lte: endDate },
    });

    // Fetch all approved salary advances for this period
    const advances = await SalaryAdvance.find({
      companyId: session.user.companyId,
      status: "approved",
      date: { $gte: startDate, $lte: endDate },
    });

    const attendanceByEmployee: Record<string, IAttendance[]> = {};
    attendanceRecords.forEach((att) => {
      const empId = att.employeeId.toString();
      if (!attendanceByEmployee[empId]) {
        attendanceByEmployee[empId] = [];
      }
      attendanceByEmployee[empId].push(att);
    });

    const advancesByEmployee: Record<string, number> = {};
    advances.forEach((adv) => {
      const empId = adv.employeeId.toString();
      advancesByEmployee[empId] = (advancesByEmployee[empId] || 0) + adv.amount;
    });

    const draftPayrolls = employees.map((emp) => {
      const empId = emp._id.toString();
      const records = attendanceByEmployee[empId] || [];
      const advanceDeduction = advancesByEmployee[empId] || 0;

      // Count metrics
      let presentDays = 0;
      let absentDays = 0;
      let halfDays = 0;
      let leaveDays = 0;
      let holidayDays = 0;
      let totalOtHours = 0;

      records.forEach((r) => {
        if (r.status === "present") presentDays++;
        else if (r.status === "absent") absentDays++;
        else if (r.status === "half_day") halfDays++;
        else if (r.status === "leave") leaveDays++;
        else if (r.status === "holiday") holidayDays++;
        
        if (emp.otEligible && r.otHours > 0) {
          totalOtHours += r.otHours;
        }
      });

      // Staff Salary vs Worker Salary
      let earnedSalary = 0;
      let baseSalary = emp.salary; // Fixed Monthly for Staff, Daily rate for Worker

      if (emp.employeeType === "staff") {
        // Staff: fixed monthly salary. Deductions for absences.
        // Paid days = total days in month - absent days - (0.5 * half days)
        const unpaidDays = absentDays + (halfDays * 0.5);
        const dailyRate = baseSalary / daysInMonth;
        earnedSalary = Math.max(0, baseSalary - (unpaidDays * dailyRate));
      } else {
        // Worker: daily wage based. Paid days = present days + (0.5 * half days) + (leaveDays/holidayDays as paid baseline)
        // Usually holidays and approved leaves might be paid or unpaid. Let's assume leaves are unpaid for workers, holidays are paid.
        const paidDays = presentDays + (halfDays * 0.5) + holidayDays;
        earnedSalary = paidDays * baseSalary;
      }

      // Overtime calculation
      let otRate = 0;
      if (emp.otEligible) {
        if (company.otType === "fixed") {
          otRate = company.fixedOtRate;
        } else {
          // normal ot hourly rate: Monthly salary / (working days * working hours)
          // For worker, daily salary is baseSalary. So hourly rate = daily wage / daily hours
          if (emp.employeeType === "worker") {
            otRate = baseSalary / company.workingHours;
          } else {
            // standard 26 working days for staff
            otRate = baseSalary / (26 * company.workingHours);
          }
        }
      }
      const otAmount = totalOtHours * otRate;

      // Statutory deductions
      let pfDeduction = 0;
      let esiDeduction = 0;
      let pfEmployerShare = 0;
      let esiEmployerShare = 0;

      if (company.pfEnabled && emp.pfEnabled) {
        pfDeduction = earnedSalary * (company.pfPercentage / 100);
        pfEmployerShare = earnedSalary * (company.pfEmployerPercentage / 100);
      }

      if (company.esiEnabled && emp.esiEnabled) {
        esiDeduction = earnedSalary * (company.esiPercentage / 100);
        esiEmployerShare = earnedSalary * (company.esiEmployerPercentage / 100);
      }

      const bonus = 0;
      const incentives = 0;
      
      const netSalary = Math.max(
        0,
        earnedSalary + otAmount + bonus + incentives - pfDeduction - esiDeduction - advanceDeduction
      );

      return {
        employeeId: emp,
        companyId: company._id,
        month,
        year,
        baseSalary,
        workingDays: daysInMonth,
        presentDays,
        absentDays,
        halfDays,
        otHours: totalOtHours,
        otAmount: Math.round(otAmount * 100) / 100,
        pfDeduction: Math.round(pfDeduction * 100) / 100,
        esiDeduction: Math.round(esiDeduction * 100) / 100,
        pfEmployerShare: Math.round(pfEmployerShare * 100) / 100,
        esiEmployerShare: Math.round(esiEmployerShare * 100) / 100,
        advanceDeduction: Math.round(advanceDeduction * 100) / 100,
        bonus,
        incentives,
        netSalary: Math.round(netSalary * 100) / 100,
        status: "draft",
      };
    });

    return NextResponse.json({ payrolls: draftPayrolls, isDraft: true });
  } catch (error: any) {
    console.error("Calculate payroll draft error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== UserRole.COMPANY_ADMIN && role !== UserRole.ACCOUNTANT) {
      return NextResponse.json({ error: "Forbidden: Accountant or Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { month, year, payrolls } = body; // payrolls: Array of payroll records to save/commit

    if (!month || !year || !Array.isArray(payrolls)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await connectToDatabase();

    const bulkOperations = payrolls.map((pay) => {
      const filter = {
        employeeId: pay.employeeId,
        month,
        year,
      };

      const update = {
        companyId: session.user.companyId,
        baseSalary: pay.baseSalary,
        workingDays: pay.workingDays,
        presentDays: pay.presentDays,
        absentDays: pay.absentDays,
        halfDays: pay.halfDays,
        otHours: pay.otHours,
        otAmount: pay.otAmount,
        pfDeduction: pay.pfDeduction,
        esiDeduction: pay.esiDeduction,
        pfEmployerShare: pay.pfEmployerShare,
        esiEmployerShare: pay.esiEmployerShare,
        advanceDeduction: pay.advanceDeduction,
        bonus: pay.bonus || 0,
        incentives: pay.incentives || 0,
        netSalary: pay.netSalary,
        status: pay.status || "draft",
        generatedBy: session.user.id,
        paidAt: pay.status === "paid" ? new Date() : undefined,
      };

      return {
        updateOne: {
          filter,
          update: { $set: update },
          upsert: true,
        },
      };
    });

    if (bulkOperations.length > 0) {
      await Payroll.bulkWrite(bulkOperations as any);

      // If status is paid, update SalaryAdvances to 'deducted'
      const employeeIds = payrolls.map((p) => p.employeeId);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      await SalaryAdvance.updateMany(
        {
          companyId: session.user.companyId,
          employeeId: { $in: employeeIds },
          status: "approved",
          date: { $gte: startDate, $lte: endDate },
        },
        { $set: { status: "deducted" } }
      );

      // Send summary notification email to user
      if (session.user.email) {
        try {
          const totalNetSalary = payrolls.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0);
          await sendSystemNotificationEmail(
            session.user.email,
            "Payroll Registry Finalised",
            `The payroll registry for period ${month}/${year} has been successfully saved to the ledger. Processed wages for ${payrolls.length} employee profiles. Total Net Disbursement amount: ${totalNetSalary.toLocaleString()} units.`
          );
        } catch (mailErr) {
          console.error("Failed to send payroll commit confirmation email:", mailErr);
        }
      }
    }

    return NextResponse.json({
      message: `Successfully processed payroll for ${payrolls.length} employees`,
    });
  } catch (error: any) {
    console.error("Save payroll error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
