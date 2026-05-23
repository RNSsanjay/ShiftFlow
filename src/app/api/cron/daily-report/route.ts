import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Attendance } from "@/models/Attendance";
import { sendDailyAttendanceCsvEmail } from "@/lib/email";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date"); // Optional YYYY-MM-DD override for testing
    
    await connectToDatabase();

    let start = new Date();
    let end = new Date();

    if (dateParam) {
      const parsedDate = new Date(dateParam);
      if (!isNaN(parsedDate.getTime())) {
        start = new Date(parsedDate);
        end = new Date(parsedDate);
      }
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Fetch all attendance logs for the target date
    const records = await Attendance.find({
      date: { $gte: start, $lte: end },
    })
      .populate("employeeId")
      .populate("companyId");

    const dateStr = start.toISOString().split("T")[0];

    // Format the records into a CSV layout
    let csvContent = "Company Name,Employee Name,Status,Check-In,Check-Out,Overtime Hours,Notes\n";

    if (records.length > 0) {
      records.forEach((record: any) => {
        const companyName = record.companyId?.name || "N/A";
        const employeeName = record.employeeId?.name || "N/A";
        const status = record.status || "absent";
        const checkIn = record.checkIn || "-";
        const checkOut = record.checkOut || "-";
        const otHours = record.otHours || 0;
        const notes = record.notes ? `"${record.notes.replace(/"/g, '""')}"` : "-";

        csvContent += `"${companyName}","${employeeName}","${status}","${checkIn}","${checkOut}",${otHours},${notes}\n`;
      });
    } else {
      csvContent += "No attendance records found for this date,-,-,-,-,0,-\n";
    }

    // Retrieve default target email
    const targetEmail = process.env.DEFAULT_FROM_EMAIL || "sanjay.n.aiml.2022@snsct.org";

    // Dispatch email with attachment
    const info = await sendDailyAttendanceCsvEmail(targetEmail, dateStr, csvContent);

    return NextResponse.json({
      message: `Daily attendance CSV report for ${dateStr} dispatched successfully.`,
      targetEmail,
      recordsCompiled: records.length,
      messageId: info.messageId,
    }, { status: 200 });

  } catch (error: any) {
    console.error("Daily report cron error:", error);
    return NextResponse.json(
      { error: "An error occurred compiling the daily attendance CSV report." },
      { status: 500 }
    );
  }
}
