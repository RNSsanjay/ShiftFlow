import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    await connectToDatabase();

    const emailClean = email.toLowerCase().trim();
    const user = await User.findOne({ email: emailClean });

    // Enforce email verification status if user exists
    if (user && user.isEmailVerified === false) {
      return NextResponse.json(
        {
          error: "Your administrator account email has not been verified yet.",
          unverified: true,
          email: user.email,
        },
        { status: 400 }
      );
    }

    // Otherwise, succeed silently to let NextAuth handle login details or credentials validation
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    console.error("Pre-auth check error:", error);
    // Continue login if the check fails due to DB outage so that the user gets the standard DB error alert
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
