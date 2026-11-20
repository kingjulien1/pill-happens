"use client";

import {
  useImperativeHandle,
  useSyncExternalStore,
  type Ref,
  type RefObject,
  type ReactNode,
} from "react";
import { ActionIcon } from "@/components/action-icon";
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
  title: ReactNode;
  headerVariant?: "medication" | "check-in";
  /** Native header controls share the close button’s action rail. */
  headerActions?: ReactNode;
  context?: ReactNode;
  description: string;
  scrollKey?: string;
  publicScrollKey?: PublicDialogScrollKey;
  /** Pane positions are local to this opening; new popups always start at the top. */
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
      className={cn(
        styles.headingRow,
        headerVariant === "check-in" && styles.checkInHeader,
        medicationHeader && styles.medicationHeader,
      )}
      data-modal-header
    >
      <div className={styles.headingCopy}>
        {titleNode}
        {context && !medicationHeader && (
          <p className={styles.context}>{context}</p>
        )}
      </div>
      <div
        className={cn(
          closeStyles.actions,
          medicationHeader && styles.medicationActions,
        )}
      >
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
      rim={false}
      className={cn(
        closeStyles.control,
        medicationHeader && closeStyles.medicationControl,
      )}
      data-dialog-corner={medicationHeader ? "medication" : "control"}
      data-modal-close
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
          className={cn(
            "max-h-[90dvh] overflow-y-auto overscroll-x-none rounded-[var(--dialog-radius-surface)] p-7 [--dialog-scroll-gutter:calc(var(--spacing)*7)] sm:max-w-[440px]",
            styles.dialog,
            headerVariant === "check-in" && styles.checkInSurface,
            medicationHeader && styles.medicationDialog,
          )}
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
              <DialogDescription className={styles.description}>
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
        className={cn(
          "rounded-t-[var(--dialog-radius-surface)]",
          headerVariant === "check-in" && styles.checkInSurface,
        )}
        finalFocus={returnFocus}
      >
        <div
          ref={setScrollElement}
          data-dialog-scroll
          data-base-ui-swipe-ignore={headerVariant === "check-in" ? "" : undefined}
          className={cn(
            "min-h-0 overflow-y-auto overscroll-contain overscroll-x-none px-6 pb-[max(24px,env(safe-area-inset-bottom))] [--dialog-scroll-gutter:calc(var(--spacing)*6)]",
            styles.scrollBody,
          )}
        >
          <DrawerHeader
            className={cn(
              "px-0 pb-4 text-left!",
              styles.drawerHeader,
              medicationHeader &&
                cn("pb-3 min-[360px]:pb-5", styles.medicationDrawerHeader),
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
              <DrawerDescription className={styles.description}>
                {description}
              </DrawerDescription>,
            )}
          </DrawerHeader>
          <div className="pt-1" data-modal-body>
            {children}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
