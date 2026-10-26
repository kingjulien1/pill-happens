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
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl p-7 sm:max-w-[440px]">
          <DialogHeader className="mb-1 gap-1.5">
            <DialogTitle className="pr-9 text-lg font-semibold tracking-tight">
              <HeadingText title={title} context={context} />
            </DialogTitle>
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
        <DrawerHeader className="relative px-6 pt-5 pb-4 text-left!">
          <DrawerTitle className="pr-9 text-lg font-semibold tracking-tight">
            <HeadingText title={title} context={context} />
          </DrawerTitle>
          <DrawerDescription className="mt-1.5 pr-6 text-left text-xs leading-relaxed">
            {description}
          </DrawerDescription>
          <DrawerClose
            render={
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 size-11"
                aria-label="Close"
              />
            }
          >
            <ActionIcon name="close" />
          </DrawerClose>
        </DrawerHeader>
        <div className="overflow-y-auto px-6 pt-1 pb-[max(24px,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
