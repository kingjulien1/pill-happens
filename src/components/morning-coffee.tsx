import { Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./morning-coffee.module.css";

export function MorningCoffee({ className }: { className?: string }) {
  return <Coffee className={cn(styles.coffee, className)} aria-hidden="true" />;
}
