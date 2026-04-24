import type { TraitSelection } from "./pfpTraits";

// A saved PFP lives in localStorage keyed by wallet address (or "anon"
// when disconnected). We keep the last N most recent to bound storage.
// The image URL points at fal.ai's CDN, so entries older than ~a few
// days may 404 — that's acceptable for a gallery, users who want it
// permanently should download it.

export type SavedPfp = {
  id: string;
  url: string;
  traits: TraitSelection;
  prompt: string;
  seed: number;
  createdAt: number;
};

const MAX_SAVED = 24;

const key = (addr: string | null) => `spaceshiba.pfp.gallery.${addr ?? "anon"}`;
const selectedKey = (addr: string | null) =>
  `spaceshiba.pfp.selected.${addr ?? "anon"}`;

export function loadGallery(addr: string | null): SavedPfp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(addr));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedPfp[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveToGallery(
  addr: string | null,
  pfp: SavedPfp,
): SavedPfp[] {
  const existing = loadGallery(addr);
  const next = [pfp, ...existing.filter((p) => p.id !== pfp.id)].slice(
    0,
    MAX_SAVED,
  );
  try {
    window.localStorage.setItem(key(addr), JSON.stringify(next));
  } catch {
    /* quota — ignore */
  }
  return next;
}

export function removeFromGallery(
  addr: string | null,
  id: string,
): SavedPfp[] {
  const existing = loadGallery(addr);
  const next = existing.filter((p) => p.id !== id);
  try {
    window.localStorage.setItem(key(addr), JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function setSelectedPfp(addr: string | null, id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id === null) window.localStorage.removeItem(selectedKey(addr));
    else window.localStorage.setItem(selectedKey(addr), id);
  } catch {
    /* ignore */
  }
}

export function getSelectedPfp(addr: string | null): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(selectedKey(addr));
  } catch {
    return null;
  }
}
