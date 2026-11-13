/** Small, known destinations only: no journal IDs or private state in the loader. */
export const LOADING_SCREEN_LINKS = [
  { id: "today", href: "/", label: "Today" },
  { id: "journal", href: "/journal", label: "Journal" },
  { id: "history", href: "/history", label: "Past Days" },
  { id: "medications", href: "/medications", label: "Medications" },
  { id: "goals", href: "/goals", label: "Goals" },
  { id: "streaks", href: "/streaks", label: "Streaks" },
  { id: "guide", href: "/guide#start", label: "Guide" },
  { id: "developer-guide", href: "/developer-guide", label: "Dev Guide" },
] as const;

export type LoadingScreenLink = (typeof LOADING_SCREEN_LINKS)[number];

export const LOADING_SCREEN_COPY = {
  title: "Loading. Allegedly...",
  secondary: [
    "Your journal is taking a dramatic pause.",
    "Apparently, even pixels need a minute.",
  ],
  footer: [
    "Your pills, your days, your notes.",
    "Slightly more organised than life.",
  ],
} as const;

function routePath(value: string) {
  return value.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
}

function belongsToRoute(path: string, destination: string) {
  const family = routePath(destination);
  return path === family || (family !== "/" && path.startsWith(`${family}/`));
}

/**
 * Choose once per loading request. The browser caller verifies a referrer's
 * origin before supplying its pathname; this helper never follows supplied URLs.
 */
export function selectLoadingScreenLinks(
  pathname: string,
  referrerPathname?: string | null,
  random: () => number = Math.random,
): readonly [LoadingScreenLink, LoadingScreenLink] {
  const excluded = [routePath(pathname)];
  if (referrerPathname) excluded.push(routePath(referrerPathname));
  const candidates = LOADING_SCREEN_LINKS.filter(
    ({ href }) => !excluded.some((path) => belongsToRoute(path, href)),
  );

  // Eight destinations and at most two excluded families always leave two.
  function take() {
    const sample = random();
    const index = Math.min(
      candidates.length - 1,
      Math.max(
        0,
        Math.floor((Number.isFinite(sample) ? sample : 0) * candidates.length),
      ),
    );
    return candidates.splice(index, 1)[0];
  }

  return [take(), take()];
}
