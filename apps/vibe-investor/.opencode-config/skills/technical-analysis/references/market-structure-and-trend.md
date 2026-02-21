# Market Structure And Trend

## Wyckoff Phase Lens

- Accumulation: sideways after decline with absorption behavior
- Markup: trend expansion and broad participation
- Distribution: sideways after rise with supply emergence
- Markdown: declining structure and weak demand

## Balance/Imbalance Model

- Balance: price accepted inside value area
- Imbalance: repricing after acceptance loss

Operating rules:

- In balance, trade extremes instead of range midpoint.
- In imbalance, prioritize continuation unless failure is confirmed.
- Breakout acceptance requires close, follow-through, and supporting volume.

## Trend Definitions

- Uptrend: HH and HL sequence
- Downtrend: LH and LL sequence
- Sideways: mixed swings with flattening moving averages

## Swing-Point Logic (N=2)

- Swing high: higher than 2 bars on each side
- Swing low: lower than 2 bars on each side

Trend-break confirmation requires closing break beyond recent swing level; wick-only breaks are insufficient.

## Moving Averages And Trendlines

- MA as dynamic support in uptrends, dynamic resistance in downtrends
- Typical stack: MA5/10 for fast, MA20 medium, MA50 slower trend
- Trendline break quality improves with close confirmation plus volume support
- Confluence break (trendline plus MA) increases signal strength

## Reference Code

### Indicators, ATR, and Swing Points

```python
df = df_daily.copy()
df['datetime'] = pd.to_datetime(df['datetime'])
df = df.set_index('datetime').sort_index()

for n in [5, 10, 20, 50]:
    df[f'MA{n}'] = df['close'].rolling(n).mean()

high, low, close = df['high'], df['low'], df['close']
prev_close = close.shift(1)
tr = pd.concat([
    (high - low).abs(),
    (high - prev_close).abs(),
    (low - prev_close).abs()
], axis=1).max(axis=1)
df['ATR14'] = tr.rolling(14).mean()

n = 2
swing_high = True
for i in range(1, n + 1):
    swing_high &= (df['high'] > df['high'].shift(i))
    swing_high &= (df['high'] > df['high'].shift(-i))
df['swing_high'] = df['high'].where(swing_high)

swing_low = True
for i in range(1, n + 1):
    swing_low &= (df['low'] < df['low'].shift(i))
    swing_low &= (df['low'] < df['low'].shift(-i))
df['swing_low'] = df['low'].where(swing_low)
```

### Trend Detection

```python
lookback = 5
highs = df[df['swing_high'].notna()]['swing_high'].tail(lookback).values
lows = df[df['swing_low'].notna()]['swing_low'].tail(lookback).values

if len(highs) >= 2 and len(lows) >= 2:
    higher_highs = all(highs[i] >= highs[i - 1] for i in range(1, len(highs)))
    higher_lows = all(lows[i] >= lows[i - 1] for i in range(1, len(lows)))
    lower_highs = all(highs[i] <= highs[i - 1] for i in range(1, len(highs)))
    lower_lows = all(lows[i] <= lows[i - 1] for i in range(1, len(lows)))

    if higher_highs and higher_lows:
        trend = 'UPTREND'
    elif lower_highs and lower_lows:
        trend = 'DOWNTREND'
    else:
        trend = 'SIDEWAYS'
```
