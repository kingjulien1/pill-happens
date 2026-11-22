import Link from "next/link";
import { ActionIcon } from "@/components/action-icon";
import { BrandMark } from "@/components/brand";
import { DialogPrimaryButton } from "@/components/dialog-primary-button";
import { PublicStatus } from "@/components/public-status";

export default function NotFound() {
  return (
    <PublicStatus
      icon={<BrandMark />}
      context="404 · A wrong turn"
      title="Page Not Found"
      actions={
        <DialogPrimaryButton
          navigation
          nativeButton={false}
          render={<Link href="/" />}
          className="w-full"
          leadingIcon={<ActionIcon name="back" />}
        >
          Back to today
        </DialogPrimaryButton>
      }
    >
      This link doesn’t lead to a page. Your daily journal is a good place to
      pick things up.
    </PublicStatus>
  );
}
