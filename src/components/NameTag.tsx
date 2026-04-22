"use client";
import { useEffect, useRef, useState } from "react";

// Inline-editable name pill. Click to edit, Enter / blur to save, Esc to
// cancel. Empty or too-long inputs are ignored; otherwise renamePlayer is
// called which broadcasts to the server and persists to localStorage.
export function NameTag({
  name,
  onRename,
}: {
  name: string;
  onRename: (n: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const save = () => {
    const n = draft.trim().slice(0, 20);
    if (n && n !== name) onRename(n);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(name);
    setEditing(false);
  };

  if (editing) {
    return (
      <div
        className="flex items-center gap-1 border-2 border-flame bg-surface px-2 py-1"
        style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
      >
        <span className="text-ink/50 text-xs uppercase tracking-widest">you:</span>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value.toUpperCase())}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          maxLength={20}
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-ink text-sm uppercase tracking-wider tabular-nums"
          style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
          spellCheck={false}
          autoCapitalize="characters"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="click to rename"
      className="flex items-center gap-1 border-2 border-ink bg-surface px-2 py-1 hover:border-flame transition-colors"
      style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
    >
      <span className="text-ink/50 text-xs uppercase tracking-widest">you:</span>
      <span className="text-ink text-sm uppercase tracking-wider tabular-nums truncate max-w-[8rem]">
        {name || "…"}
      </span>
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-ink/40 shrink-0"
      >
        <path d="M3 21v-4l11-11 4 4L7 21z" />
        <path d="M14 6l4 4" />
      </svg>
    </button>
  );
}
