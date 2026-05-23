import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Match all paths except static assets, manifest, favicon, SW
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icon-.*|sw.js).*)",
  ],
};
