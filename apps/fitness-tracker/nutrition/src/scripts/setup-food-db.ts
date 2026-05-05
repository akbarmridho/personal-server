/**
 * Setup script for the food search SQLite FTS5 database.
 *
 * Imports both USDA Foundation Foods and OpenFoodFacts data into a single
 * SQLite database with FTS5 full-text search (BM25 ranking).
 *
 * Usage: npx tsx src/scripts/setup-food-db.ts
 */
import {
  createReadStream,
  createWriteStream,
  existsSync,
  readFileSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import Database from "better-sqlite3";

const DATA_DIR = resolve(import.meta.dirname, "../../data");
const DB_PATH = resolve(DATA_DIR, "food-search.db");

const USDA_URL =
  "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2026-04-30.zip";
const USDA_PATH = resolve(DATA_DIR, "usda-foundation.json");

const OFF_CSV_FILENAME = "en.openfoodfacts.org.products.csv";
const OFF_GZ_URL = `https://static.openfoodfacts.org/data/${OFF_CSV_FILENAME}.gz`;

// Columns we care about from the OFF CSV (0-indexed)
const COL = {
  code: 0,
  product_name: 10,
  brands: 18,
  categories_en: 23,
  countries_en: 41,
  serving_size: 50,
  energy_kcal_100g: 89,
  fat_100g: 92,
  carbohydrates_100g: 129,
  fiber_100g: 146,
  proteins_100g: 150,
} as const;

function log(msg: string) {
  console.log(`[setup-food-db] ${msg}`);
}

function parseFloat0(val: string | undefined): number {
  if (!val) return 0;
  const n = Number.parseFloat(val);
  return Number.isFinite(n) ? n : 0;
}

// ─── USDA ────────────────────────────────────────────────────────────────────

async function downloadUsda() {
  if (existsSync(USDA_PATH)) {
    log(`USDA data already exists at ${USDA_PATH}`);
    return;
  }

  log("Downloading USDA Foundation Foods...");
  const { execSync } = await import("node:child_process");
  const tmpZip = `/tmp/usda-${Date.now()}.zip`;
  execSync(`curl -fSL "${USDA_URL}" -o "${tmpZip}"`, { stdio: "inherit" });
  execSync(`unzip -o -j "${tmpZip}" "*.json" -d "${DATA_DIR}"`, {
    stdio: "inherit",
  });
  unlinkSync(tmpZip);

  // Rename to expected filename
  const { readdirSync } = await import("node:fs");
  const files = readdirSync(DATA_DIR).filter(
    (f) => f.endsWith(".json") && f !== "usda-foundation.json",
  );
  if (files.length > 0) {
    const { renameSync } = await import("node:fs");
    renameSync(resolve(DATA_DIR, files[0]), USDA_PATH);
  }
  log("USDA download complete.");
}

function importUsda(db: Database.Database) {
  log("Importing USDA Foundation Foods...");

  const raw = readFileSync(USDA_PATH, "utf-8");
  const parsed = JSON.parse(raw) as {
    FoundationFoods?: Array<{
      fdcId: number;
      description: string;
      foodNutrients: Array<{ nutrient: { id: number }; amount?: number }>;
    }>;
  };

  const rawFoods = parsed.FoundationFoods ?? (parsed as any);

  const insert = db.prepare(`
    INSERT INTO foods (source, name, brand, categories, country, serving_size, calories, protein, carbs, fat, fiber)
    VALUES ('usda', ?, '', '', '', '', ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    let count = 0;
    for (const f of rawFoods) {
      if (!f || !f.description) continue;
      const getNutrient = (id: number) =>
        f.foodNutrients?.find(
          (n: { nutrient: { id: number }; amount?: number }) =>
            n.nutrient.id === id,
        )?.amount ?? 0;

      insert.run(
        f.description,
        getNutrient(1008), // calories
        getNutrient(1003), // protein
        getNutrient(1005), // carbs
        getNutrient(1004), // fat
        getNutrient(1079), // fiber
      );
      count++;
    }
    return count;
  });

  const count = tx();
  log(`USDA: imported ${count} foods.`);
}

// ─── OpenFoodFacts ───────────────────────────────────────────────────────────

async function getOffCsvPath(): Promise<string> {
  // Check CWD first
  const cwdPath = resolve(process.cwd(), OFF_CSV_FILENAME);
  if (existsSync(cwdPath)) {
    log(`Found OFF CSV at ${cwdPath}`);
    return cwdPath;
  }

  // Check workspace root
  const rootPath = resolve(
    import.meta.dirname,
    "../../../../",
    OFF_CSV_FILENAME,
  );
  if (existsSync(rootPath)) {
    log(`Found OFF CSV at ${rootPath}`);
    return rootPath;
  }

  // Download
  const gzPath = resolve(DATA_DIR, `${OFF_CSV_FILENAME}.gz`);
  const csvPath = resolve(DATA_DIR, OFF_CSV_FILENAME);

  log(`Downloading OFF CSV from ${OFF_GZ_URL}...`);
  const res = await fetch(OFF_GZ_URL);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download OFF CSV: ${res.status}`);
  }

  // Stream to disk
  const writer = createWriteStream(gzPath);
  await pipeline(res.body as any, writer);
  log(`Downloaded ${(statSync(gzPath).size / 1e9).toFixed(2)} GB compressed.`);

  // Extract
  log("Extracting...");
  await pipeline(
    createReadStream(gzPath),
    createGunzip(),
    createWriteStream(csvPath),
  );
  unlinkSync(gzPath);
  log("Extraction complete.");

  return csvPath;
}

async function importOpenFoodFacts(db: Database.Database) {
  const csvPath = await getOffCsvPath();

  log("Importing OpenFoodFacts (streaming)...");

  const insert = db.prepare(`
    INSERT INTO foods (source, name, brand, categories, country, serving_size, calories, protein, carbs, fat, fiber)
    VALUES ('off', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const rl = createInterface({
    input: createReadStream(csvPath, { encoding: "utf-8" }),
    crlfDelay: Number.POSITIVE_INFINITY,
  });

  let lineNum = 0;
  let imported = 0;
  let skipped = 0;
  const BATCH_SIZE = 10_000;
  let batch: Array<() => void> = [];

  const flushBatch = db.transaction(() => {
    for (const fn of batch) fn();
  });

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) continue; // skip header

    const cols = line.split("\t");

    const name = cols[COL.product_name]?.trim();
    if (!name) {
      skipped++;
      continue;
    }

    const calories = parseFloat0(cols[COL.energy_kcal_100g]);
    // Skip products with no nutritional data at all
    if (calories === 0 && !cols[COL.proteins_100g] && !cols[COL.fat_100g]) {
      skipped++;
      continue;
    }

    const brand = cols[COL.brands]?.trim() ?? "";
    const categories = cols[COL.categories_en]?.trim() ?? "";
    const country = cols[COL.countries_en]?.trim() ?? "";
    const servingSize = cols[COL.serving_size]?.trim() ?? "";
    const protein = parseFloat0(cols[COL.proteins_100g]);
    const carbs = parseFloat0(cols[COL.carbohydrates_100g]);
    const fat = parseFloat0(cols[COL.fat_100g]);
    const fiber = parseFloat0(cols[COL.fiber_100g]);

    batch.push(() =>
      insert.run(
        name,
        brand,
        categories,
        country,
        servingSize,
        calories,
        protein,
        carbs,
        fat,
        fiber,
      ),
    );
    imported++;

    if (batch.length >= BATCH_SIZE) {
      flushBatch();
      batch = [];
      if (imported % 500_000 === 0) {
        log(`  ...${imported} rows imported`);
      }
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    flushBatch();
  }

  log(
    `OpenFoodFacts: imported ${imported} foods, skipped ${skipped} (no name or no nutrition).`,
  );

  // Clean up CSV if we downloaded it to data dir
  const dataLocalCsv = resolve(DATA_DIR, OFF_CSV_FILENAME);
  if (existsSync(dataLocalCsv)) {
    log("Removing downloaded CSV...");
    unlinkSync(dataLocalCsv);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Remove existing DB to rebuild fresh
  if (existsSync(DB_PATH)) {
    log("Removing existing database...");
    unlinkSync(DB_PATH);
  }

  log(`Creating database at ${DB_PATH}`);
  const db = new Database(DB_PATH);

  // Performance settings for bulk import
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = OFF");
  db.pragma("cache_size = -64000"); // 64MB cache during import
  db.pragma("mmap_size = 268435456"); // 256MB mmap

  // Create content table
  db.exec(`
    CREATE TABLE foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      name TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT '',
      categories TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      serving_size TEXT NOT NULL DEFAULT '',
      calories REAL NOT NULL DEFAULT 0,
      protein REAL NOT NULL DEFAULT 0,
      carbs REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      fiber REAL NOT NULL DEFAULT 0
    );
  `);

  // Create FTS5 virtual table
  // Column weights for BM25: name=10, brand=5, categories=2
  // This is applied at query time via bm25() function
  db.exec(`
    CREATE VIRTUAL TABLE foods_fts USING fts5(
      name,
      brand,
      categories,
      content=foods,
      content_rowid=id,
      tokenize='unicode61 remove_diacritics 2'
    );
  `);

  // Triggers to keep FTS in sync
  db.exec(`
    CREATE TRIGGER foods_ai AFTER INSERT ON foods BEGIN
      INSERT INTO foods_fts(rowid, name, brand, categories)
      VALUES (new.id, new.name, new.brand, new.categories);
    END;
  `);

  // Import data
  await downloadUsda();
  importUsda(db);
  await importOpenFoodFacts(db);

  // Optimize FTS index
  log("Optimizing FTS index...");
  db.exec(`INSERT INTO foods_fts(foods_fts) VALUES('optimize')`);

  // Set default rank to boost name heavily, brand moderately
  db.exec(
    `INSERT INTO foods_fts(foods_fts, rank) VALUES('rank', 'bm25(10.0, 5.0, 2.0)')`,
  );

  // Reset pragmas for normal operation
  db.pragma("synchronous = NORMAL");
  db.pragma("cache_size = -2000"); // 2MB default

  // Create index on country for Indonesia boost queries
  db.exec(`CREATE INDEX idx_foods_country ON foods(country)`);
  db.exec(`CREATE INDEX idx_foods_source ON foods(source)`);

  const totalRows = db.prepare("SELECT COUNT(*) as cnt FROM foods").get() as {
    cnt: number;
  };
  const dbSize = (statSync(DB_PATH).size / 1e6).toFixed(1);

  log(`Done! ${totalRows.cnt} total foods. DB size: ${dbSize} MB`);
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
