import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Company } from "@/models/Company";
import { User, UserRole } from "@/models/User";
import { Attendance } from "@/models/Attendance";
import { sendSystemNotificationEmail } from "@/lib/email";

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // Get all companies
    const companies = await Company.find({});
    const alertsDispatched: string[] = [];

    for (const company of companies) {
      // Check if attendance is marked today for this company
      const hasRecords = await Attendance.exists({
        companyId: company._id,
        date: { $gte: start, $lte: end },
      });

      if (!hasRecords) {
        // Find the company administrator
        const adminUser = await User.findOne({
          companyId: company._id,
          role: UserRole.COMPANY_ADMIN,
        });

        if (adminUser && adminUser.email) {
          try {
            await sendSystemNotificationEmail(
              adminUser.email,
              "Action Required: Daily Attendance Reminder",
              `This is an automated reminder that no attendance records have been logged today for your organization "${company.name}". Please log into the console dashboard and record shifts to ensure correct payroll cycles.`
            );
            alertsDispatched.push(adminUser.email);
          } catch (mailErr) {
            console.error(`Failed to send reminder email to ${adminUser.email}:`, mailErr);
          }
        }
      }
    }

    return NextResponse.json({
      message: "Attendance reminder scan executed successfully.",
      missedCount: alertsDispatched.length,
      alertsDispatched,
    }, { status: 200 });

  } catch (error: any) {
    console.error("Attendance reminder cron error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during attendance scan." },
      { status: 500 }
    );
  }
}
