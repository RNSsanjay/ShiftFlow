import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { sendSystemNotificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP parameters are required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const emailClean = email.toLowerCase().trim();
    const user = await User.findOne({ email: emailClean });

    if (!user) {
      return NextResponse.json(
        { error: "User account could not be found." },
        { status: 404 }
      );
    }

    if (user.isEmailVerified) {
      return NextResponse.json(
        { message: "This email has already been verified. Proceed to sign in." },
        { status: 200 }
      );
    }

    // Verify OTP and Expiration
    if (!user.verificationOtp || user.verificationOtp !== otp) {
      return NextResponse.json(
        { error: "The verification OTP is invalid." },
        { status: 400 }
      );
    }

    if (user.verificationOtpExpires && user.verificationOtpExpires < new Date()) {
      return NextResponse.json(
        { error: "The verification OTP has expired. Please register again or request resend." },
        { status: 400 }
      );
    }

    // Update Verification State
    user.isEmailVerified = true;
    user.verificationOtp = undefined;
    user.verificationOtpExpires = undefined;
    await user.save();

    // Trigger confirmation notification email
    try {
      await sendSystemNotificationEmail(
        user.email,
        "Account Activated Successfully",
        `Welcome to AttendMind, ${user.name}! Your workspace console is now operational. You can authenticate sessions using your registered password keys.`
      );
    } catch (mailErr) {
      console.error("Failed to send welcome confirmation email:", mailErr);
    }

    return NextResponse.json(
      { message: "Your email has been verified successfully. You can now sign in." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Verification API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during email verification." },
      { status: 500 }
    );
  }
}
