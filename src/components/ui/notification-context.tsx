import type { ReactNode } from "react";
import {
  BadgeCheck,
  CircleAlert,
  Info,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import type {
  JournalToastKind,
  JournalNotificationDetails,
} from "./journal-toast";
import styles from "@/components/notification-change-preview.module.css";

const presentation = {
  success: { Icon: BadgeCheck, label: "Completed", context: "Result" },
  error: {
    Icon: CircleAlert,
    label: "Not confirmed",
    context: "Review before retrying",
  },
  warning: {
    Icon: TriangleAlert,
    label: "Please review",
    context: "Before you continue",
  },
  info: { Icon: Info, label: "Good to know", context: "Journal context" },
  loading: {
    Icon: LoaderCircle,
    label: "In progress",
    context: "Awaiting the result",
  },
  update: { Icon: Info, label: "App update", context: "New files ready" },
} as const;

/** All supplied context stays readable; no private draft or recovery is inferred. */
export function NotificationContext({
  kind,
  heading,
  message,
  details,
}: {
  kind: JournalToastKind;
  heading: ReactNode;
  message: ReactNode;
  details?: JournalNotificationDetails;
}) {
  const { Icon, label, context } = presentation[kind];
  const paragraphs =
    details?.paragraphs?.filter((paragraph) => paragraph !== message) ?? [];
  return (
    <section
      className={`${styles.root} ${styles.receipt}`}
      data-notification-context={kind}
    >
      <header className={styles.receiptIntro}>
        <span className={styles.receiptKicker}>
          <Icon aria-hidden="true" />
          {label}
        </span>
        <div className={styles.receiptHeading}>
          <div>
            <h3>{heading}</h3>
          </div>
        </div>
        <div className={styles.receiptContext}>
          <strong>{context}</strong>
          <span className={styles.contextSlash} aria-hidden="true">
            /
          </span>
          <span>
            {kind === "loading"
              ? "This notice updates when it finishes"
              : "Details & next steps"}
          </span>
        </div>
        <p className={styles.contextMessage}>{message}</p>
      </header>
      {!!details?.facts?.length && (
        <dl className={styles.factBoard}>
          {details.facts.map((fact, index) => (
            <div key={index}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {paragraphs.length > 0 && (
        <div className={styles.contextBody}>
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      )}
      {details?.footer && (
        <aside className={styles.correctionNote} role="note">
          <Info aria-hidden="true" />
          <div>
            <h4>{kind === "error" ? "Before trying again" : "Keep in mind"}</h4>
            <p>{details.footer}</p>
          </div>
        </aside>
      )}
    </section>
  );
}
