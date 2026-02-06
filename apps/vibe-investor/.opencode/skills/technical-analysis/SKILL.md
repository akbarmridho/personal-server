---
name: technical-analysis
description: Expert technical analysis for IDX stocks — Wyckoff methodology, support/resistance identification, price-volume analysis, entry/exit execution frameworks, and mplfinance chart generation with reference code.
---

## Data & Charting Tools

**`fetch-ohlcv`** — downloads 3 years of daily data to a file. Save to `work/` to avoid context explosion.

- **ticker**: 4 uppercase letters (e.g., "BBCA")
- **output_path**: e.g., `work/BBCA_ohlcv.json`
- If `fetch-ohlcv` returns an error, **STOP**. Do not retry or use alternative sources.

**Python libraries:** `pandas`, `numpy`, `mplfinance` for calculations and chart generation.

After generating a chart, **use Read tool to view the image**. Visual reasoning catches things code alone misses.

### OHLCV Data Schema

JSON array of daily records:

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | "YYYY-MM-DD" |
| `open`, `high`, `low`, `close` | int | Prices in IDR |
| `volume` | int | Shares traded |
| `foreignbuy`, `foreignsell` | int | Foreign flow values in IDR |
| `foreignflow` | int | Cumulative foreign flow |
| `frequency` | int | Number of transactions |
| `freq_analyzer` | float | Frequency analysis metric |
| `value` | int | Total trading value |
| `dividend` | int | Dividend amount (0 if none) |
| `shareoutstanding` | int | Outstanding shares |
| `soxclose` | int | Market cap at close |

Load with: `pd.read_json('work/BBCA_ohlcv.json')`

---

## Analysis Workflow

**Principle:** Generate chart → Read chart → Analyze → "What else do I need to see?" → Next view → Repeat until confident.

### Phase 1: Data Prep

Fetch data (`fetch-ohlcv`) → Load with pandas → Calculate indicators (swing points, MAs, ATR, S/R clusters, volume metrics) → Print summary

### Phase 2: Iterative Visual Analysis

| Chart | Timeframe | Purpose |
|-------|-----------|---------|
| Context | Full 2-3 years | Major trend, historical S/R, Wyckoff phase |
| Recent | 120-180 days | Current structure, recent S/R, volume patterns |
| Detail | 30-60 days (if needed) | Specific patterns (spring, climax, fakeout) |
| Volume Profile | As needed | VPVR, POC, volume anomalies |

For EACH chart: Generate → Read → Run checklist (below) → Decide if another view is needed.

### Phase 3: Red Flags Analysis

Systematically check all red flag categories (see section below).

### Phase 4: Synthesis

Answer these questions with evidence from charts:

1. **Structure**: What Wyckoff phase? Trend intact or broken?
2. **Levels**: Which S/R levels matter most? Confluence?
3. **Price Action**: Patterns detected (spring, climax, distribution, breakout)?
4. **Volume**: Confirming or contradicting price?
5. **Informed Money**: Signs of smart money activity? (context-dependent)
6. **Red Flags**: Warning signs detected?
7. **Overall Risk**: LOW/MEDIUM/HIGH/CRITICAL with reasoning
8. **Conflicts**: Where data contradicts visuals — which to trust and why?

---

## Module 1: Market Structure & Trend

### Wyckoff Phases

| Phase | Description | Who's Active |
|-------|-------------|--------------|
| **Accumulation** | Smart money buying. Sideways after downtrend. | Institutions BUY, Retail SELLS |
| **Markup** | Price rises, trend established. | Everyone joins |
| **Distribution** | Smart money selling. Sideways after uptrend. | Institutions SELL, Retail BUYS |
| **Markdown** | Price falls, supply > demand. | Retail left holding |

### Trend Definition

- **Uptrend**: HH + HL, price above MAs, trendline connecting HLs intact
- **Downtrend**: LH + LL, price below MAs, trendline connecting LHs intact
- **Sideways**: No clear HH/HL or LH/LL, MAs flatten and intertwine

### Swing Points (N=2)

| Term | Rule |
|------|------|
| Swing High | High > 2 candles on each side |
| Swing Low | Low < 2 candles on each side |

**Trend from swings:**

| Trend | Swing High Pattern | Swing Low Pattern |
|-------|-------------------|-------------------|
| Uptrend | Each SH > previous SH (HH) | Each SL > previous SL (HL) |
| Downtrend | Each SH < previous SH (LH) | Each SL < previous SL (LL) |

**Trend Break:**

- Uptrend breaks when price **closes below** most recent swing low
- Downtrend breaks when price **closes above** most recent swing high
- Wick/shadow alone is NOT confirmation — body must close beyond

### Moving Averages as Trend Filter

- Uptrend: MA = dynamic support (floor)
- Downtrend: MA = dynamic resistance (ceiling)
- Fast stocks: MA3/5/10 | Medium: MA20 | Slow: MA50
- Price above Dynamic MA = trend intact

### Trendlines

- Uptrend: connect 2+ swing lows → dynamic support
- Downtrend: connect 2+ swing highs → dynamic resistance
- Validity: 3+ touches > 2, moderate slope > steep, longer > shorter
- Break confirmed: price **closes** beyond + volume confirmation
- **Convergence Signal**: breaks both Dynamic MA AND trendline = strong signal

---

## Module 2: Levels (Support/Resistance)

### Identification Methods

**Method 1 — Swing Highs/Lows (Primary):**

- Recent swings (1-3 months) = stronger relevance
- Older swings (6+ months) valid if reaction was significant
- Larger bounce/rejection = stronger level

**Method 2 — Historical Significant Levels:**

- ATH, 52-week high/low, previous major peaks/troughs
- Valid if price reaction was significant and level hasn't been broken since

### VPVR (Volume Profile)

| Component | Description | S/R Role |
|-----------|-------------|----------|
| **POC** (Point of Control) | Highest traded volume price | Strongest S/R, price magnet |
| **HVN** (High Volume Node) | Heavy trading areas | Strong S/R, expect bounce |
| **LVN** (Low Volume Node) | Little trading activity | Fast movement zones, NOT S/R |
| **Value Area** | ~70% of volume range | Upper = resistance, Lower = support |

- HVN from below → expect resistance. HVN from above → expect support.
- Breakout through LVN often continues to next HVN.

### Level Strength by Test Count

| Tests | Strength | Notes |
|-------|----------|-------|
| 1st | Strongest | Untested = highest hold probability |
| 2nd | Strong | Still reliable |
| 3rd | Weakening | Exhausting |
| 4th+ | Weak | High break probability |

### Zones, Not Lines

S/R spans 1-3% of price. Zone width methods:

- Fixed: ±1-2% from level
- ATR-based: ±0.5 ATR
- Wick-based: body to wick extreme

### Volume on S/R

| Event | Volume | Interpretation |
|-------|--------|----------------|
| Bounce from support | HIGH | Valid bounce |
| Bounce from support | LOW | Weak, may retest |
| Break through S/R | HIGH | Valid break |
| Break through S/R | LOW | Likely fake break |

### Bandar Manipulation at S/R

Market makers push price below support to trigger retail stops, then buy cheap and reverse. S/R levels are **liquidity pools** for:

- Triggering stops to buy cheap (at support)
- Triggering FOMO to sell high (at resistance)

**Fake break signs:** Quick recovery, only wick breaks (body inside), no follow-through.

**Defense:** Buffer on stops, wait for daily close, check volume.

### Role Reversal

Broken support becomes resistance (and vice versa). Traders who bought at that level want to sell at breakeven → creates selling pressure.

### Fibonacci Retracement

**Key levels:** 23.6% (shallow), 38.2% (common), 50%, 61.8% (golden ratio), 78.6% (deep)

- Uptrend: measure low → high
- Downtrend: measure high → low
- Most powerful as **confluence** — Fib level + previous swing + round number = high probability zone
- **Extensions** for targets: 127.2%, 161.8%, 261.8%

---

## Module 3: Price Action & Patterns

### Price-Volume Matrix (Wyckoff)

| Price | Volume | Signal | Action |
|-------|--------|--------|--------|
| ↑ | ↑ | Strong Trend | Hold / Buy |
| ↓ | ↓ | Healthy Correction | Hold / Buy Dip |
| ↑ | ↓ | Weak Rally | Caution |
| ↓ | ↑ | **Distribution** | **EXIT** |

### Volume Anomaly: 70% Rule

If a stock reaches **70% of avg daily volume within the first hour** → major move imminent (breakout or dump). Transition to active monitoring.

### Accumulation Detection (Frequency)

When stock is **sideways + unusual frequency spikes persisting days/weeks** → big money accumulating. Conditions:

1. Price sideways (consolidation)
2. Previously quiet/illiquid
3. Activity persists (not just one day)
4. Confirm with broker summary if available

### Wyckoff Accumulation Phases

**Phase A — Stopping the Downtrend:**

| Event | Description | Volume |
|-------|-------------|--------|
| Preliminary Support (PS) | Large buyers step in | Increasing |
| Selling Climax (SC) | Panic selling, massive spike | Massive |
| Automatic Rally (AR) | Exhaustion bounce, defines range | Decreasing |
| Secondary Test (ST) | Returns to SC area | **Much lower than SC** |

**Phase B — Building the Cause:** Longest phase. Price oscillates in range. Institutions absorb supply. Frustrates retail (they exit).

**Phase C — The Spring:** Deliberate break below support on **LOW volume** → quick recovery → final shakeout before markup.

Spring valid when: support breaks on LOW volume → price recovers above support → followed by markup on increasing volume.

### Selling Climax (Bottom Anatomy)

1. Saturation of bad news
2. Price stops making new lows despite bad news
3. High volume without price drop (absorption)
4. Price breaks structure, then corrects on LOW volume

**"Bad News is Good"**: Stock hit with negative news → high-volume drop → sideways → refuses to drop further → supply absorbed, primed for reversal.

### Breakouts

| Type | Volume | Close | Follow-through | Verdict |
|------|--------|-------|----------------|---------|
| Real | HIGH (1.5x+) | Strong beyond level | Next day holds | Valid |
| Fake | Low/normal | Wick only, body inside | Immediately reverses | Trap |

**Entry options:** Aggressive (enter on breakout candle) vs Conservative (wait for retest).

---

## Module 4: Execution & Risk

### Entry Strategies

**A. Trend Following Breakout** — Buy strength when price breaks above key resistance/MAs with significant volume spike (>70% of daily avg in first hour).

**B. Pullback to Value** — Buy at demand areas in uptrend: support zones, Fib levels (38.2/50/61.8%), Dynamic MA. Confirm with volume on bounce.

**C. Wyckoff Spring** — Buy the shakeout: support breaks on LOW volume → quick recovery → enter on recovery back inside range.

### Position Sizing: 1% Risk Rule

```
Position Size = (Total Capital × 1%) / (Entry Price − Stop Loss)
```

- Initial entry: 30-70% of max size depending on conviction
- Average UP on winners, never average down on losers

### Exit Strategies

**A. Structural Exit** — Price closes below Dynamic MA AND breaks trendline. Do not sell just because price "feels high."

**B. Resistance/Extension Targets** — Sell partials (50%) at major resistance/Fib extensions, trail the rest.

**C. Volume Emergency** — Support breaks with HIGH volume (real supply) OR massive volume spike without price progress (churning) after rally.

### No Resistance Phase

When stock breaks ATH / clears all resistance:

- Do NOT guess a target. No overhead supply.
- Hold until trend structure breaks.
- Ignore "overvalued" commentary; price discovery is in effect.

### Entry/Exit Checklist

**Before Entry:**

- [ ] Trend confirmed (Price > MA)?
- [ ] Volume anomaly or smart money footprint?
- [ ] Max loss calculated (1% rule)?
- [ ] Buying breakout (strength) or valid bounce (value)?

**During Trade:**

- [ ] Price > Dynamic MA → HOLD
- [ ] Correction on low volume → HOLD
- [ ] Support/MA break on high volume → EXIT

---

## Analysis Checklist

For each chart, verify ALL applicable items:

**Structure (Module 1):**

- [ ] Wyckoff Phase: Accumulation/Markup/Distribution/Markdown?
- [ ] Trend: HH/HL (up)? LH/LL (down)? Mixed (sideways)?
- [ ] Last 5 swing points — rising or falling?
- [ ] Trend break: Close below last SL (up) or above last SH (down)?
- [ ] MA position: Above/below MA20, MA50? Distance?
- [ ] Valid trendline connecting 2+ swing points?

**Levels (Module 2):**

- [ ] Historical S/R: Major highs/lows acting as S/R
- [ ] Recent S/R: Cluster swing points from last 90 days
- [ ] VPVR: POC? HVNs?
- [ ] Zone width: ±3% or ±0.5 ATR around key levels
- [ ] Test count per level (1st=strongest, 4+=weak)
- [ ] Volume on bounces/rejections?
- [ ] Role reversal: Broken support now resistance?
- [ ] Fibonacci confluence?

**Price Action (Module 3):**

- [ ] Price-Volume Matrix (last 20 days): Strong/Correction/Weak Rally/Distribution?
- [ ] Volume anomalies: >1.5x or <0.5x average?
- [ ] Distribution signs: price flat/up at highs with high volume?
- [ ] Accumulation signs: sideways with increasing volume/frequency?
- [ ] Selling Climax: massive spike at lows + stability?
- [ ] Spring: fake break below support on LOW volume + quick recovery?
- [ ] Breakout validation: close beyond level with HIGH volume?
- [ ] Bandar trap: wick break below support with immediate recovery?

---

## Red Flags

### Categories

**1. MA Breakdown:**

- Below MA5 (short-term momentum lost)
- Below MA10 (short-term broken)
- Below MA20 (medium-term broken)
- Near/below MA50 (long-term at risk)
- MAs bearishly aligned (MA5 < MA10 < MA20 declining)

**2. Trend Structure Failure:**

- LH instead of HH
- LL instead of HL
- Closed below recent swing low
- Failed to make new highs after peak

**3. Volume & Distribution:**

- Distribution day (price down + volume >1.2x)
- Weak recovery after distribution
- Volume declining on rallies
- High volume at peaks without progress (churning)
- Volume spike with no price movement (absorption)

**4. Support & Resistance:**

- Support tested 3+ times (weakening)
- Broken support acting as resistance
- Far from resistance, close to support (asymmetric risk)
- No clear nearby support (free-fall risk)

**5. Position Risk:**

- Distance to stop < 5%
- Underwater with deteriorating structure

**Severity:** LOW / MEDIUM / HIGH / CRITICAL with specific evidence.

### Informed Money Signals

When distribution appears near peaks without obvious news:

- Smart money exiting before announcement
- Institutional selling to retail
- Front-running upcoming events

**Patterns:** Distribution days near highs, churning, weak bounces after distribution, frequency/volume spikes at resistance.

**Context matters:** In speculative plays (MSCI, merger) → highly suspicious. In established trends → may be normal profit-taking. After parabolic rallies → often marks smart money exit.

---

## Output Report Structure

**A. Header** — Ticker, date, price, data range, position status, intent (ENTRY/HOLD/EXIT/SCREENING)

**B. Quick Assessment** — Trend status, MA position, volume pattern, overall risk level

**C. Key Levels** — Top 3 resistance zones, top 3 support zones, **stop loss (MANDATORY)**

**D. Risk Assessment** — Red flags by category with severity/evidence, informed money signals (if applicable), overall risk (LOW/MED/HIGH/CRITICAL), scenario analysis, risk mitigation, critical warnings

**E. Action** — BUY/HOLD/SELL/WAIT/EXIT with rationale, conditions that change recommendation, mandatory stop loss

**F. Detailed Analysis** (context-dependent) — ENTRY: zones/sizing/checklist | HOLD: status/assessment | EXIT: urgency/options

**G. Charts** — List all generated chart files with purpose

---

## Reference Code

### Indicators

```python
# Moving Averages
for n in [5, 10, 20, 50]:
    df[f'MA{n}'] = df['close'].rolling(n).mean()

# ATR
high, low, close = df['high'], df['low'], df['close']
prev_close = close.shift(1)
tr = pd.concat([
    (high - low).abs(),
    (high - prev_close).abs(),
    (low - prev_close).abs()
], axis=1).max(axis=1)
df['ATR14'] = tr.rolling(14).mean()

# Swing Points (N=2)
n = 2
swing_high = True
for i in range(1, n+1):
    swing_high &= (df['high'] > df['high'].shift(i))
    swing_high &= (df['high'] > df['high'].shift(-i))
df['swing_high'] = df['high'].where(swing_high)

swing_low = True
for i in range(1, n+1):
    swing_low &= (df['low'] < df['low'].shift(i))
    swing_low &= (df['low'] < df['low'].shift(-i))
df['swing_low'] = df['low'].where(swing_low)
```

### S/R Clustering

```python
def cluster_levels(levels, tolerance=0.03):
    if len(levels) == 0:
        return []
    clusters = []
    for level in sorted(set(levels), reverse=True):
        if not any(abs(level - c) / c < tolerance for c, _, _ in clusters):
            touches = sum(1 for x in levels if abs(x - level) / level < tolerance)
            strength = "UNTESTED" if touches == 1 else "STRONG" if touches >= 2 else "WEAK"
            clusters.append((level, touches, strength))
    return clusters

recent = df.tail(90)
resistances = cluster_levels(recent[recent['swing_high'].notna()]['swing_high'].values)
supports = cluster_levels(recent[recent['swing_low'].notna()]['swing_low'].values)
```

### Trend Detection

```python
lookback = 5
highs = df[df['swing_high'].notna()]['swing_high'].tail(lookback).values
lows = df[df['swing_low'].notna()]['swing_low'].tail(lookback).values

if len(highs) >= 2 and len(lows) >= 2:
    higher_highs = all(highs[i] >= highs[i-1] for i in range(1, len(highs)))
    higher_lows = all(lows[i] >= lows[i-1] for i in range(1, len(lows)))
    lower_highs = all(highs[i] <= highs[i-1] for i in range(1, len(highs)))
    lower_lows = all(lows[i] <= lows[i-1] for i in range(1, len(lows)))

    if higher_highs and higher_lows: trend = "UPTREND"
    elif lower_highs and lower_lows: trend = "DOWNTREND"
    else: trend = "SIDEWAYS"
```

### Price-Volume Classification (Wyckoff)

```python
avg_vol_20 = df['volume'].rolling(20).mean()
df['vol_ratio'] = df['volume'] / avg_vol_20
df['chg'] = df['close'].pct_change()

def classify_pv(row):
    vol_high = row['vol_ratio'] > 1.2
    vol_low = row['vol_ratio'] < 0.8
    if row['chg'] > 0 and vol_high: return "STRONG_UP"
    elif row['chg'] < 0 and vol_low: return "HEALTHY_CORRECTION"
    elif row['chg'] > 0 and vol_low: return "WEAK_RALLY"
    elif row['chg'] < 0 and vol_high: return "DISTRIBUTION"
    else: return "NEUTRAL"

df['pv_signal'] = df.apply(classify_pv, axis=1)
```

### Red Flags Detection

```python
def analyze_red_flags(df, current_price, user_entry=None, stop_loss=None):
    flags = []
    if current_price < df['MA20'].iloc[-1]:
        flags.append({'category': 'Structure', 'signal': 'Below MA20', 'severity': 'HIGH',
            'evidence': f"Price {current_price} < MA20 {df['MA20'].iloc[-1]:.1f}"})
    if current_price < df['MA50'].iloc[-1]:
        flags.append({'category': 'Structure', 'signal': 'Below MA50', 'severity': 'CRITICAL',
            'evidence': "Long-term trend compromised"})
    recent_highs = df[df['swing_high'].notna()]['swing_high'].tail(3).values
    if len(recent_highs) >= 2 and recent_highs[-1] < recent_highs[-2]:
        flags.append({'category': 'Structure', 'signal': 'Lower highs',
            'severity': 'HIGH', 'evidence': f"{recent_highs[-1]:.0f} < {recent_highs[-2]:.0f}"})
    recent = df.tail(20)
    dist_days = recent[(recent['chg'] < -0.03) & (recent['vol_ratio'] > 1.2)]
    if len(dist_days) > 0:
        flags.append({'category': 'Volume', 'signal': f'Distribution ({len(dist_days)} days)',
            'severity': 'HIGH', 'evidence': "High volume selling"})
    if user_entry and current_price < user_entry:
        loss_pct = (current_price - user_entry) / user_entry * 100
        flags.append({'category': 'Position', 'signal': 'Underwater',
            'severity': 'MEDIUM' if loss_pct > -10 else 'HIGH',
            'evidence': f"Down {loss_pct:.1f}%"})
    if stop_loss:
        distance = abs((current_price - stop_loss) / current_price * 100)
        if distance < 5:
            flags.append({'category': 'Position', 'signal': 'Close to stop',
                'severity': 'HIGH', 'evidence': f"{distance:.1f}% to stop at {stop_loss}"})
    return flags
```

### Informed Money Analysis

```python
def analyze_informed_money(df, context=None):
    signals = []
    recent = df.tail(30)
    recent_high = recent['high'].max()
    high_idx = df.index.get_loc(recent['high'].idxmax())
    days_since_peak = len(df) - high_idx - 1
    if days_since_peak <= 10:
        near_peak = recent[recent['high'] > recent_high * 0.95]
        if len(near_peak) > 0 and near_peak['vol_ratio'].mean() > 1.3:
            signals.append({'type': 'Peak Distribution',
                'evidence': f"High volume ({near_peak['vol_ratio'].mean():.1f}x) near high"})
    dist_days = recent[(recent['chg'] < -0.03) & (recent['vol_ratio'] > 1.2)]
    if len(dist_days) >= 2:
        signals.append({'type': 'Persistent Distribution',
            'evidence': f'{len(dist_days)} distribution days'})
    if len(dist_days) > 0:
        last_dist = dist_days.index[-1]
        days_after = len(df) - df.index.get_loc(last_dist) - 1
        if days_after >= 2:
            recovery = df.loc[last_dist:].iloc[1:min(days_after+1, 4)]
            if len(recovery) >= 2:
                gain = (recovery['close'].iloc[-1] - recovery['close'].iloc[0]) / recovery['close'].iloc[0]
                if gain < 0.03:
                    signals.append({'type': 'Weak Recovery',
                        'evidence': f'Only {gain*100:.1f}% bounce after distribution'})
    return signals
```

### Volume Profile (VPVR)

```python
def calculate_volume_profile(df, bins=50):
    price_range = np.linspace(df['low'].min(), df['high'].max(), bins+1)
    vol_by_price = np.zeros(bins)
    for _, row in df.iterrows():
        low_idx = np.searchsorted(price_range, row['low']) - 1
        high_idx = np.searchsorted(price_range, row['high']) - 1
        if low_idx == high_idx:
            vol_by_price[max(0, low_idx)] += row['volume']
        else:
            price_span = row['high'] - row['low']
            for i in range(max(0, low_idx), min(bins, high_idx + 1)):
                overlap = min(price_range[i+1], row['high']) - max(price_range[i], row['low'])
                if overlap > 0:
                    vol_by_price[i] += row['volume'] * (overlap / price_span)
    poc_idx = np.argmax(vol_by_price)
    poc_price = (price_range[poc_idx] + price_range[poc_idx + 1]) / 2
    total_vol = vol_by_price.sum()
    sorted_indices = np.argsort(vol_by_price)[::-1]
    cum_vol, va_prices = 0, []
    for idx in sorted_indices:
        cum_vol += vol_by_price[idx]
        va_prices.append((price_range[idx] + price_range[idx+1]) / 2)
        if cum_vol >= total_vol * 0.70: break
    hvn_threshold = np.percentile(vol_by_price, 80)
    hvns = [(price_range[i] + price_range[i+1]) / 2 for i in np.where(vol_by_price >= hvn_threshold)[0]]
    return {'poc': poc_price, 'va_high': max(va_prices), 'va_low': min(va_prices), 'hvns': hvns[:5]}
```

### Fibonacci

```python
def fibonacci_levels(swing_high, swing_low, trend='uptrend'):
    diff = swing_high - swing_low if trend == 'uptrend' else swing_low - swing_high
    base = swing_low if trend == 'uptrend' else swing_high
    return {f'{r*100}%': base + diff * r for r in [0, 0.382, 0.5, 0.618, 1.0]}
```

### Stop Loss

```python
structural_stop = nearest_support * 0.98  # Buffer for manipulation
atr_stop = current_price - (atr * 2)      # ATR-based
# Choose based on context — the stop marks where your thesis is invalidated
```

### Charts (mplfinance)

```python
import mplfinance as mpf

style = mpf.make_mpf_style(base_mpf_style='yahoo', gridstyle=':', rc={'font.size': 8})

# Chart 1: Context (full history)
alines, colors = [], []
for level in swing_highs[:5]:
    alines.append([(plot_df.index[0], level), (plot_df.index[-1], level)]); colors.append('red')
for level in swing_lows[:5]:
    alines.append([(plot_df.index[0], level), (plot_df.index[-1], level)]); colors.append('green')

mpf.plot(plot_df, type='candle', volume=True, style=style,
    alines=dict(alines=alines, colors=colors, linewidths=[0.8]*len(colors), linestyle='--'),
    title=f'{ticker} Full Context',
    savefig=dict(fname=f'work/{ticker}_context.png', dpi=150, bbox_inches='tight'))

# Chart 2: Recent (150 days)
plot_recent = plot_df.tail(150)
apds = [
    mpf.make_addplot(plot_recent['MA20'], color='orange', width=1.5),
    mpf.make_addplot(plot_recent['MA50'], color='red', width=1.5)
]
mpf.plot(plot_recent, type='candle', volume=True, style=style, addplot=apds,
    alines=dict(alines=alines, colors=colors, linewidths=[0.8]*len(colors), linestyle='--'),
    title=f'{ticker} Recent',
    savefig=dict(fname=f'work/{ticker}_recent.png', dpi=150, bbox_inches='tight'))

# Chart 3: Detail (zoom into critical period)
detail_df = df.loc['2025-12-01':].copy()
markers_h = detail_df['swing_high'].dropna()
markers_l = detail_df['swing_low'].dropna()
apds = [
    mpf.make_addplot(detail_df['MA20'], color='orange', width=1),
    mpf.make_addplot(detail_df['MA50'], color='red', width=1),
    mpf.make_addplot(markers_h, type='scatter', markersize=50, color='red', marker='v'),
    mpf.make_addplot(markers_l, type='scatter', markersize=50, color='green', marker='^')
]
mpf.plot(detail_df, type='candle', volume=True, style=style, addplot=apds,
    title=f'{ticker} Detail',
    savefig=dict(fname=f'work/{ticker}_detail.png', dpi=150, bbox_inches='tight'))
```

**All patterns are context-dependent.** Distribution in a speculative play = suspicious. In a mature stock = normal profit-taking. Use these as tools, not rigid rules.
