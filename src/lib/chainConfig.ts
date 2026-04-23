// Public on-chain identifiers for the client UI. The bank address and
// token mint are public values — safe to ship in the bundle. Override
// via NEXT_PUBLIC_* envs if you ever rotate them.

export const BANK_ADDRESS =
  process.env.NEXT_PUBLIC_BANK_ADDRESS ??
  "8E9KXFHGyGQothNeQNE9raGLYv4bmLjkqdPckF1hw54p";

export const TOKEN_MINT_ADDRESS =
  process.env.NEXT_PUBLIC_TOKEN_MINT ??
  "3U9uQvDEYfYSjXB9v8NEbu3bgtryp3Y5EWvppBdgdoge";

export const MAX_WITHDRAW_UI = 10_000;
