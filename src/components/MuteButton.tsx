"use client";

export function MuteButton({
  muted,
  setMuted,
}: {
  muted: boolean;
  setMuted: (v: boolean) => void;
}) {
  return (
    <button
      aria-label={muted ? "unmute sound" : "mute sound"}
      onClick={() => setMuted(!muted)}
      className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center border-2 border-ink bg-surface text-ink hover:bg-ink hover:text-bg transition-colors"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />
        {muted ? (
          <>
            <line x1="17" y1="9" x2="23" y2="15" />
            <line x1="23" y1="9" x2="17" y2="15" />
          </>
        ) : (
          <>
            <path d="M16 8a5 5 0 0 1 0 8" />
            <path d="M19 5a9 9 0 0 1 0 14" />
          </>
        )}
      </svg>
    </button>
  );
}
