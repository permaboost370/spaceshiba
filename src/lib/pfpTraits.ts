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

export type TraitSelection = Record<string, string>; // { background: "deep-space", ... }

// Hidden baseline the UI never exposes. Locks the output to the
// reference character's identity + the reference's flat hand-drawn
// aesthetic so the only thing that changes per-generation is the
// user-picked traits. The "do NOT" clause is effectively a negative
// prompt — it kills Seedream's default bias toward adding depth,
// volumetric lighting, and glossy digital-painting shading, which
// otherwise makes outputs feel 3D compared to the naive 2D reference.
const BASELINE =
  "recreate the EXACT shiba inu astronaut character from the reference image: same face markings and mask pattern, same eye shape and colour, same muzzle, same head and helmet shape, same spacesuit silhouette and body proportions; centered head-and-shoulders profile-picture composition";
const STYLE_LOCK =
  "draw in the reference's flat 2D children's-book hand-drawn style: simple clean outlines, flat coloured-pencil fills on textured cream paper, minimal light shading, slight visible pencil texture, naive amateur feel; DO NOT add 3D rendering, volumetric lighting, ambient occlusion, digital painting, glossy or metallic highlights, specular reflections, cinematic lighting, depth of field, photorealism, or detail beyond what the reference itself shows; keep it completely flat and hand-drawn exactly like the reference";

export function defaultSelection(): TraitSelection {
  const sel: TraitSelection = {};
  for (const cat of TRAIT_CATEGORIES) {
    sel[cat.id] = cat.options[0].id;
  }
  return sel;
}

// Joins the user's selected traits + optional freeform prompt into a
// single prompt string. The BASELINE + STYLE_LOCK are always prepended
// so the model is told "same character, same style, only these
// traits change."
export function composePrompt(
  selection: TraitSelection,
  userPrompt: string,
): string {
  const traitParts: string[] = [];
  for (const cat of TRAIT_CATEGORIES) {
    const chosen = cat.options.find((o) => o.id === selection[cat.id]);
    if (chosen) traitParts.push(chosen.prompt);
  }
  const extras = userPrompt.trim().slice(0, 200);

  const parts = [BASELINE, STYLE_LOCK, ...traitParts];
  if (extras) parts.push(extras);
  return parts.join(", ");
}
