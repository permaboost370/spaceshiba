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
    id: "helmet",
    label: "helmet",
    options: [
      { id: "classic", label: "classic", prompt: "classic white astronaut helmet with gold visor" },
      { id: "cracked", label: "cracked", prompt: "battle-worn helmet with a cracked visor" },
      { id: "chrome", label: "chrome", prompt: "mirror-chrome helmet reflecting stars" },
      { id: "tinted", label: "tinted", prompt: "deep red tinted visor" },
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
  "recreate the EXACT composition from the reference image without altering the layout. Keep the 'SPACESHIBA' black wordmark at the top unchanged, keep the 'ASTROID' black wordmark at the bottom unchanged, keep BOTH orange four-pointed astroid star ornaments in their exact positions, sizes, and colour. Keep the shiba inu astronaut character's face markings, eye shape and colour, muzzle, head/helmet shape, suit silhouette, front-facing seated full-body pose (ears to paws, including the tail), and proportions identical to the reference. Centered composition matching the reference layout";
const STYLE_LOCK =
  "draw the character in the reference's flat 2D children's-book hand-drawn style: simple clean outlines, flat coloured-pencil fills, minimal light shading, slight visible pencil texture on the character only, naive amateur feel. The background MUST be completely clean pure white (#ffffff) — no paper texture, no cream tint, no scene, no environment, no stars, no sky, no gradient, no framing, no shadow behind the character. The SPACESHIBA and ASTROID wordmarks must stay crisp solid-black typography exactly matching the reference letterforms, and both astroid ornaments must stay the same orange colour. DO NOT add 3D rendering, volumetric lighting, ambient occlusion, digital painting, glossy or metallic highlights, specular reflections, cinematic lighting, depth of field, photorealism, or any detail beyond what the reference shows. Layer the user-picked traits ONLY onto the shiba character — never on the wordmarks or the astroid ornaments";

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
