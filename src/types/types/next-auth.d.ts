import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";
declare module "next-auth" { interface Session { user: { id: string; tenantId: string | null; role: Role } & DefaultSession["user"] } }
declare module "next-auth/jwt" { interface JWT { uid?: string; tid?: string | null; role?: Role } }
