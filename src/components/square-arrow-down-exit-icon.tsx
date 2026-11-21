import { createLucideIcon } from "lucide-react";

// Lucide SquareArrowDownExit (ISC), backported without changing the icon package.
// https://github.com/lucide-icons/lucide/blob/main/icons/square-arrow-down-exit.svg
export const SquareArrowDownExit = createLucideIcon("square-arrow-down-exit", [
  ["path", { d: "M12 11v10", key: "shaft" }],
  [
    "path",
    {
      d: "M17.67 21H19a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h1.33",
      key: "frame",
    },
  ],
  ["path", { d: "m8 17 4 4 4-4", key: "arrow" }],
]);
