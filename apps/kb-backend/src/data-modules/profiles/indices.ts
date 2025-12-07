export const indices: Array<{ name: string; alternativeNames: string[] }> = [
  {
    name: "FTSE-IDX",
    alternativeNames: ["FTSE Indonesia", "FTSE Indonesia Index"],
  },
  {
    name: "IHSG",
    alternativeNames: [
      "JCI",
      "Jakarta Composite Index",
      "IDX Composite",
      "I.H.S.G.",
    ],
  },
  {
    name: "LQ45",
    alternativeNames: ["LQ-45", "IDX LQ45", "LQ 45"],
  },
  {
    name: "IDX30",
    alternativeNames: ["IDX 30", "IDX-30"],
  },
  {
    name: "IDXHIDIV20",
    alternativeNames: ["IDX High Dividend 20", "IDX High Div 20"],
  },
  {
    name: "IDXBUMN20",
    alternativeNames: ["IDX BUMN 20", "IDX BUMN20"],
  },
  {
    name: "IDXV30",
    alternativeNames: ["IDX Value 30", "IDX Value30"],
  },
  {
    name: "IDXG30",
    alternativeNames: ["IDX Growth 30", "IDX Growth30"],
  },
  {
    name: "IDXQ30",
    alternativeNames: ["IDX Quality 30", "IDX Quality30"],
  },
  {
    name: "IDXESGL",
    alternativeNames: ["IDX ESG Leaders"],
  },
  {
    name: "ECONOMIC30",
    alternativeNames: ["IDX Cyclical Economy 30", "IDX ECONOMY 30"],
  },
  {
    name: "KOMPAS100",
    alternativeNames: ["Kompas 100", "Kompas-100"],
  },
  {
    name: "SRI-KEHATI",
    alternativeNames: ["Sri Kehati", "SRI-KEHATI Index"],
  },
  {
    name: "SMinfra18",
    alternativeNames: ["SM Infra 18", "SMInfra 18"],
  },
  {
    name: "IDXVESTA28",
    alternativeNames: ["IDX-Infovesta Multi-Factor 28", "IDX Vesta 28"],
  },
  {
    name: "JII70",
    alternativeNames: ["Jakarta Islamic Index 70", "JII 70"],
  },
  {
    name: "S&P 500",
    alternativeNames: ["SPX", "S&P500", "GSPC", "US500"],
  },
  {
    name: "Nasdaq",
    alternativeNames: ["Nasdaq Composite", "IXIC", "US100"],
  },
  {
    name: "MSCI",
    alternativeNames: [
      "MSCI Index",
      "MSCI Indonesia",
      "MSCI World",
      "MSCI Indeks",
    ],
  },
];

// Helper to escape special regex characters (like ".", "&", "+")
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
};

// Pre-compute the Regex patterns (Run only once)
// Structure: { name: "IHSG", regex: /\b(IHSG|JCI|IDX Composite)\b/i }
const indexMatchers = indices.map((item) => {
  // Combine name and alternatives
  const allVariations = [item.name, ...item.alternativeNames];

  // Sort by length descending (longest first).
  // This prevents "IDX" matching prematurely if "IDX30" is also in the list (safety check)
  allVariations.sort((a, b) => b.length - a.length);

  // Escape special chars and join with OR operator "|"
  const patternString = allVariations.map(escapeRegExp).join("|");

  return {
    name: item.name,
    // \b ensures word boundaries. 'i' flag makes it case insensitive.
    // Example Pattern: /\b(JCI|IHSG|Jakarta Composite Index)\b/i
    regex: new RegExp(`\\b(${patternString})\\b`, "i"),
  };
});

export const getMentionedIndices = (text: string): string[] => {
  if (!text) return [];

  // Filter the pre-computed matchers
  return [
    ...new Set(
      indexMatchers
        .filter((matcher) => matcher.regex.test(text))
        .map((matcher) => matcher.name),
    ),
  ];
};
