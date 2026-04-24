// Trait catalog for the Spaceshiba PFP generator. Each trait's `prompt`
// is a short phrase injected into the final Kontext prompt — keep them
// visual, concrete, and brand-coherent with the hand-drawn astronaut
// reference. `label` is what the user sees; `id` is the stable slug we
// send to the API and persist in saved PFPs.

export type Trait = { id: string; label: string; prompt: string };
export type TraitCategory = {
  id: string;
  label: string;
  options: Trait[];
};

export const TRAIT_CATEGORIES: TraitCategory[] = [
  {
    id: "background",
    label: "background",
    options: [
      { id: "deep-space", label: "deep space", prompt: "deep space with distant stars and a faint nebula" },
      { id: "neon-city", label: "neon city", prompt: "neon cyberpunk cityscape at night, bright magenta and cyan lights" },
      { id: "sunset-orbit", label: "sunset orbit", prompt: "low earth orbit at sunrise, warm orange and red atmospheric glow" },
      { id: "void", label: "void", prompt: "pure black void with a single hard light source" },
      { id: "meteor-shower", label: "meteor shower", prompt: "meteor shower streaking across a dark purple sky" },
      { id: "moon-surface", label: "moon surface", prompt: "cratered lunar surface with earth rising in the background" },
    ],
  },
  {
    id: "helmet",
    label: "helmet",
    options: [
      { id: "classic", label: "classic", prompt: "classic white astronaut helmet with gold visor" },
      { id: "cracked", label: "cracked", prompt: "battle-worn helmet with a cracked visor" },
      { id: "chrome", label: "chrome", prompt: "mirror-chrome helmet reflecting stars" },
      { id: "tinted", label: "tinted", prompt: "deep red tinted visor" },
      { id: "none", label: "no helmet", prompt: "no helmet, fur flowing in zero gravity" },
      { id: "crown", label: "crown", prompt: "golden crown fused to the helmet" },
    ],
  },
  {
    id: "accessory",
    label: "accessory",
    options: [
      { id: "none", label: "none", prompt: "no extra accessory" },
      { id: "chain", label: "chain", prompt: "heavy gold chain around the neck" },
      { id: "shades", label: "shades", prompt: "black wayfarer sunglasses on top of the helmet" },
      { id: "cigar", label: "cigar", prompt: "lit cigar clenched in teeth with a thin trail of smoke" },
      { id: "medallion", label: "medallion", prompt: "medallion with the SPACESHIBA logo resting on chest" },
      { id: "patch", label: "mission patch", prompt: "embroidered ASTROID mission patch on the chest" },
    ],
  },
  {
    id: "aura",
    label: "aura",
    options: [
      { id: "none", label: "none", prompt: "no aura" },
      { id: "fire", label: "fire", prompt: "bright orange flame aura licking the outline of the character" },
      { id: "electric", label: "electric", prompt: "blue electric arcs crackling around the character" },
      { id: "cosmic", label: "cosmic", prompt: "swirling purple cosmic energy outlining the character" },
      { id: "rainbow", label: "rainbow", prompt: "soft pastel rainbow glow around the silhouette" },
      { id: "holy", label: "holy", prompt: "golden halo above the head and soft divine glow" },
    ],
  },
  {
    id: "expression",
    label: "expression",
    options: [
      { id: "focused", label: "focused", prompt: "focused determined expression, eyes forward" },
      { id: "smirk", label: "smirk", prompt: "confident smirk, one eyebrow raised" },
      { id: "shocked", label: "shocked", prompt: "shocked wide-eyed expression" },
      { id: "zen", label: "zen", prompt: "calm meditative expression, eyes closed" },
      { id: "tongue", label: "tongue out", prompt: "playful tongue sticking out" },
      { id: "sleepy", label: "sleepy", prompt: "sleepy half-closed eyes" },
    ],
  },
];

export type StylePreset = {
  id: string;
  label: string;
  prompt: string;
};

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "handdrawn",
    label: "hand-drawn",
    prompt:
      "hand-drawn ink illustration on cream paper, visible pencil strokes, brutalist zine aesthetic, matches the reference character's style",
  },
  {
    id: "pixel",
    label: "pixel",
    prompt:
      "32-bit pixel art portrait, clean pixels, limited palette, retro game sprite aesthetic",
  },
  {
    id: "cosmic",
    label: "cosmic",
    prompt:
      "high-contrast cosmic digital painting, vivid nebula colors, dramatic rim light",
  },
  {
    id: "3d",
    label: "3d render",
    prompt:
      "stylized 3d render, soft volumetric light, clean plastic-like materials, octane quality",
  },
];

export type TraitSelection = Record<string, string>; // { background: "deep-space", ... }

export function defaultSelection(): TraitSelection {
  const sel: TraitSelection = {};
  for (const cat of TRAIT_CATEGORIES) {
    sel[cat.id] = cat.options[0].id;
  }
  return sel;
}

// Joins the user's selected traits + style + freeform prompt into a
// single prompt string to send to the image model. Kontext is at its
// best with comma-separated concrete descriptors, not long prose.
export function composePrompt(
  selection: TraitSelection,
  styleId: string,
  userPrompt: string,
): string {
  const traitParts: string[] = [];
  for (const cat of TRAIT_CATEGORIES) {
    const chosen = cat.options.find((o) => o.id === selection[cat.id]);
    if (chosen) traitParts.push(chosen.prompt);
  }
  const style =
    STYLE_PRESETS.find((s) => s.id === styleId) ?? STYLE_PRESETS[0];
  const extras = userPrompt.trim().slice(0, 200);

  const core =
    "portrait of the reference shiba inu astronaut character, centered profile-picture composition, head and shoulders visible";
  const parts = [core, ...traitParts, style.prompt];
  if (extras) parts.push(extras);
  return parts.join(", ");
}
