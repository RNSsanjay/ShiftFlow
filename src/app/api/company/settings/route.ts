import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Company } from "@/models/Company";
import { UserRole } from "@/models/User";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const company = await Company.findById(session.user.companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ company });
  } catch (error: any) {
    console.error("Fetch company settings error:", error);
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
    if (role !== UserRole.COMPANY_ADMIN && role !== UserRole.HR) {
      return NextResponse.json({ error: "Forbidden: Admin or HR access required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      phone,
      address,
      pfEnabled,
      esiEnabled,
      pfPercentage,
      esiPercentage,
      pfEmployerPercentage,
      esiEmployerPercentage,
      salaryCycle,
      otType,
      fixedOtRate,
      workingHours,
      currency,
    } = body;

    await connectToDatabase();

    const updatedCompany = await Company.findByIdAndUpdate(
      session.user.companyId,
      {
        name,
        phone,
        address,
        pfEnabled: !!pfEnabled,
        esiEnabled: !!esiEnabled,
        pfPercentage: Number(pfPercentage) ?? 12,
        esiPercentage: Number(esiPercentage) ?? 0.75,
        pfEmployerPercentage: Number(pfEmployerPercentage) ?? 13,
        esiEmployerPercentage: Number(esiEmployerPercentage) ?? 3.25,
        salaryCycle: salaryCycle ?? "monthly",
        otType: otType ?? "normal",
        fixedOtRate: Number(fixedOtRate) ?? 0,
        workingHours: Number(workingHours) ?? 8,
        currency: currency ?? "INR",
      },
      { new: true }
    );

    if (!updatedCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Company settings updated successfully",
      company: updatedCompany,
    });
  } catch (error: any) {
    console.error("Update company settings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
