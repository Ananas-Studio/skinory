// ---------------------------------------------------------------------------
// Ingredient normalizer – pure string manipulation, no external dependencies.
// ---------------------------------------------------------------------------

/** A single ingredient after normalization. */
export interface NormalizedIngredient {
  /** Normalized INCI name (uppercased, trimmed, spaces collapsed). */
  inciName: string;
  /** Original text as found (only trimmed). */
  rawLabel: string;
  /** 0-based position in the de-duplicated ingredient list. */
  order: number;
}

/** Result of parsing a raw ingredient string. */
export interface ParseResult {
  ingredients: NormalizedIngredient[];
  /** The original input string, preserved as-is. */
  rawText: string;
}

// ---------------------------------------------------------------------------
// Alias map — common names → canonical INCI names
// ---------------------------------------------------------------------------

/**
 * Map of common ingredient aliases to their canonical INCI names.
 * Keys and values are **uppercase** to allow O(1) lookup after normalizing
 * the input name.
 */
export const INGREDIENT_ALIASES: Record<string, string> = {
  WATER: "AQUA",
  "VITAMIN E": "TOCOPHEROL",
  "VITAMIN C": "ASCORBIC ACID",
  "VITAMIN A": "RETINOL",
  "VITAMIN B3": "NIACINAMIDE",
  "VITAMIN B5": "PANTHENOL",
  "SHEA BUTTER": "BUTYROSPERMUM PARKII BUTTER",
  "COCONUT OIL": "COCOS NUCIFERA OIL",
  "JOJOBA OIL": "SIMMONDSIA CHINENSIS SEED OIL",
  "ARGAN OIL": "ARGANIA SPINOSA KERNEL OIL",
  "CASTOR OIL": "RICINUS COMMUNIS SEED OIL",
  "OLIVE OIL": "OLEA EUROPAEA FRUIT OIL",
  "SUNFLOWER OIL": "HELIANTHUS ANNUUS SEED OIL",
  "SWEET ALMOND OIL": "PRUNUS AMYGDALUS DULCIS OIL",
  "ROSEHIP OIL": "ROSA CANINA FRUIT OIL",
  "TEA TREE OIL": "MELALEUCA ALTERNIFOLIA LEAF OIL",
  "BEESWAX": "CERA ALBA",
  "WITCH HAZEL": "HAMAMELIS VIRGINIANA WATER",
  "ALOE VERA": "ALOE BARBADENSIS LEAF JUICE",
  "GREEN TEA": "CAMELLIA SINENSIS LEAF EXTRACT",
  "CHAMOMILE": "CHAMOMILLA RECUTITA FLOWER EXTRACT",
  "HYALURONIC ACID": "SODIUM HYALURONATE",
  "GLYCOLIC ACID": "GLYCOLIC ACID",
  "SALICYLIC ACID": "SALICYLIC ACID",
  "LACTIC ACID": "LACTIC ACID",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Uppercase, trim, and collapse consecutive whitespace to a single space.
 * Also strips trailing periods / semicolons that OCR often leaves behind.
 */
function cleanName(raw: string): string {
  return raw
    .toUpperCase()
    .trim()
    .replace(/[.;]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Normalize a single ingredient name to its canonical INCI form.
 *
 * 1. Uppercases and trims the input.
 * 2. Collapses multiple whitespace characters.
 * 3. Resolves known aliases via {@link INGREDIENT_ALIASES}.
 *
 * @param name - Raw ingredient name (e.g. `"vitamin e"`)
 * @returns Canonical INCI name (e.g. `"TOCOPHEROL"`)
 */
export function normalizeInciName(name: string): string {
  const cleaned = cleanName(name);
  return INGREDIENT_ALIASES[cleaned] ?? cleaned;
}

/**
 * Split a raw ingredient string on commas while preserving parenthesised
 * groups.
 *
 * For example `"Cetearyl Alcohol (and) Dicetyl Phosphate, Aqua"` splits into
 * `["Cetearyl Alcohol (and) Dicetyl Phosphate", "Aqua"]` — the comma inside
 * parentheses (if any) would also be preserved, but the main concern here is
 * that text inside parentheses is never broken apart.
 */
function splitIngredients(raw: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (const ch of raw) {
    if (ch === "(") {
      depth++;
      current += ch;
    } else if (ch === ")") {
      depth = Math.max(0, depth - 1);
      current += ch;
    } else if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  // Push whatever remains after the last comma (or the entire string if no
  // commas were present).
  if (current.length > 0) {
    parts.push(current);
  }

  return parts;
}

/**
 * Parse a raw ingredient string (typically from OCR or an external API) into
 * a list of {@link NormalizedIngredient} objects.
 *
 * Behaviour:
 * - Splits on commas but respects parenthesised groups.
 * - Trims whitespace and strips trailing punctuation from each entry.
 * - Removes empty entries.
 * - De-duplicates by normalised INCI name (keeps the first occurrence).
 * - Assigns a 0-based `order` reflecting each ingredient's position in the
 *   de-duplicated list.
 *
 * @param raw - The raw ingredient string (e.g. from a product label).
 * @returns A {@link ParseResult} containing the normalised ingredient list
 *          and the original input text.
 */
export function parseIngredientString(raw: string): ParseResult {
  const tokens = splitIngredients(raw);

  const seen = new Set<string>();
  const ingredients: NormalizedIngredient[] = [];

  for (const token of tokens) {
    const trimmed = token.trim();
    if (trimmed === "") continue;

    const inciName = normalizeInciName(trimmed);
    if (inciName === "") continue;

    if (seen.has(inciName)) continue;
    seen.add(inciName);

    ingredients.push({
      inciName,
      rawLabel: trimmed,
      order: ingredients.length,
    });
  }

  return { ingredients, rawText: raw };
}
