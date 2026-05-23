import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Company } from "@/models/Company";
import { User, UserRole } from "@/models/User";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      companyName,
      companyEmail,
      phone,
      address,
      pfEnabled,
      esiEnabled,
      pfPercentage,
      esiPercentage,
      salaryCycle,
      otType,
      fixedOtRate,
      workingHours,
      currency,
      adminName,
      adminEmail,
      adminPassword,
    } = body;

    // Basic Validation
    if (!companyName || !companyEmail || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Required fields are missing: Company Name, Company Email, Admin Name, Admin Email, Admin Password" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if Company Email already exists
    const existingCompany = await Company.findOne({ email: companyEmail.toLowerCase() });
    if (existingCompany) {
      return NextResponse.json(
        { error: "A company with this email is already registered." },
        { status: 409 }
      );
    }

    // Check if Admin User Email already exists
    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this administrator email is already registered." },
        { status: 409 }
      );
    }

    // 1. Create the Company
    const company = await Company.create({
      name: companyName,
      email: companyEmail.toLowerCase(),
      phone,
      address,
      pfEnabled: !!pfEnabled,
      esiEnabled: !!esiEnabled,
      pfPercentage: Number(pfPercentage) || 12,
      esiPercentage: Number(esiPercentage) || 0.75,
      salaryCycle: salaryCycle || "monthly",
      otType: otType || "normal",
      fixedOtRate: Number(fixedOtRate) || 0,
      workingHours: Number(workingHours) || 8,
      currency: currency || "INR",
    });

    // 2. Generate OTP, Hash Password and Create Admin User
    const verificationOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationOtpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminUser = await User.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      password: hashedPassword,
      role: UserRole.COMPANY_ADMIN,
      companyId: company._id,
      isActive: true,
      isEmailVerified: false,
      verificationOtp,
      verificationOtpExpires,
    });

    // Send verification email
    try {
      await sendVerificationEmail(adminUser.email, adminUser.name, verificationOtp);
    } catch (mailErr) {
      console.error("Failed to send signup verification email:", mailErr);
    }

    return NextResponse.json(
      {
        message: "Company and Admin registered successfully. Please verify your email.",
        companyId: company._id,
        adminId: adminUser._id,
        email: adminUser.email,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Company registration error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during company registration." },
      { status: 500 }
    );
  }
}
