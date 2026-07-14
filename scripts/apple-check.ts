import "dotenv/config";
import { decodeJwt, decodeProtectedHeader } from "jose";
import { getDeveloperToken } from "../lib/music/apple";

/**
 * Verify the Apple Music credentials actually work, without needing a signed-in
 * user. Catalog endpoints require only the developer token, so this proves the
 * .p8, key ID and team ID are all correct and mutually consistent — a five
 * second answer instead of debugging it through a failing sync.
 *
 *   pnpm apple:check
 */
async function main() {
  console.log("Apple Music credential check\n");

  const missing = [
    "APPLE_MUSIC_TEAM_ID",
    "APPLE_MUSIC_KEY_ID",
    "APPLE_MUSIC_PRIVATE_KEY",
  ].filter((key) => !process.env[key]);

  if (missing.length) {
    console.error(`❌ Not configured. Missing: ${missing.join(", ")}`);
    process.exit(1);
  }

  // 1. Can we sign a developer token at all? This is where a malformed .p8 dies.
  let token: string;

  try {
    token = await getDeveloperToken();
  } catch (error: any) {
    console.error(`❌ Could not sign a developer token: ${error.message}`);
    console.error(
      "\n   Usually means APPLE_MUSIC_PRIVATE_KEY isn't complete PEM — it must\n" +
        "   include the -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY----- lines.",
    );
    process.exit(1);
  }

  const header = decodeProtectedHeader(token);
  const claims = decodeJwt(token);

  console.log("✅ Developer token signed");
  console.log(`     alg ${header.alg}   kid ${header.kid}   iss ${claims.iss}`);

  // 2. Does Apple actually accept it? A well-formed token signed with the wrong
  //    key, or a key ID that doesn't match the team, fails only here.
  const response = await fetch(
    "https://api.music.apple.com/v1/catalog/us/search?term=queen&types=songs&limit=1",
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (response.status === 401 || response.status === 403) {
    console.error(`\n❌ Apple rejected the token (${response.status}).`);
    console.error(
      "   The token is well-formed but Apple won't accept it. Check that:\n" +
        "     - APPLE_MUSIC_KEY_ID matches the key the .p8 came from\n" +
        "     - APPLE_MUSIC_TEAM_ID is your Team ID (not the Media ID)\n" +
        "     - the key has MusicKit enabled and is not revoked",
    );
    process.exit(1);
  }

  if (!response.ok) {
    console.error(
      `\n❌ Apple returned ${response.status} ${response.statusText}`,
    );
    process.exit(1);
  }

  const body = await response.json();
  const song = body.results?.songs?.data?.[0]?.attributes;

  console.log("✅ Apple accepted the token — live catalog request succeeded");
  console.log(`     sample result: ${song?.name} — ${song?.artistName}`);

  console.log(
    "\nCredentials are good. The remaining piece is the Music User Token, which\n" +
      "can only be minted in a browser by MusicKit JS — that's the connect button.",
  );
}

main();
