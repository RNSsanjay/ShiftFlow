import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Match all paths except API, static, and public folder assets
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-192.png|icon-512.png|ai_terminal_illustration.png|dashboard_hero_mockup.png|mobile_attendance_swipe.png|payroll_compliance_illustration.png|globe.svg|file.svg|vercel.svg|next.svg|window.svg|\\.well-known).*)",
  ],
};
