import { requireUser } from "@/lib/permissions";
import { signTicket } from "@/lib/wsTicket";
import { fail } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function POST() {
  try {
    const u = await requireUser("map:view");
    return Response.json({ ticket: signTicket(u.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return fail(e) }
}
