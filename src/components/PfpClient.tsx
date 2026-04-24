"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  TRAIT_CATEGORIES,
  STYLE_PRESETS,
  composePrompt,
  defaultSelection,
  type TraitSelection,
} from "@/lib/pfpTraits";
import {
  loadGallery,
  saveToGallery,
  removeFromGallery,
  getSelectedPfp,
  setSelectedPfp,
  type SavedPfp,
} from "@/lib/pfpStorage";
import { AstroidMark } from "@/components/AstroidMark";

type GenResult = { url: string; seed: number };
type GenState =
  | { kind: "idle" }
  | { kind: "loading"; progress: number; total: number }
  | { kind: "ready"; results: GenResult[] }
  | { kind: "error"; message: string };

export function PfpClient() {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;

  const [selection, setSelection] = useState<TraitSelection>(defaultSelection);
  const [styleId, setStyleId] = useState<string>(STYLE_PRESETS[0].id);
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [gen, setGen] = useState<GenState>({ kind: "idle" });
  const [gallery, setGallery] = useState<SavedPfp[]>([]);
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<SavedPfp | null>(null);

  useEffect(() => {
    setGallery(loadGallery(walletAddress));
    setSelectedIdState(getSelectedPfp(walletAddress));
  }, [walletAddress]);

  const composedPrompt = useMemo(
    () => composePrompt(selection, styleId, userPrompt),
    [selection, styleId, userPrompt],
  );

  const setTrait = (cat: string, val: string) =>
    setSelection((s) => ({ ...s, [cat]: val }));

  const generate = useCallback(async () => {
    if (gen.kind === "loading") return;
    const total = 4;
    setGen({ kind: "loading", progress: 0, total });
    try {
      const res = await fetch("/api/pfp/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          traits: selection,
          styleId,
          prompt: userPrompt,
          numImages: total,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { images: GenResult[] };
      setGen({ kind: "ready", results: data.images });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      setGen({ kind: "error", message: msg });
    }
  }, [gen.kind, selection, styleId, userPrompt]);

  const saveAndUse = (result: GenResult) => {
    const id = `${Date.now()}-${result.seed}`;
    const pfp: SavedPfp = {
      id,
      url: result.url,
      traits: selection,
      styleId,
      prompt: userPrompt,
      seed: result.seed,
      createdAt: Date.now(),
    };
    const next = saveToGallery(walletAddress, pfp);
    setGallery(next);
    setSelectedPfp(walletAddress, id);
    setSelectedIdState(id);
  };

  const justSave = (result: GenResult) => {
    const id = `${Date.now()}-${result.seed}`;
    const pfp: SavedPfp = {
      id,
      url: result.url,
      traits: selection,
      styleId,
      prompt: userPrompt,
      seed: result.seed,
      createdAt: Date.now(),
    };
    setGallery(saveToGallery(walletAddress, pfp));
  };

  const removeSaved = (id: string) => {
    const next = removeFromGallery(walletAddress, id);
    setGallery(next);
    if (selectedId === id) {
      setSelectedPfp(walletAddress, null);
      setSelectedIdState(null);
    }
  };

  const setAsPfp = (id: string) => {
    setSelectedPfp(walletAddress, id);
    setSelectedIdState(id);
  };

  const shareOnX = (pfp: SavedPfp) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    // fal.ai CDN URL goes in as ?img so our /pfp/s page can emit OG
    // meta pointing at the generated image. Cache-bust with ?v so X
    // re-unfurls every new share instead of reusing a cached preview.
    const shareUrl = new URL(`${origin}/pfp/s`);
    shareUrl.searchParams.set("img", pfp.url);
    shareUrl.searchParams.set("v", pfp.seed.toString(36));
    const text =
      `Just generated my $SPACESHIBA PFP 🐕‍🚀\n` +
      `All fees go to charity.\n`;
    const params = new URLSearchParams({
      text,
      url: shareUrl.toString(),
      hashtags: "ASTROID,CANCER,RESEARCH",
    });
    window.open(
      `https://twitter.com/intent/tweet?${params.toString()}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const downloadImage = async (url: string, id: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `spaceshiba-${id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <main
      className="relative w-full flex flex-col bg-bg min-h-[100svh] md:h-[100svh] md:overflow-hidden"
    >
      <div className="absolute inset-0 graph-paper opacity-50 pointer-events-none" />

      <header className="relative z-20 shrink-0 flex items-center gap-2 px-3 pt-2 sm:px-4 sm:pt-3">
        <Link
          href="/"
          className="shrink-0 border-2 border-ink bg-surface px-2 py-1 text-ink text-[11px] uppercase tracking-[0.22em] hover:bg-ink hover:text-bg transition-colors"
          style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
        >
          ← PORTAL
        </Link>
        <div className="shrink-0 flex items-center gap-2 px-2 py-1 border-2 border-ink bg-surface">
          <AstroidMark size={20} color="var(--color-flame)" />
          <span
            className="text-ink uppercase tracking-[0.18em] text-xs sm:text-sm leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SPACESHIBA
          </span>
          <span
            className="hidden sm:inline text-ink/45 text-[10px] tracking-[0.2em] leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            // PFP GENERATOR
          </span>
        </div>
      </header>

      <div className="relative z-10 flex-1 md:min-h-0 px-3 sm:px-4 pt-3 pb-4 flex flex-col md:flex-row gap-3 sm:gap-4">
        {/* LEFT: results / preview area */}
        <section className="flex-1 min-w-0 md:min-h-0 flex flex-col gap-3">
          <ResultsPanel
            state={gen}
            onUse={saveAndUse}
            onSave={justSave}
            onRegenerate={generate}
            onShare={(r) => {
              // turn the transient result into a saved pfp so the share URL resolves
              const id = `${Date.now()}-${r.seed}`;
              const pfp: SavedPfp = {
                id,
                url: r.url,
                traits: selection,
                styleId,
                prompt: userPrompt,
                seed: r.seed,
                createdAt: Date.now(),
              };
              setGallery(saveToGallery(walletAddress, pfp));
              shareOnX(pfp);
            }}
            onDownload={(r) => downloadImage(r.url, String(r.seed))}
          />

          <GalleryStrip
            gallery={gallery}
            selectedId={selectedId}
            onOpen={(p) => setLightbox(p)}
          />
        </section>

        {/* RIGHT: traits + controls */}
        <aside className="w-full md:w-72 lg:w-80 xl:w-96 shrink-0 md:min-h-0 flex flex-col gap-3">
          <div className="bg-surface border-2 border-ink p-2.5 sm:p-3 flex flex-col gap-2 sm:gap-2.5 flex-1 md:min-h-0 overflow-y-auto">
            {TRAIT_CATEGORIES.map((cat) => (
              <TraitGroup
                key={cat.id}
                label={cat.label}
                options={cat.options.map((o) => ({ id: o.id, label: o.label }))}
                value={selection[cat.id]}
                onChange={(v) => setTrait(cat.id, v)}
              />
            ))}

            <div className="border-t-2 border-ink/25 pt-2">
              <TraitGroup
                label="style"
                options={STYLE_PRESETS.map((s) => ({ id: s.id, label: s.label }))}
                value={styleId}
                onChange={setStyleId}
              />
            </div>

            <div>
              <label
                className="block text-ink/55 text-[10px] uppercase tracking-[0.22em] mb-1"
                style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
              >
                extra prompt (optional)
              </label>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value.slice(0, 200))}
                placeholder="// e.g. laser eyes, galaxy in the visor"
                className="w-full bg-bg border-2 border-ink px-2 py-1 text-ink placeholder-ink/35 focus:outline-none text-[13px] resize-none"
                style={{ fontFamily: "var(--font-hand)", fontWeight: 400 }}
                rows={2}
                maxLength={200}
              />
              <div className="text-right text-ink/40 text-[10px] tabular-nums mt-0.5">
                {userPrompt.length}/200
              </div>
            </div>
          </div>

          <button
            onClick={generate}
            disabled={gen.kind === "loading"}
            className="shrink-0 bg-flame text-on-flame border-2 border-ink shadow-[4px_4px_0_#0a0a0a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#0a0a0a] transition-all py-2.5 sm:py-3 text-base sm:text-lg md:text-xl uppercase tracking-wider disabled:opacity-40 disabled:shadow-none"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
          >
            {gen.kind === "loading"
              ? `generating ${gen.progress}/${gen.total}…`
              : "generate"}
          </button>
        </aside>
      </div>

      <AnimatePresence>
        {lightbox && (
          <Lightbox
            pfp={lightbox}
            onClose={() => setLightbox(null)}
            onShare={() => shareOnX(lightbox)}
            onDownload={() => downloadImage(lightbox.url, lightbox.id)}
            onSetAsPfp={() => {
              setAsPfp(lightbox.id);
              setLightbox(null);
            }}
            onRemove={() => {
              removeSaved(lightbox.id);
              setLightbox(null);
            }}
            isCurrentPfp={selectedId === lightbox.id}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function TraitGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div
        className="text-ink/55 text-[10px] uppercase tracking-[0.22em] mb-1"
        style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
      >
        {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              onClick={() => onChange(o.id)}
              className={`px-1.5 py-0.5 border-2 text-[10px] sm:text-[11px] uppercase tracking-wider leading-tight transition-colors ${
                active
                  ? "bg-flame text-on-flame border-flame"
                  : "bg-surface text-ink border-ink/60 hover:border-ink hover:bg-ink/10"
              }`}
              style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ResultsPanel({
  state,
  onUse,
  onSave,
  onRegenerate,
  onShare,
  onDownload,
}: {
  state: GenState;
  onUse: (r: GenResult) => void;
  onSave: (r: GenResult) => void;
  onRegenerate: () => void;
  onShare: (r: GenResult) => void;
  onDownload: (r: GenResult) => void;
}) {
  const frame =
    "flex-1 md:min-h-0 min-h-[260px] bg-surface border-2 border-ink";

  if (state.kind === "idle") {
    return (
      <div className={`${frame} flex items-center justify-center p-6`}>
        <IdleHint />
      </div>
    );
  }

  if (state.kind === "loading") {
    return (
      <div className={`${frame} p-3 flex flex-col gap-3`}>
        <LaunchBanner total={state.total} />
        <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
          {Array.from({ length: state.total }).map((_, i) => (
            <LoadingTile key={i} index={i} />
          ))}
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className={`flex-1 md:min-h-0 min-h-[260px] bg-surface border-2 border-danger p-6 flex flex-col items-center justify-center gap-3 text-center`}>
        <div
          className="text-danger text-lg uppercase tracking-widest"
          style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
        >
          generation failed
        </div>
        <div
          className="text-ink/70 text-sm break-words max-w-full"
          style={{ fontFamily: "var(--font-hand)" }}
        >
          {state.message}
        </div>
        <button
          onClick={onRegenerate}
          className="border-2 border-ink bg-ink text-bg px-3 py-1.5 text-sm uppercase tracking-widest"
          style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
        >
          retry
        </button>
      </div>
    );
  }

  return (
    <div className={`${frame} p-3`}>
      <div className="grid grid-cols-2 gap-2 h-full min-h-0">
        {state.results.map((r, i) => (
          <ResultTile
            key={`${r.seed}-${i}`}
            result={r}
            onUse={() => onUse(r)}
            onSave={() => onSave(r)}
            onShare={() => onShare(r)}
            onDownload={() => onDownload(r)}
          />
        ))}
      </div>
    </div>
  );
}

function IdleHint() {
  return (
    <div className="text-center max-w-sm flex flex-col gap-2">
      <div
        className="text-ink text-2xl sm:text-3xl uppercase tracking-wider"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
      >
        ready for launch
      </div>
      <div
        className="text-ink/60 text-sm uppercase tracking-[0.2em]"
        style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
      >
        // pick traits, pick a style, hit generate
      </div>
    </div>
  );
}

function LaunchBanner({ total }: { total: number }) {
  return (
    <div
      className="flex items-center justify-between border-2 border-flame px-3 py-1.5 text-flame uppercase tracking-[0.22em] text-[11px]"
      style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
    >
      <span>// painting orbit…</span>
      <span className="tabular-nums">{total} variants</span>
    </div>
  );
}

function LoadingTile({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0.4 }}
      animate={{ opacity: [0.4, 0.9, 0.4] }}
      transition={{
        duration: 1.4,
        repeat: Infinity,
        delay: index * 0.12,
        ease: "easeInOut",
      }}
      className="relative border-2 border-ink/40 bg-bg overflow-hidden"
      style={{ aspectRatio: "1 / 1" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(135deg, rgba(255,74,0,0.12) 0 12px, transparent 12px 24px)",
        }}
      />
      <div
        className="absolute inset-0 flex items-center justify-center text-flame text-xs uppercase tracking-[0.22em]"
        style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
      >
        orbit {index + 1}
      </div>
    </motion.div>
  );
}

function ResultTile({
  result,
  onUse,
  onSave,
  onShare,
  onDownload,
}: {
  result: GenResult;
  onUse: () => void;
  onSave: () => void;
  onShare: () => void;
  onDownload: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative border-2 border-ink bg-bg overflow-hidden flex flex-col min-h-0"
    >
      <div className="relative flex-1 min-h-0" style={{ minHeight: 0 }}>
        <img
          src={result.url}
          alt="generated spaceshiba pfp"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <div className="shrink-0 border-t-2 border-ink bg-bg grid grid-cols-4 divide-x-2 divide-ink">
        <TileAction label="Set as PFP" onClick={onUse} highlight>
          <UserIcon />
        </TileAction>
        <TileAction label="Share on X" onClick={onShare}>
          <XGlyph />
        </TileAction>
        <TileAction label="Download" onClick={onDownload}>
          <DownloadIcon />
        </TileAction>
        <TileAction label="Save" onClick={onSave}>
          <PlusIcon />
        </TileAction>
      </div>
    </motion.div>
  );
}

function TileAction({
  label,
  onClick,
  highlight,
  children,
}: {
  label: string;
  onClick: () => void;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex items-center justify-center py-1.5 text-ink hover:text-on-flame hover:bg-flame transition-colors ${
        highlight ? "text-flame" : ""
      }`}
    >
      {children}
    </button>
  );
}

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 22c0-4.42 3.58-8 8-8s8 3.58 8 8" />
    </svg>
  );
}

function XGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2H21.5l-7.53 8.61L22.5 22h-6.844l-5.36-6.99L4.1 22H.84l8.06-9.21L.5 2h7.02l4.85 6.41L18.244 2Zm-1.2 18h1.87L7.03 4H5.06l11.984 16Z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="square" aria-hidden>
      <path d="M12 3v13" />
      <path d="M6 12l6 6 6-6" />
      <path d="M4 21h16" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="square" aria-hidden>
      <path d="M12 4v16" />
      <path d="M4 12h16" />
    </svg>
  );
}

function GalleryStrip({
  gallery,
  selectedId,
  onOpen,
}: {
  gallery: SavedPfp[];
  selectedId: string | null;
  onOpen: (pfp: SavedPfp) => void;
}) {
  if (gallery.length === 0) return null;
  return (
    <div className="shrink-0 bg-surface border-2 border-ink p-2 sm:p-3">
      <div
        className="text-ink/55 text-[10px] uppercase tracking-[0.22em] mb-1.5"
        style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
      >
        my spaceshibas · {gallery.length}
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {gallery.map((p) => (
          <div
            key={p.id}
            className={`relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 border-2 overflow-hidden ${
              selectedId === p.id ? "border-flame" : "border-ink/60"
            }`}
          >
            <button
              onClick={() => onOpen(p)}
              className="absolute inset-0 group"
            >
              <img src={p.url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-bg/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-ink text-[10px] uppercase tracking-widest">
                open
              </div>
            </button>
            {selectedId === p.id && (
              <div
                className="absolute top-0.5 left-0.5 bg-flame text-on-flame text-[8px] px-1 uppercase tracking-widest"
                style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
              >
                pfp
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Lightbox({
  pfp,
  onClose,
  onShare,
  onDownload,
  onSetAsPfp,
  onRemove,
  isCurrentPfp,
}: {
  pfp: SavedPfp;
  onClose: () => void;
  onShare: () => void;
  onDownload: () => void;
  onSetAsPfp: () => void;
  onRemove: () => void;
  isCurrentPfp: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-bg/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 12, opacity: 0 }}
        className="bg-surface border-2 border-ink max-w-md w-full p-3 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-2 border-ink overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
          <img src={pfp.url} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onSetAsPfp}
            disabled={isCurrentPfp}
            className="bg-flame text-on-flame border-2 border-ink px-2 py-2 text-[11px] uppercase tracking-widest disabled:opacity-40"
            style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
          >
            {isCurrentPfp ? "current pfp" : "set as my pfp"}
          </button>
          <button
            onClick={onShare}
            className="bg-ink text-bg border-2 border-ink px-2 py-2 text-[11px] uppercase tracking-widest"
            style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
          >
            share on x
          </button>
          <button
            onClick={onDownload}
            className="bg-surface text-ink border-2 border-ink px-2 py-2 text-[11px] uppercase tracking-widest"
            style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
          >
            download
          </button>
          <button
            onClick={onRemove}
            className="bg-surface text-danger border-2 border-danger px-2 py-2 text-[11px] uppercase tracking-widest"
            style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
          >
            delete
          </button>
        </div>
        <button
          onClick={onClose}
          className="text-ink/60 text-[10px] uppercase tracking-widest hover:text-ink"
          style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
        >
          close
        </button>
      </motion.div>
    </motion.div>
  );
}
