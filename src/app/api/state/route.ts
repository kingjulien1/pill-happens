import { api } from "@/lib/server/api";
import { readState } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return api(request, readState);
}
