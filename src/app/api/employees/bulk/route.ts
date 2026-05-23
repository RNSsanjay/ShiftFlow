import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { UserRole } from "@/models/User";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== UserRole.COMPANY_ADMIN && role !== UserRole.HR) {
      return NextResponse.json({ error: "Forbidden: HR or Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { employees, commit } = body; // commit is boolean

    if (!Array.isArray(employees)) {
      return NextResponse.json({ error: "Invalid data format. Expected 'employees' array." }, { status: 400 });
    }

    await connectToDatabase();

    // Fetch existing employee phone numbers in the company
    const existingEmployees = await Employee.find({ companyId: session.user.companyId }).select("phone name");
    const existingPhones = new Set(existingEmployees.map((e) => e.phone));

    const phoneSeenInPayload = new Set<string>();
    const previewRows: any[] = [];
    let hasErrors = false;

    // Validate rows
    for (let idx = 0; idx < employees.length; idx++) {
      const row = employees[idx];
      const errors: string[] = [];

      // Column Validation
      const name = row.name?.toString().trim();
      const phone = row.phone?.toString().trim();
      const type = row.employeeType?.toString().trim().toLowerCase();
      const department = row.department?.toString().trim();
      const salary = Number(row.salary);

      if (!name) {
        errors.push("Name is required");
      }
      if (!phone) {
        errors.push("Phone number is required");
      } else {
        // Format checking e.g., length
        if (!/^\+?[0-9\s-]{8,15}$/.test(phone)) {
          errors.push("Invalid phone format");
        }
        // Duplicate check within uploaded payload
        if (phoneSeenInPayload.has(phone)) {
          errors.push(`Duplicate phone number in spreadsheet`);
        } else {
          phoneSeenInPayload.add(phone);
        }
        // Duplicate check in database
        if (existingPhones.has(phone)) {
          errors.push(`Phone already registered in database`);
        }
      }

      if (!type || (type !== "staff" && type !== "worker")) {
        errors.push("Employee type must be 'staff' or 'worker'");
      }

      if (!department) {
        errors.push("Department is required");
      }

      if (isNaN(salary) || salary < 0) {
        errors.push("Salary must be a positive number");
      }

      if (errors.length > 0) {
        hasErrors = true;
      }

      previewRows.push({
        index: idx + 1,
        row: {
          name: name || "",
          phone: phone || "",
          employeeType: type || "",
          department: department || "",
          salary: isNaN(salary) ? 0 : salary,
          joiningDate: row.joiningDate ? new Date(row.joiningDate) : new Date(),
        },
        errors,
      });
    }

    if (commit && !hasErrors) {
      // Perform database insertion
      const recordsToInsert = previewRows.map((p) => ({
        ...p.row,
        companyId: session.user.companyId,
        status: "active",
        otEligible: true,
        pfEnabled: true,
        esiEnabled: true,
      }));

      await Employee.insertMany(recordsToInsert);

      return NextResponse.json({
        success: true,
        message: `Successfully imported ${recordsToInsert.length} employees.`,
      });
    }

    // Return the preview structure
    return NextResponse.json({
      success: !hasErrors,
      hasErrors,
      previewRows,
    });
  } catch (error: any) {
    console.error("Bulk upload employees error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
