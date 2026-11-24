import { Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./morning-coffee.module.css";

export function MorningCoffee({ className }: { className?: string }) {
  return (
    <Coffee className={cn(styles.coffee, className)} aria-hidden="true">
      {/* Close only the cup body; its handle and steam keep their outline. */}
      <path
        d="M4 8h12a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1Z"
        fill="currentColor"
        stroke="none"
        data-coffee-cup-fill
      />
    </Coffee>
  );
}
