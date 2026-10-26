import { api } from "@/lib/server/api";
import { readState } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return api(request, async () => {
    const data = await readState();
    const today = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), data }, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="pill-happens-backup-${today}.json"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
