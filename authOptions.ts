import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { authRateLimiter, recordLoginAttempt, verifyPassword, type Role } from "@/lib/identity";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60, updateAge: 60 * 60 },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "not-configured",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "not-configured",
      authorization: { params: { scope: "openid email profile", prompt: "consent", access_type: "offline", response_type: "code" } },
    }),
    CredentialsProvider({
      name: "Email and password",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;
        const attempt = await authRateLimiter.check(`login:${email}`, 5, 900);
        if (!attempt.allowed) return null;
        try {
          const { data } = await supabaseAdmin.from("identity_users").select("id, tenant_id, role, email, password_hash, status, permission_version").eq("email", email).maybeSingle();
          if (!data || data.status !== "active" || !verifyPassword(password, data.password_hash)) { recordLoginAttempt(email, false); return null; }
          recordLoginAttempt(email, true);
          return { id: data.id, email: data.email, tenantId: data.tenant_id, role: data.role as Role, permissionVersion: data.permission_version || 1 };
        } catch { return null; }
      },
    }),
  ],
  pages: { signIn: "/signin" },
  callbacks: {
    async signIn() { return true; },
    async redirect({ url, baseUrl }) { if (url.startsWith("/")) return `${baseUrl}${url}`; if (url.startsWith(`${baseUrl}/`) || url === baseUrl) return url; return baseUrl; },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.tenantId = (user as typeof user & { tenantId?: string }).tenantId || token.tenantId;
        token.role = (user as typeof user & { role?: Role }).role || token.role || "patient";
        token.permissionVersion = (user as typeof user & { permissionVersion?: number }).permissionVersion || 1;
        if (user.email && !token.tenantId) {
          const provisioned = await provisionOAuthIdentity(user.email, user.name || undefined);
          if (provisioned) {
            token.sub = provisioned.id;
            token.tenantId = provisioned.tenantId;
            token.role = provisioned.role;
            token.permissionVersion = provisioned.permissionVersion;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.tenantId = token.tenantId as string;
        session.user.role = token.role as Role;
        session.user.permissionVersion = (token.permissionVersion as number) || 1;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

async function provisionOAuthIdentity(email: string, displayName?: string) {
  try {
    const normalized = email.trim().toLowerCase();
    const existing = await supabaseAdmin.from("identity_users").select("id, tenant_id, role, permission_version").eq("email", normalized).maybeSingle();
    if (existing.data) return { id: existing.data.id, tenantId: existing.data.tenant_id, role: existing.data.role as Role, permissionVersion: existing.data.permission_version || 1 };
    const tenant = await supabaseAdmin.from("identity_tenants").insert({ name: `${displayName || "Personal"} care space` }).select("id").single();
    if (tenant.error || !tenant.data) return null;
    const created = await supabaseAdmin.from("identity_users").insert({ tenant_id: tenant.data.id, email: normalized, display_name: displayName || null, role: "patient" }).select("id, tenant_id, role, permission_version").single();
    if (created.error || !created.data) return null;
    return { id: created.data.id, tenantId: created.data.tenant_id, role: created.data.role as Role, permissionVersion: created.data.permission_version || 1 };
  } catch { return null; }
}
