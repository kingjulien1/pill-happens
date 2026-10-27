import { HouseLineIcon } from "@phosphor-icons/react/dist/ssr/HouseLine";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/ssr/CalendarDots";
import { PillIcon } from "@phosphor-icons/react/dist/ssr/Pill";
import { FlagBannerIcon } from "@phosphor-icons/react/dist/ssr/FlagBanner";
import { PlusCircleIcon } from "@phosphor-icons/react/dist/ssr/PlusCircle";
import { PencilSimpleLineIcon } from "@phosphor-icons/react/dist/ssr/PencilSimpleLine";
import { ArchiveIcon } from "@phosphor-icons/react/dist/ssr/Archive";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { MinusIcon } from "@phosphor-icons/react/dist/ssr/Minus";
import { CalendarCheckIcon } from "@phosphor-icons/react/dist/ssr/CalendarCheck";
import { SpinnerGapIcon } from "@phosphor-icons/react/dist/ssr/SpinnerGap";
import { LockKeyIcon } from "@phosphor-icons/react/dist/ssr/LockKey";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretUpIcon } from "@phosphor-icons/react/dist/ssr/CaretUp";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { ListIcon } from "@phosphor-icons/react/dist/ssr/List";
import { FireIcon } from "@phosphor-icons/react/dist/ssr/Fire";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { LightningIcon } from "@phosphor-icons/react/dist/ssr/Lightning";
import { ShootingStarIcon } from "@phosphor-icons/react/dist/ssr/ShootingStar";
import { FlowerIcon } from "@phosphor-icons/react/dist/ssr/Flower";
import { ConfettiIcon } from "@phosphor-icons/react/dist/ssr/Confetti";
import { NotePencilIcon } from "@phosphor-icons/react/dist/ssr/NotePencil";
import { cn } from "@/lib/utils";

const icons = {
  today: HouseLineIcon,
  history: CalendarDotsIcon,
  medications: PillIcon,
  goals: FlagBannerIcon,
  create: PlusCircleIcon,
  edit: PencilSimpleLineIcon,
  archive: ArchiveIcon,
  restore: ArrowCounterClockwiseIcon,
  delete: TrashIcon,
  settings: SlidersHorizontalIcon,
  export: DownloadSimpleIcon,
  signOut: SignOutIcon,
  close: XIcon,
  save: CheckCircleIcon,
  selected: CheckIcon,
  next: ArrowRightIcon,
  external: ArrowUpRightIcon,
  back: ArrowLeftIcon,
  loadMore: ArrowDownIcon,
  retry: ArrowClockwiseIcon,
  add: PlusIcon,
  subtract: MinusIcon,
  calendar: CalendarCheckIcon,
  loading: SpinnerGapIcon,
  secure: LockKeyIcon,
  expand: CaretDownIcon,
  collapse: CaretUpIcon,
  open: CaretRightIcon,
  menu: ListIcon,
  fire: FireIcon,
  sparkle: SparkleIcon,
  lightning: LightningIcon,
  shootingStar: ShootingStarIcon,
  flower: FlowerIcon,
  confetti: ConfettiIcon,
  log: NotePencilIcon,
} as const;

export type ActionIconName = keyof typeof icons;

export function ActionIcon({
  name,
  className,
  weight = "bold",
}: {
  name: ActionIconName;
  className?: string;
  weight?: "regular" | "bold" | "fill" | "duotone";
}) {
  const Icon = icons[name];
  return (
    <Icon
      size={20}
      weight={weight}
      aria-hidden="true"
      focusable="false"
      data-action-icon={name}
      className={cn("size-5 shrink-0", className)}
    />
  );
}
