import {
  CircleAlert,
  CircleCheck,
  Info,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { JournalToastKind } from "@/components/ui/journal-toast";
import { cn } from "@/lib/utils";
import styles from "./notification-status-badge.module.css";

/** Shared display labels and symbols; a status never implies an Undo action. */
export const NOTIFICATION_STATUS_REGISTRY = {
  success: { label: "Success", Icon: CircleCheck },
  error: { label: "Error", Icon: CircleAlert },
  warning: { label: "Warning", Icon: TriangleAlert },
  info: { label: "Info", Icon: Info },
  loading: { label: "Loading", Icon: LoaderCircle },
  update: { label: "Update", Icon: Sparkles },
} as const satisfies Record<
  JournalToastKind,
  { label: string; Icon: LucideIcon }
>;

export type NotificationStatus = keyof typeof NOTIFICATION_STATUS_REGISTRY;

export type NotificationStatusBadgeProps = {
  status: NotificationStatus;
  label?: string;
  className?: string;
};

/** A quiet status label; its containing notification owns interaction and motion. */
export function NotificationStatusBadge({
  status,
  label,
  className,
}: NotificationStatusBadgeProps) {
  const { Icon, label: statusLabel } = NOTIFICATION_STATUS_REGISTRY[status];

  return (
    <Badge
      variant="secondary"
      className={cn(styles.badge, className)}
      data-notification-status={status}
    >
      <span className={styles.glyph} aria-hidden="true">
        <Icon size={9.5} strokeWidth={2.5} />
      </span>
      <span>{label ?? statusLabel}</span>
    </Badge>
  );
}
