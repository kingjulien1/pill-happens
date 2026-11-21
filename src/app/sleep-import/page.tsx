"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  isSleepImageToken,
  rememberSleepImage,
} from "@/lib/shared-sleep-image";

/** Preserve the one-time token through the sign-in redirect, without storing image bytes in a URL. */
export default function SleepImageLanding() {
  useEffect(() => {
    const query = new URL(window.location.href).searchParams;
    const raw = query.get("token");
    const token = raw && isSleepImageToken(raw) ? raw : "unavailable";
    rememberSleepImage(token);
    window.location.replace(`/?sleep-import=${encodeURIComponent(token)}`);
  }, []);
  return (
    <main style={{ padding: 24 }}>
      <p role="status">Opening your sleep report…</p>
      <Link href="/">Continue to your journal</Link>
    </main>
  );
}
