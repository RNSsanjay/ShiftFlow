import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { Attendance } from "@/models/Attendance";
import { Payroll } from "@/models/Payroll";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, date } = body; // date is optional YYYY-MM-DD

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    await connectToDatabase();
    const companyId = session.user.companyId;

    // 1. Gather rich real-time context about the organization to make the chatbot extremely smart
    const employees = await Employee.find({ companyId, status: "active" }).select("name department employeeType shift");
    const totalEmployees = employees.length;
    const employeeNames = employees.map((e) => e.name).join(", ");
    const departments = Array.from(new Set(employees.map((e) => e.department))).join(", ");
    const shifts = Array.from(new Set(employees.map((e) => e.shift || "General Shift (09:00 AM - 05:00 PM)"))).join(", ");

    // Today's attendance summary
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const attendancesToday = await Attendance.find({
      companyId,
      date: { $gte: todayStart, $lte: todayEnd },
    });

    let presentCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    attendancesToday.forEach((att) => {
      if (att.status === "present") presentCount++;
      else if (att.status === "absent") absentCount++;
      else if (att.status === "half_day") halfDayCount++;
    });

    const activeShift = (session.user as any).activeShift || "all";

    // 2. Call LLM to parse message, build the conversational response, and return any database action triggers
    const systemPrompt = `
You are the omnipresent ShiftFlow AI Assistant. You help managers interact with their workforce, fetch stats, and mark roster updates in a friendly, conversational manner.
Here is the real-time company metadata:
- Today's Date: ${new Date().toLocaleDateString()}
- Total Active Employees: ${totalEmployees}
- Employee Names: [${employeeNames}]
- Departments: [${departments}]
- Active Shifts: [${shifts}]
- Today's Attendance committed so far: Present: ${presentCount}, Absent: ${absentCount}, Half Day: ${halfDayCount}

Your task is to analyze the user's conversational message.
- If they ask a question (e.g., "how many workers do we have?", "what shifts exist?"), answer professionally and concisely.
- If they want to perform an administrative action (e.g., "mark Kumar present", "give Ramesh 500 bonus", "calculate payroll for May 2026"), determine the corresponding structured action parameters and build a reply confirming that you have successfully processed this change.

You must respond ONLY with a raw JSON object matching this schema (no markdown, no code blocks):
{
  "reply": "Friendly, professional text answer to user's question, or confirmation of action execution.",
  "action": "mark_attendance" | "add_adjustment" | "generate_payroll" | "none",
  "target": "name_match" | "department_match" | "all" | "none",
  "name": "string (exact matched employee name from organization list, or empty)",
  "department": "string (exact matched department name from organization list, or empty)",
  "status": "present" | "absent" | "half_day" | "leave" | "holiday" | "none",
  "otHours": number (default 0),
  "bonus": number (default 0),
  "incentive": number (default 0),
  "month": number (1-12, default 0),
  "year": number (default 0)
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
          { role: "user", content: message },
        ],
        temperature: 0.2,
      }),
    });

    if (!groqResponse.ok) {
      return NextResponse.json({ error: "Failed to communicate with LLM" }, { status: 502 });
    }

    const responseData = await groqResponse.json();
    let cleanJson = responseData.choices[0]?.message?.content?.trim() || "{}";
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.slice(7);
    }
    if (cleanJson.endsWith("```")) {
      cleanJson = cleanJson.slice(0, -3);
    }
    cleanJson = cleanJson.trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // 3. Execute actions in MongoDB if an action was identified
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    let actionExecuted = false;

    if (parsed.action === "mark_attendance") {
      if (parsed.target === "name_match" && parsed.name) {
        const emp = await Employee.findOne({
          companyId,
          name: { $regex: new RegExp(`^${parsed.name}$`, "i") },
          status: "active",
        });

        if (emp) {
          await Attendance.updateOne(
            { employeeId: emp._id, date: targetDate },
            {
              $set: {
                companyId,
                status: parsed.status || "present",
                otHours: parsed.otHours || 0,
                markedBy: session.user.id,
                notes: "Marked via Floating Chat: " + message,
              },
            },
            { upsert: true }
          );
          actionExecuted = true;
        }
      } else if (parsed.target === "department_match" && parsed.department) {
        const deptEmployees = await Employee.find({
          companyId,
          department: { $regex: new RegExp(`^${parsed.department}$`, "i") },
          status: "active",
        });

        if (deptEmployees.length > 0) {
          const bulkOps = deptEmployees.map((emp) => ({
            updateOne: {
              filter: { employeeId: emp._id, date: targetDate },
              update: {
                $set: {
                  companyId,
                  status: parsed.status || "present",
                  otHours: parsed.otHours || 0,
                  markedBy: session.user.id,
                  notes: "Marked via Floating Chat (Bulk): " + message,
                },
              },
              upsert: true,
            },
          }));
          await Attendance.bulkWrite(bulkOps as any);
          actionExecuted = true;
        }
      }
    } else if (parsed.action === "add_adjustment" && parsed.name) {
      const emp = await Employee.findOne({
        companyId,
        name: { $regex: new RegExp(`^${parsed.name}$`, "i") },
        status: "active",
      });

      if (emp) {
        const currentMonth = targetDate.getMonth() + 1;
        const currentYear = targetDate.getFullYear();

        const updated = await Payroll.findOneAndUpdate(
          {
            employeeId: emp._id,
            companyId,
            month: currentMonth,
            year: currentYear,
            status: "draft",
          },
          {
            $inc: {
              bonus: parsed.bonus || 0,
              incentives: parsed.incentive || 0,
              netSalary: (parsed.bonus || 0) + (parsed.incentive || 0),
            },
          },
          { new: true }
        );
        if (updated) {
          actionExecuted = true;
        } else {
          parsed.reply = `I identified you wanted to add a bonus/incentive to ${emp.name}, but a payroll draft for ${currentMonth}/${currentYear} was not found. Please calculate draft first in the Payroll tab.`;
        }
      }
    } else if (parsed.action === "generate_payroll") {
      // Return details to client to handle dashboard navigation
      return NextResponse.json({
        success: true,
        reply: parsed.reply,
        navigate: `/payroll?month=${parsed.month || targetDate.getMonth() + 1}&year=${parsed.year || targetDate.getFullYear()}`,
      });
    }

    return NextResponse.json({
      success: true,
      reply: parsed.reply,
      action: parsed.action,
      actionExecuted,
    });
  } catch (error: any) {
    console.error("AI Floating Chat error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
