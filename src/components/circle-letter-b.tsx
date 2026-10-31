import type { SVGProps } from "react";

type CircleLetterBProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
};

/** A compact letter marker sharing Lucide's 24px currentColor stroke setup. */
export function CircleLetterB({
  size = 14,
  strokeWidth = 2.9,
  ...props
}: CircleLetterBProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-medication-class-glyph="circle-letter-b"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9 7.5v9h3.5a2.25 2.25 0 0 0 0-4.5H9h3a2.25 2.25 0 0 0 0-4.5H9Z" />
    </svg>
  );
}
