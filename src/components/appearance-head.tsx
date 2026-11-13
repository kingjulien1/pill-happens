import { APPEARANCE_BOOT_SCRIPT } from "@/lib/appearance";

/** Before both external CSS and the controlled-refresh curtain are painted. */
export function AppearanceHead() {
  return (
    <script
      data-appearance-boot
      dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOT_SCRIPT }}
    />
  );
}
