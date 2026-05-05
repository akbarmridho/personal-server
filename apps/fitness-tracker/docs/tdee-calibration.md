# TDEE Calibration & Protein Insights

Future feature: use weight trend + Garmin activity data + workout history to detect systematic logging bias, provide macro targets, and surface actionable fitness insights.

## Data Sources

| Source | Location | Key Fields |
|--------|----------|------------|
| Food logs | Postgres `meals` table | calories, protein_g, carbs_g, fat_g per meal |
| Weight & body comp | Postgres `measurements` table | weight, skeletal_muscle_mass, body_fat_pct, fat_free_mass |
| Garmin daily stats | InfluxDB `DailyStats` | activeKilocalories, bmrKilocalories, totalSteps, activeSeconds |
| Garmin activities | InfluxDB `Activity` | activityType, duration, calories |
| Garmin sleep | InfluxDB `SleepSummary` | sleepTimeSeconds, sleepScore, avgOvernightHrv |
| Garmin HRV | InfluxDB `HRV` | weeklyAvg, hrvStatus |
| Garmin body composition | InfluxDB `BodyComposition` | weight, bodyFat, muscleMass |
| Liftosaur | Export/API (TBD) | exercises, sets, reps, weight, volume, progression |

InfluxDB is accessible from the nutrition bot container at `fitness_influxdb:8086` on the `personal_network`.

## Part 1: Calorie & Macro Target Calculation

### BMR Estimation

Use Katch-McArdle when body fat % is available (from `/measure`), Mifflin-St Jeor as fallback:

```
Katch-McArdle:  BMR = 370 + 21.6 × lean_mass_kg
                lean_mass_kg = weight × (1 - body_fat_pct / 100)

Mifflin-St Jeor: BMR = 10w + 6.25h - 5a + 5  (male)
                  BMR = 10w + 6.25h - 5a - 161 (female)
```

### TDEE

```
TDEE = BMR × activity_multiplier

Activity multiplier derived from Garmin data:
- sedentarySeconds / totalDaySeconds → sedentary ratio
- activeKilocalories / bmrKilocalories → activity factor

Mapping:
  1.2  sedentary (desk job, <5k steps)
  1.4  lightly active (5-8k steps, 1-2 sessions/week)
  1.6  moderately active (8-12k steps, 3-4 sessions/week)
  1.8  very active (12k+ steps, 5-6 sessions/week)
  2.0  extra active (physical job + daily training)
```

Instead of static multiplier, compute from actual Garmin data:
`activity_multiplier = (activeKilocalories + bmrKilocalories) / bmrKilocalories` averaged over 7 days.

### Daily Calorie Target

```
target_calories = TDEE + adjustment
adjustment = weeklyChangeKg × 7700 / 7

Examples:
  Lose 0.5kg/week: adjustment = -550 kcal/day
  Maintain: adjustment = 0
  Gain 0.25kg/week: adjustment = +275 kcal/day
```

### Macro Targets

| Macro | Formula | Reference |
|-------|---------|-----------|
| Protein | 1.6-2.2 g/kg by activity level; +0.2 g/kg during cut (Helms et al 2014) | Higher end for strength athletes, lower for endurance |
| Fat | 0.6 g/kg body weight (floor) | Hormonal health minimum |
| Carbs | Remainder: `(target_cal - protein×4 - fat×9) / 4` | Auto-balanced from leftover calories |

Protein target by context:

- Sedentary: 0.8-1.0 g/kg
- Endurance training: 1.2-1.6 g/kg
- Strength training (bulk): 1.6-2.0 g/kg
- Strength training (cut): 1.8-2.2 g/kg

## Part 1: Calorie Calibration

### Principle

```
Calories In - Calories Out = Weight Change
```

If we know logged intake and actual weight change, we can detect if logging is systematically off.

### Algorithm

1. Collect 14+ days of continuous food logging
2. Compute smoothed weight trend (linear regression over daily weigh-ins to filter water noise)
3. Calculate actual daily surplus/deficit:
   - `weight_change_kg_per_day × 7700 = actual_surplus_kcal_per_day`
4. Get Garmin TDEE estimate: `activeKilocalories + bmrKilocalories` (averaged over same period)
5. Compare:
   - `expected_surplus = avg_logged_intake - avg_garmin_tdee`
   - `actual_surplus = weight_trend × 7700`
   - `correction_factor = actual_surplus / expected_surplus`
6. If correction factor consistently > 1.0 → user is underlogging
7. If correction factor consistently < 1.0 → user is overlogging

### Output

Show the user something like:

> Based on 3 weeks of data: your logged intake averages 1,950 kcal/day, but your weight trend suggests actual intake is ~2,250 kcal/day (+15%). Consider that portions may be larger than estimated.

Or apply silently as a multiplier to future LLM estimates.

### Caveats

- Needs 2-3 weeks minimum (water weight noise)
- Gaps in logging break the calculation
- Garmin TDEE is itself ±15-25% off — use it as a cross-check, not ground truth
- Exercise variation adds noise (use weekly averages, not daily)
- The algorithm self-corrects: it doesn't need Garmin TDEE to be accurate, only weight + intake

## Part 2: Protein & Body Composition Insights

### Principle

Protein adequacy can't be directly measured like calories (no "protein scale"). But skeletal muscle mass trends + training data provide a lagging indicator.

### Signals

| Signal | Source | Interpretation |
|--------|--------|----------------|
| Avg daily protein (g/kg) | Postgres meals + weight | Is intake in the 1.6-2.2g/kg range for muscle building? |
| Strength training frequency | InfluxDB Activity (type=strength_training) | Are they training enough to stimulate growth? |
| SMM trend (4-8 weeks) | Postgres measurements.skeletal_muscle_mass | Is muscle actually growing? |
| Sleep quality | InfluxDB SleepSummary.sleepScore | Recovery adequate? |
| Weight trend direction | Postgres measurements.weight | Surplus (bulk) or deficit (cut)? |

### Logic

```
IF training ≥ 3x/week AND protein ≥ 1.6g/kg AND SMM declining:
  → "Protein may be overestimated, or recovery is insufficient (check sleep)"

IF training ≥ 3x/week AND protein < 1.2g/kg AND SMM flat:
  → "Protein intake likely limiting muscle growth. Target 1.6-2.0g/kg."

IF protein ≥ 1.6g/kg AND training ≥ 3x/week AND SMM increasing:
  → "On track. Current protein intake supports muscle growth."

IF in caloric deficit AND protein < 1.8g/kg:
  → "During a cut, higher protein (1.8-2.2g/kg) helps preserve muscle."
```

### Output

Weekly/monthly insight:

```
📊 Protein & Body Composition (last 4 weeks)

Avg protein: 95g/day (1.3g/kg at 73kg)
Strength sessions: 3.2/week
SMM trend: +0.2kg
Weight trend: +0.4kg
Avg sleep score: 72

Assessment: Protein intake is below optimal for your training volume.
Target for lean gain: 1.6-2.0g/kg → aim for 117-146g/day.
```

### Caveats

- SMM from bioimpedance scales (InBody, etc.) has ±1-2kg measurement noise
- Need 4-8 weeks of SMM data for a meaningful trend
- Protein quality (leucine content, complete vs incomplete) isn't tracked
- This is a coaching nudge, not a mathematical correction like calories

## Implementation Notes

- New command: `/insights` or `/calibrate`
- Query InfluxDB via HTTP API from the nutrition bot (same Docker network)
- Minimum data requirements before showing insights:
  - Calorie calibration: 14 days of logging + 5+ weight measurements
  - Protein insights: 4 weeks of logging + 2+ SMM measurements + activity data
- Could also surface as a weekly automated message (scheduled job)

## Part 3: Future Data Insights

Cross-referencing all data sources (nutrition, Garmin, body comp, Liftosaur) opens up deeper analysis:

### Recovery & Performance Correlation

| Insight | Data Used | Question Answered |
|---------|-----------|-------------------|
| Sleep vs training performance | Garmin sleep score + Liftosaur volume/progression | Does poor sleep correlate with missed reps or stalled lifts? |
| HRV trend vs training load | Garmin HRV + Liftosaur weekly volume | Is HRV dropping when volume is too high? (overreaching signal) |
| Nutrition timing vs recovery | Meal timestamps + sleep score next night | Does eating late affect sleep quality? |
| Protein timing vs muscle gain | Meal protein distribution + SMM trend | Does protein distribution across meals matter for your body? |

### Training Insights (with Liftosaur data)

| Insight | Logic |
|---------|-------|
| Volume-matched calorie needs | Training days with high volume (sets × reps × weight) → flag if calorie intake was low that day |
| Progressive overload vs nutrition | If lifts are stalling AND calories are at deficit → suggest maintenance phase |
| Deload detection | If Liftosaur shows reduced volume for a week → adjust TDEE estimate down (less activity) |
| Muscle group recovery | Time between same-muscle sessions + sleep quality → flag if recovery is likely insufficient |

### Body Recomposition Tracking

| Metric | Calculation | Insight |
|--------|-------------|---------|
| Fat-free mass index (FFMI) | `FFM / height_m²` | Track muscle development relative to frame size |
| Rate of lean gain | `ΔSMM / weeks` | Is muscle gain rate realistic? (0.1-0.25kg/week for intermediates) |
| Fat:muscle gain ratio | `ΔfatMass / ΔSMM` during bulk | Ratio > 1:1 suggests surplus is too aggressive |
| Estimated body fat from weight | If no recent scan: `(weight - last_known_FFM) / weight × 100` | Rough BF% between scans |

### Lifestyle & Habit Patterns

| Insight | Data Used |
|---------|-----------|
| Step count vs calorie accuracy | Days with high steps → Garmin TDEE more reliable; low step days → more sedentary error |
| Stress vs overeating | Garmin stress score + daily calorie intake | Does high stress correlate with higher intake? |
| Weekend vs weekday patterns | Day-of-week analysis on calories, protein, steps | Surface "you eat 300 kcal more on weekends" |
| Consistency score | % of days with complete logging (meals + weight) | Gamification / accountability |

### Periodization Awareness

If Liftosaur data shows training phases (hypertrophy → strength → deload):

```
Hypertrophy phase: suggest slight surplus (+200-300 kcal), protein at 2.0g/kg
Strength phase: suggest maintenance calories, protein at 1.8g/kg  
Deload week: reduce calorie target (less activity expenditure)
Cut phase: increase protein to 2.0-2.2g/kg, deficit at -500 kcal
```

### Data Integration Plan (Liftosaur)

Liftosaur stores workout data locally. Options to get it into the system:

1. Export CSV/JSON periodically and import into Postgres
2. If Liftosaur has an API or cloud sync — query directly
3. Manual: user pastes workout summary to bot, LLM extracts structured data

Priority: start with CSV export → scheduled import script → Postgres `workouts` table with:

- date, exercise_name, sets, reps, weight_kg, volume (sets×reps×weight), rpe
