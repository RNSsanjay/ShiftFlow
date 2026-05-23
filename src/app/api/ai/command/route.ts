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
    const { command, date } = body; // date: YYYY-MM-DD for attendance contexts

    if (!command) {
      return NextResponse.json({ error: "Command is required" }, { status: 400 });
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    await connectToDatabase();

    // 1. Fetch available employees & departments in the company to guide the AI context
    const employees = await Employee.find({
      companyId: session.user.companyId,
      status: "active",
    }).select("name department");

    const employeeNames = employees.map((e) => e.name).join(", ");
    const departments = Array.from(new Set(employees.map((e) => e.department))).join(", ");

    // 2. Query Groq LLM to parse command
    const systemPrompt = `
You are the AI Command Center for AttendMind, an attendance and payroll SaaS.
Your task is to parse a user's natural language command into a structured JSON action.
Here is the organization metadata:
- Employee names: [${employeeNames}]
- Departments: [${departments}]

You must respond ONLY with a raw JSON object (no markdown formatting, no code blocks, no explanation).
The JSON schema is:
{
  "action": "mark_attendance" | "add_adjustment" | "generate_payroll" | "invalid",
  "target": "name_match" | "department_match" | "all" | "none",
  "name": "string (the matched employee name from the list, or empty)",
  "department": "string (the matched department name from the list, or empty)",
  "status": "present" | "absent" | "half_day" | "leave" | "holiday" | "none",
  "otHours": number (default 0),
  "bonus": number (default 0),
  "incentive": number (default 0),
  "month": number (1-12, default 0),
  "year": number (default 0),
  "reasoning": "brief explanation of what you matched"
}

Examples:
- "Kumar present with 2 hours OT" -> {"action":"mark_attendance","target":"name_match","name":"Kumar","status":"present","otHours":2,"department":"","bonus":0,"incentive":0,"month":0,"year":0,"reasoning":"Marked Kumar present with 2 hours OT"}
- "Mark all yard workers present" -> {"action":"mark_attendance","target":"department_match","name":"","status":"present","otHours":0,"department":"Yard","bonus":0,"incentive":0,"month":0,"year":0,"reasoning":"Marked all employees in Yard department present"}
- "Add 500 bonus to Ramesh" -> {"action":"add_adjustment","target":"name_match","name":"Ramesh","status":"none","otHours":0,"department":"","bonus":500,"incentive":0,"month":0,"year":0,"reasoning":"Applied 500 bonus to Ramesh"}
- "Calculate payroll for March 2026" -> {"action":"generate_payroll","target":"all","name":"","status":"none","otHours":0,"department":"","bonus":0,"incentive":0,"month":3,"year":2026,"reasoning":"Requested payroll calculation for March 2026"}
`;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192", // Fast and efficient model for structuring
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: command },
        ],
        temperature: 0.1,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq API Error:", errorText);
      return NextResponse.json({ error: "Failed to communicate with AI model" }, { status: 502 });
    }

    const responseData = await groqResponse.json();
    const parsedText = responseData.choices[0]?.message?.content?.trim();

    // Clean JSON wraps if model returned ```json ... ```
    let cleanJson = parsedText;
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.slice(7);
    }
    if (cleanJson.endsWith("```")) {
      cleanJson = cleanJson.slice(0, -3);
    }
    cleanJson = cleanJson.trim();

    let parsedAction: any;
    try {
      parsedAction = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON parse failure from AI content:", cleanJson);
      return NextResponse.json({ error: "Failed to interpret AI instructions structure" }, { status: 500 });
    }

    if (parsedAction.action === "invalid") {
      return NextResponse.json({ error: "Could not understand command: " + (parsedAction.reasoning || "") }, { status: 400 });
    }

    // 3. Execute actions based on AI interpretation
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    let message = "";
    let executionSuccess = false;

    if (parsedAction.action === "mark_attendance") {
      if (parsedAction.target === "name_match" && parsedAction.name) {
        // Find employee by name (fuzzy match or exact match)
        const employee = await Employee.findOne({
          companyId: session.user.companyId,
          name: { $regex: new RegExp(`^${parsedAction.name}$`, "i") },
          status: "active",
        });

        if (!employee) {
          return NextResponse.json({ error: `Employee named '${parsedAction.name}' not found.` }, { status: 404 });
        }

        await Attendance.updateOne(
          { employeeId: employee._id, date: targetDate },
          {
            $set: {
              companyId: session.user.companyId,
              status: parsedAction.status,
              otHours: parsedAction.otHours || 0,
              markedBy: session.user.id,
              notes: "AI command: " + command,
            },
          },
          { upsert: true }
        );

        message = `Successfully marked ${employee.name} as ${parsedAction.status} with ${parsedAction.otHours} hrs OT.`;
        executionSuccess = true;
      } else if (parsedAction.target === "department_match" && parsedAction.department) {
        // Find all active employees in department
        const deptEmployees = await Employee.find({
          companyId: session.user.companyId,
          department: { $regex: new RegExp(`^${parsedAction.department}$`, "i") },
          status: "active",
        });

        if (deptEmployees.length === 0) {
          return NextResponse.json({ error: `No active employees found in '${parsedAction.department}' department.` }, { status: 404 });
        }

        const bulkOps = deptEmployees.map((emp) => ({
          updateOne: {
            filter: { employeeId: emp._id, date: targetDate },
            update: {
              $set: {
                companyId: session.user.companyId,
                status: parsedAction.status,
                otHours: parsedAction.otHours || 0,
                markedBy: session.user.id,
                notes: "AI Bulk: " + command,
              },
            },
            upsert: true,
          },
        }));

        await Attendance.bulkWrite(bulkOps as any);

        message = `Successfully marked ${deptEmployees.length} employees in ${parsedAction.department} as ${parsedAction.status}.`;
        executionSuccess = true;
      }
    } else if (parsedAction.action === "add_adjustment") {
      if (parsedAction.target === "name_match" && parsedAction.name) {
        const employee = await Employee.findOne({
          companyId: session.user.companyId,
          name: { $regex: new RegExp(`^${parsedAction.name}$`, "i") },
          status: "active",
        });

        if (!employee) {
          return NextResponse.json({ error: `Employee named '${parsedAction.name}' not found.` }, { status: 404 });
        }

        const currentMonth = targetDate.getMonth() + 1; // 1-12
        const currentYear = targetDate.getFullYear();

        // Update existing payroll draft for the month
        const updated = await Payroll.findOneAndUpdate(
          {
            employeeId: employee._id,
            companyId: session.user.companyId,
            month: currentMonth,
            year: currentYear,
            status: "draft",
          },
          {
            $inc: {
              bonus: parsedAction.bonus || 0,
              incentives: parsedAction.incentive || 0,
              netSalary: (parsedAction.bonus || 0) + (parsedAction.incentive || 0), // Base increment
            },
          },
          { new: true }
        );

        if (!updated) {
          return NextResponse.json({
            error: `Payroll draft for ${employee.name} for ${currentMonth}/${currentYear} was not found. Please calculate draft first in Payroll tab.`,
          }, { status: 404 });
        }

        message = `Successfully added ${parsedAction.bonus ? `${parsedAction.bonus} Bonus` : ""}${parsedAction.incentive ? ` & ${parsedAction.incentive} Incentive` : ""} to ${employee.name}'s draft payroll.`;
        executionSuccess = true;
      }
    } else if (parsedAction.action === "generate_payroll") {
      // Return parameters to front-end to trigger navigation and processing
      return NextResponse.json({
        success: true,
        action: "navigate_payroll",
        month: parsedAction.month || targetDate.getMonth() + 1,
        year: parsedAction.year || targetDate.getFullYear(),
        message: "Navigating to payroll draft generation page as requested.",
      });
    }

    if (executionSuccess) {
      return NextResponse.json({
        success: true,
        message,
        parsedAction,
      });
    }

    return NextResponse.json({
      error: "Command parsed but could not execute action. Target/Action values were invalid.",
      parsedAction,
    }, { status: 400 });
  } catch (error: any) {
    console.error("AI Command parse/execution error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
