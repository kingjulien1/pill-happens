"use client";

import { useSyncExternalStore } from "react";
import { ActionIcon, type ActionIconName } from "@/components/action-icon";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { HeadingText } from "@/components/heading-text";
import { cn } from "@/lib/utils";

const subscribe = (fn: () => void) => {
  const query = window.matchMedia("(min-width: 768px)");
  query.addEventListener("change", fn);
  return () => query.removeEventListener("change", fn);
};
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  titleIcon,
  headerVariant,
  context,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  titleIcon?: ActionIconName;
  headerVariant?: "medication";
  context?: string;
  description: string;
  children: React.ReactNode;
}) {
  const desktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(min-width: 768px)").matches,
    () => false,
  );
  const medicationHeader = headerVariant === "medication";
  const heading = (
    <HeadingText
      className="items-center gap-y-0"
      title={
        <span
          data-slot="modal-title-line"
          className="inline-flex min-h-7 items-center gap-2 leading-7"
        >
          {titleIcon && (
            <ActionIcon
              name={titleIcon}
              weight="bold"
              className={medicationHeader ? "size-[22px]" : "size-4"}
            />
          )}
          <span>{title}</span>
        </span>
      }
      context={context}
    />
  );
  const closeButton = (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "absolute -top-2 right-0 size-11 text-foreground",
        medicationHeader && "-top-2.5 -right-2 size-8",
      )}
      aria-label="Close"
    />
  );
  if (desktop)
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[90dvh] overflow-y-auto rounded-3xl p-7 sm:max-w-[440px]"
        >
          <DialogHeader
            className={cn("mb-1 gap-1.5", medicationHeader && "mb-2")}
          >
            <div className="relative">
              <DialogTitle
                className={cn(
                  "pr-13 text-lg font-semibold tracking-tight text-foreground",
                  medicationHeader && "pr-8",
                )}
              >
                {heading}
              </DialogTitle>
              <DialogClose render={closeButton}>
                <ActionIcon
                  name="close"
                  className={medicationHeader ? "size-3" : "size-4"}
                />
              </DialogClose>
            </div>
            <DialogDescription
              className={
                medicationHeader ? "sr-only" : "text-xs leading-relaxed"
              }
            >
              {description}
            </DialogDescription>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="rounded-t-[28px]">
        <DrawerHeader
          className={cn(
            "px-6 pt-5 pb-4 text-left!",
            medicationHeader && "pb-3 min-[360px]:pb-5",
          )}
        >
          <div className="relative">
            <DrawerTitle
              className={cn(
                "pr-13 text-lg font-semibold tracking-tight",
                medicationHeader && "pr-8",
              )}
            >
              {heading}
            </DrawerTitle>
            <DrawerClose render={closeButton}>
              <ActionIcon
                name="close"
                className={medicationHeader ? "size-3" : "size-4"}
              />
            </DrawerClose>
          </div>
          <DrawerDescription
            className={
              medicationHeader
                ? "sr-only"
                : "mt-1.5 pr-6 text-left text-xs leading-relaxed"
            }
          >
            {description}
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-6 pt-1 pb-[max(24px,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
