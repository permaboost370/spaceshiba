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

// Keeps the "only recolour the existing white fur, don't add any
// decorations or background elements" instruction consistent across
// every fur-color option.
function furColorPrompt(colour: string): string {
  return `recolour the existing white fur pixels on the shiba (body, muzzle, cheeks, legs, paws, chest — every area that is white in the reference) to ${colour}. DO NOT add any new fur, fluff, halo, mane, aura, or decorative elements in that colour behind or around the character. The orange face-mask markings, orange ear tips, and all orange parts stay EXACTLY the same orange as the reference. The background stays pure white`;
}

// Flag patch prompt template — the model gets the flag name plus a
// concrete visual description since it often renders flags better
// from appearance than from country name alone.
function flagPrompt(country: string, description: string): string {
  return `small rectangular ${country} flag patch stitched onto the right shoulder of the spacesuit — ${description}. The patch should be roughly the size of a real mission patch, drawn in the same hand-drawn pencil-and-ink style as the rest of the character`;
}

export const TRAIT_CATEGORIES: TraitCategory[] = [
  {
    id: "furColor",
    label: "fur color",
    options: [
      { id: "default", label: "reference", prompt: "the shiba's white fur stays the same off-white colour as the reference" },
      { id: "pink", label: "pink", prompt: furColorPrompt("pastel pink") },
      { id: "blue", label: "blue", prompt: furColorPrompt("pastel sky blue") },
      { id: "grey", label: "grey", prompt: furColorPrompt("soft light grey") },
      { id: "mint", label: "mint", prompt: furColorPrompt("pale mint green") },
      { id: "lavender", label: "lavender", prompt: furColorPrompt("pale lavender purple") },
      { id: "yellow", label: "yellow", prompt: furColorPrompt("soft pastel yellow") },
      { id: "black", label: "black", prompt: furColorPrompt("matte black") },
      { id: "brown", label: "brown", prompt: furColorPrompt("warm chocolate brown") },
      { id: "peach", label: "peach", prompt: furColorPrompt("soft peach") },
      { id: "teal", label: "teal", prompt: furColorPrompt("muted teal blue-green") },
      { id: "crimson", label: "crimson", prompt: furColorPrompt("deep crimson red") },
      { id: "cream", label: "cream", prompt: furColorPrompt("warm cream beige") },
      { id: "galaxy", label: "galaxy", prompt: furColorPrompt("deep navy blue with tiny white star speckles scattered across the fur like a galaxy") },
    ],
  },
  {
    id: "suitColor",
    label: "suit color",
    options: [
      { id: "default", label: "reference", prompt: "spacesuit stays the off-white colour of the reference image" },
      { id: "orange", label: "orange", prompt: "bright solid orange hand-coloured spacesuit, matching NASA-style safety orange" },
      { id: "navy", label: "navy", prompt: "deep navy blue hand-coloured spacesuit" },
      { id: "sky", label: "sky blue", prompt: "bright sky blue hand-coloured spacesuit" },
      { id: "black", label: "black", prompt: "matte black hand-coloured spacesuit with subtle pencil shading" },
      { id: "red", label: "red", prompt: "fire engine red hand-coloured spacesuit" },
      { id: "burgundy", label: "burgundy", prompt: "deep burgundy wine-red hand-coloured spacesuit" },
      { id: "silver", label: "silver", prompt: "light silver-grey hand-coloured spacesuit" },
      { id: "chrome", label: "chrome", prompt: "shiny chrome hand-coloured spacesuit with subtle metallic reflective pencil shading" },
      { id: "pink", label: "pink", prompt: "pastel pink hand-coloured spacesuit" },
      { id: "purple", label: "purple", prompt: "royal purple hand-coloured spacesuit" },
      { id: "teal", label: "teal", prompt: "muted teal green-blue hand-coloured spacesuit" },
      { id: "mint", label: "mint", prompt: "pastel mint green hand-coloured spacesuit" },
      { id: "yellow", label: "yellow", prompt: "bright sunflower yellow hand-coloured spacesuit" },
      { id: "camo", label: "camo", prompt: "green military camouflage pattern hand-coloured onto the spacesuit" },
      { id: "desert-camo", label: "desert camo", prompt: "beige and brown desert camouflage pattern hand-coloured onto the spacesuit" },
      { id: "gold", label: "gold", prompt: "metallic gold-yellow hand-coloured spacesuit" },
      { id: "holographic", label: "holographic", prompt: "iridescent holographic hand-coloured spacesuit with pastel pink, blue, and purple highlights suggesting a rainbow sheen" },
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
      { id: "fox", label: "fox", prompt: "long bushy fox-like tail with a white tip, swept to one side" },
      { id: "double", label: "double", prompt: "two matching shiba tails splitting out from the rear, both curled in opposite directions" },
      { id: "flame", label: "flame", prompt: "tail made of stylised hand-drawn orange flame instead of fur" },
      { id: "lightning", label: "lightning", prompt: "tail shaped like a sharp yellow lightning bolt instead of fur" },
      { id: "rocket", label: "rocket", prompt: "small cartoon rocket thruster in place of the tail, with a short flame trail" },
      { id: "bow", label: "bow-tied", prompt: "short reference shiba tail with a large red ribbon bow tied around its base" },
      { id: "robotic", label: "robotic", prompt: "mechanical metallic robot tail with visible joints and a small red LED at the tip" },
    ],
  },
  {
    id: "chestLogo",
    label: "chest logo",
    options: [
      { id: "none", label: "none", prompt: "no additional logo on the chest beyond what the reference shows" },
      { id: "spaceshiba", label: "spaceshiba", prompt: "small SPACESHIBA logo patch stitched onto the left chest of the suit — a four-pointed orange astroid star with the word SPACESHIBA under it" },
      { id: "astroid", label: "astroid", prompt: "small round patch stitched onto the left chest of the suit — a four-pointed orange astroid star on a black circular background" },
      { id: "btc", label: "bitcoin", prompt: "small round Bitcoin logo patch stitched onto the left chest of the suit — an orange circle with a bold white B that has two vertical strokes extending above and below it" },
      { id: "eth", label: "ethereum", prompt: "small round Ethereum logo patch stitched onto the left chest of the suit — a faceted two-tone diamond shape with light and dark grey triangular facets" },
      { id: "sol", label: "solana", prompt: "small rectangular Solana logo patch stitched onto the left chest of the suit — three parallel diagonal bars stacked on top of each other with a gradient from magenta-purple on the left to teal-green on the right" },
      { id: "doge", label: "dogecoin", prompt: "small round Dogecoin logo patch stitched onto the left chest of the suit — a gold coin with a stylised capital letter D on it" },
      { id: "shib", label: "shiba inu", prompt: "small round Shiba Inu token logo patch stitched onto the left chest of the suit — an orange circle with a stylised shiba silhouette in red" },
      { id: "pepe", label: "pepe", prompt: "small round PEPE coin logo patch stitched onto the left chest of the suit — a green frog face cartoon on a yellow circle" },
      { id: "bonk", label: "bonk", prompt: "small round BONK logo patch stitched onto the left chest of the suit — an orange cartoon dog face with a baseball bat over a yellow circle" },
      { id: "xrp", label: "xrp", prompt: "small round XRP logo patch stitched onto the left chest of the suit — a black circle with a stylised white X made from two overlapping curves" },
      { id: "ada", label: "cardano", prompt: "small round Cardano logo patch stitched onto the left chest of the suit — a blue circular pattern of small dots arranged in a symmetric starburst" },
      { id: "usdc", label: "usdc", prompt: "small round USDC logo patch stitched onto the left chest of the suit — a blue circle with a white capital dollar sign" },
      { id: "nasa", label: "nasa (parody)", prompt: "small round mission patch stitched onto the left chest of the suit — parody NASA-style blue circular patch with red swoosh and white stars" },
    ],
  },
  {
    id: "flag",
    label: "flag patch",
    options: [
      { id: "none", label: "none", prompt: "no flag patch" },
      { id: "usa", label: "usa", prompt: flagPrompt("United States", "red and white horizontal stripes with a blue field of small white stars in the top left corner") },
      { id: "uk", label: "uk", prompt: flagPrompt("United Kingdom Union Jack", "dark blue background with overlapping red and white crosses forming a diagonal and upright cross pattern") },
      { id: "japan", label: "japan", prompt: flagPrompt("Japan", "a solid red circle centered on a pure white background") },
      { id: "china", label: "china", prompt: flagPrompt("China", "bright red background with one large yellow five-pointed star in the top left and four smaller yellow stars curved around it") },
      { id: "germany", label: "germany", prompt: flagPrompt("Germany", "three equal horizontal stripes from top to bottom in black, red, and gold") },
      { id: "france", label: "france", prompt: flagPrompt("France", "three equal vertical stripes from left to right in blue, white, and red") },
      { id: "italy", label: "italy", prompt: flagPrompt("Italy", "three equal vertical stripes from left to right in green, white, and red") },
      { id: "spain", label: "spain", prompt: flagPrompt("Spain", "three horizontal stripes in red, yellow, red — the yellow band is twice as tall as each red band") },
      { id: "portugal", label: "portugal", prompt: flagPrompt("Portugal", "two vertical stripes of green and red with a small national shield emblem at the center of the divide") },
      { id: "netherlands", label: "netherlands", prompt: flagPrompt("Netherlands", "three equal horizontal stripes from top to bottom in red, white, and blue") },
      { id: "sweden", label: "sweden", prompt: flagPrompt("Sweden", "blue background with a yellow Scandinavian cross, vertical bar shifted toward the left") },
      { id: "norway", label: "norway", prompt: flagPrompt("Norway", "red background with a blue Scandinavian cross outlined in white, vertical bar shifted toward the left") },
      { id: "ireland", label: "ireland", prompt: flagPrompt("Ireland", "three equal vertical stripes from left to right in green, white, and orange") },
      { id: "greece", label: "greece", prompt: flagPrompt("Greece", "nine horizontal blue and white stripes with a small white cross on a blue square in the top left corner") },
      { id: "turkey", label: "turkey", prompt: flagPrompt("Turkey", "red background with a white crescent moon and small white five-pointed star") },
      { id: "russia", label: "russia", prompt: flagPrompt("Russia", "three equal horizontal stripes from top to bottom in white, blue, and red") },
      { id: "ukraine", label: "ukraine", prompt: flagPrompt("Ukraine", "two equal horizontal stripes of blue on top and yellow on the bottom") },
      { id: "korea", label: "south korea", prompt: flagPrompt("South Korea", "white background with a red and blue circular taegeuk in the center and four black trigrams in the corners") },
      { id: "india", label: "india", prompt: flagPrompt("India", "three equal horizontal stripes in saffron orange, white, and green with a navy blue 24-spoke wheel in the center") },
      { id: "brazil", label: "brazil", prompt: flagPrompt("Brazil", "green background with a large yellow diamond and a blue celestial globe with white stars in the center") },
      { id: "argentina", label: "argentina", prompt: flagPrompt("Argentina", "three equal horizontal stripes of light blue, white, and light blue with a golden sun of May on the white stripe") },
      { id: "mexico", label: "mexico", prompt: flagPrompt("Mexico", "three equal vertical stripes of green, white, and red with a central emblem of an eagle on a cactus") },
      { id: "canada", label: "canada", prompt: flagPrompt("Canada", "white center with two vertical red bars on the sides and a single red eleven-pointed maple leaf in the centre") },
      { id: "australia", label: "australia", prompt: flagPrompt("Australia", "blue field with the Union Jack in the upper left corner, a large seven-pointed Commonwealth star below it, and the Southern Cross constellation on the right") },
      { id: "newzealand", label: "new zealand", prompt: flagPrompt("New Zealand", "blue field with the Union Jack in the upper left corner and four red stars outlined in white forming the Southern Cross on the right") },
      { id: "southafrica", label: "south africa", prompt: flagPrompt("South Africa", "horizontal Y-shape splitting the flag into red, blue, and a green wedge with black triangle bordered by yellow and white") },
      { id: "nigeria", label: "nigeria", prompt: flagPrompt("Nigeria", "three equal vertical stripes of green, white, and green") },
      { id: "kenya", label: "kenya", prompt: flagPrompt("Kenya", "three horizontal stripes of black, red, and green separated by thin white fimbriations with a red and black Maasai shield and spears in the center") },
      { id: "egypt", label: "egypt", prompt: flagPrompt("Egypt", "three equal horizontal stripes in red, white, and black with a golden eagle of Saladin in the center") },
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

// Joins the user's selected traits into a single prompt string.
// BASELINE + STYLE_LOCK are always prepended so the model is told
// "same character concept, same illustration style, only these
// traits change."
export function composePrompt(selection: TraitSelection): string {
  const traitParts: string[] = [];
  for (const cat of TRAIT_CATEGORIES) {
    const chosen = cat.options.find((o) => o.id === selection[cat.id]);
    if (chosen) traitParts.push(chosen.prompt);
  }
  return [BASELINE, STYLE_LOCK, ...traitParts].join(", ");
}
