"use client";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/useMultiplayerGame";

type Props = {
  messages: ChatMessage[];
  sendChat: (text: string) => void;
  canChat: boolean;
  selfWallet: string | null;
};

export function ChatPanel({ messages, sendChat, canChat, selfWallet }: Props) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Stick to bottom whenever a new message arrives, but only if the user
  // was already at/near the bottom — don't hijack scroll if they're reading
  // back through history.
  const stickRef = useRef(true);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickRef.current = gap < 32;
  };

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    sendChat(t);
    setText("");
    stickRef.current = true;
  };

  return (
    <div className="brut-flat bg-surface h-full flex flex-col min-h-0">
      <div
        className="flex items-center justify-between px-3 py-2 border-b-2 border-ink uppercase tracking-widest text-xs sm:text-sm"
        style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
      >
        <span>// chat</span>
      </div>

      <div
        ref={listRef}
        onScroll={onScroll}
        className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-2 py-1.5 space-y-1"
        style={{ fontFamily: "var(--font-hand)" }}
      >
        {messages.length === 0 ? (
          <div className="text-ink/40 text-sm px-1">no messages yet</div>
        ) : (
          messages.map((m) => {
            const isSelf = selfWallet !== null && m.wallet === selfWallet;
            return (
              <div
                key={m.id}
                className="text-sm leading-tight break-words"
              >
                <span
                  className={`font-bold ${isSelf ? "text-flame" : "text-ink"}`}
                >
                  {m.from}
                </span>
                <span className="text-ink/40">: </span>
                <span className="text-ink/90 whitespace-pre-wrap">
                  {m.text}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t-2 border-ink p-1.5 flex gap-1.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 200))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          disabled={!canChat}
          placeholder={canChat ? "say something…" : "sign in to chat"}
          maxLength={200}
          className="flex-1 min-w-0 bg-surface border-2 border-ink px-2 py-1 text-sm text-ink placeholder-ink/40 focus:outline-none disabled:opacity-50"
          style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
        />
        <button
          onClick={submit}
          disabled={!canChat || !text.trim()}
          className="px-3 bg-ink text-bg border-2 border-ink text-sm uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
        >
          send
        </button>
      </div>
    </div>
  );
}
