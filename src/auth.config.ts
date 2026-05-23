import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      
      const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth") || nextUrl.pathname.startsWith("/api/company/register");
      const isPublicRoute = ["/login", "/register"].includes(nextUrl.pathname) || nextUrl.pathname === "/";

      if (isApiAuthRoute) {
        return true;
      }

      if (isPublicRoute) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) {
        return false; // automatically redirects to pages.signIn ("/login")
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.companyId = (user as any).companyId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).companyId = token.companyId as string;
      }
      return session;
    },
  },
  providers: [], // Providers list is empty here, populated in auth.ts
} satisfies NextAuthConfig;
