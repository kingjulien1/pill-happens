import { APP_CANVAS_CSS } from "@/lib/app-theme";
import { APPEARANCE_BOOT_SCRIPT } from "@/lib/appearance";

/** Before both external CSS and the controlled-refresh curtain are painted. */
export function AppearanceHead() {
  return (
    <>
      <style
        data-app-canvas
        dangerouslySetInnerHTML={{
          __html: `
          :root { ${APP_CANVAS_CSS} }
          html { background-color: var(--app-canvas-base); }
          body {
            margin: 0;
            min-height: 100dvh;
            background: var(--app-canvas-background);
            background-attachment: fixed;
            color: var(--foreground, var(--app-canvas-foreground));
          }
        `,
        }}
      />
      <script
        data-appearance-boot
        dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOT_SCRIPT }}
      />
    </>
  );
}
