"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { Sparkles, Star } from "lucide-react";
import { ActionIcon } from "@/components/action-icon";

type StarVariant = "title" | "star" | "cluster" | "shooting" | "twinkle";

// The installed Tailwind Yellow 200–500 pigments stay yellow in both themes.
const yellows = ["#fff085", "#ffdf20", "#fdc700", "#f0b100"] as const;
const particles = [
  { x: "-15px", y: "-14px", size: "5px", delay: "0ms", spin: "32deg" },
  { x: "3px", y: "-20px", size: "4px", delay: "70ms", spin: "-28deg" },
  { x: "18px", y: "-9px", size: "5px", delay: "130ms", spin: "42deg" },
  { x: "17px", y: "12px", size: "3px", delay: "200ms", spin: "-36deg" },
  { x: "-2px", y: "18px", size: "4px", delay: "90ms", spin: "24deg" },
  { x: "-18px", y: "5px", size: "3px", delay: "160ms", spin: "-45deg" },
] as const;

export function FinalLookStar({ variant }: { variant: StarVariant }) {
  const element = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    let active = false;
    let disposed = false;
    let burstTimer: ReturnType<typeof setTimeout> | undefined;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    function randomYellow() {
      node!.style.setProperty(
        "--star-yellow",
        yellows[Math.floor(Math.random() * yellows.length)],
      );
    }

    function canAnimate() {
      return !disposed && inView && !document.hidden && !reducedMotion.matches;
    }

    function cancelBurst() {
      clearTimeout(burstTimer);
      clearTimeout(settleTimer);
      burstTimer = undefined;
      settleTimer = undefined;
      node!.removeAttribute("data-star-burst");
    }

    function scheduleBurst() {
      if (!canAnimate()) return;
      const delay = 5000 + Math.floor(Math.random() * 5001);
      burstTimer = setTimeout(() => {
        burstTimer = undefined;
        if (!canAnimate()) return;
        randomYellow();
        node!.style.setProperty(
          "--star-burst-turn",
          `${Math.round(Math.random() * 60 - 30)}deg`,
        );
        node!.setAttribute("data-star-burst", "true");
        settleTimer = setTimeout(() => {
          node!.removeAttribute("data-star-burst");
          settleTimer = undefined;
        }, 1450);
        scheduleBurst();
      }, delay);
    }

    function syncMotion() {
      const next = canAnimate();
      if (next === active) return;
      active = next;
      node!.setAttribute("data-star-active", String(active));
      cancelBurst();
      if (active) scheduleBurst();
    }

    randomYellow();
    node.style.setProperty(
      "--star-twinkle-duration",
      `${3.8 + Math.random() * 2}s`,
    );
    node.style.setProperty("--star-twinkle-offset", `${-Math.random() * 4}s`);
    const observer =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            syncMotion();
          })
        : null;
    if (observer) observer.observe(node);
    else {
      inView = true;
      syncMotion();
    }
    document.addEventListener("visibilitychange", syncMotion);
    reducedMotion.addEventListener("change", syncMotion);

    return () => {
      disposed = true;
      cancelBurst();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", syncMotion);
      reducedMotion.removeEventListener("change", syncMotion);
    };
  }, []);

  return (
    <span
      ref={element}
      aria-hidden="true"
      className={`final-look-star ${variant === "title" ? "final-look-star--title" : `final-look-doodle final-look-doodle--${variant}`}`}
      data-final-look-star={variant}
      data-star-active="false"
    >
      <span className="final-look-star-core">
        {variant === "cluster" ? (
          <Sparkles strokeWidth={2} fill="currentColor" />
        ) : variant === "twinkle" ? (
          <Star strokeWidth={2} fill="currentColor" />
        ) : (
          <ActionIcon
            name={variant === "shooting" ? "shootingStar" : "sparkle"}
            weight={variant === "title" ? "bold" : "fill"}
          />
        )}
      </span>
      <span className="final-look-star-emitter">
        {particles.map((particle, index) => (
          <span
            key={index}
            className="final-look-star-particle"
            style={
              {
                "--star-particle-x": particle.x,
                "--star-particle-y": particle.y,
                "--star-particle-size": particle.size,
                "--star-particle-delay": particle.delay,
                "--star-particle-spin": particle.spin,
              } as CSSProperties
            }
          >
            <ActionIcon name="sparkle" weight="fill" />
          </span>
        ))}
      </span>
    </span>
  );
}
