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
  context,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  titleIcon?: ActionIconName;
  context?: string;
  description: string;
  children: React.ReactNode;
}) {
  const desktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(min-width: 768px)").matches,
    () => false,
  );
  const heading = (
    <HeadingText
      className="items-center gap-y-0"
      title={
        <span
          data-slot="modal-title-line"
          className="inline-flex min-h-7 items-center gap-2 leading-7"
        >
          {titleIcon && <ActionIcon name={titleIcon} className="size-4" />}
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
      className="absolute -top-2 right-0 size-11 text-foreground"
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
          <DialogHeader className="mb-1 gap-1.5">
            <div className="relative">
              <DialogTitle className="pr-13 text-lg font-semibold tracking-tight text-foreground">
                {heading}
              </DialogTitle>
              <DialogClose render={closeButton}>
                <ActionIcon name="close" className="size-4" />
              </DialogClose>
            </div>
            <DialogDescription className="text-xs leading-relaxed">
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
        <DrawerHeader className="px-6 pt-5 pb-4 text-left!">
          <div className="relative">
            <DrawerTitle className="pr-13 text-lg font-semibold tracking-tight">
              {heading}
            </DrawerTitle>
            <DrawerClose render={closeButton}>
              <ActionIcon name="close" className="size-4" />
            </DrawerClose>
          </div>
          <DrawerDescription className="mt-1.5 pr-6 text-left text-xs leading-relaxed">
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
