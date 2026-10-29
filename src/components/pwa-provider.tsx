"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Download,
  Menu,
  Monitor,
  Plus,
  Share2,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";

type InstallPrompt = Event & {
  prompt: () => Promise<unknown>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type PwaContext = {
  installed: boolean;
  install: () => Promise<void>;
};
const Context = createContext<PwaContext | null>(null);
const standaloneQuery = "(display-mode: standalone)";
const subscribeStandalone = (notify: () => void) => {
  const media = window.matchMedia(standaloneQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const getStandalone = () =>
  window.matchMedia(standaloneQuery).matches ||
  Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
const subscribePlatform = () => () => {};
const getPlatform = () => {
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return "ios";
  if (
    /Macintosh/.test(navigator.userAgent) &&
    /Safari/.test(navigator.userAgent) &&
    !/Chrome|Chromium|Edg/.test(navigator.userAgent)
  )
    return "mac-safari";
  return "browser";
};

export function usePwa() {
  const context = useContext(Context);
  if (!context) throw new Error("PWA controls need the app provider.");
  return context;
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const standalone = useSyncExternalStore(
    subscribeStandalone,
    getStandalone,
    () => false,
  );
  const platform = useSyncExternalStore(
    subscribePlatform,
    getPlatform,
    () => "browser",
  );
  const [installedHere, setInstalledHere] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const prompt = useRef<InstallPrompt | null>(null);
  const installed = standalone || installedHere;

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      prompt.current = event as InstallPrompt;
    };
    const onInstalled = () => {
      prompt.current = null;
      setInstalledHere(true);
      setHelpOpen(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator) ||
      !window.isSecureContext
    )
      return;

    let active = true;
    let registration: ServiceWorkerRegistration | undefined;
    let reloadRequested = false;
    let announced: ServiceWorker | undefined;
    let updateToastVisible = false;
    let updateTimer: ReturnType<typeof setTimeout> | undefined;
    const workerListeners = new Map<ServiceWorker, () => void>();

    const announceUpdate = () => {
      const waiting = registration?.waiting;
      if (!active || !waiting || !navigator.serviceWorker.controller) return;
      if (announced === waiting && updateToastVisible) return;
      announced = waiting;
      updateToastVisible = true;
      toast("App update ready", {
        id: "pwa-update",
        description: "Reload when you’ve finished your current entry.",
        duration: Infinity,
        onDismiss: () => {
          updateToastVisible = false;
        },
        action: {
          label: "Reload",
          onClick: () => {
            if (!registration?.waiting) {
              window.location.reload();
              return;
            }
            reloadRequested = true;
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          },
        },
        cancel: {
          label: "Later",
          onClick: () => {
            updateToastVisible = false;
          },
        },
      });
    };
    const watchInstalling = () => {
      const worker = registration?.installing;
      if (!worker || workerListeners.has(worker)) return;
      const onState = () => {
        if (worker.state === "installed") {
          // waiting is assigned as installation finishes; inspect it next tick.
          clearTimeout(updateTimer);
          updateTimer = setTimeout(announceUpdate, 0);
        }
      };
      workerListeners.set(worker, onState);
      worker.addEventListener("statechange", onState);
    };
    const onController = () => {
      // Routine activation never interrupts an entry being edited.
      if (!reloadRequested) return;
      reloadRequested = false;
      window.location.reload();
    };
    const checkForUpdate = () => {
      if (!registration) return;
      // Also offer a waiting update again after the user chose Later.
      void registration.update().then(announceUpdate, announceUpdate);
    };

    navigator.serviceWorker.addEventListener("controllerchange", onController);
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((result) => {
        if (!active) return;
        registration = result;
        registration.addEventListener("updatefound", watchInstalling);
        watchInstalling();
        announceUpdate();
        window.addEventListener("focus", checkForUpdate);
      })
      .catch(() => {
        // Installation guidance and the online journal still work without a worker.
      });

    return () => {
      active = false;
      clearTimeout(updateTimer);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onController,
      );
      registration?.removeEventListener("updatefound", watchInstalling);
      window.removeEventListener("focus", checkForUpdate);
      for (const [worker, listener] of workerListeners)
        worker.removeEventListener("statechange", listener);
    };
  }, []);

  async function install() {
    if (installed) return;
    const pending = prompt.current;
    prompt.current = null;
    if (!pending) {
      setHelpOpen(true);
      return;
    }
    try {
      await pending.prompt();
      const choice = await pending.userChoice;
      if (choice.outcome === "accepted") {
        setInstalledHere(true);
        setHelpOpen(false);
      }
    } catch {
      setHelpOpen(true);
    }
  }

  const steps =
    platform === "ios"
      ? [
          {
            icon: Share2,
            title: "Open Share",
            text: "In Safari, open the page menu and choose Share.",
          },
          {
            icon: Plus,
            title: "Add to Home Screen",
            text: "Choose Add to Home Screen in the share menu.",
          },
          {
            icon: Smartphone,
            title: "Open as Web App",
            text: "Keep Open as Web App enabled, then tap Add.",
          },
        ]
      : platform === "mac-safari"
        ? [
            {
              icon: Share2,
              title: "Open Safari’s Share Menu",
              text: "Use the Share button in the toolbar.",
            },
            {
              icon: Plus,
              title: "Add to Dock",
              text: "Choose Add to Dock, then confirm with Add.",
            },
            {
              icon: Monitor,
              title: "Make Yourself at Home",
              text: "Open pill happens from its new Dock icon.",
            },
          ]
        : [
            {
              icon: Menu,
              title: "Open Your Browser Menu",
              text: "Use the menu beside the address bar.",
            },
            {
              icon: Download,
              title: "Install the App",
              text: "Look for Install app or Add to Home screen.",
            },
            {
              icon: Smartphone,
              title: "Launch from Its Icon",
              text: "If installation isn’t offered, try Safari, Chrome, or Edge.",
            },
          ];

  return (
    <Context.Provider value={{ installed, install }}>
      {children}
      <ResponsiveModal
        open={helpOpen && !installed}
        onOpenChange={setHelpOpen}
        title="Keep It Close"
        context="Install App"
        description="Your journal, one tap from your Home Screen or Dock."
      >
        <ol className="space-y-3">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <li
              key={title}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-foreground/[.025] p-3"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-foreground">
                <Icon className="size-5" strokeWidth={2.5} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium">
                  <span className="mr-1.5 text-muted-foreground">
                    {index + 1}.
                  </span>
                  {title}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {text}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Sign in on this device, then open the app from its icon. A connection
          is needed to load and save your journal.
        </p>
        <Button
          type="button"
          className="mt-4 h-12 w-full rounded-xl"
          onClick={() => setHelpOpen(false)}
        >
          Got it
        </Button>
      </ResponsiveModal>
    </Context.Provider>
  );
}
