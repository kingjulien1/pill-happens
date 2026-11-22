"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useJournal } from "./journal-provider";
import { useJournalWorkspace } from "./journal-drafts";
import { toast } from "./ui/journal-toast";
import { dayKey } from "@/lib/domain";
import {
  acknowledgeSleepImage,
  getPendingSleepImage,
  clearRememberedSleepImage,
  isSleepImageToken,
  rememberedSleepImage,
  sleepImageProblem,
  stageSleepImage,
  takeSharedSleepImage,
} from "@/lib/shared-sleep-image";

type ImageLaunch = { files?: readonly { getFile(): Promise<File> }[] };
type LaunchWindow = Window & {
  launchQueue?: { setConsumer(consume: (launch: ImageLaunch) => void): void };
};

/** Receiving an image opens a draft/review; it never saves or overwrites an entry. */
export function SharedSleepImageReceiver() {
  const { data, now, busy } = useJournal();
  const { ready, openDialog, rememberDestination } = useJournalWorkspace();
  const path = usePathname();
  const router = useRouter();
  const latest = useRef({ data, now, busy, ready, openDialog, path });
  const mounted = useRef(false);
  const claimed = useRef<string | null>(null);
  const waiting = useRef<File | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      waiting.current = null;
      const image = getPendingSleepImage();
      if (image) acknowledgeSleepImage(image.id);
    };
  }, []);
  useEffect(() => {
    latest.current = { data, now, busy, ready, openDialog, path };
  });

  useEffect(() => {
    if (!data || !now || !ready || busy) return;
    const fail = (message: string) =>
      toast.info(message, {
        heading: "Sleep report not opened.",
        duration: 15_000,
        details: {
          paragraphs: [
            "Open Morning Check-In to choose or paste a Sleep Cycle report. Use its full portrait share image so the importer can read the times and sleep stages together.",
          ],
          links: [{ label: "Open Today", href: "/" }],
        },
      });
    const open = (file: File) => {
      if (!mounted.current) return;
      const problem = sleepImageProblem(file);
      if (problem) {
        fail(problem);
        return;
      }
      const current = latest.current;
      if (
        !current.data ||
        !current.now ||
        !current.ready ||
        current.busy ||
        current.path !== "/"
      ) {
        waiting.current = file;
        if (current.path !== "/") {
          rememberDestination("/");
          router.push("/");
        }
        return;
      }
      stageSleepImage(file);
      current.openDialog({
        kind: "check-in",
        period: "morning",
        day: dayKey(current.now, current.data.settings.timezone),
      });
    };
    const query = new URL(window.location.href);
    const token =
      query.searchParams.get("sleep-import") ?? rememberedSleepImage();
    if (token && claimed.current !== token) {
      claimed.current = token;
      clearRememberedSleepImage();
      if (query.searchParams.has("sleep-import")) {
        query.searchParams.delete("sleep-import");
        window.history.replaceState(
          window.history.state,
          "",
          `${query.pathname}${query.search}${query.hash}`,
        );
      }
      if (isSleepImageToken(token)) {
        void takeSharedSleepImage(token)
          .then((file) => {
            if (file) open(file);
            else if (mounted.current)
              fail(
                "This shared image expired or was already opened. Choose it again in Morning Check-In.",
              );
          })
          .catch(() => {
            if (mounted.current)
              fail(
                "Couldn’t open the shared image. Choose it again in Morning Check-In.",
              );
          });
      } else
        fail(
          "Sharing wasn’t available for this image. Open Morning Check-In and choose the report there.",
        );
    }
    if (waiting.current) {
      const file = waiting.current;
      waiting.current = null;
      open(file);
    }
  }, [data, now, ready, busy, path, openDialog, rememberDestination, router]);

  useEffect(() => {
    const queue = (window as LaunchWindow).launchQueue;
    if (!queue) return;
    queue.setConsumer((launch) => {
      const files = launch.files ?? [];
      if (files.length > 1) {
        toast.info("Only one image can be imported at a time.", {
          heading: "Choose one sleep report.",
          details: {
            paragraphs: [
              "Open the report for one night, review its readings, then apply the values to your Morning Check-In. Import another night separately.",
            ],
          },
        });
        return;
      }
      const handle = files[0];
      if (!handle) return;
      void handle
        .getFile()
        .then((file) => {
          if (!mounted.current) return;
          const problem = sleepImageProblem(file);
          if (problem) throw new Error(problem);
          const current = latest.current;
          if (
            !current.data ||
            !current.now ||
            !current.ready ||
            current.busy ||
            current.path !== "/"
          ) {
            waiting.current = file;
            if (current.path !== "/") {
              rememberDestination("/");
              router.push("/");
            }
            return;
          }
          stageSleepImage(file);
          current.openDialog({
            kind: "check-in",
            period: "morning",
            day: dayKey(current.now, current.data.settings.timezone),
          });
        })
        .catch((error) => {
          if (mounted.current)
            toast.info(
              error instanceof Error
                ? error.message
                : "Choose the report in Morning Check-In to try again.",
              {
                heading: "Image could not open.",
                details: {
                  paragraphs: [
                    "Choose or paste the report from Morning Check-In instead. Its readings stay in a review step until you apply them to your draft.",
                  ],
                },
              },
            );
        });
    });
    return () => {
      queue.setConsumer(() => {});
    };
  }, [rememberDestination, router]);

  return null;
}
