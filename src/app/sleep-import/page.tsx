"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ImageDown } from "lucide-react";
import { PublicStatus } from "@/components/public-status";
import { DialogPrimaryButton } from "@/components/dialog-primary-button";
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
    <PublicStatus
      live
      icon={<ImageDown />}
      context="Morning check-in · Image import"
      title="Opening Your Sleep Report"
      actions={
        <DialogPrimaryButton
          navigation
          nativeButton={false}
          render={<Link href="/" />}
          className="w-full"
          trailingIcon={<ArrowRight />}
        >
          Continue to Journal
        </DialogPrimaryButton>
      }
    >
      Taking your image to the morning check-in. You’ll review the readings
      before anything is applied to your draft.
    </PublicStatus>
  );
}
