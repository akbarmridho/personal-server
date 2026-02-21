# Levels Support Resistance And VPVR

## Level Identification

Primary methods:

- Recent swing highs and lows
- Historical major highs/lows
- Round-number and reaction clusters

Recent and repeatedly respected levels carry higher operational value.

## VPVR Components

- POC: highest-volume price, often strongest magnet level
- HVN: heavy-volume node, tends to behave as strong S/R
- LVN: low-volume node, often fast-travel zone
- Value area: core traded range (~70% volume)

## Level Strength Heuristic

- 1st test strongest
- 2nd still reliable
- 3rd weakening
- 4th+ high break risk

## Zones, Not Lines

Treat S/R as zones using one of:

- fixed percentage band (about 1-3%)
- ATR-based width (about 0.5 ATR)
- wick-to-body zone

## Volume Confirmation At Levels

- Bounce on high volume: stronger confirmation
- Break on high volume: more reliable break
- Break on weak volume: higher fakeout risk

## Manipulation And Role Reversal

- Fake breaks often target stops around obvious levels.
- Require close confirmation and follow-through.
- Broken support can become resistance and vice versa.

## Fibonacci As Confluence

Key retracements: 38.2%, 50%, 61.8%.
Use fib as a confluence layer with structure, not as a standalone trigger.

## Reference Code

### S/R Clustering

```python
def cluster_levels(levels, tolerance=0.03):
    if len(levels) == 0:
        return []
    clusters = []
    for level in sorted(set(levels), reverse=True):
        if not any(abs(level - c) / c < tolerance for c, _, _ in clusters):
            touches = sum(1 for x in levels if abs(x - level) / level < tolerance)
            strength = 'UNTESTED' if touches == 1 else 'STRONG' if touches >= 2 else 'WEAK'
            clusters.append((level, touches, strength))
    return clusters
```

### VPVR

```python
def calculate_volume_profile(df, bins=50):
    price_range = np.linspace(df['low'].min(), df['high'].max(), bins + 1)
    vol_by_price = np.zeros(bins)

    for _, row in df.iterrows():
        low_idx = np.searchsorted(price_range, row['low']) - 1
        high_idx = np.searchsorted(price_range, row['high']) - 1
        low_idx = max(0, low_idx)
        high_idx = min(bins - 1, high_idx)
        for i in range(low_idx, high_idx + 1):
            vol_by_price[i] += row['volume']

    poc_idx = int(np.argmax(vol_by_price))
    poc_price = (price_range[poc_idx] + price_range[poc_idx + 1]) / 2
    return {'poc': poc_price}
```

### Fibonacci Helper

```python
def fibonacci_levels(swing_high, swing_low):
    diff = swing_high - swing_low
    return {
        '38.2%': swing_high - diff * 0.382,
        '50.0%': swing_high - diff * 0.5,
        '61.8%': swing_high - diff * 0.618,
    }
```
