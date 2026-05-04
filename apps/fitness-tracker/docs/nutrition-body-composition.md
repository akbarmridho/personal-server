# Body Composition Tracking — Extension to Nutrition Tracker

> This extends the Telegram nutrition tracker defined in `nutrition-tracker-plan.md`.
> Bot entry point remains the same single bot with an additional command.

---

## Overview

Garmin and Liftosaur only track **weight + body fat %**.
The InBody 270 scan captures **10+ detailed metrics** (muscle mass, visceral fat, segmental breakdown).

This module adds:

- `/measure` — log a full body composition scan
- `/progress` — compare against previous scan, show deltas
- Automatic tracking of all InBody metrics over time

---

## InBody Metrics to Track

| Field | Unit | From Scan | Normal Range (User) | User's Value |
|-------|------|-----------|---------------------|--------------|
| **weight** | kg | Weight | — | 72.8 |
| **body_fat_pct** | % | PBF (Percent Body Fat) | — | 34.0 |
| **body_fat_mass** | kg | Body Fat Mass | 7.5–14.9 | 24.7 |
| **skeletal_muscle_mass** | kg | SMM | — | 26.8 |
| **visceral_fat_level** | level (1-20) | Visceral Fat Level | Low (<10) | 10 |
| **bmr** | kcal | Basal Metabolic Rate | 1573–1840 | 1408 |
| **total_body_water** | L | Total Body Water | 34.9–42.7 | 35.1 |
| **bmi** | kg/m² | BMI | 18.5–25.0 | 25.8 |
| **waist_hip_ratio** | ratio | Waist-Hip Ratio | <0.90 | 0.89 |
| **fat_free_mass** | kg | Fat Free Mass | 47.5–58.1 | 48.1 |
| **smi** | kg/m² | SMI (Skeletal Muscle Index) | — | 7.4 |

---

## Commands

### `/weight` — Quick Weight Log

For daily/weekly weigh-ins. No LLM, no parsing overhead.

```
User: /weight 71.5

Bot:  ✅ Weight logged: 71.5 kg (today)

      Previous: 72.8 kg (Apr 26) → -1.3 kg ✅

User: /weight 71.2 2026-05-10

Bot:  ✅ Weight logged: 71.2 kg (May 10)

      Previous: 71.5 kg (May 4) → -0.3 kg ✅
      Trend (30 days): 72.8 → 71.2 (-1.6 kg total)
```

**Behavior:**

- Parse directly in code: first token = number, optional second token = date
- No LLM call — fast, cheap
- Save to `WeightLog` table
- Reply with delta from previous entry + optional mini trend (last 7 or 30 days)
- One entry per date — upsert

### `/weight` without args — Show Weight History

```
User: /weight

Bot:  📉 Weight History

      May 10   71.2 kg   -0.3 ✅
      May 4    71.5 kg   -1.3 ✅
      Apr 26   72.8 kg   —

      Trend: -1.6 kg since Apr 26
```

### `/measure` — Log a Full Body Composition Scan

Accepts **text or photo** (or both). The primary input method is a photo of the InBody result sheet — the LLM extracts all values via vision.

**Photo mode** (primary):

```
User: /measure [photo of InBody printout]

LLM reads values from photo via vision, returns structured data.
Bot saves and replies with confirmation + deltas.
```

**Text mode** (fallback):

```
User: /measure
      Weight: 72.8, SMM: 26.8, PBF: 34%, Visceral: 10, BMR: 1408

Bot:  ✅ Body composition logged for 2026-04-26

      Weight:          72.8 kg
      SMM:             26.8 kg
      Body Fat %:      34.0%
      Visceral Fat:    10       (⚠️ Over threshold)
      BMR:             1408 kcal

      Previous: 2026-04-26 (first scan)
```

**Behavior:**

- If photo attached: send image to LLM with vision, extract all metrics from the InBody printout
- If text only: parse free-form input with LLM (single call, structured output)
- If both: use both as context for the LLM call
- Save to `Measurement` table
- Reply with all values + comparison to previous scan (if exists)
- One measurement per date — upsert (overwrite if same date)

### `/progress` — Show Changes Over Time

```
User: /progress

Bot:  📊 Body Composition Progress

      Metric              Apr 26      Change
      ──────────────────────────────────────
      Weight              72.8 kg     —
      SMM                 26.8 kg     —
      Body Fat %          34.0%       —
      Body Fat Mass       24.7 kg     —
      Visceral Fat        10          —

      💡 First scan. Log your next scan to see progress!
```

After second scan:

```
Bot:  📊 Body Composition Progress

      Metric              Apr 26   Jul 15   Change
      ────────────────────────────────────────────
      Weight              72.8  →  70.2    -2.6 kg  ✅
      SMM                 26.8  →  27.4    +0.6 kg  ✅
      Body Fat %          34.0  →  31.2    -2.8%    ✅
      Body Fat Mass       24.7  →  21.4    -3.3 kg  ✅
      Visceral Fat        10    →  8       -2       ✅

      ⭐ All metrics improved! Keep going.
```

**Behavior:**

- Show current vs most recent previous scan
- Weight shown from `WeightLog` if no `Measurement` for that date — always current
- Sort metrics by "impact" (weight, SMM, body fat %, visceral fat)
- Emoji indicators: ✅ improved, ⚠️ worsened, ➖ no change

---

## Database Schema Addition

```prisma
model WeightLog {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime @db.Date
  weight    Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, date])
  @@index([userId, date])
}

model Measurement {
  id                    String   @id @default(cuid())
  userId                String   // Telegram user ID
  date                  DateTime @db.Date

  // Core metrics
  weight                Float
  bodyFatPct            Float
  bodyFatMass           Float?
  skeletalMuscleMass    Float?
  visceralFatLevel      Int?
  bmr                   Int?

  // Additional InBody metrics
  totalBodyWater        Float?
  bmi                   Float?
  waistHipRatio         Float?
  fatFreeMass           Float?
  smi                   Float?

  // Metadata
  source                String   @default("manual") // "manual" | "inbody_photo" | "garmin"
  notes                 String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([userId, date])
  @@index([userId, date])
}
```

**Notes:**

- `WeightLog` is for frequent weigh-ins (daily/weekly). `Measurement` is for full scans (every 2-3 months).
- `WeightLog` has no LLM, no parsing — direct number input only.
- `Measurement` uses LLM to parse free-form text or photo of InBody printout (vision).
- Both tables have `@@unique([userId, date])` — one entry per day, upsert.
- `Measurement` fields except `weight` and `bodyFatPct` are optional — partial scans allowed.
- `source` tracks origin: `"manual"` (text input), `"inbody_photo"` (photo OCR), `"garmin"` (future).

---

## Implementation

### Files to Add

```
src/
├── bodycomp/
│   ├── weight.ts         # /weight handler: parse number → save → reply with delta + trend
│   ├── measure.ts        # /measure handler: parse input via LLM → save → reply
│   ├── progress.ts       # /progress handler: fetch scans → compute deltas → format reply
│   └── parser.ts         # LLM prompt to parse free-form measurement text
```

### `/weight` Flow

```
User sends: /weight 71.5

Bot:
1. Parse in code: extract number (kg), optional date
2. Upsert into WeightLog (userId + date)
3. Fetch previous entry (most recent before this date)
4. Fetch last 7 entries for mini trend
5. Reply: current weight + delta + optional trend line
```

### `/measure` Flow

```
User sends: /measure <text and/or photo of InBody printout>

Bot:
1. Extract text and/or photo from message
2. Build LLM call with vision support:
   - If photo: send image to LLM, extract all metrics from the InBody printout
   - If text: parse free-form input
   - If both: use both as context
3. Call LLM → structured JSON response
4. Upsert into Measurement table (userId + date)
5. Fetch previous scan (most recent before this date)
6. Format reply with current values + deltas
```

### `/progress` Flow

```
Bot:
1. Fetch all measurements for user, ordered by date

2. If only 1 scan:
   - Show values + "Log your next scan to see progress!"

3. If 2+ scans:
   - Take latest and most recent previous
   - Compute delta for each field
   - Format table with ✅/⚠️ indicators
   - Add motivational summary line
```

---

## Integration with Nutrition Tracker

Body composition data lives in the **same database** as meals/favorites.

The bot is a single Grammy instance with all commands:

- `/log`, `/today`, `/week`, `/month`, `/history`, `/fav`, `/unfav`
- `/measure`, `/progress`

**No cross-command intelligence** (by design):

- `/progress` doesn't mention diet or workouts
- `/today` doesn't reference body composition
- Each command is independent — simple, predictable

---

## Garmin Connect Sync

When the user logs weight via `/weight` or `/measure`, the bot also syncs the weight entry to **Garmin Connect** so the Garmin dashboard stays up to date.

**Why:** Garmin only stores weight + body fat %. The bot stores the full InBody data. But weight is the common metric — keep it in sync.

**How:** The bot shells out to a Python script using [`garminconnect`](https://github.com/cyberjunky/python-garminconnect).

```
User: /weight 71.5

Bot:
1. Save 71.5 kg to WeightLog (local DB)
2. Reply instantly: "✅ Weight logged: 71.5 kg"
3. Fire-and-forget: spawn Python script to sync to Garmin
```

### Python Sync Script

```python
# scripts/sync_garmin_weight.py
import sys
from datetime import datetime
from garminconnect import Garmin

email = sys.argv[1]
password = sys.argv[2]
weight = float(sys.argv[3])      # kg
date = sys.argv[4]               # YYYY-MM-DD

client = Garmin(email, password)
client.login()

# Garmin expects weight in grams
weight_g = int(weight * 1000)

client.add_weigh_in(weight_g, unit_key="kg", date=date)
print(f"Synced {weight} kg to Garmin for {date}")
```

### Node.js Integration

```typescript
import { spawn } from 'child_process';

function syncGarminWeight(weight: number, date: string) {
  const python = spawn('python', [
    'scripts/sync_garmin_weight.py',
    process.env.GARMIN_EMAIL!,
    process.env.GARMIN_PASSWORD!,
    String(weight),
    date,
  ]);

  python.stdout.on('data', (data) => console.log(`Garmin sync: ${data}`));
  python.stderr.on('data', (data) => console.error(`Garmin sync error: ${data}`));
  // Fire-and-forget — don't await, don't block reply
}
```

### Environment Variables

```
GARMIN_EMAIL=your@email.com
GARMIN_PASSWORD=yourpassword
```

### Behavior

| Scenario | Action |
|----------|--------|
| `/weight 71.5` | Save locally + sync weight to Garmin |
| `/measure` (includes weight) | Save locally + sync weight to Garmin |
| Garmin sync fails | Log error, don't notify user, don't retry |
| No Garmin credentials set | Skip sync silently |

**Note:** Only **weight** syncs to Garmin. Body fat %, SMM, visceral fat, etc. are bot-only. Garmin doesn't have fields for them.

---

## Future Enhancements (Post-MVP)

1. **Garmin Scale Import** — auto-import weight/body fat % from Garmin → bot (reverse direction)
2. **Trend Graphs** — mini ASCII sparklines in bot replies (no external charts)
3. **Goal Setting** — user sets targets (SMM, body fat %), `/progress` shows distance to goal
4. **Notification** — bot reminds user to re-scan every 2-3 months

---

## References

- **Main Plan:** `nutrition-tracker-plan.md`
- **InBody 270:** <https://inbody.com/products/inbody270/>
- **User's Scan:** `measurements/2026-04-26.jpeg`
