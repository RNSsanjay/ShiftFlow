import { NextResponse } from "next/server";
import { auth } from "@/auth";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "AI services are not configured in environment" }, { status: 500 });
    }

    const { image } = await req.json(); // base64 image string with data URL prefix
    if (!image) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    // 2. Prepare visual extraction prompt
    const systemPrompt = `
You are an expert document parser specializing in scanning attendance rosters, payroll sheets, and employee list images.
Your task is to analyze the provided image and extract all employee profiles and their daily attendance records.

Extract the following information for each employee found in the document:
- name: Full name of the employee (required).
- phone: Phone number if listed next to their name, otherwise null.
- employeeType: Must be "staff" (if they are salaried, monthly paid, management, office) or "worker" (if they are daily wage, field worker, yard worker, machine operator). If not explicitly clear, output null.
- department: The department or section (e.g. Packing, HR, Yard, Production) if listed, otherwise null.
- salary: Baseline daily rate or monthly salary if written, otherwise null.
- shift: Active shift or working hours timing if mentioned, otherwise null.
- attendanceStatus: Look for tick marks, 'P', dots, or presence indicators next to their names. If they are indicated as present, output "present". If they are marked with a cross, 'A', 'absent', or indicated as absent, output "absent". If the employee is listed but there is no specific negative mark, default to "present".

You must respond ONLY with a raw JSON object containing an "employees" array. Do not include any markdown, code blocks, or conversational text.

Strict Output JSON Schema:
{
  "employees": [
    {
      "name": "string",
      "phone": "string | null",
      "employeeType": "staff | worker | null",
      "department": "string | null",
      "salary": number | null,
      "shift": "string | null",
      "attendanceStatus": "present | absent"
    }
  ]
}
`;

    // 3. Make API call to Groq using Llama 3.2 11B Vision
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: systemPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: image, // includes data URL e.g. data:image/png;base64,...
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error("Groq vision call error:", errText);
      return NextResponse.json({ error: "Failed to communicate with AI vision services" }, { status: 502 });
    }

    const responseData = await groqResponse.json();
    const cleanJson = responseData.choices[0]?.message?.content?.trim() || "{}";

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse Llama vision JSON response:", cleanJson);
      return NextResponse.json({ error: "AI failed to return structured roster data. Please upload a clearer image." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      employees: parsed.employees || [],
    });
  } catch (error: any) {
    console.error("AI extract-roster error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
