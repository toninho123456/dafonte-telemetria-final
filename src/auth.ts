import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createSelfAccount } from "@/lib/signup";
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
      // Google só entra com e-mail verificado. Quem ainda não tem conta ganha uma no primeiro acesso.
      if (!profile?.email || !profile.email_verified) return false;
      const email = profile.email.toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing) {
        try { await createSelfAccount({ email, name: profile.name || email.split("@")[0] }) }
        catch (e) { if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e } // criada em paralelo
      } else if (existing.unverifiedSignup) {
        // Alguém criou essa conta com senha sem provar que o e-mail é dele: o dono verdadeiro acabou de provar pelo Google,
        // então a senha antiga é descartada (ele define outra em "Esqueci minha senha", se quiser).
        await prisma.user.update({ where: { id: existing.id }, data: { unverifiedSignup: false, passwordHash: null } });
      }
      return !!(await loadUser(email));
    },
    async jwt({ token }) { // relê o usuário a cada requisição: bloqueio e mudança de cargo valem na hora
      if (!token.email) return null;
      const u = await loadUser(token.email);
      if (!u) return null;
      token.uid = u.id; token.tid = u.tenantId; token.role = u.role;
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.uid as string; session.user.tenantId = (token.tid as string | undefined) ?? null; session.user.role = token.role as typeof session.user.role;
      return session;
    },
  },
});
