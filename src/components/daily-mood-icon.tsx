import {
  Activity,
  Anchor,
  Armchair,
  Award,
  BatteryFull,
  BatteryLow,
  CheckCheck,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSun,
  Compass,
  Droplet,
  Droplets,
  Eye,
  Feather,
  Flag,
  Flame,
  Focus,
  Gauge,
  HandHeart,
  Heart,
  HeartHandshake,
  History,
  Hourglass,
  House,
  Laugh,
  Leaf,
  Lightbulb,
  Meh,
  MessagesSquare,
  Minus,
  Mountain,
  Orbit,
  PartyPopper,
  Pause,
  Puzzle,
  Rocket,
  Scale,
  Search,
  Shell,
  Shield,
  ShieldCheck,
  Shuffle,
  Smile,
  Snail,
  Sparkles,
  Split,
  Sprout,
  Sunrise,
  Sun,
  Timer,
  TreePine,
  Undo2,
  Unlink,
  UserRound,
  Users,
  Vibrate,
  Volume1,
  Waves,
  Wind,
  Zap,
  type LucideProps,
} from "lucide-react";
import { DAILY_MOODS, type DailyMood } from "@/lib/daily-check-in";

const moodById = new Map(DAILY_MOODS.map((mood) => [mood.value, mood]));

const symbols = {
  activity: Activity,
  anchor: Anchor,
  armchair: Armchair,
  award: Award,
  "battery-full": BatteryFull,
  "battery-low": BatteryLow,
  "check-check": CheckCheck,
  "circle-check": CircleCheck,
  "circle-dashed": CircleDashed,
  "circle-help": CircleHelp,
  cloud: Cloud,
  "cloud-drizzle": CloudDrizzle,
  "cloud-fog": CloudFog,
  "cloud-lightning": CloudLightning,
  "cloud-moon": CloudMoon,
  "cloud-rain": CloudRain,
  "cloud-sun": CloudSun,
  compass: Compass,
  droplet: Droplet,
  droplets: Droplets,
  eye: Eye,
  feather: Feather,
  flag: Flag,
  flame: Flame,
  focus: Focus,
  gauge: Gauge,
  "hand-heart": HandHeart,
  heart: Heart,
  "heart-handshake": HeartHandshake,
  history: History,
  hourglass: Hourglass,
  house: House,
  laugh: Laugh,
  leaf: Leaf,
  lightbulb: Lightbulb,
  meh: Meh,
  "messages-square": MessagesSquare,
  minus: Minus,
  mountain: Mountain,
  orbit: Orbit,
  "party-popper": PartyPopper,
  pause: Pause,
  puzzle: Puzzle,
  rocket: Rocket,
  scale: Scale,
  search: Search,
  shell: Shell,
  shield: Shield,
  "shield-check": ShieldCheck,
  shuffle: Shuffle,
  smile: Smile,
  snail: Snail,
  sparkles: Sparkles,
  split: Split,
  sprout: Sprout,
  sun: Sun,
  sunrise: Sunrise,
  timer: Timer,
  "tree-pine": TreePine,
  "undo-2": Undo2,
  unlink: Unlink,
  "user-round": UserRound,
  users: Users,
  vibrate: Vibrate,
  "volume-1": Volume1,
  waves: Waves,
  wind: Wind,
  zap: Zap,
};

/** One renderer upgrades old and new saved mood IDs everywhere without rewriting data. */
export function DailyMoodIcon({
  mood,
  ...props
}: LucideProps & { mood: DailyMood }) {
  const option = moodById.get(mood);
  const Icon = option ? symbols[option.icon] : Smile;
  return <Icon aria-hidden="true" size={15} strokeWidth={2.1} {...props} />;
}

/** Cards and notification snapshots share the same four-icon preview. */
export function DailyMoodIndicators({
  moods,
  className,
  id,
}: {
  moods: readonly DailyMood[];
  className: string;
  id?: string;
}) {
  if (!moods.length) return null;
  const visible = moods.slice(0, 4);
  const labels = visible.map((mood) => moodById.get(mood)?.label ?? mood);
  const remaining = moods.length - visible.length;
  const more = remaining
    ? `${remaining} more ${remaining === 1 ? "feeling" : "feelings"}`
    : "";
  return (
    <span
      id={id}
      className={className}
      role="img"
      aria-label={[...labels, more].filter(Boolean).join(", ")}
    >
      {visible.map((mood, index) => (
        <span key={mood} title={labels[index]}>
          <DailyMoodIcon mood={mood} size={14} />
        </span>
      ))}
      {remaining > 0 && (
        <span data-mood-overflow title={more}>
          +{remaining}
        </span>
      )}
    </span>
  );
}
