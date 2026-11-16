/** Public project references and examples; no journal state belongs in this file. */
export const DEVELOPER_REPOSITORY =
  "https://github.com/kingjulien1/pill-happens";

export function developerSource(path: string) {
  return `${DEVELOPER_REPOSITORY}/blob/main/${path}`;
}

export const DEVELOPER_SECTIONS = [
  ["foundation", "Foundation"],
  ["colors", "Colors & Appearance"],
  ["roles", "Theme Roles"],
  ["setup", "Theme Setup"],
  ["specimens", "In Context"],
  ["typography", "Type & Rhythm"],
  ["responsive-layout", "Responsive Layout & Breakpoints"],
  ["buttons", "Buttons & Action Hierarchy"],
  ["layers", "Layers & Light"],
  ["motion", "Motion & Input"],
  ["notifications", "Notifications & Undo"],
  ["icons", "Icons & Artwork"],
  ["architecture", "Source Map"],
  ["development", "Development"],
  ["github", "GitHub & Contributions"],
] as const;

export const THEME_USAGE_EXAMPLE = `/* Choose a surface and the text designed for it. */
.reading-card {
  background: var(--surface-reading);
  color: var(--surface-reading-foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.reading-card small {
  color: var(--muted-foreground);
}

/* Copy above the moving field uses the canvas pair. */
.canvas-heading {
  color: var(--canvas-foreground);
}

.canvas-caption {
  color: var(--canvas-muted-foreground);
}`;

export const TAILWIND_THEME_EXAMPLE = `<section className="rounded-2xl border border-border
  bg-surface-reading p-4 text-surface-reading-foreground">
  <h2 className="text-sm font-semibold">A Familiar Surface</h2>
  <p className="mt-2 text-xs text-muted-foreground">
    Use semantic roles so the system mode can do its work.
  </p>
</section>`;

export const THEME_WORKFLOW_EXAMPLE = `# 1. Change the source palette or role values.
#    src/lib/app-theme.ts

# 2. Regenerate the application and offline theme.
npm run theme:generate

# 3. Verify the generated output and theme behavior.
npm run theme:check
node --import tsx --test src/lib/app-theme.test.ts

# 4. Inspect both device modes and the moving canvas.
npm run dev`;

export const LOCAL_SETUP_EXAMPLE = `git clone https://github.com/kingjulien1/pill-happens.git
cd pill-happens
npm ci
npm run dev

# Open http://127.0.0.1:3000`;

export const VALIDATION_EXAMPLE = `npm run lint
npm run typecheck
npm test
npm run format:check
npm run theme:check
npm run palette:check
npm run icons:tablets:check
npm run icons:app:check
npm run build`;

export const GENERATED_ASSETS_EXAMPLE = `# Application roles + offline theme
npm run theme:generate

# Installed Tailwind palette -> medication swatches
npm run palette:generate

# Tablet geometry + artwork -> public SVGs
npm run icons:tablets

# App installation artwork
npm run icons:app`;

export const MOTION_EXAMPLE = `/* Continuous effects respect the device preference. */
@media (prefers-reduced-motion: reduce) {
  .decorative-effect {
    animation: none;
    transition: none;
  }
}

/* Hover belongs to larger screens with a precise pointer. */
@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .interactive-card:hover {
    border-color: var(--ring);
  }
}`;

export const SOURCE_GROUPS = [
  {
    title: "Theme & Reading",
    description:
      "The palette, semantic roles, generated styles and this reference.",
    files: [
      [
        "src/lib/app-theme.ts",
        "Canonical palette, role values and CSS rendering",
      ],
      [
        "scripts/generate-app-theme.ts",
        "Application and offline theme generation",
      ],
      ["src/app/theme.css", "Generated light and dark CSS variables"],
      [
        "src/app/globals.css",
        "Tailwind mapping, global styles and component effects",
      ],
      ["src/components/guide-colors.tsx", "Live copy and inspection tools"],
    ],
  },
  {
    title: "Interaction & Effects",
    description:
      "The ambient field, action button, shared modals and arrival motion.",
    files: [
      [
        "src/components/journal-background.tsx",
        "Root field, static fallback and input-inert host",
      ],
      [
        "src/components/iridescence.tsx",
        "Passive Iridescence shader and lifecycle",
      ],
      [
        "src/components/iridescence.module.css",
        "Background-only blur and tint layers",
      ],
      ["src/components/grainient.tsx", "Optional legacy Grainient renderer"],
      [
        "src/components/intake-action.tsx",
        "Daily action content and mobile dock",
      ],
      [
        "src/components/specular-rim.tsx",
        "WebGL rim and fallback coordination",
      ],
      [
        "src/components/accent-button.tsx",
        "Reusable CSS-only warm accent action",
      ],
      [
        "src/components/accent-button.module.css",
        "First-frame field, light well and rounded moving rim",
      ],
      [
        "src/components/responsive-modal.tsx",
        "Responsive dialog and drawer presentation",
      ],
      [
        "src/components/streak-spotlight.tsx",
        "Targeted milestone arrival and cleanup",
      ],
    ],
  },
  {
    title: "Notifications & Undo",
    description:
      "Shared notification content, reading clocks, animations and scoped reversals.",
    files: [
      [
        "src/components/ui/journal-toast.tsx",
        "Public notification facade and same-ID generations",
      ],
      [
        "src/components/ui/journal-notification.tsx",
        "Expandable content, pauses, actions and staged dismissal",
      ],
      [
        "src/components/ui/sonner.tsx",
        "Native stack adapter and notification artwork",
      ],
      [
        "src/components/ui/sonner.css",
        "Mode-aware surfaces, geometry, icon and exit motion",
      ],
      [
        "src/lib/journal-notification-lifecycle.ts",
        "Monotonic reading clock, exit registry and async Undo settlement",
      ],
      [
        "src/lib/journal-notification-lifecycle.test.ts",
        "Clock, version and async failure regressions",
      ],
      [
        "src/lib/server/journal-undo.ts",
        "Signed receipts and atomic target restoration",
      ],
      [
        "src/lib/server/journal-undo.test.ts",
        "Scope, expiry, conflicts and persistence checks",
      ],
      ["src/app/api/undo/route.ts", "Authenticated same-origin Undo endpoint"],
      [
        "src/components/guide-notifications.tsx",
        "Complete notification developer reference",
      ],
      [
        "src/components/guide-notification-demo.tsx",
        "Isolated, synthetic live examples",
      ],
    ],
  },
  {
    title: "Medication Appearance",
    description:
      "Stable stored IDs, search vocabulary, geometry and generated artwork.",
    files: [
      ["src/lib/medication-appearance.ts", "Saved color and symbol validation"],
      ["src/lib/medication-palette.ts", "Generated Tailwind swatches"],
      [
        "src/lib/svg-icon-catalog.ts",
        "Project SVG names, labels and discovery",
      ],
      ["src/lib/tablet-icons/geometry.ts", "Lucide-compatible tablet outlines"],
      [
        "src/lib/tablet-icons/artwork.ts",
        "Colored variants and artwork metadata",
      ],
      [
        "src/components/medication-icon.tsx",
        "Shared medication glyph rendering",
      ],
    ],
  },
  {
    title: "Journal & Persistence",
    description: "Domain rules, API boundaries and isolated journal storage.",
    files: [
      ["src/lib/domain.ts", "Record shapes, tracking days and dose helpers"],
      ["src/lib/guide-onboarding.ts", "Optional new-journal guide state"],
      [
        "src/components/guide-onboarding.tsx",
        "Guide acknowledgement and first daily navigation",
      ],
      [
        "src/lib/server/guide-onboarding.ts",
        "Idempotent per-journal acknowledgement",
      ],
      [
        "src/components/journal-provider.tsx",
        "Client journal state and mutations",
      ],
      [
        "src/lib/server/api.ts",
        "Request checks, authentication and response handling",
      ],
      [
        "src/lib/server/journal-state.ts",
        "State reconciliation inside atomic writes",
      ],
      ["src/lib/server/journal-repository.ts", "Versioned Postgres repository"],
      [
        "src/lib/server/local-journal-repository.ts",
        "Development file repository",
      ],
    ],
  },
] as const;

export const CONTRIBUTION_STEPS = [
  {
    title: "Describe One Concrete Change",
    text: "Name the screen, the action that triggers the problem, and the behavior you want. For a visual change, include the viewport, light or dark mode, and an image made with synthetic entries.",
  },
  {
    title: "Work On A Focused Branch",
    text: "Start from the current main branch. Keep generated assets together with their source, preserve stored appearance IDs, and avoid mixing unrelated design or data changes into the same review.",
  },
  {
    title: "Verify The Result",
    text: "Run the checks that cover the change. Review phone widths, both system appearances, keyboard access, reduced motion and long content where relevant. Use an isolated journal with invented data.",
  },
  {
    title: "Make The Review Easy",
    text: "Explain the problem, the resulting behavior and the validation. Add before/after images for visible changes, note any persistence or migration effect, and include the generated-file checks you ran.",
  },
] as const;
