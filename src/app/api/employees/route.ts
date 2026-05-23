import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { UserRole } from "@/models/User";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    await connectToDatabase();

    const query: any = { companyId: session.user.companyId };

    if (department && department !== "all") {
      query.department = department;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const employees = await Employee.find(query).sort({ name: 1 });
    return NextResponse.json({ employees });
  } catch (error: any) {
    console.error("Fetch employees error:", error);
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
      role !== UserRole.ACCOUNTANT
    ) {
      return NextResponse.json({ error: "Forbidden: HR or Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { name, phone, employeeType, department, salary, joiningDate, otEligible, pfEnabled, esiEnabled } = body;

    if (!name || !phone || !employeeType || !department || salary === undefined) {
      return NextResponse.json(
        { error: "Required fields: name, phone, employeeType, department, salary" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check duplicate phone in the company context
    const existingEmployee = await Employee.findOne({
      companyId: session.user.companyId,
      phone,
    });

    if (existingEmployee) {
      return NextResponse.json(
        { error: "An employee with this phone number already exists in your company." },
        { status: 409 }
      );
    }

    const newEmployee = await Employee.create({
      name,
      phone,
      employeeType,
      department,
      salary: Number(salary) || 0,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      otEligible: otEligible !== undefined ? !!otEligible : true,
      pfEnabled: pfEnabled !== undefined ? !!pfEnabled : true,
      esiEnabled: esiEnabled !== undefined ? !!esiEnabled : true,
      companyId: session.user.companyId,
      status: "active",
    });

    return NextResponse.json(
      { message: "Employee added successfully", employee: newEmployee },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Add employee error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
