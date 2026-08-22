"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useActionState } from "react";
import { signUp } from "@/lib/actions/auth";
import { SHARE_PATH } from "@/lib/sample-locker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/PasswordField";
import { Alert } from "@/components/ui/alert";

type AuthResult = { error: string | null; message?: string } | null;
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type SaveContextValue = {
  askToUse: () => void;
};

const SaveContext = createContext<SaveContextValue | null>(null);

export function useSaveToHome() {
  return useContext(SaveContext);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function SaveToHomeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [state, action, pending] = useActionState(
    async (_prev: AuthResult, formData: FormData) => signUp(formData),
    null,
  );

  useEffect(() => {
    setSaved(isStandalone() || window.localStorage.getItem("lokr_saved_home") === "1");
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      window.localStorage.setItem("lokr_saved_home", "1");
      setSaved(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const askToUse = useCallback(() => {
    setOpen(true);
  }, []);

  async function addToHome() {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") {
        window.localStorage.setItem("lokr_saved_home", "1");
        setSaved(true);
      }
      setInstallEvent(null);
      return;
    }
    window.localStorage.setItem("lokr_saved_home", "1");
    setSaved(true);
  }

  return (
    <SaveContext.Provider value={{ askToUse }}>
      {children}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-xl">
            {!saved ? (
              <>
                <h2 className="text-xl font-semibold">Save to Home Screen</h2>
                <p className="mt-2 text-muted-foreground">
                  To send a message or share this locker, save LOKR to your phone
                  first. There is no sign-in until you do that.
                </p>
                <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                  <li>On iPhone, tap Share, then Add to Home Screen.</li>
                  <li>On Android, tap Add to Home Screen or Install.</li>
                </ol>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button type="button" onClick={() => void addToHome()}>
                    {installEvent ? "Add LOKR" : "I saved it"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Keep looking
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold">Your email</h2>
                <p className="mt-2 text-muted-foreground">
                  LOKR is on your phone. Enter the email you want for this locker.
                </p>
                <form action={action} className="mt-4 space-y-4">
                  <input type="hidden" name="next" value={SHARE_PATH} />
                  {state?.error ? <Alert variant="destructive">{state.error}</Alert> : null}
                  {state?.message ? <Alert>{state.message}</Alert> : null}
                  <div className="space-y-2">
                    <Label htmlFor="save-email">Email</Label>
                    <Input
                      id="save-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                    />
                  </div>
                  <PasswordField
                    id="save-password"
                    name="password"
                    label="LOKR password"
                    autoComplete="new-password"
                  />
                  <PasswordField
                    id="save-confirm"
                    name="confirm"
                    label="Confirm password"
                    autoComplete="new-password"
                  />
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" disabled={pending}>
                      {pending ? "Saving…" : "Use this locker"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Not now
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}
    </SaveContext.Provider>
  );
}
