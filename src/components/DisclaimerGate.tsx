"use client";
import { useEffect, useState } from "react";

const STORAGE_KEY = "spaceshiba.disclaimer.v1";
const ACCEPTED = "accepted";
const DECLINED = "declined";

type Decision = typeof ACCEPTED | typeof DECLINED | null;

export function DisclaimerGate() {
  const [decision, setDecision] = useState<Decision>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      if (v === ACCEPTED || v === DECLINED) {
        setDecision(v as Decision);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const accept = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, ACCEPTED);
    } catch {
      /* ignore */
    }
    setDecision(ACCEPTED);
  };

  const decline = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, DECLINED);
    } catch {
      /* ignore */
    }
    setDecision(DECLINED);
  };

  if (!mounted) return null;
  if (decision === ACCEPTED) return null;

  if (decision === DECLINED) {
    return (
      <div className="fixed inset-0 z-[100] bg-bg flex items-center justify-center p-6">
        <div
          className="max-w-md text-center space-y-4 border-2 border-ink bg-surface p-6"
          style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
        >
          <div className="text-lg uppercase tracking-widest text-ink">
            access declined
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            You chose not to accept the terms. You cannot use this site.
          </p>
          <p className="text-xs text-ink/50">
            If this was a mistake, clear site data or use a different browser
            to see the prompt again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        className="w-full max-w-lg border-2 border-ink bg-surface p-5 sm:p-6 space-y-4"
        style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
      >
        <div
          className="text-lg sm:text-xl uppercase tracking-[0.18em] text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          spaceshiba · demo
        </div>

        <div className="space-y-3 text-sm text-ink/90 leading-relaxed">
          <p>
            This site is provided <strong>for demonstration purposes
            only</strong> by the Spaceshiba project team. It is not a
            commercial gambling product and is not operated for profit.
          </p>
          <p>
            By continuing, you confirm that:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-ink/80">
            <li>you are at least <strong>18 years old</strong>,</li>
            <li>
              you use this site <strong>entirely at your own risk</strong>,
            </li>
            <li>
              you accept that the operators accept{" "}
              <strong>no liability</strong> for any loss of funds or tokens,
              technical failures, or other consequences of your use,
            </li>
            <li>
              you are <strong>solely responsible</strong> for complying with
              the laws of your jurisdiction.
            </li>
          </ul>
          <p className="text-ink/70 text-xs">
            If you do not agree, or you are under 18, choose decline.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={decline}
            className="flex-1 border-2 border-ink bg-surface text-ink px-4 py-2 text-sm uppercase tracking-widest hover:bg-ink hover:text-bg transition-colors"
          >
            decline
          </button>
          <button
            onClick={accept}
            className="flex-1 border-2 border-ink bg-ink text-bg px-4 py-2 text-sm uppercase tracking-widest shadow-[4px_4px_0_#ff4a00] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#ff4a00] transition-all"
          >
            i am 18+ · accept
          </button>
        </div>
      </div>
    </div>
  );
}
