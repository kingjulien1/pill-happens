"use client";

import { isValidElement, type ReactNode } from "react";
import { NOTIFICATION_CHECKPOINT_INTERVAL } from "@/lib/notification-scheduling";
import { recordNotificationContent } from "@/lib/record-notification-content";
import { updateCompensanNotification } from "@/lib/compensan-appearance";
import { toast as sonnerToast, type ExternalToast, type ToastT } from "sonner";
import {
  JournalNotification,
  type JournalNotificationDetails,
  type JournalNotificationUndo,
} from "@/components/ui/journal-notification";
import {
  NotificationClock,
  NotificationExitRegistry,
  NOTIFICATION_DEFAULT_DURATION,
  type NotificationExitReason,
  type NotificationId,
} from "@/lib/journal-notification-lifecycle";
import {
  createJournalNotificationStore,
  type PersistedJournalNotification,
} from "@/lib/journal-notification-persistence";
import {
  isPersistedNotificationDescriptor,
  journalNotificationDescriptor,
  type PersistedNotificationDescriptor,
} from "@/lib/journal-notification-descriptor";

export type JournalToastKind =
  "success" | "error" | "info" | "warning" | "loading" | "update";

export type JournalToastOptions = ExternalToast & {
  heading?: ReactNode;
  details?: JournalNotificationDetails;
  undo?: JournalNotificationUndo;
  variant?: "intake-saved" | "unchanged";
  /** Browser-only examples, live requests and service workers cannot be replayed. */
  persistence?: false;
  /** Fences a late async result to the journal that initiated its request. */
  journalScope?: string;
  /** Commit a guarded action only after its current card completes its exit. */
  afterActionExit?: () => void;
};
export type { JournalNotificationDetails, JournalNotificationUndo };
type ToastMessage = Parameters<typeof sonnerToast>[0];
type SavedNotice =
  PersistedJournalNotification<PersistedNotificationDescriptor>;
type Store = ReturnType<
  typeof createJournalNotificationStore<PersistedNotificationDescriptor>
>;
type Binding = {
  scope: string;
  store: Store;
  undo: (token: string) => Promise<void>;
};
type LiveNotice = {
  id: NotificationId;
  hostId?: string;
  kind: JournalToastKind;
  heading: ReactNode;
  body: ReactNode;
  duration: number;
  dismissible: boolean;
  options: JournalToastOptions;
  clock: NotificationClock;
  binding: Binding | null;
  descriptor?: PersistedNotificationDescriptor;
  createdAt: number;
  lastSaved: number;
  lastElapsed?: number;
  version: number;
  removed: boolean;
};

const exits = new NotificationExitRegistry();
const live = new Map<NotificationId, LiveNotice>();
let active: Binding | null = null;
let lastIssued = 0;
const issueTime = () => (lastIssued = Math.max(Date.now(), lastIssued + 1));
const defaultHeadings: Record<JournalToastKind, string> = {
  success: "Change saved",
  error: "Action failed",
  info: "Journal notice",
  warning: "Please review",
  loading: "In progress",
  update: "Update available",
};

function plainText(value: ReactNode): string | undefined {
  if (value == null || typeof value === "boolean") return "";
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (Array.isArray(value)) {
    const values = value.map(plainText);
    return values.every((entry) => entry !== undefined)
      ? values.join("")
      : undefined;
  }
  if (
    isValidElement<{ children?: ReactNode }>(value) &&
    "children" in value.props
  )
    return plainText(value.props.children);
  return undefined;
}

function describe(
  entry: LiveNotice,
): PersistedNotificationDescriptor | undefined {
  const { options } = entry;
  // A callback is live process state, not a recoverable command. Persisted Undo
  // instead carries its original signed receipt and rebinds to the current session.
  if (
    !entry.binding ||
    options.persistence === false ||
    entry.kind === "loading" ||
    entry.kind === "update" ||
    options.afterActionExit ||
    options.action ||
    options.cancel
  )
    return;
  const details = options.details;
  const candidate = {
    version: 1,
    kind: entry.kind,
    heading: plainText(entry.heading),
    message: plainText(entry.body),
    dismissible: entry.dismissible,
    variant: options.variant,
    details: details && {
      preview: details.preview,
      paragraphs: details.paragraphs?.map(plainText),
      facts: details.facts?.map(({ label, value }) => ({
        label: plainText(label),
        value: plainText(value),
      })),
      links: details.links,
      footer:
        details.footer === undefined ? undefined : plainText(details.footer),
    },
    undo: options.undo?.receipt && {
      receipt: options.undo.receipt,
      label: options.undo.label,
      pendingLabel: options.undo.pendingLabel,
      successLabel: options.undo.successLabel,
    },
  };
  const parsed = journalNotificationDescriptor.safeParse(candidate);
  if (!parsed.success) return;
  // Optional undefined fields are intentionally absent from the storage DTO.
  return JSON.parse(
    JSON.stringify(parsed.data),
  ) as PersistedNotificationDescriptor;
}

function checkpoint(entry: LiveNotice, force = false) {
  if (
    !entry.binding ||
    !entry.descriptor ||
    entry.removed ||
    live.get(entry.id) !== entry
  )
    return;
  const now = Date.now();
  if (!force && now - entry.lastSaved < NOTIFICATION_CHECKPOINT_INTERVAL)
    return;
  entry.lastSaved = now;
  const clock = entry.clock.checkpoint();
  if (!force && clock.elapsedActive === entry.lastElapsed) return;
  entry.lastElapsed = clock.elapsedActive;
  const result = entry.binding.store.upsert({
    id: entry.id,
    descriptor: entry.descriptor,
    createdAt: entry.createdAt,
    clock,
    updatedAt: Math.max(now, entry.createdAt),
  });
  if (result.error === "stale-generation") {
    // A confirmed logout in another tab fences this mounted provider too.
    const binding = entry.binding;
    for (const notice of live.values())
      if (notice.binding === binding) detach(notice);
    if (active === binding) active = null;
  } else if (
    result.status !== "error" &&
    !result.records.some(
      (record) =>
        record.id === entry.id && record.createdAt === entry.createdAt,
    )
  ) {
    detach(entry);
  }
}

function detach(entry: LiveNotice) {
  hideNativeHost(entry);
  entry.removed = true;
  exits.finish(entry.id, entry.version);
  if (live.get(entry.id) === entry) live.delete(entry.id);
  if (entry.hostId) sonnerToast.dismiss(entry.hostId);
}

function hideNativeHost(entry: LiveNotice) {
  if (!entry.hostId || typeof document === "undefined") return;
  for (const element of document.querySelectorAll<HTMLElement>(
    "[data-notification-host-id]",
  )) {
    if (element.dataset.notificationHostId !== entry.hostId) continue;
    // Journal changes must not leave private content painted during Sonner's
    // native removal animation. Normal dismissals still use the full outro.
    element.style.visibility = "hidden";
    element.inert = true;
  }
}

function forget(entry: LiveNotice) {
  if (entry.removed) return;
  entry.removed = true;
  if (entry.descriptor)
    entry.binding?.store.remove(entry.id, issueTime(), entry.createdAt);
}

function requestExit(
  entry: LiveNotice,
  reason: NotificationExitReason = "dismiss",
) {
  if (live.get(entry.id) !== entry) return false;
  forget(entry);
  return exits.request(entry.id, reason);
}

function show(entry: LiveNotice) {
  const { id, kind, duration, dismissible, options } = entry;
  const hostId =
    (entry.hostId ??= `notice-host-${globalThis.crypto?.randomUUID?.() ?? issueTime()}`);
  const {
    heading: _heading,
    details,
    undo,
    variant,
    persistence: _persistence,
    journalScope: _journalScope,
    afterActionExit,
    ...nativeOptions
  } = options;
  void _heading;
  void _persistence;
  void _journalScope;
  const recordText =
    kind === "success" && details?.preview
      ? recordNotificationContent(details.preview)
      : undefined;
  const heading = recordText?.heading ?? entry.heading;
  const body = recordText?.message ?? entry.body;
  entry.version = exits.begin(id);
  const version = entry.version;
  const current = () => live.get(id) === entry && exits.isCurrent(id, version);
  const record: ToastT = {
    ...nativeOptions,
    id,
    title: heading,
    description: body,
    type: kind === "update" ? "normal" : kind,
    duration,
  };
  const finish = (reason: NotificationExitReason) => {
    if (!current() || !exits.finish(id, version)) return;
    forget(entry);
    live.delete(id);
    try {
      if (reason === "timeout") nativeOptions.onAutoClose?.(record);
      else if (reason === "dismiss") nativeOptions.onDismiss?.(record);
    } finally {
      sonnerToast.dismiss(hostId);
    }
    if (reason === "action") afterActionExit?.();
  };
  sonnerToast.custom(
    () => (
      <JournalNotification
        key={version}
        id={id}
        nativeHostId={hostId}
        kind={kind}
        heading={heading}
        message={body}
        details={details}
        undo={undo}
        variant={variant}
        icon={nativeOptions.icon}
        duration={duration}
        readingClock={entry.clock}
        onCheckpoint={() => checkpoint(entry)}
        onUndoPending={(pending) => {
          if (!entry.descriptor || !current()) return;
          // Never replay a command whose confirmation was interrupted by a reload.
          entry.descriptor = {
            ...entry.descriptor,
            undo: pending ? undefined : describe(entry)?.undo,
          };
          entry.descriptor = JSON.parse(
            JSON.stringify(entry.descriptor),
          ) as PersistedNotificationDescriptor;
          entry.createdAt = issueTime();
          checkpoint(entry, true);
        }}
        dismissible={dismissible}
        action={nativeOptions.action}
        cancel={nativeOptions.cancel}
        actionButtonStyle={nativeOptions.actionButtonStyle}
        cancelButtonStyle={nativeOptions.cancelButtonStyle}
        registerExit={(exit, cancelExit) =>
          exits.attach(id, version, exit, cancelExit)
        }
        onRequestDismiss={(reason) => requestExit(entry, reason)}
        onExitComplete={finish}
        isCurrent={current}
        onDetachedUndoFailure={(error) => {
          if (entry.binding !== active) return;
          notify(
            "error",
            error instanceof Error
              ? error.message
              : "That undo could not be confirmed.",
            {
              heading: "Undo unsuccessful",
              details: {
                paragraphs: [
                  "The original notice closed before this undo could be confirmed. Review your journal before trying again.",
                ],
                facts: [{ label: "Original change", value: heading }],
              },
            },
          );
        }}
      />
    ),
    {
      ...nativeOptions,
      id: hostId,
      duration: Infinity,
      dismissible,
      closeButton: false,
      description: undefined,
      icon: null,
      action: undefined,
      cancel: undefined,
      onAutoClose: undefined,
      onDismiss: (nativeRecord) => {
        if (!current() || !exits.finish(id, version)) return;
        forget(entry);
        live.delete(id);
        nativeOptions.onDismiss?.(record ?? nativeRecord);
      },
      className: [
        "journal-notification-host",
        `journal-toast--${kind}`,
        nativeOptions.className,
      ]
        .filter(Boolean)
        .join(" "),
    },
  );
  return id;
}

function notify(
  kind: JournalToastKind,
  message: ToastMessage,
  options: JournalToastOptions = {},
) {
  if (kind === "success" && options.variant === "unchanged") {
    kind = "info";
    message = "Already saved just like this.";
    options = {
      ...options,
      heading: "No changes.",
      description: undefined,
      undo: undefined,
    };
  }
  const description =
    options.description === undefined ? message : options.description;
  const duration =
    kind === "loading"
      ? Infinity
      : (options.duration ?? NOTIFICATION_DEFAULT_DURATION);
  const id =
    options.id ??
    `notice-${globalThis.crypto?.randomUUID?.() ?? `${issueTime()}-${Math.random().toString(36).slice(2)}`}`;
  if (
    options.journalScope !== undefined &&
    options.journalScope !== active?.scope
  )
    return id;
  const previous = live.get(id);
  const retainedHost =
    previous && !previous.removed ? previous.hostId : undefined;
  if (previous) {
    if (previous.removed && previous.hostId)
      sonnerToast.dismiss(previous.hostId);
    previous.removed = true;
    exits.finish(id, previous.version);
  }
  const entry: LiveNotice = {
    id,
    hostId: retainedHost,
    kind,
    heading: options.heading ?? defaultHeadings[kind],
    body: typeof description === "function" ? description() : description,
    duration,
    dismissible: kind !== "loading" && options.dismissible !== false,
    options,
    clock: new NotificationClock(duration),
    binding: active,
    createdAt: issueTime(),
    lastSaved: 0,
    version: -1,
    removed: false,
  };
  entry.descriptor = describe(entry);
  live.set(id, entry);
  // A same-ID ephemeral replacement must not leave the preceding saved notice.
  if (!entry.descriptor && previous?.descriptor)
    previous.binding?.store.remove(id, entry.createdAt, previous.createdAt);
  checkpoint(entry, true);
  return entry.removed ? id : show(entry);
}

function hideBinding(binding: Binding) {
  for (const entry of live.values()) {
    if (entry.binding !== binding) continue;
    checkpoint(entry, true);
    hideNativeHost(entry);
    entry.clock.pause("workspace", true);
    exits.finish(entry.id, entry.version);
    live.delete(entry.id);
    if (entry.hostId) sonnerToast.dismiss(entry.hostId);
  }
}

/** Bind only a server-authenticated journal namespace, never an entered password. */
export function bindJournalNotifications(
  scope: string,
  undo: (token: string) => Promise<void>,
) {
  if (active) hideBinding(active);
  const binding: Binding = {
    scope,
    undo,
    store: createJournalNotificationStore<PersistedNotificationDescriptor>(
      scope,
      { validateDescriptor: isPersistedNotificationDescriptor },
    ),
  };
  active = binding;
  const restore = (record: SavedNotice) => {
    const descriptor = updateCompensanNotification(
      record.descriptor,
      record.createdAt,
    );
    const readingClock = NotificationClock.restore(record.clock);
    if (readingClock.snapshot().expired) {
      binding.store.remove(record.id, issueTime(), record.createdAt);
      return;
    }
    lastIssued = Math.max(lastIssued, record.createdAt);
    const receipt = descriptor.undo?.receipt;
    const restoredUndo: JournalNotificationUndo | undefined =
      receipt && Date.parse(receipt.expiresAt) > Date.now()
        ? {
            ...descriptor.undo,
            onUndo: async () => {
              if (
                active !== binding ||
                Date.parse(receipt.expiresAt) <= Date.now()
              )
                throw new Error(
                  "This Undo has expired. Review the saved entry instead.",
                );
              await binding.undo(receipt.token);
            },
          }
        : undefined;
    const entry: LiveNotice = {
      id: record.id,
      kind: descriptor.kind,
      heading: descriptor.heading,
      body: descriptor.message,
      dismissible: descriptor.dismissible,
      duration: record.clock.duration ?? Infinity,
      clock: readingClock,
      options: {
        id: record.id,
        details: descriptor.details as JournalNotificationDetails | undefined,
        undo: restoredUndo,
        variant: descriptor.variant,
      },
      binding,
      descriptor,
      createdAt: record.createdAt,
      lastSaved: Date.now(),
      version: -1,
      removed: false,
    };
    live.set(entry.id, entry);
    show(entry);
  };
  for (const record of binding.store.read().records) restore(record);
  const save = () => {
    for (const entry of live.values())
      if (entry.binding === binding) checkpoint(entry, true);
    binding.store.flush();
  };
  const storageChanged = (event: StorageEvent) => {
    if (event.key !== binding.store.key && event.key !== null) return;
    // Closed cards from another tab must never be resurrected by this tab's
    // next checkpoint. Synchronize generations before any further writes.
    const saved = binding.store.read().records;
    const records = new Map(saved.map((record) => [record.id, record]));
    for (const entry of live.values()) {
      if (entry.binding !== binding || !entry.descriptor) continue;
      const record = records.get(entry.id);
      if (!record || record.createdAt !== entry.createdAt) {
        entry.removed = true;
        exits.finish(entry.id, entry.version);
        live.delete(entry.id);
        if (entry.hostId) sonnerToast.dismiss(entry.hostId);
      }
    }
  };
  window.addEventListener("pagehide", save);
  window.addEventListener("pageshow", save);
  window.addEventListener("beforeunload", save);
  document.addEventListener("visibilitychange", save);
  window.addEventListener("storage", storageChanged);
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    window.removeEventListener("pagehide", save);
    window.removeEventListener("pageshow", save);
    window.removeEventListener("beforeunload", save);
    document.removeEventListener("visibilitychange", save);
    window.removeEventListener("storage", storageChanged);
    if (active !== binding) return;
    hideBinding(binding);
    binding.store.flush();
    active = null;
  };
}

/** Confirmed logout clears only the matching journal and fences stale tabs. */
export function clearJournalNotifications(scope: string) {
  if (active?.scope === scope) {
    hideBinding(active);
    active = null;
  }
  createJournalNotificationStore(scope).clear(issueTime());
}

const ofKind =
  (kind: JournalToastKind) =>
  (message: ToastMessage, options?: JournalToastOptions) =>
    notify(kind, message, options);
function dismiss(id?: NotificationId) {
  if (id !== undefined) {
    const entry = live.get(id);
    return entry && requestExit(entry) ? id : sonnerToast.dismiss(id);
  }
  for (const entry of live.values()) requestExit(entry);
  const managedHosts = new Set([...live.values()].map((entry) => entry.hostId));
  for (const entry of sonnerToast.getToasts())
    if (!managedHosts.has(String(entry.id))) sonnerToast.dismiss(entry.id);
}

export const toast = Object.assign(ofKind("info"), {
  success: ofKind("success"),
  error: ofKind("error"),
  info: ofKind("info"),
  warning: ofKind("warning"),
  loading: ofKind("loading"),
  update: ofKind("update"),
  message: ofKind("info"),
  dismiss,
});
