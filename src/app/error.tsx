"use client";

import Link from "next/link";
import { ActionIcon } from "@/components/action-icon";
import { Button } from "@/components/ui/button";
import { DialogPrimaryButton } from "@/components/dialog-primary-button";
import { BrandMark } from "@/components/brand";
import { PublicStatus } from "@/components/public-status";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PublicStatus
      icon={<BrandMark />}
      context="A brief interruption"
      title="Something Went Wrong"
      actions={
        <>
          <DialogPrimaryButton
            type="button"
            onClick={reset}
            className="w-full"
            leadingIcon={<ActionIcon name="retry" />}
          >
            Try again
          </DialogPrimaryButton>
          <Button
            navigation
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/" />}
            className="mt-3 inline-flex min-h-11 items-center px-4 text-sm text-canvas-muted-foreground underline-offset-4 hover:text-canvas-foreground hover:underline h-auto"
          >
            Back to today
          </Button>
        </>
      }
    >
      Something interrupted this page. Try loading it again, or return to Today.
    </PublicStatus>
  );
}
