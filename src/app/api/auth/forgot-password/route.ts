import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      // Security best practice: Do not reveal if email exists or not to prevent user enumeration.
      // However, for testing convenience, we can tell them "If the account exists..."
      return NextResponse.json(
        { message: "If an account exists with this email, a reset link has been dispatched." },
        { status: 200 }
      );
    }

    // Generate secure recovery token
    const token = crypto.randomBytes(32).toString("hex");
    
    // Set expiry to 1 hour from now
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    await user.save();

    // Construct the reset URL
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const resetUrl = `${origin}/reset-password?token=${token}`;

    // Simulate email dispatch
    console.log("==========================================");
    console.log(`PASSWORD RECOVERY REQUEST RECEIVED FOR: ${user.email}`);
    console.log(`RESET URL: ${resetUrl}`);
    console.log("==========================================");

    const isDev = process.env.NODE_ENV === "development";

    return NextResponse.json(
      {
        message: "If an account exists with this email, a reset link has been dispatched.",
        // Expose debug details only in dev environment to allow instant testing
        debugResetUrl: isDev ? resetUrl : undefined,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Forgot password API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred processing your request." },
      { status: 500 }
    );
  }
}
