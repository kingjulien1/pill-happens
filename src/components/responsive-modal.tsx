"use client";

import { useSyncExternalStore } from "react";
import { ActionIcon } from "@/components/action-icon";
import {
  Dialog,
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
  context,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  context?: string;
  description: string;
  children: React.ReactNode;
}) {
  const desktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(min-width: 768px)").matches,
    () => false,
  );
  if (desktop)
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-xl border border-border p-5 shadow-none ring-0 sm:max-w-[440px]">
          <DialogHeader className="gap-1">
            <DialogTitle className="pr-9 text-lg leading-6 font-semibold tracking-tight">
              <HeadingText title={title} context={context} />
            </DialogTitle>
            <DialogDescription className="text-xs leading-5">
              {description}
            </DialogDescription>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="data-[swipe-direction=down]:rounded-t-[14px]">
        <DrawerHeader className="relative gap-1 px-5 pt-4 pb-3 text-left!">
          <DrawerTitle className="pr-9 text-lg leading-6 font-semibold tracking-tight">
            <HeadingText title={title} context={context} />
          </DrawerTitle>
          <DrawerDescription className="pr-6 text-left text-xs leading-5">
            {description}
          </DrawerDescription>
          <DrawerClose
            render={
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 size-11 rounded-lg"
                aria-label="Close"
              />
            }
          >
            <ActionIcon name="close" />
          </DrawerClose>
        </DrawerHeader>
        <div className="overflow-y-auto px-5 pt-1 pb-[max(20px,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
