export type IndexDefinition = {
  name: string;
  alternativeNames: string[];
};

export const indices: IndexDefinition[] = [
  {
    name: "FTSE-IDX",
    alternativeNames: [
      "FTSE IDX",
      "FTSE Indonesia",
      "FTSE Indonesia Index",
      "FTSE-IDX Index",
      "Indeks FTSE IDX",
      "Indeks FTSE Indonesia",
    ],
  },
  {
    name: "IHSG",
    alternativeNames: [
      "JCI",
      "Jakarta Composite Index",
      "Jakarta Composite",
      "IDX Composite",
      "I.H.S.G.",
      "Indeks Harga Saham Gabungan",
      "Indeks Harga Saham Gabungan (IHSG)",
      "Indeks Komposit Jakarta",
      "Indeks Komposit",
      "Indeks Gabungan",
    ],
  },
  {
    name: "LQ45",
    alternativeNames: [
      "LQ-45",
      "LQ 45",
      "IDX LQ45",
      "IDX LQ-45",
      "IDX LQ 45",
      "Indeks LQ45",
      "Indeks LQ-45",
      "Indeks LQ 45",
      "LQ45 Index",
    ],
  },
  {
    name: "IDX30",
    alternativeNames: [
      "IDX 30",
      "IDX-30",
      "Indeks IDX30",
      "Indeks IDX 30",
      "IDX30 Index",
    ],
  },
  {
    name: "IDXHIDIV20",
    alternativeNames: [
      "IDX High Dividend 20",
      "IDX High Div 20",
      "High Dividend 20",
      "High Div 20",
      "Indeks High Dividend 20",
      "Indeks High Dividen 20",
    ],
  },
  {
    name: "IDXBUMN20",
    alternativeNames: [
      "IDX BUMN 20",
      "IDX BUMN20",
      "Indeks BUMN 20",
      "Indeks BUMN20",
      "Indeks IDX BUMN 20",
    ],
  },
  {
    name: "IDXV30",
    alternativeNames: [
      "IDX Value 30",
      "IDX Value30",
      "Value 30",
      "Indeks Value 30",
      "IDXV 30",
    ],
  },
  {
    name: "IDXG30",
    alternativeNames: [
      "IDX Growth 30",
      "IDX Growth30",
      "Growth 30",
      "Indeks Growth 30",
      "IDXG 30",
    ],
  },
  {
    name: "IDXQ30",
    alternativeNames: [
      "IDX Quality 30",
      "IDX Quality30",
      "Quality 30",
      "Indeks Quality 30",
      "IDXQ 30",
    ],
  },
  {
    name: "IDXESGL",
    alternativeNames: [
      "IDX ESG Leaders",
      "ESG Leaders",
      "Indeks ESG Leaders",
      "Indeks IDX ESG Leaders",
    ],
  },
  {
    name: "ECONOMIC30",
    alternativeNames: [
      "IDX Cyclical Economy 30",
      "IDX Cyclical Economic 30",
      "IDX ECONOMY 30",
      "Economic 30",
      "Cyclical Economy 30",
      "Indeks Ekonomi Siklikal 30",
      "Indeks Cyclical Economy 30",
    ],
  },
  {
    name: "KOMPAS100",
    alternativeNames: [
      "Kompas 100",
      "Kompas-100",
      "Indeks Kompas 100",
      "Kompas100 Index",
      "Kompas Index 100",
    ],
  },
  {
    name: "SRI-KEHATI",
    alternativeNames: [
      "Sri Kehati",
      "SRI KEHATI",
      "SRI-KEHATI Index",
      "Indeks SRI-KEHATI",
      "Indeks Sri Kehati",
      "Indeks SRI KEHATI",
    ],
  },
  {
    name: "SMinfra18",
    alternativeNames: [
      "SM Infra 18",
      "SMInfra 18",
      "SMinfra 18",
      "SM Infra18",
      "Indeks SM Infra 18",
      "Indeks SMinfra 18",
    ],
  },
  {
    name: "IDXVESTA28",
    alternativeNames: [
      "IDX-Infovesta Multi-Factor 28",
      "IDX Infovesta Multi Factor 28",
      "IDX Vesta 28",
      "IDXVesta 28",
      "Infovesta 28",
      "Indeks IDX Infovesta Multi Factor 28",
    ],
  },
  {
    name: "JII70",
    alternativeNames: [
      "JII 70",
      "JII70 Index",
      "Jakarta Islamic Index 70",
      "Jakarta Islamic 70",
      "Indeks Syariah JII70",
      "Indeks Syariah JII 70",
      "Indeks Jakarta Islamic Index 70",
    ],
  },
  {
    name: "S&P 500",
    alternativeNames: [
      "SPX",
      "S&P500",
      "S&P-500",
      "GSPC",
      "US500",
      "S&P 500 Index",
      "S&P500 Index",
      "Standard and Poor 500",
      "Standard & Poor 500",
      "Indeks S&P 500",
      "Indeks Standard & Poor 500",
    ],
  },
  {
    name: "Nasdaq",
    alternativeNames: [
      "Nasdaq Composite",
      "Nasdaq Index",
      "IXIC",
      "US100",
      "Nasdaq Comp",
      "Indeks Nasdaq",
      "Indeks Nasdaq Composite",
    ],
  },
  {
    name: "MSCI",
    alternativeNames: [
      "MSCI Index",
      "MSCI Indonesia",
      "MSCI World",
      "MSCI World Index",
      "MSCI Indonesia Index",
      "MSCI Indeks",
      "Indeks MSCI",
      "MSCI Global",
      "MSCI Global Index",
    ],
  },
];

// Escape special regex characters
const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Build a flexible pattern for a single name / alias:
// - Split on spaces and hyphens
// - Escape each token
// - Join tokens with "[-\s]*" so it matches
//   "LQ45", "LQ-45", "LQ 45", "LQ   -   45", etc.
const buildFlexiblePattern = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const parts = trimmed.split(/[-\s]+/).filter(Boolean);
  if (parts.length === 0) return "";

  const escapedParts = parts.map(escapeRegExp);

  // Allow zero or more spaces/hyphens between tokens
  return escapedParts.join("[-\\s]*");
};

// Build OR-joined pattern string for all aliases of one index
const buildPatternString = (names: string[]): string => {
  const variations = names
    .map((v) => v.trim())
    .filter(Boolean)
    // Longest first so more specific phrases have priority
    .sort((a, b) => b.length - a.length);

  const patterns = variations
    .map(buildFlexiblePattern)
    .filter((p) => p.length > 0);

  return patterns.join("|");
};

type IndexMatcher = {
  name: string;
  regex: RegExp;
};

// Pre-compute regex patterns once
const indexMatchers: IndexMatcher[] = indices.map((item) => {
  const allVariations = [item.name, ...item.alternativeNames];
  const patternString = buildPatternString(allVariations);

  // Unicode-aware boundaries without lookbehind:
  // (^|[^\p{L}\p{N}])  before
  // (?![\p{L}\p{N}])   after
  const source = `(?:^|[^\\p{L}\\p{N}])(?:${patternString})(?![\\p{L}\\p{N}])`;

  return {
    name: item.name,
    regex: new RegExp(source, "iu"),
  };
});

export const getMentionedIndices = (text: string): string[] => {
  if (!text) return [];

  // Basic normalization to reduce noise from extra whitespace
  const normalized = text.normalize("NFC").replace(/\s+/g, " ").trim();

  const matchedNames = indexMatchers
    .filter((matcher) => matcher.regex.test(normalized))
    .map((matcher) => matcher.name);

  // Deduplicate while preserving order
  return Array.from(new Set(matchedNames));
};
