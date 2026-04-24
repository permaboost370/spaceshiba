"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  TRAIT_CATEGORIES,
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
  const [gen, setGen] = useState<GenState>({ kind: "idle" });
  const [gallery, setGallery] = useState<SavedPfp[]>([]);
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<SavedPfp | null>(null);

  useEffect(() => {
    setGallery(loadGallery(walletAddress));
    setSelectedIdState(getSelectedPfp(walletAddress));
  }, [walletAddress]);

  const setTrait = (cat: string, val: string) =>
    setSelection((s) => ({ ...s, [cat]: val }));

  const generate = useCallback(async () => {
    if (gen.kind === "loading") return;
    const total = 1;
    setGen({ kind: "loading", progress: 0, total });
    try {
      const res = await fetch("/api/pfp/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          traits: selection,
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
  }, [gen.kind, selection]);

  const saveAndUse = (result: GenResult) => {
    const id = `${Date.now()}-${result.seed}`;
    const pfp: SavedPfp = {
      id,
      url: result.url,
      traits: selection,
      prompt: "",
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
      prompt: "",
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

  const downloadImage = async (url: string, id: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      // Sniff the real image format from the file's magic bytes.
      // Necessary because fal.ai's CDN can return `.png` URLs with
      // Content-Type: image/png even though the bytes are JPEG; saving
      // as .png with mismatched bytes leaves macOS unable to generate
      // Finder thumbnails or Quick Look previews.
      const head = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
      let ext = "jpg";
      let mime = "image/jpeg";
      if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) {
        ext = "png";
        mime = "image/png";
      } else if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
        ext = "jpg";
        mime = "image/jpeg";
      } else if (
        head[0] === 0x52 &&
        head[1] === 0x49 &&
        head[2] === 0x46 &&
        head[3] === 0x46 &&
        head[8] === 0x57 &&
        head[9] === 0x45 &&
        head[10] === 0x42 &&
        head[11] === 0x50
      ) {
        ext = "webp";
        mime = "image/webp";
      } else if (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x38) {
        ext = "gif";
        mime = "image/gif";
      }
      // Rebuild the blob with the correct MIME so the downloaded file's
      // metadata is internally consistent (matters for some Finder
      // plugins + any downstream upload).
      const fixed = new Blob([blob], { type: mime });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(fixed);
      a.download = `spaceshiba-${id}.${ext}`;
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
          </div>

          <button
            onClick={generate}
            disabled={gen.kind === "loading"}
            className="shrink-0 bg-flame text-on-flame border-2 border-ink shadow-[4px_4px_0_#0a0a0a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#0a0a0a] transition-all py-2.5 sm:py-3 text-base sm:text-lg md:text-xl uppercase tracking-wider disabled:opacity-40 disabled:shadow-none"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
          >
            {gen.kind === "loading"
              ? gen.total > 1
                ? `generating ${gen.progress}/${gen.total}…`
                : "generating…"
              : "generate"}
          </button>
        </aside>
      </div>

      <AnimatePresence>
        {lightbox && (
          <Lightbox
            pfp={lightbox}
            onClose={() => setLightbox(null)}
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
  onDownload,
}: {
  state: GenState;
  onUse: (r: GenResult) => void;
  onSave: (r: GenResult) => void;
  onRegenerate: () => void;
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
    const cols = state.total > 1 ? "grid-cols-2" : "grid-cols-1";
    return (
      <div className={`${frame} p-3 flex flex-col gap-3`}>
        <LaunchBanner total={state.total} />
        <div className={`grid ${cols} gap-2 flex-1 min-h-0`}>
          {Array.from({ length: state.total }).map((_, i) => (
            <LoadingTile key={i} index={i} single={state.total === 1} />
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

  const cols = state.results.length > 1 ? "grid-cols-2" : "grid-cols-1";
  return (
    <div className={`${frame} p-3`}>
      <div className={`grid ${cols} gap-2 h-full min-h-0`}>
        {state.results.map((r, i) => (
          <ResultTile
            key={`${r.seed}-${i}`}
            result={r}
            single={state.results.length === 1}
            onUse={() => onUse(r)}
            onSave={() => onSave(r)}
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
      {total > 1 && <span className="tabular-nums">{total} variants</span>}
    </div>
  );
}

// Parametric astroid: x = r·cos³(t), y = -r·sin³(t). 4-cusp curve —
// the same path used in the game's crash-explosion animation so the
// PFP generator and the game share a visual language.
const ASTROID_STEPS = 48;
const ASTROID_X: number[] = [];
const ASTROID_Y: number[] = [];
for (let i = 0; i <= ASTROID_STEPS; i++) {
  const s = (i / ASTROID_STEPS) * Math.PI * 2;
  const c = Math.cos(s);
  const sn = Math.sin(s);
  ASTROID_X.push(c * c * c); // preserves sign via odd power
  ASTROID_Y.push(-sn * sn * sn);
}

function LoadingTile({ index }: { index: number; single?: boolean }) {
  // Astroid curve path string for the faint trace behind the shiba.
  const tracePath = `M ${ASTROID_X.map((x, i) => `${x.toFixed(4)} ${ASTROID_Y[i].toFixed(4)}`).join(" L ")} Z`;
  // Shiba orbits this radius inside the [-1, 1] viewBox, leaving
  // headroom for the sprite width.
  const R = 0.62;
  const shibaHeight = 0.55;
  const shibaWidth = shibaHeight * (209 / 408);
  return (
    <motion.div
      initial={{ opacity: 0.6 }}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{
        duration: 2.4,
        repeat: Infinity,
        delay: index * 0.12,
        ease: "easeInOut",
      }}
      className="relative border-2 border-ink/40 bg-bg overflow-hidden w-full h-full"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(135deg, rgba(255,74,0,0.10) 0 12px, transparent 12px 24px)",
        }}
      />

      {/* Both the astroid trace and the orbiting shiba share the
          SVG viewBox so positioning scales with the tile size. */}
      <svg
        viewBox="-1.15 -1.15 2.3 2.3"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <path
          d={tracePath}
          fill="none"
          stroke="rgba(255,74,0,0.32)"
          strokeWidth={0.014}
          strokeLinecap="round"
        />
        <motion.g
          animate={{
            x: ASTROID_X.map((v) => v * R),
            y: ASTROID_Y.map((v) => v * R),
          }}
          transition={{
            duration: 3.6,
            repeat: Infinity,
            ease: "linear",
            delay: index * 0.25,
          }}
        >
          <image
            href="/shiba.png"
            width={shibaWidth}
            height={shibaHeight}
            x={-shibaWidth / 2}
            y={-shibaHeight * 0.88}
            preserveAspectRatio="xMidYMid meet"
          />
        </motion.g>
      </svg>

      <div
        className="absolute inset-x-0 bottom-2 text-center text-flame text-[10px] uppercase tracking-[0.28em]"
        style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
      >
        // in orbit
      </div>
    </motion.div>
  );
}

function ResultTile({
  result,
  single,
  onUse,
  onSave,
  onDownload,
}: {
  result: GenResult;
  single?: boolean;
  onUse: () => void;
  onSave: () => void;
  onDownload: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative border-2 border-ink bg-bg overflow-hidden flex flex-col w-full h-full min-h-0"
    >
      <div className="relative flex-1 min-h-0 bg-bg">
        <img
          src={result.url}
          alt="generated spaceshiba pfp"
          // single result → contain (square PFP shown uncropped in a
          // possibly non-square cell); 2x2 grid → cover for a clean
          // tile look without letterboxing.
          className={`absolute inset-0 w-full h-full ${
            single ? "object-contain" : "object-cover"
          }`}
        />
      </div>
      <div className="shrink-0 border-t-2 border-ink bg-bg grid grid-cols-3 divide-x-2 divide-ink">
        <TileAction label="Set as PFP" onClick={onUse} highlight>
          <UserIcon />
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
  onDownload,
  onSetAsPfp,
  onRemove,
  isCurrentPfp,
}: {
  pfp: SavedPfp;
  onClose: () => void;
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
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onSetAsPfp}
            disabled={isCurrentPfp}
            className="bg-flame text-on-flame border-2 border-ink px-2 py-2 text-[11px] uppercase tracking-widest disabled:opacity-40"
            style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
          >
            {isCurrentPfp ? "current pfp" : "set as my pfp"}
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
