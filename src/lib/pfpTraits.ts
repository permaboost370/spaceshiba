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
    id: "suitColor",
    label: "suit color",
    options: [
      { id: "default", label: "reference", prompt: "spacesuit stays the off-white colour of the reference image" },
      { id: "orange", label: "orange", prompt: "bright solid orange hand-coloured spacesuit, matching NASA-style safety orange" },
      { id: "navy", label: "navy", prompt: "deep navy blue hand-coloured spacesuit" },
      { id: "black", label: "black", prompt: "matte black hand-coloured spacesuit with subtle pencil shading" },
      { id: "red", label: "red", prompt: "fire engine red hand-coloured spacesuit" },
      { id: "silver", label: "silver", prompt: "light silver-grey hand-coloured spacesuit" },
      { id: "pink", label: "pink", prompt: "pastel pink hand-coloured spacesuit" },
      { id: "camo", label: "camo", prompt: "green military camouflage pattern hand-coloured onto the spacesuit" },
      { id: "gold", label: "gold", prompt: "metallic gold-yellow hand-coloured spacesuit" },
    ],
  },
  {
    id: "tail",
    label: "tail",
    options: [
      { id: "default", label: "reference", prompt: "tail matches the reference: short striped shiba tail curled to one side" },
      { id: "short", label: "short", prompt: "tiny stubby shiba tail, barely poking out from behind the body" },
      { id: "long", label: "long", prompt: "extra long flowing shiba tail extending past the paws and curling outward" },
      { id: "bushy", label: "bushy", prompt: "oversized extra-bushy fluffy shiba tail, fur fanning out" },
      { id: "curled", label: "curled tight", prompt: "tail curled tightly into a perfect spiral over the back" },
    ],
  },
  {
    id: "chestLogo",
    label: "chest logo",
    options: [
      { id: "none", label: "none", prompt: "no additional logo on the chest beyond what the reference shows" },
      { id: "spaceshiba", label: "spaceshiba", prompt: "small SPACESHIBA logo patch stitched onto the left chest of the suit — a four-pointed orange astroid star with the word SPACESHIBA under it" },
      { id: "btc", label: "bitcoin", prompt: "small round Bitcoin logo patch stitched onto the left chest of the suit — the orange circle with a white stylised B" },
      { id: "eth", label: "ethereum", prompt: "small round Ethereum logo patch stitched onto the left chest of the suit — the faceted two-tone diamond mark" },
      { id: "sol", label: "solana", prompt: "small rectangular Solana logo patch stitched onto the left chest of the suit — three diagonal gradient bars going from purple to green" },
      { id: "doge", label: "dogecoin", prompt: "small round Dogecoin logo patch stitched onto the left chest of the suit — gold coin with a D on it" },
    ],
  },
  {
    id: "flag",
    label: "flag patch",
    options: [
      { id: "none", label: "none", prompt: "no flag patch" },
      { id: "usa", label: "usa", prompt: "small rectangular United States flag patch stitched onto the right shoulder of the suit — red and white stripes with a blue field of white stars" },
      { id: "uk", label: "uk", prompt: "small rectangular Union Jack flag patch stitched onto the right shoulder of the suit" },
      { id: "japan", label: "japan", prompt: "small rectangular Japan flag patch stitched onto the right shoulder of the suit — red circle on white" },
      { id: "germany", label: "germany", prompt: "small rectangular Germany flag patch stitched onto the right shoulder of the suit — black, red, and gold horizontal stripes" },
      { id: "france", label: "france", prompt: "small rectangular France flag patch stitched onto the right shoulder of the suit — blue, white, and red vertical stripes" },
      { id: "italy", label: "italy", prompt: "small rectangular Italy flag patch stitched onto the right shoulder of the suit — green, white, and red vertical stripes" },
      { id: "brazil", label: "brazil", prompt: "small rectangular Brazil flag patch stitched onto the right shoulder of the suit — green with a yellow diamond and blue globe" },
      { id: "korea", label: "south korea", prompt: "small rectangular South Korea flag patch stitched onto the right shoulder of the suit — white with a red and blue taegeuk and four black trigrams" },
      { id: "canada", label: "canada", prompt: "small rectangular Canada flag patch stitched onto the right shoulder of the suit — red bars with a central red maple leaf on white" },
      { id: "australia", label: "australia", prompt: "small rectangular Australia flag patch stitched onto the right shoulder of the suit — blue field with Union Jack and southern cross" },
      { id: "mexico", label: "mexico", prompt: "small rectangular Mexico flag patch stitched onto the right shoulder of the suit — green, white, and red vertical stripes with a central emblem" },
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
  "a shiba inu astronaut character in the same spirit as the reference image: a front-facing full-body seated pose, a shiba's face with classic orange-and-white mask markings, a spacesuit with a bubble helmet, centered in the frame with comfortable margins and the entire character visible from the tips of the ears to the paws including the tail. The character does NOT have to be a pixel-perfect clone of the reference — the user's selected traits override colours and details as specified below. What MUST stay identical is the illustration style";
const STYLE_LOCK =
  "the illustration style MUST match the reference exactly: a flat 2D children's-book hand-drawn pencil-and-ink aesthetic — simple clean outlines, flat coloured-pencil fills, minimal light shading, slight visible pencil texture on the character, naive amateur hand-drawn feel. The background MUST be completely clean pure white (#ffffff) — no paper texture, no cream tint, no scene, no environment, no stars, no sky, no gradient, no framing, no shadow behind the character, nothing but solid white. DO NOT add 3D rendering, volumetric lighting, ambient occlusion, digital painting, glossy or metallic highlights, specular reflections, cinematic lighting, depth of field, or photorealism. No matter what traits the user picks — spacesuit colour, tail length, logo patch, flag patch — everything on the character must be rendered as if the same human artist who drew the reference drew it: same line weight, same coloured-pencil technique, same level of detail, same naive flat 2D feel";

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
