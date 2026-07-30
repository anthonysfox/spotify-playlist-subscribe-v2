import { randomBytes, createHash } from "crypto";

// A recognizable prefix so a leaked token is obvious in logs and so users can
// tell PlaylistFox tokens apart from anything else in their MCP config.
const TOKEN_PREFIX = "plf_";

// How many leading characters we keep in plaintext for display in the token list
// (`plf_9f3c…`). Enough to distinguish tokens, far too few to be useful to a thief.
const DISPLAY_PREFIX_LENGTH = 12;

export interface GeneratedToken {
  /** The full plaintext token — shown to the user exactly once, never stored. */
  token: string;
  /** SHA-256 of the token; this is what we persist and look up by. */
  tokenHash: string;
  /** The leading slice kept for display in the UI. */
  prefix: string;
}

/**
 * SHA-256 is the right hash here: the token is 256 bits of randomness, so there's
 * nothing to brute-force (unlike a password), and we need a fast, deterministic
 * digest we can look up by directly. This mirrors how GitHub/OpenAI store PATs.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): GeneratedToken {
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashToken(token),
    prefix: token.slice(0, DISPLAY_PREFIX_LENGTH),
  };
}
