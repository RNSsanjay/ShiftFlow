import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Attendance } from "@/models/Attendance";
import { Employee } from "@/models/Employee";
import { UserRole } from "@/models/User";
import { sendSystemNotificationEmail } from "@/lib/email";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date"); // YYYY-MM-DD
    if (!dateStr) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
    }

    const queryDate = new Date(dateStr);
    queryDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(queryDate);
    nextDay.setDate(queryDate.getDate() + 1);

    await connectToDatabase();

    // 1. Get all active employees
    const employees = await Employee.find({
      companyId: session.user.companyId,
      status: "active",
    }).sort({ name: 1 });

    // 2. Get attendance for the date range
    const attendanceRecords = await Attendance.find({
      companyId: session.user.companyId,
      date: { $gte: queryDate, $lt: nextDay },
    });

    const attendanceMap = new Map(
      attendanceRecords.map((r) => [r.employeeId.toString(), r])
    );

    // Merge employees with their attendance records
    const results = employees.map((emp) => {
      const record = attendanceMap.get(emp._id.toString());
      return {
        employee: emp,
        attendance: record || {
          status: "present", // default option
          otHours: 0,
          notes: "",
          isNew: true,
        },
      };
    });

    return NextResponse.json({ records: results });
  } catch (error: any) {
    console.error("Fetch attendance error:", error);
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
    if (
      role !== UserRole.COMPANY_ADMIN &&
      role !== UserRole.HR &&
      role !== UserRole.MAINTAINER
    ) {
      return NextResponse.json({ error: "Forbidden: Maintainer, HR, or Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { date, records } = body; // date: YYYY-MM-DD, records: Array of { employeeId, status, otHours, notes, checkIn, checkOut }

    if (!date || !Array.isArray(records)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    await connectToDatabase();

    const bulkOperations = records.map((rec) => {
      const filter = {
        employeeId: rec.employeeId,
        date: queryDate,
      };

      const update = {
        companyId: session.user.companyId,
        status: rec.status,
        checkIn: rec.checkIn || undefined,
        checkOut: rec.checkOut || undefined,
        otHours: Number(rec.otHours) || 0,
        notes: rec.notes || "",
        markedBy: session.user.id,
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
      await Attendance.bulkWrite(bulkOperations as any);

      // Send summary notification email to user
      if (session.user.email) {
        try {
          const presentCount = records.filter(
            (r: any) => r.status === "present" || r.status === "half_day"
          ).length;
          await sendSystemNotificationEmail(
            session.user.email,
            "Daily Attendance Committed",
            `A daily shift log for ${date} has been saved to the database. Total employees processed: ${records.length} (${presentCount} marked present/half-day).`
          );
        } catch (mailErr) {
          console.error("Failed to send attendance commit confirmation email:", mailErr);
        }
      }
    }

    return NextResponse.json({
      message: `Successfully marked attendance for ${records.length} employees`,
    });
  } catch (error: any) {
    console.error("Save attendance error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
