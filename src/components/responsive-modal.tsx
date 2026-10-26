"use client";

import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
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

const subscribe = (fn: () => void) => {
  const query = window.matchMedia("(min-width: 768px)");
  query.addEventListener("change", fn);
  return () => query.removeEventListener("change", fn);
};
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
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
          <DialogHeader className="mb-2 gap-3">
            <DialogTitle className="display text-3xl">{title}</DialogTitle>
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
          <DrawerTitle className="display text-3xl">{title}</DrawerTitle>
          <DrawerDescription className="mt-2 pr-6 text-left text-xs leading-relaxed">
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
            <X size={17} />
          </DrawerClose>
        </DrawerHeader>
        <div className="overflow-y-auto px-6 pt-1 pb-[max(24px,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
