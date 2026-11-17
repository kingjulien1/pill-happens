"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  CheckCheck,
  CircleAlert,
  Info,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Trash2,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { toast, type JournalToastKind } from "@/components/ui/journal-toast";
import type { NotificationId } from "@/lib/journal-notification-lifecycle";
import type {
  NotificationMedicationSnapshot,
  NotificationPreviewRecord,
} from "@/lib/notification-change-preview";
import { Button } from "@/components/ui/button";
import styles from "./guide-notification-demo.module.css";

const kinds = [
  { kind: "success", label: "Success", Icon: CheckCheck },
  { kind: "error", label: "Error", Icon: CircleAlert },
  { kind: "info", label: "Info", Icon: Info },
  { kind: "warning", label: "Warning", Icon: TriangleAlert },
  { kind: "loading", label: "Loading", Icon: LoaderCircle },
  { kind: "update", label: "Update", Icon: Sparkles },
] as const;

const summaries: Record<JournalToastKind, string> = {
  success: "An example change, neatly noted.",
  error: "An example error. Nothing needs fixing here.",
  info: "A little context, with room for the details.",
  warning: "A sample heads-up, without the actual drama.",
  loading: "An example wait. Clear demos when you’re ready.",
  update: "A sample update, already dressed for the occasion.",
};

const sampleMedication: NotificationMedicationSnapshot = {
  name: "Example Aurora",
  activeIngredient: "Example ingredient",
  strengthMg: 2,
  defaultQuantity: 1,
  form: "tablet",
  color: "rose",
  icon: "pill",
  iconRotation: 15,
  archived: false,
  categories: [],
};

function sampleIntake(quantity: number): NotificationPreviewRecord {
  return {
    kind: "intake",
    name: sampleMedication.name,
    quantity,
    strengthMg: sampleMedication.strengthMg,
    form: "tablet",
    takenAt: "2026-11-15T20:15:00.000Z",
    timeZone: "Europe/Vienna",
    medication: {
      ...sampleMedication,
      categories: [...sampleMedication.categories],
    },
  };
}

/** Explicit local demos use the real facade and the existing global Toaster. */
export function GuideNotificationDemo() {
  const scope = useId();
  const ids = useRef(new Set<NotificationId>());
  const timers = useRef(
    new Map<NotificationId, ReturnType<typeof setTimeout>>(),
  );
  const [sample, setSample] = useState("No sample change yet");
  const [sampleQuantity, setSampleQuantity] = useState(0.5);
  const [status, setStatus] = useState(
    "Choose an example to show a real notification.",
  );

  useEffect(() => {
    const ownedIds = ids.current;
    const ownedTimers = timers.current;
    return () => {
      for (const timer of ownedTimers.values()) clearTimeout(timer);
      ownedTimers.clear();
      for (const id of ownedIds) toast.dismiss(id);
      ownedIds.clear();
    };
  }, []);

  function own(name: string) {
    const id = `notification-guide-${scope}-${name}`;
    ids.current.add(id);
    return id;
  }

  function show(kind: JournalToastKind) {
    toast[kind](summaries[kind], {
      persistence: false,
      id: own(kind),
      heading: `Demo ${kind}`,
      ...(kind === "update" ? { duration: Infinity } : {}),
      details: {
        paragraphs: [
          "This is the production notification component using invented content. Opening it pauses its reading countdown; its details, links and footer expand beneath the summary.",
          kind === "loading"
            ? "Loading has no countdown and cannot be swiped away. Clear demos removes it through the programmatic exit, just as a completed operation would replace or dismiss it."
            : kind === "update"
              ? "This update example is deliberately persistent. It remains until you clear the demo or dismiss it; it does not reload the app."
              : "The normal reading time is 11 seconds. Focus, pointer interaction and a rear stack position also pause it. Swipe left, right or up to dismiss.",
        ],
        facts: [
          { label: "Source", value: "Developer Guide" },
          { label: "Records Changed", value: "None" },
        ],
        links: [
          { label: "Reading Clock Reference", href: "#notifications-clock" },
        ],
        footer: "Demo only · Your journal stays as it is.",
      },
    });
    setStatus(
      `${kind[0].toUpperCase()}${kind.slice(1)} demo shown. Tap its card for context.`,
    );
  }

  function flow(fail: boolean) {
    const id = own("flow");
    const pending = timers.current.get(id);
    if (pending) clearTimeout(pending);
    toast.loading("A local timer is standing in for a request.", {
      persistence: false,
      id,
      heading: "Demo request",
      details: {
        paragraphs: [
          "After 1.8 seconds this same notification ID will show a simulated result. No request is sent.",
        ],
        footer: "Demo only · No network operation.",
      },
    });
    setStatus(`Loading → ${fail ? "error" : "success"} demo started.`);
    timers.current.set(
      id,
      setTimeout(() => {
        timers.current.delete(id);
        const send = fail ? toast.error : toast.success;
        send(
          fail
            ? "A pretend failure, with a real explanation."
            : "The pretend request has finished.",
          {
            id,
            persistence: false,
            heading: fail ? "Demo request failed" : "Demo request finished",
            details: {
              paragraphs: [
                "The loading notice was replaced using the same ID. The new generation gets a fresh reading clock, and stale callbacks cannot remove it.",
                "In application code, choose the result after awaiting the real operation. This guide uses a local timer only.",
              ],
              links: [
                { label: "Same-ID Example", href: "#notifications-examples" },
              ],
              footer: "Demo only · No journal change to reverse.",
            },
          },
        );
        setStatus(`The same ID now shows ${fail ? "error" : "success"}.`);
      }, 1_800),
    );
  }

  function undoExample() {
    const beforeQuantity = sampleQuantity;
    const afterQuantity = beforeQuantity === 1 ? 0.5 : 1;
    const preview = {
      before: sampleIntake(beforeQuantity),
      after: sampleIntake(afterQuantity),
    };
    setSampleQuantity(afterQuantity);
    setSample(
      `Example changed from ${beforeQuantity} to ${afterQuantity} tablet`,
    );
    toast.success("An invented intake edit, with a local Undo.", {
      persistence: false,
      id: own("undo"),
      heading: "Demo intake updated",
      details: {
        preview,
        links: [{ label: "Real Undo Safeguards", href: "#notifications-undo" }],
      },
      undo: {
        label: "Undo Demo",
        onUndo: () => {
          setSampleQuantity(beforeQuantity);
          setSample(`Example restored to ${beforeQuantity} tablet`);
        },
      },
    });
    setStatus(
      "Open the invented before/after preview, or use the centered Undo Demo icon. Only the local sample status changes; no server request runs.",
    );
  }

  function clear() {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
    for (const id of ids.current) toast.dismiss(id);
    ids.current.clear();
    setStatus(
      "Demo notifications cleared. Other notifications were left alone.",
    );
  }

  return (
    <section
      className={styles.demo}
      id="notifications-demo"
      aria-labelledby="notifications-demo-title"
      data-notification-guide-demo
    >
      <div className={styles.heading}>
        <h3 id="notifications-demo-title" data-guide-outline-level="2">
          Try The Real Component
        </h3>
        <span>
          Live UI <b>·</b> Demo Data
        </span>
      </div>
      <p className={styles.intro}>
        Show a notice, open its details, pause the countdown and swipe it away.
        Intake &amp; Undo compares invented before/after records and reverses
        only the sample status below. These controls use invented data and make
        no journal or network changes.
      </p>
      <div className={styles.kinds} aria-label="Notification type examples">
        {kinds.map(({ kind, label, Icon }) => (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            key={kind}
            onClick={() => show(kind)}
          >
            <Icon size={15} strokeWidth={2.2} aria-hidden="true" />
            {label}
          </Button>
        ))}
      </div>
      <div
        className={styles.actions}
        aria-label="Notification lifecycle examples"
      >
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => flow(false)}
        >
          <RefreshCw size={14} aria-hidden="true" />
          Loading → Success
        </Button>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => flow(true)}
        >
          <CircleAlert size={14} aria-hidden="true" />
          Loading → Error
        </Button>
        <Button variant="ghost" size="sm" type="button" onClick={undoExample}>
          <Undo2 size={14} aria-hidden="true" />
          Intake & Undo
        </Button>
        <Button variant="ghost" size="sm" type="button" onClick={clear}>
          <Trash2 size={14} aria-hidden="true" />
          Clear Demos
        </Button>
      </div>
      <div className={styles.status}>
        <p role="status" aria-live="polite">
          {status}
        </p>
        <span>
          Local Sample <b>{sample}</b>
        </span>
      </div>
      <p className={styles.note}>
        Loading and Update examples stay open. Clear Demos cancels pending
        example timers and dismisses only notices created here; leaving this
        guide cleans them up too.
      </p>
    </section>
  );
}
