export const sleepCycleMetrics = {
  reportScore: { label: "Sleep score", unit: "/ 100", max: 100 },
  dreamMinutes: { label: "Dream sleep", unit: "min", max: 1440 },
  lightMinutes: { label: "Light sleep", unit: "min", max: 1440 },
  deepMinutes: { label: "Deep sleep", unit: "min", max: 1440 },
  regularity: { label: "Regularity", unit: "%", max: 100 },
  snoringMinutes: { label: "Snoring", unit: "min", max: 1440 },
  coughingRate: { label: "Coughing", unit: "/ h", max: Infinity },
} as const;

export type ReportMetric = keyof typeof sleepCycleMetrics;
export const reportMetrics = Object.keys(sleepCycleMetrics) as ReportMetric[];
export const reportLabels = {
  lightsOut: "Went to Bed",
  gotUp: "Woke Up",
  fallAsleepMinutes: "Asleep After",
  awakeMinutes: "Awake",
  reportScore: "Sleep Score",
  lightMinutes: "Light Sleep",
  dreamMinutes: "Dream Sleep",
  deepMinutes: "Deep Sleep",
  regularity: "Regularity",
  snoringMinutes: "Snoring",
  coughingRate: "Coughing",
} satisfies Record<ReportKey, string>;
export type ReportKey =
  ReportMetric | "lightsOut" | "gotUp" | "fallAsleepMinutes" | "awakeMinutes";
export type ReportValues = Partial<Record<ReportKey, string>>;

export function readReportValue(
  key: ReportKey,
  raw: string,
): string | undefined {
  const text = raw.trim().toLowerCase().replace(/\s+/g, "").replace(",", ".");
  if (key === "lightsOut" || key === "gotUp") {
    return /^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(text)
      ? text.padStart(5, "0")
      : undefined;
  }
  if (key.endsWith("Minutes")) {
    const match = /^(?:(\d+)h)?(?:(\d+)(?:min|m))?$/.exec(text);
    if (!match || (!match[1] && !match[2])) return;
    const minutes = Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
    return minutes <= 1440 ? String(minutes) : undefined;
  }
  const number = text.replace(key === "coughingRate" ? /\/h$/ : /%$/, "");
  if (!(key === "coughingRate" ? /^\d+(\.\d+)?$/ : /^\d+$/).test(number))
    return;
  if (Number.isFinite(+number) && (key === "coughingRate" || +number <= 100))
    return number;
}
