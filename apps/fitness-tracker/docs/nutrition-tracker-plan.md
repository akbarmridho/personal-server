# Nutrition Tracker — Telegram Bot (TypeScript)

> Personal calorie & macro tracker. Snap a photo, describe what you ate, get nutrition estimates. All via Telegram.

---

## Overview

| Aspect | Decision |
|--------|----------|
| **Input** | Telegram: `/log` command with text, photo, or both. Text-only is the primary flow. |
| **AI** | LLM Vision API (Claude/GPT) for food recognition + estimation |
| **Database** | PostgreSQL (structured meals, favorites) |
| **Language** | TypeScript (Node.js) |
| **Bot Framework** | Grammy (modern Telegram bot framework for TS) |
| **ORM** | Prisma |
| **Dashboard** | Grafana (connect to PG) |
| **Hosting** | Self-hosted or cheap VPS (~$5/month) |

---

## Architecture

```
User (Telegram)
  │
  ├─ /log [photo and/or text]
  │  (text-only, photo-only, or both)
  │
  ▼
Telegram Bot (Grammy, TypeScript)
  │
  ├─ Parse message: extract photo, text
  ├─ Fetch user's favorites from PG (<30 items)
  │
  ▼
LLM (single call — does EVERYTHING)
  │
  ├─ Receives: system prompt + favorites list + user text + photo
  ├─ Matches favorite? → returns exact saved numbers
  ├─ New food? → estimates from knowledge + photo
  ├─ Multiple items? → splits into line items (mixed fav + estimated)
  ├─ "save as X" detected? → includes save flag in response
  ├─ Datetime override? → includes parsed time in response
  ├─ Output: structured JSON
  │
  ▼
Bot: parse JSON response
  │
  ├─ Save meal to PostgreSQL
  ├─ Save favorite if flagged
  │
  ▼
Bot Reply → formatted summary
  │
  ▼
Grafana Dashboard (reads PG) → daily/weekly trends
```

No traditional matching code. No external API calls. No fuzzy search.
One LLM call per `/log`. The LLM is the matching engine, estimator, and parser — everything.

External food databases (OpenFoodFacts, USDA, etc.) are **not used**.
The LLM already knows nutrition data for common foods from training data.
For packaged foods, the user either: (a) photos the nutrition label, or (b) saves it as a favorite after first estimation.

---

## Commands

| Command | What |
|---------|------|
| `/log [text/photo]` | Log a meal — LLM estimates or matches favorite |
| `/today` | Today's calorie + macro summary |
| `/week` | This week's daily breakdown |
| `/month` | Last 4 weeks, aggregated per week |
| `/fav` | List saved favorites |
| `/unfav [name]` | Delete a favorite |

Retrieval and analysis beyond these commands is done conversationally via LLM (just query the PG tables).

---

## Features (MVP)

### Must Have
- [ ] `/log` — receive text, photo, or both via Telegram
- [ ] Single LLM call per `/log` — handles everything: favorite matching, estimation, datetime parsing, save-as detection
- [ ] Inject user's favorites into LLM prompt context before each call
- [ ] Store meal in PostgreSQL (calories, protein, carbs, fat)
- [ ] Reply with formatted summary (per-item breakdown + totals)
- [ ] Default timestamp = message time; LLM parses overrides ("lunch yesterday", "breakfast 8am")
- [ ] "save as [name]" → LLM detects, bot saves to FavoriteFood table
- [ ] `/today` — today's total calories + macros
- [ ] `/week` — this week's daily breakdown
- [ ] `/month` — this month's daily breakdown
- [ ] `/fav` — list saved favorites
- [ ] `/unfav [name]` — delete a favorite
- [ ] `/history YYYY-MM-DD` — specific date lookup
- [ ] `/weight` — quick daily weigh-in (no LLM)
- [ ] `/measure` — log full body composition scan (InBody data)
- [ ] `/progress` — body composition changes over time

Body composition tracking is defined in `nutrition-body-composition.md`.

---

## Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Meal {
  id          Int      @id @default(autoincrement())
  telegramId  String   @map("telegram_id")
  loggedAt    DateTime @default(now()) @map("logged_at")
  mealTime    DateTime @map("meal_time")
  description String?
  photoFileId String?  @map("photo_file_id")
  calories    Float?
  proteinG    Float?   @map("protein_g")
  carbsG      Float?   @map("carbs_g")
  fatG        Float?   @map("fat_g")
  fiberG      Float?   @map("fiber_g")
  items       Json?    // [{name, calories, protein_g, carbs_g, fat_g, fiber_g, portion}]
  rawLlm      Json?    @map("raw_llm") // full LLM response for debugging
  source      String   @default("llm") // "llm" or "favorite"

  @@map("meals")
}

model FavoriteFood {
  id          Int      @id @default(autoincrement())
  telegramId  String   @map("telegram_id")
  name        String   // display name: "FM Boneless Crispy Chicken"
  alias       String   // shorthand: "famiciki"
  calories    Float
  proteinG    Float    @map("protein_g")
  carbsG      Float    @map("carbs_g")
  fatG        Float    @map("fat_g")
  fiberG      Float?   @map("fiber_g")
  portion     String?  // "1 piece", "1 bungkus"
  createdAt   DateTime @default(now()) @map("created_at")

  @@unique([telegramId, alias])
  @@map("favorite_foods")
}
```

---

## LLM Prompt Strategy

### System Prompt

The LLM does ALL the work: matching favorites, estimating new foods, parsing datetime overrides, detecting "save as" commands.

```
You are a nutrition estimation assistant specializing in Indonesian food.

Given a photo and/or text description of a meal, estimate the nutritional content.

## User's Saved Foods (Favorites)
{{FAVORITES_LIST}}

## Rules
- If user input matches a saved food (by name or alias), use the EXACT saved numbers. Do not re-estimate.
- If user input does NOT match any saved food, estimate from your knowledge and/or the photo.
- One message can contain multiple items — split them into separate line items.
- Some items may match favorites while others need estimation. Handle both in one response.
- Account for portion modifiers: "x2", "half", "setengah", "double" — multiply the numbers.
- Use standard Indonesian portion sizes (1 porsi nasi = ~180g cooked rice = ~250 kcal).
- Account for cooking method: goreng (fried) adds ~50-100 kcal vs rebus (boiled).
- For drinks, always estimate sugar content (teh manis = ~100 kcal, kopi susu = ~80 kcal).
- If photo is unclear, rely more on text description.

## Datetime Override
- If user mentions a time or date ("lunch yesterday", "breakfast 8am", "dinner 2 days ago"), parse it.
- Return the parsed datetime in meal_time field.
- If no override, set meal_time to null (bot will use message timestamp).

## Save as Favorite
- If user says "save as [name]", set save_as to that name.
- Otherwise, set save_as to null.

## Response JSON (strict, no markdown wrapping)
{
  "items": [
    {
      "name": "string",
      "portion": "string (e.g. '1 porsi', '1 potong', '200ml')",
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "fiber_g": number,
      "source": "favorite" | "estimated"
    }
  ],
  "meal_time": "ISO 8601 string" | null,
  "save_as": "string" | null,
  "notes": "string (optional)"
}
```

Totals are calculated by the bot (sum of items), not by the LLM.

### Favorites Injection

Before each LLM call, fetch the user's favorites from PG and inject into the prompt:

```typescript
const favorites = await prisma.favoriteFood.findMany({
  where: { telegramId: userId },
});

const favoritesText = favorites.length > 0
  ? favorites.map(f =>
      `- ${f.alias}: ${f.calories} kcal P:${f.proteinG}g C:${f.carbsG}g F:${f.fatG}g (${f.portion ?? 'standard'})`
    ).join('\n')
  : 'No saved foods yet.';

// Replace {{FAVORITES_LIST}} in system prompt with favoritesText
```

### Cost Per Call

Depends on model choice. With a cheap model (Gemini Flash, Haiku, GPT-4o-mini), expect ~$0.50-3/month for ~90 calls (3 meals/day).

---

## Food Databases & Integration

### Strategy: LLM with Tool Use

The LLM decomposes dishes into basic ingredients, then uses tools to look up reference nutrition data. This gives the LLM verified per-100g values to calculate from, instead of guessing from memory.

Example flow:
```
User: /log nasi goreng ayam

LLM thinks: "nasi goreng = fried rice + chicken + oil + egg + seasoning"
LLM calls: search_usda("rice, white, cooked")     → 130 kcal/100g, P:2.7g, C:28g, F:0.3g
LLM calls: search_usda("chicken, fried")           → 260 kcal/100g, P:27g, C:8g, F:14g
LLM calls: search_usda("vegetable oil")            → 884 kcal/100g, P:0g, C:0g, F:100g
LLM estimates portions: rice 180g, chicken 80g, oil 10ml
LLM calculates total from reference × portions
```

For packaged Indonesian products:
```
User: /log [photo of Indomie Goreng]

LLM calls: search_openfoodfacts("Indomie Mi Goreng") → exact label data
LLM returns exact numbers from label
```

### Data Source 1: USDA Foundation Foods (In-Memory)

| Aspect | Detail |
|--------|--------|
| **What** | Lab-analyzed basic ingredients (rice, chicken, egg, oil, vegetables, etc.) |
| **Quality** | Gold standard — USDA lab-verified, updated April/October each year |
| **Size** | ~6.5MB JSON (April 2026), ~459KB zipped |
| **Download** | https://fdc.nal.usda.gov/download-datasets.html → Foundation Foods JSON |
| **Integration** | Download once, load into memory at boot, search with MiniSearch |
| **Good for** | Basic ingredients that LLM decomposes dishes into |
| **Not good for** | Indonesian dishes, packaged products, brand names |

#### In-Memory Search: MiniSearch

| Library | Why |
|---------|-----|
| **minisearch** | 982k weekly downloads, zero deps, TypeScript, fuzzy + prefix search, BM25 ranking |

```typescript
import MiniSearch from 'minisearch';

// Load USDA Foundation Foods at boot
const usdaFoods = JSON.parse(fs.readFileSync('data/usda-foundation.json', 'utf-8'));

const usdaIndex = new MiniSearch({
  fields: ['description'],
  storeFields: ['description', 'calories', 'protein', 'carbs', 'fat', 'fiber'],
  searchOptions: {
    fuzzy: 0.2,
    prefix: true,
  },
});

usdaIndex.addAll(usdaFoods);

// LLM tool: search_usda
function searchUsda(query: string, limit = 5) {
  return usdaIndex.search(query, { limit });
}
```

### Data Source 2: OpenFoodFacts Indonesia (REST API)

| Aspect | Detail |
|--------|--------|
| **What** | Crowdsourced packaged food database — barcodes, nutrition labels |
| **Quality** | Variable (crowdsourced) but uses actual nutrition labels. Good for Indonesian packaged products (Indomie, Ultramilk, etc.) |
| **API** | `https://id.openfoodfacts.org/cgi/search.pl` or `https://world.openfoodfacts.org/api/v2/search` |
| **Rate limit** | Official: 10 req/min for search. We'll use 8 req/min to be safe. |
| **Integration** | REST API call, rate-limited with p-throttle |
| **Good for** | Indonesian packaged products, brand-name foods, barcode lookup |
| **Not good for** | Warung food, home cooking, unpackaged food |

#### Rate Limiting: p-throttle

```typescript
import pThrottle from 'p-throttle';

const throttle = pThrottle({
  limit: 8,
  interval: 60_000, // 8 requests per 60 seconds
});

const searchOpenFoodFacts = throttle(async (query: string, limit = 5) => {
  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
  url.searchParams.set('search_terms', query);
  url.searchParams.set('search_simple', '1');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page_size', String(limit));
  url.searchParams.set('cc', 'id'); // Indonesia
  url.searchParams.set('fields', 'product_name,nutriments,brands');

  const res = await fetch(url.toString());
  const data = await res.json();
  return data.products?.map((p: any) => ({
    name: p.product_name,
    brand: p.brands,
    calories: p.nutriments?.['energy-kcal_100g'],
    protein: p.nutriments?.proteins_100g,
    carbs: p.nutriments?.carbohydrates_100g,
    fat: p.nutriments?.fat_100g,
    fiber: p.nutriments?.fiber_100g,
  })) ?? [];
});
```

### LLM Tool Definitions

The LLM receives two tools it can call during `/log` processing:

```typescript
const tools = [
  {
    name: 'search_usda',
    description: 'Search USDA Foundation Foods database for basic ingredient nutrition data (per 100g). Use this for raw/basic ingredients like rice, chicken, egg, oil, vegetables, fruits, etc. Returns lab-verified nutrition values.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Ingredient name in English (e.g. "rice white cooked", "chicken breast raw", "soybean oil")' },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_openfoodfacts',
    description: 'Search OpenFoodFacts for packaged/branded food products, especially Indonesian products. Use this for brand-name items like Indomie, Ultramilk, Pocari Sweat, etc. Returns nutrition label data per 100g.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Product name or brand (e.g. "Indomie Mi Goreng", "Ultramilk Chocolate", "Pocari Sweat")' },
      },
      required: ['query'],
    },
  },
];
```

### When Each Tool Is Used

| Food Type | Tool | Example |
|-----------|------|---------|
| Basic ingredient | `search_usda` | rice, chicken, egg, tempe, tofu, oil |
| Indonesian dish (decomposed) | `search_usda` (multiple calls) | nasi goreng → rice + chicken + oil + egg |
| Packaged product | `search_openfoodfacts` | Indomie, Ultramilk, Yakult |
| Photo with nutrition label | Neither — LLM reads the label directly | Back of package photo |
| Unknown warung food | Neither — LLM estimates from knowledge | Random warteg dish |
| Favorite | Neither — exact numbers from DB | "famiciki" |

### Hidden Calorie Awareness

The LLM system prompt includes reminders about commonly underestimated calorie sources:

```
## Hidden Calorie Reminders
- Cooking oil: 1 tablespoon = ~120 kcal. Goreng (fried) dishes use 1-3 tbsp.
- Santan (coconut milk): 1 cup = ~550 kcal. Rendang, gulai, sayur lodeh all use it.
- Sambal with oil: 1 tablespoon = ~50-80 kcal.
- Salad dressing / mayo: 1 tablespoon = ~90-100 kcal.
- Teh manis / es teh: 2-3 tablespoons sugar = ~100-150 kcal.
- Kecap manis: 1 tablespoon = ~70 kcal.
- Nasi: most warung portions are 200-250g cooked, not 100g.
Always account for cooking oil and sauces when estimating fried or sauced dishes.
```

### Multiple Images Support

One `/log` can include multiple photos. Telegram supports sending multiple photos as a media group.

| Scenario | How It Works |
|----------|-------------|
| Photo of food + photo of nutrition label | LLM sees both: identifies food from first, reads exact data from label |
| Photo of bento + photo of separate drink | LLM identifies multiple items across images |
| Multiple dishes in one order | LLM splits into separate line items |

The bot collects all photos from a media group message, encodes them, and sends all to the LLM in a single call.

### Accuracy With Tools vs Without

| Method | Expected Error |
|--------|---------------|
| LLM alone (text only) | ±20-30% |
| LLM + photo | ±15-25% |
| **LLM + USDA tool (decomposed ingredients)** | **±10-15%** |
| **LLM + OpenFoodFacts (packaged product)** | **±5-10%** |
| **LLM + nutrition label photo** | **±2-5%** |
| Favorite (exact saved numbers) | 0% (by definition) |

---

## Existing Open Source References

Projects to study for patterns (not to fork — they're Python or different stack):

| Project | Language | Stack | What to Learn |
|---------|----------|-------|---------------|
| **EatCount-Bot** | **TypeScript** | Grammy, Prisma, PostgreSQL, OpenAI, FatSecret | **Closest to our stack.** Study structure, Grammy patterns, Prisma schema. |
| **Calorie-Counter-AI** | Python | Aiogram, OpenRouter, Whisper | Photo analysis prompt engineering, 3D volume estimation |
| **MealMetrics** | Python | python-telegram-bot, Gemini, SQLite | Confirm/cancel flow, daily summaries |
| **Intake API** | TypeScript | NestJS, MongoDB, OpenAI | Structured JSON output validation, "AI behind strict boundary" pattern |
| **KCALM** | Unknown | Telegram bot (commercial) | UX patterns: `/today`, `/week`, `/history`, correction flow |
| **n8n Nutrition Tracker** | n8n workflow | Telegram + Gemini + Google Sheets | Simple flow: photo → LLM → store → reply |

**Key repo:** https://github.com/GopkoDev/EatCount-Bot — TypeScript, Grammy, Prisma, PostgreSQL, OpenAI. Almost exactly our stack. Study this first.

---

## Project Structure

```
nutrition/
├── src/
│   ├── bot/
│   │   ├── index.ts              # Grammy bot setup, middleware
│   │   ├── handlers/
│   │   │   ├── log.ts            # /log — core handler: build prompt → LLM (with tools) → save → reply
│   │   │   ├── commands.ts       # /today, /week, /month, /history, /fav, /unfav
│   │   │   └── callback.ts       # Inline button callbacks (OK/Delete)
│   │   └── keyboards.ts          # Inline keyboards
│   ├── llm/
│   │   ├── analyzer.ts           # Build full prompt (system + favorites + user input), call LLM with tools, parse response
│   │   ├── prompts.ts            # System prompt template
│   │   └── tools.ts              # Tool definitions (search_usda, search_openfoodfacts)
│   ├── search/
│   │   ├── usda.ts               # Load USDA Foundation Foods JSON, build MiniSearch index, search function
│   │   └── openfoodfacts.ts      # OpenFoodFacts REST API client, p-throttle rate limiting
│   ├── db/
│   │   ├── meals.ts              # Meal CRUD operations
│   │   ├── favorites.ts          # Favorite CRUD (simple get/insert/delete)
│   │   └── stats.ts              # Aggregation queries (daily/weekly/monthly totals)
│   ├── utils/
│   │   └── format.ts             # Format bot reply messages
│   └── index.ts                  # Entry point
├── data/
│   └── usda-foundation.json      # USDA Foundation Foods dataset (downloaded once, ~6.5MB)
├── prisma/
│   └── schema.prisma
├── .env.example
├── package.json
├── tsconfig.json
└── docker-compose.yml            # PostgreSQL + bot (optional)
```

---

## Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| **Runtime** | Node.js 20+ | TypeScript native support |
| **Bot Framework** | Grammy | Modern, TypeScript-first, well-documented, active community |
| **ORM** | Prisma | Type-safe, great DX, migrations built-in |
| **Database** | PostgreSQL | Structured data, Grafana-compatible, free (local/Supabase) |
| **LLM** | Anthropic Claude / Google Gemini / OpenAI | Vision + structured output + tool use |
| **In-Memory Search** | MiniSearch | BM25 ranking, fuzzy + prefix, zero deps, 982k weekly downloads |
| **Rate Limiting** | p-throttle | Throttle OpenFoodFacts API calls (8 req/min) |
| **Dashboard** | Grafana | Free, connects to PG, good for time-series nutrition data |

---

## Cost Estimate (Monthly)

| Component | Cost |
|-----------|------|
| LLM API (~3 meals/day × 30 days = 90 calls) | ~$1-3 (Claude Haiku) or ~$0.50 (Gemini Flash) |
| PostgreSQL | Free (local, Supabase free tier, or Neon free tier) |
| Grafana | Free (self-hosted or Grafana Cloud free tier) |
| Telegram Bot API | Free |
| VPS (if needed) | ~$5/month (or run locally / on existing server) |
| **Total** | **~$1-8/month (~Rp16k-130k)** |

---

## Accuracy Expectations

| Input Type | Expected Error | Notes |
|------------|---------------|-------|
| Photo only (no text) | ±30-40% | LLM guesses portion size, cooking method |
| **Photo + text description** | **±15-25%** | **This is the default workflow** |
| Photo + text + database cross-ref | ±10-20% | Post-MVP with seeded Indonesian food table |
| Text only (no photo) | ±20-30% | Depends on description detail |

### Tips to Improve Accuracy (In Bot Welcome Message)
- Include a spoon/fork in frame for scale
- Mention portion: "1 porsi", "setengah"
- Mention cooking method: "goreng", "rebus", "bakar"
- Mention drinks separately: "teh manis", "es jeruk"

## Inline Buttons & Callbacks

Every `/log` response includes inline buttons. Meal is **saved immediately** — buttons are for correction only.

| Button | Action |
|--------|--------|
| **✅ OK** | ACK — removes buttons from message. Data already saved. |
| **🗑 Delete** | Deletes meal from DB. Edits message to "🗑 Deleted." Removes buttons. |

Callback data format: `ok:{mealId}` and `delete:{mealId}`.

---

## Error Handling

### LLM Errors

LLM response must be valid JSON. If it fails (malformed JSON, timeout, API error), the bot should:

1. **Not save anything** to DB
2. **Reply with a clear error message** to the user
3. **Include the raw error** for debugging (truncated if too long)

```
User: /log asdfghjkl

Bot:  ❌ Couldn't process that.
      Reason: LLM could not identify any food items.
      Try again with a clearer description or photo.
```

```
User: /log [blurry photo, no text]

Bot:  ❌ Couldn't process that.
      Reason: Photo too unclear and no text description provided.
      Try adding a text description of what you ate.
```

```
User: /log nasi goreng

Bot:  ❌ Something went wrong.
      Reason: LLM API timeout. Please try again.
```

### LLM Structured Output — Error Schema

The LLM prompt should include an error response format:

```json
{
  "error": true,
  "reason": "string — human-readable explanation",
  "items": []
}
```

Bot checks `response.error` first. If true, forward `reason` to user. Don't save to DB.

### Other Error Cases

| Error | Bot Response |
|-------|-------------|
| `/log` with no text and no photo | "❌ Send a food description, photo, or both." |
| `/unfav` with unknown name | "❌ No favorite found with that name." |
| DB connection failure | "❌ Database error. Please try again later." |
| Callback on already-deleted meal | Silently ignore or "Already deleted." |

---

### 1. Log a Meal (LLM Estimation)

```
User: /log [photo of nasi padang] nasi padang ayam rendang, teh manis

Bot:  🍽 Logged — May 3, 13:06
      ─────────────────────
      Nasi putih 1 porsi     250 kcal  P:5g  C:53g  F:0g  Fi:1g
      Ayam rendang 1 potong  350 kcal  P:25g C:8g   F:22g Fi:1g
      Sayur daun singkong    80 kcal   P:4g  C:10g  F:2g  Fi:3g
      Teh manis 1 gelas      100 kcal  P:0g  C:25g  F:0g  Fi:0g
      ─────────────────────
      Total: 780 kcal | P:34g C:96g F:24g Fi:5g

      [✅ OK]  [🗑 Delete]
```

Meal is saved to DB immediately. Buttons:
- **OK** — removes the buttons (ACK). Data already saved, nothing else happens.
- **Delete** — deletes the meal from DB, updates message to show "🗑 Deleted."

### 2. Log + Save as Favorite

```
User: /log [photo of FM chicken] fm boneless crispy chicken, save as famiciki

Bot:  🍽 Logged — May 3, 14:30
      ─────────────────────
      FM Boneless Crispy Chicken  280 kcal  P:18g C:15g F:16g Fi:0g
      ─────────────────────
      ⭐ Saved as "famiciki"

      [✅ OK]  [🗑 Delete]
```

### 3. Log from Favorite (No LLM, Instant)

```
User: /log famiciki

Bot:  🍽 Logged (⭐) — May 5, 12:00
      ─────────────────────
      famiciki: 280 kcal  P:18g C:15g F:16g Fi:0g
      ─────────────────────

      [✅ OK]  [🗑 Delete]
```

### 4. Log Multiple Items (Mixed)

```
User: /log famiciki, teh manis

Bot:  🍽 Logged — May 5, 12:00
      ─────────────────────
      famiciki (⭐)            280 kcal  P:18g C:15g F:16g Fi:0g
      Teh manis 1 gelas        100 kcal  P:0g  C:25g F:0g  Fi:0g
      ─────────────────────
      Total: 380 kcal | P:18g C:40g F:16g Fi:0g

      [✅ OK]  [🗑 Delete]
```

### 5. Text-Only (No Photo)

```
User: /log nasi goreng ayam, es jeruk

Bot:  🍽 Logged — May 3, 19:00
      ─────────────────────
      Nasi goreng ayam 1 porsi  450 kcal  P:15g C:58g F:16g Fi:2g
      Es jeruk 1 gelas          120 kcal  P:0g  C:30g F:0g  Fi:0g
      ─────────────────────
      Total: 570 kcal | P:15g C:88g F:16g Fi:2g

      [✅ OK]  [🗑 Delete]
```

### 6. Backfill

```
User: /log breakfast yesterday, 2 eggs and toast

Bot:  🍽 Logged — May 2, 08:00 (backfilled)
      ...
```

### 7. Check Today

```
User: /today

Bot:  📊 Today — May 3
      ─────────────────────
      13:06  Nasi padang       780 kcal  P:34g C:96g  F:24g Fi:5g
      14:30  famiciki (⭐)     280 kcal  P:18g C:15g  F:16g Fi:0g
      19:00  Nasi goreng       570 kcal  P:15g C:88g  F:16g Fi:2g
      ─────────────────────
      Total: 1630 kcal | P:67g C:199g F:56g Fi:7g
```

### 8. Check Week

```
User: /week

Bot:  📊 This Week
      ─────────────────────
      Mon   1630 kcal  P:67g  C:199g F:56g Fi:7g
      Tue   1820 kcal  P:95g  C:210g F:52g Fi:12g
      Wed   — not logged —
      Thu   1540 kcal  P:88g  C:175g F:48g Fi:9g
      Fri   (today so far) 450 kcal  P:15g  C:58g  F:16g Fi:2g
      ─────────────────────
      Avg:  1663 kcal  P:83g C:195g F:52g Fi:9g
```

### 9. Check Month (Last 4 Weeks)

```
User: /month

Bot:  📊 Last 4 Weeks
      ─────────────────────
      Apr 7 – Apr 13:   avg 1680 kcal  P:78g  C:200g F:50g Fi:8g  (4/7 days logged)
      Apr 14 – Apr 20:  avg 1750 kcal  P:92g  C:195g F:55g Fi:11g (5/7 days logged)
      Apr 21 – Apr 27:  avg 1540 kcal  P:85g  C:180g F:48g Fi:9g  (6/7 days logged)
      Apr 28 – May 4:   avg 1630 kcal  P:67g  C:199g F:56g Fi:7g  (3/7 days, current)
      ─────────────────────
      Overall avg: 1650 kcal  P:81g C:194g F:52g Fi:9g
```

Weeks are Monday-anchored. Current week runs from this Monday to today (future days not counted).

### 10. Manage Favorites

```
User: /fav

Bot:  ⭐ Your favorites:
      1. famiciki — 280 kcal P:18g C:15g F:16g Fi:0g
      2. indomie-goreng — 380 kcal P:8g C:52g F:14g Fi:2g

User: /unfav famiciki

Bot:  🗑 Removed "famiciki" from favorites.
```

---

## Implementation Order

| Phase | What | Effort |
|-------|------|--------|
| **1. Scaffold** | Init project, Grammy bot, Prisma schema, PG connection | ~1 hour |
| **2. Data Sources** | Download USDA Foundation Foods, build MiniSearch index, OpenFoodFacts client with p-throttle | ~1.5 hours |
| **3. Core Loop** | `/log` — build prompt (system + favorites + input + photos) → LLM with tools (search_usda, search_openfoodfacts) → parse JSON → save to PG → reply with OK/Delete buttons | ~3.5 hours |
| **4. Commands** | `/today`, `/week`, `/month`, `/history`, `/fav`, `/unfav` | ~2 hours |
| **5. Polish** | Error handling, multi-image media group support, edge cases | ~1.5 hours |
| **6. Deploy** | Docker compose or VPS setup | ~1 hour |
| **Total MVP** | | **~11 hours** |
| **7. Grafana** | Connect PG, build daily/weekly panels | ~1 hour |

---

## Environment Variables

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nutrition

# LLM (pick one)
ANTHROPIC_API_KEY=sk-ant-...
# or
OPENAI_API_KEY=sk-...
# or
GOOGLE_AI_API_KEY=...

# LLM Config
LLM_PROVIDER=anthropic  # anthropic | openai | google
LLM_MODEL=claude-sonnet-4-20250514  # or gpt-4o-mini or gemini-2.0-flash

# Optional
GRAFANA_URL=http://localhost:3000
```

---

## References

- **EatCount-Bot (TypeScript, Grammy, Prisma, PG):** https://github.com/GopkoDev/EatCount-Bot
- **Intake API (TypeScript, NestJS, OpenAI):** https://github.com/bohdan-strilets/Intake-api
- **Calorie-Counter-AI (Telegram, Vision):** https://github.com/oleksandr-g-rock/Calorie-Counter-AI
- **MealMetrics (Telegram, Gemini):** https://github.com/mrx-arafat/MealMetrics
- **OpenFoodFacts API:** https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/
- **OpenFoodFacts Indonesia:** https://id.openfoodfacts.org/
- **Panganku.org (Indonesian Food Composition):** https://www.panganku.org/
- **NutriNusa (Indonesian Food Database):** https://nutrinusa.id/
- **Kaggle Indonesian Food Dataset:** https://www.kaggle.com/datasets/anasfikrihanif/indonesian-food-and-drink-nutrition-dataset
- **USDA FoodData Central API:** https://fdc.nal.usda.gov/api-guide
- **Grammy (Telegram Bot Framework):** https://grammy.dev/
- **Prisma ORM:** https://www.prisma.io/
- **KCALM Telegram Bot (commercial reference):** https://www.kcalm.app/
- **ShotMeal (commercial reference):** https://shotmeal.io/

OTHER: https://github.com/apoorvdarshan/fud-ai