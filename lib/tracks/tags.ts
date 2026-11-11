// Chart tags can appear anywhere in the tag ("billboard hot 100", "5+ wochen").
const CHART =
  /number one|billboard|hot 100|\btop \d+|\d+\+? wochen|offizielle|\bcharts?\b/;
// Bookmark/spam tags are recognisable by how they start ("my favourites", "ph_temp…").
const BOOKMARK =
  /^(seen live|favou?rite|my |albums i own|check|spotify|under \d+|ph_)/;

const DEMONYMS = new Set([
  "american",
  "usa",
  "us",
  "british",
  "english",
  "uk",
  "canadian",
  "australian",
  "korean",
  "japanese",
  "french",
  "german",
  "germany",
  "swedish",
  "norwegian",
  "finnish",
  "icelandic",
  "russian",
  "brazil",
  "brazilian",
  "new zealand",
]);

const NUMERIC = /^\d+$/;

const normalize = (s: string) => s.trim().toLowerCase().replace(/[‘’]/g, "'");

export function cleanTags(
  names: string[],
  opts?: { artistNames?: string[] },
): string[] {
  const cleanedTags = new Set<string>();
  const artists = new Set((opts?.artistNames ?? []).map(normalize));

  for (const name of names) {
    const normalized = normalize(name);

    if (!isNoise(normalized, artists)) cleanedTags.add(normalized);
  }

  return [...cleanedTags];
}

const isNoise = (tag: string, artists: Set<string>): boolean =>
  tag.length < 3 ||
  tag.length > 30 ||
  NUMERIC.test(tag) ||
  DEMONYMS.has(tag) ||
  artists.has(tag) ||
  CHART.test(tag) ||
  BOOKMARK.test(tag);
