import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { Attendance } from "@/models/Attendance";
import { Payroll } from "@/models/Payroll";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const shiftFilter = searchParams.get("shift");

    await connectToDatabase();

    const companyId = session.user.companyId;

    // 1. Core aggregates (filtered by shift)
    const empQuery: any = { companyId, status: "active" };
    if (shiftFilter && shiftFilter !== "all") {
      empQuery.shift = shiftFilter;
    }
    const totalEmployees = await Employee.countDocuments(empQuery);

    // Fetch last 30 days of attendance
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendanceQuery: any = {
      companyId,
      date: { $gte: thirtyDaysAgo },
    };

    if (shiftFilter && shiftFilter !== "all") {
      const shiftEmployees = await Employee.find({ companyId, shift: shiftFilter }).select("_id");
      const employeeIds = shiftEmployees.map((e) => e._id);
      attendanceQuery.employeeId = { $in: employeeIds };
    }

    const attendances = await Attendance.find(attendanceQuery).populate("employeeId", "name department employeeType");

    // Aggregate statistics in memory
    const employeeStats: Record<string, { name: string; dept: string; present: number; absent: number; halfDay: number; ot: number; total: number }> = {};
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalHalfDay = 0;
    let totalOtHours = 0;

    attendances.forEach((att) => {
      const emp = att.employeeId as any;
      if (!emp) return;

      const empId = emp._id.toString();
      if (!employeeStats[empId]) {
        employeeStats[empId] = {
          name: emp.name,
          dept: emp.department,
          present: 0,
          absent: 0,
          halfDay: 0,
          ot: 0,
          total: 0,
        };
      }

      employeeStats[empId].total++;
      employeeStats[empId].ot += att.otHours || 0;
      totalOtHours += att.otHours || 0;

      if (att.status === "present") {
        employeeStats[empId].present++;
        totalPresent++;
      } else if (att.status === "absent") {
        employeeStats[empId].absent++;
        totalAbsent++;
      } else if (att.status === "half_day") {
        employeeStats[empId].halfDay++;
        totalHalfDay++;
      }
    });

    // 2. Identify anomalies
    const frequentAbsentees: any[] = [];
    const highOtWorkers: any[] = [];

    Object.values(employeeStats).forEach((stat) => {
      const rate = stat.total > 0 ? (stat.absent + stat.halfDay * 0.5) / stat.total : 0;
      if (rate > 0.15 && stat.total >= 3) {
        frequentAbsentees.push({
          name: stat.name,
          department: stat.dept,
          absentDays: stat.absent + stat.halfDay * 0.5,
          totalTracked: stat.total,
          absentRate: Math.round(rate * 100),
        });
      }

      if (stat.ot > 15) {
        highOtWorkers.push({
          name: stat.name,
          department: stat.dept,
          otHours: stat.ot,
        });
      }
    });

    // Fetch payroll summary of last generated month
    const latestPayroll = await Payroll.find({ companyId })
      .sort({ year: -1, month: -1 })
      .limit(30)
      .populate("employeeId", "name");

    const totalSalaryPayable = latestPayroll.reduce((acc, curr) => acc + curr.netSalary, 0);
    const totalOtPayout = latestPayroll.reduce((acc, curr) => acc + curr.otAmount, 0);

    // 3. Construct prompt for Groq
    const companyContext = `
AttendMind Organization Statistics (Last 30 Days):
- Total Active Employees: ${totalEmployees}
- Attendance Rate: ${totalPresent + totalHalfDay > 0 ? Math.round(((totalPresent + totalHalfDay * 0.5) / (totalPresent + totalAbsent + totalHalfDay)) * 100) : 0}%
- Total Overtime Hours Worked: ${totalOtHours} hours
- Frequent Absentees (Absent > 15%): ${JSON.stringify(frequentAbsentees)}
- High Overtime Workers (>15 hours): ${JSON.stringify(highOtWorkers)}
- Last Run Payroll: Total Payout ${totalSalaryPayable} (Overtime Component: ${totalOtPayout})
`;

    const systemPrompt = `
You are the expert Workforce Intelligence Analyst for AttendMind.
Analyze the provided company statistics and generate a JSON response with high-value insights, forecasting, and smart alerts.
Do not provide standard generic text. Make the advice highly specific, professional, and actionable.

Format your output exactly as a single raw JSON object:
{
  "summary": "Brief executive analysis of current attendance & workforce status.",
  "insights": [
    "Insight 1 (e.g. Trend analysis in a specific department)",
    "Insight 2 (e.g. Overtime costs explanation)"
  ],
  "alerts": [
    "Alert 1 (e.g. High absenteeism detection for specific employees)",
    "Alert 2 (e.g. Missing records warning)"
  ],
  "forecasting": "Salary and budget projection statement based on current trends."
}
`;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: companyContext },
        ],
        temperature: 0.3,
      }),
    });

    if (!groqResponse.ok) {
      return NextResponse.json({ error: "Failed to generate AI insights" }, { status: 502 });
    }

    const responseData = await groqResponse.json();
    const parsedText = responseData.choices[0]?.message?.content?.trim();

    let cleanJson = parsedText;
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.slice(7);
    }
    if (cleanJson.endsWith("```")) {
      cleanJson = cleanJson.slice(0, -3);
    }
    cleanJson = cleanJson.trim();

    const insightsJson = JSON.parse(cleanJson);
    return NextResponse.json(insightsJson);
  } catch (error: any) {
    console.error("AI Insights compilation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
