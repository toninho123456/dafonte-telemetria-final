import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isLocked, addFail, clearFails } from "@/lib/ratelimit";

const DUMMY = bcrypt.hashSync("tempo-constante", 12); // evita revelar se o e-mail existe pelo tempo de resposta

async function loadUser(email: string) {
  const u = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, include: { tenant: true } });
  if (!u || u.status !== "ACTIVE") return null;
  if (u.tenantId && !u.tenant?.active) return null; // concessionária ainda não aprovada
  return u;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/entrar", error: "/entrar" },
  providers: [
    Google, // OAuth/OpenID Connect real (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET)
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const c = z.object({ email: z.string().email(), password: z.string().min(1).max(128) }).safeParse(raw);
        if (!c.success) return null;
        const key = c.data.email.toLowerCase();
        if (isLocked(key)) return null; // muitas tentativas erradas: espera 15 min
        const u = await loadUser(c.data.email);
        const ok = await bcrypt.compare(c.data.password, u?.passwordHash ?? DUMMY);
        if (!(u && u.passwordHash && ok)) { addFail(key); return null }
        clearFails(key);
        return { id: u.id, email: u.email, name: u.name };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      // Google só entra se o e-mail for verificado e já existir uma conta ativa no sistema
      if (!profile?.email || !profile.email_verified) return false;
      return !!(await loadUser(profile.email));
    },
    async jwt({ token }) { // relê o usuário a cada requisição: bloqueio e mudança de cargo valem na hora
      if (!token.email) return null;
      const u = await loadUser(token.email);
      if (!u) return null;
      token.uid = u.id; token.tid = u.tenantId; token.role = u.role;
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.uid!; session.user.tenantId = token.tid ?? null; session.user.role = token.role!;
      return session;
    },
  },
});
