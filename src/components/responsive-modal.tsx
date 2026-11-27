"use client";

import { DialogFooterNavigation } from "./dialog-footer-navigation";

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
import {
  DialogResetSweep,
  DialogSweepVeil,
  useDialogResetSweep,
} from "./dialog-reset-sweep";

const subscribe = (fn: () => void) => {
  const query = window.matchMedia("(min-width: 768px)");
  query.addEventListener("change", fn);
  return () => query.removeEventListener("change", fn);
};
export type DialogScrollControls = { save: () => void };
export function ResponsiveModal({
  open,
  onOpenChange,
  onOpenChangeComplete,
  surfaceClassName,
  interactionLocked = false,
  showFooterNavigation = true,
  role = "dialog",
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
  onOpenChangeComplete?: (open: boolean) => void;
  surfaceClassName?: string;
  interactionLocked?: boolean;
  showFooterNavigation?: boolean;
  role?: "dialog" | "alertdialog";
  title: ReactNode;
  headerVariant?: "medication" | "check-in" | "intake";
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
  const { phase, controls } = useDialogResetSweep();
  const locked = interactionLocked || Boolean(phase);
  const changeOpen = (next: boolean, details: { cancel: () => void }) => {
    if (locked) {
      details.cancel();
      return;
    }
    if (!next) saveScroll();
    onOpenChange(next);
  };
  const medicationHeader = headerVariant === "medication";
  const intakeHeader = headerVariant === "intake";
  const journalHeader = headerVariant === "check-in" || intakeHeader;
  const headerContent = (
    titleNode: ReactNode,
    closeNode: ReactNode,
    descriptionNode: ReactNode,
  ) => (
    <div
      className={cn(
        styles.headingRow,
        journalHeader && styles.checkInHeader,
        medicationHeader && styles.medicationHeader,
      )}
      data-modal-header
    >
      <div className={styles.headingCopy}>
        {titleNode}
        {context && !medicationHeader && !journalHeader && (
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
      {context && journalHeader && (
        <p className={cn(styles.context, styles.fullContext)}>{context}</p>
      )}
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
      <Dialog
        open={open}
        onOpenChange={changeOpen}
        onOpenChangeComplete={onOpenChangeComplete}
      >
        <DialogContent
          finalFocus={returnFocus}
          ref={setScrollElement}
          data-dialog-scroll
          data-reset-phase={phase ?? undefined}
          aria-busy={locked || undefined}
          data-interaction-locked={locked ? "" : undefined}
          role={role}
          showCloseButton={false}
          className={cn(
            "max-h-[90dvh] overflow-y-auto overscroll-x-none rounded-[var(--dialog-radius-surface)] p-7 [--dialog-scroll-gutter:calc(var(--spacing)*7)] sm:max-w-[440px]",
            styles.dialog,
            styles.surface,
            journalHeader && styles.checkInSurface,
            intakeHeader && styles.intakeSurface,
            medicationHeader && styles.medicationDialog,
            surfaceClassName,
          )}
        >
          <DialogHeader
            inert={locked}
            className={cn("mb-1 gap-1.5", medicationHeader && "mb-2")}
          >
            {headerContent(
              <DialogTitle tabIndex={-1} className={styles.title}>
                {title}
              </DialogTitle>,
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
          <DialogResetSweep.Provider value={controls}>
            <div className={styles.contentGroup} inert={locked}>
              {children}
              {showFooterNavigation && role !== "alertdialog" && (
                <DialogFooterNavigation />
              )}
            </div>
          </DialogResetSweep.Provider>
          {phase && <DialogSweepVeil phase={phase} />}
        </DialogContent>
      </Dialog>
    );
  return (
    <Drawer
      open={open}
      onOpenChange={changeOpen}
      onOpenChangeComplete={onOpenChangeComplete}
      showSwipeHandle
    >
      <DrawerContent
        className={cn(
          "rounded-t-[var(--dialog-radius-surface)]",
          styles.surface,
          journalHeader && styles.checkInSurface,
          intakeHeader && styles.intakeSurface,
          surfaceClassName,
        )}
        data-reset-phase={phase ?? undefined}
        aria-busy={locked || undefined}
        data-interaction-locked={locked ? "" : undefined}
        role={role}
        finalFocus={returnFocus}
      >
        <div
          ref={setScrollElement}
          data-dialog-scroll
          inert={locked}
          data-base-ui-swipe-ignore={journalHeader ? "" : undefined}
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
              <DrawerTitle tabIndex={-1} className={styles.title}>
                {title}
              </DrawerTitle>,
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
            <DialogResetSweep.Provider value={controls}>
              {children}
              {showFooterNavigation && role !== "alertdialog" && (
                <DialogFooterNavigation />
              )}
            </DialogResetSweep.Provider>
          </div>
        </div>
        {phase && <DialogSweepVeil phase={phase} />}
      </DrawerContent>
    </Drawer>
  );
}
