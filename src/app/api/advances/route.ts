import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { SalaryAdvance } from "@/models/SalaryAdvance";
import { UserRole } from "@/models/User";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const advances = await SalaryAdvance.find({ companyId: session.user.companyId })
      .populate("employeeId", "name department employeeType phone")
      .sort({ date: -1 });

    return NextResponse.json({ advances });
  } catch (error: any) {
    console.error("Fetch salary advances error:", error);
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
    if (role !== UserRole.COMPANY_ADMIN && role !== UserRole.HR && role !== UserRole.ACCOUNTANT) {
      return NextResponse.json({ error: "Forbidden: HR or Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, amount, date } = body;

    if (!employeeId || !amount) {
      return NextResponse.json({ error: "Required fields: employeeId, amount" }, { status: 400 });
    }

    await connectToDatabase();

    const newAdvance = await SalaryAdvance.create({
      employeeId,
      companyId: session.user.companyId,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      status: "approved", // default to approved for simplicity of records
    });

    return NextResponse.json({
      message: "Salary advance logged successfully",
      advance: newAdvance,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Add salary advance error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== UserRole.COMPANY_ADMIN && role !== UserRole.ACCOUNTANT) {
      return NextResponse.json({ error: "Forbidden: Admin or Accountant access required" }, { status: 403 });
    }

    const body = await req.json();
    const { advanceId, status } = body; // status: pending, approved, deducted

    if (!advanceId || !status) {
      return NextResponse.json({ error: "Required fields: advanceId, status" }, { status: 400 });
    }

    await connectToDatabase();

    const updated = await SalaryAdvance.findOneAndUpdate(
      { _id: advanceId, companyId: session.user.companyId },
      { status },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Salary advance record not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Advance status updated successfully",
      advance: updated,
    });
  } catch (error: any) {
    console.error("Update salary advance error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
