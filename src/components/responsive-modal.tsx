"use client";

import {
  useImperativeHandle,
  useSyncExternalStore,
  type Ref,
  type RefObject,
  type ReactNode,
} from "react";
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
import { cn } from "@/lib/utils";
import { useDialogScrollMemory } from "@/components/use-dialog-scroll-memory";
import type { PublicDialogScrollKey } from "@/lib/dialog-scroll-memory";
import closeStyles from "./dialog-close.module.css";
import styles from "./responsive-modal.module.css";

const subscribe = (fn: () => void) => {
  const query = window.matchMedia("(min-width: 768px)");
  query.addEventListener("change", fn);
  return () => query.removeEventListener("change", fn);
};
export type DialogScrollControls = { save: () => void };
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  titleIcon,
  headerVariant,
  headerActions,
  context,
  description,
  scrollKey,
  publicScrollKey,
  restoreScroll = true,
  returnFocus,
  scrollControlsRef,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  titleIcon?: ActionIconName;
  headerVariant?: "medication";
  /** Native header controls share the close button’s action rail. */
  headerActions?: ReactNode;
  context?: string;
  description: string;
  scrollKey?: string;
  publicScrollKey?: PublicDialogScrollKey;
  /** Explicit section shortcuts take precedence over a previously saved position. */
  restoreScroll?: boolean;
  returnFocus?: RefObject<HTMLElement | null> | (() => HTMLElement | null);
  scrollControlsRef?: Ref<DialogScrollControls>;
  children: React.ReactNode;
}) {
  const desktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(min-width: 768px)").matches,
    () => false,
  );
  const { setScrollElement, save: saveScroll } =
    useDialogScrollMemory<HTMLDivElement>({
      open,
      scrollKey,
      publicScrollKey,
      layout: desktop,
      restorePosition: restoreScroll,
    });
  useImperativeHandle(scrollControlsRef, () => ({ save: saveScroll }), [
    saveScroll,
  ]);
  const changeOpen = (next: boolean) => {
    if (!next) saveScroll();
    onOpenChange(next);
  };
  const medicationHeader = headerVariant === "medication";
  const headerContent = (
    titleNode: ReactNode,
    closeNode: ReactNode,
    descriptionNode: ReactNode,
  ) => (
    <div
      className={styles.headingRow}
      data-modal-header
      data-has-title-icon={titleIcon ? "" : undefined}
    >
      {titleIcon && (
        <ActionIcon
          name={titleIcon}
          weight="bold"
          className={styles.titleIcon}
          aria-hidden="true"
        />
      )}
      <div className={styles.headingCopy}>
        {titleNode}
        {context && <p className={styles.context}>{context}</p>}
      </div>
      <div className={closeStyles.actions}>
        {headerActions}
        {closeNode}
      </div>
      {descriptionNode}
    </div>
  );
  const closeButton = (
    <Button
      variant="ghost"
      size="icon"
      className={closeStyles.control}
      data-dialog-corner="control"
      aria-label="Close"
    />
  );
  if (desktop)
    return (
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent
          finalFocus={returnFocus}
          ref={setScrollElement}
          data-dialog-scroll
          showCloseButton={false}
          className="max-h-[90dvh] overflow-y-auto overscroll-x-none rounded-[var(--dialog-radius-surface)] p-7 [--dialog-scroll-gutter:calc(var(--spacing)*7)] sm:max-w-[440px]"
        >
          <DialogHeader
            className={cn("mb-1 gap-1.5", medicationHeader && "mb-2")}
          >
            {headerContent(
              <DialogTitle className={styles.title}>{title}</DialogTitle>,
              <DialogClose render={closeButton}>
                <ActionIcon
                  name="close"
                  weight="regular"
                  className="size-[18px]"
                />
              </DialogClose>,
              <DialogDescription
                className={medicationHeader ? "sr-only" : styles.description}
              >
                {description}
              </DialogDescription>,
            )}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  return (
    <Drawer open={open} onOpenChange={changeOpen} showSwipeHandle>
      <DrawerContent
        className="rounded-t-[var(--dialog-radius-surface)]"
        finalFocus={returnFocus}
      >
        <DrawerHeader
          className={cn(
            "px-6 pt-5 pb-4 text-left!",
            medicationHeader && "pb-3 min-[360px]:pb-5",
          )}
        >
          {headerContent(
            <DrawerTitle className={styles.title}>{title}</DrawerTitle>,
            <DrawerClose render={closeButton}>
              <ActionIcon
                name="close"
                weight="regular"
                className="size-[18px]"
              />
            </DrawerClose>,
            <DrawerDescription
              className={medicationHeader ? "sr-only" : styles.description}
            >
              {description}
            </DrawerDescription>,
          )}
        </DrawerHeader>
        <div
          ref={setScrollElement}
          data-dialog-scroll
          className="min-h-0 overflow-y-auto overscroll-contain overscroll-x-none px-6 pt-1 pb-[max(24px,env(safe-area-inset-bottom))] [--dialog-scroll-gutter:calc(var(--spacing)*6)]"
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
