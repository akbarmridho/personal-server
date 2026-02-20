# Price Action Patterns And Breakouts

## Price-Volume Matrix

| Price | Volume | Typical read |
|-------|--------|--------------|
| Up | Up | Strong trend |
| Down | Down | Healthy correction |
| Up | Down | Weak rally |
| Down | Up | Distribution risk |

## Volume Anomaly Rule

If volume reaches around 70% of average daily volume in the first hour, move into active monitoring mode.

## Accumulation Pattern Signals

- Sideways range with persistent abnormal activity
- Repeated absorption behavior
- Spring-style false break followed by quick reclaim

## Wyckoff Accumulation Sequence

- Phase A: stopping action (PS, SC, AR, ST)
- Phase B: cause building (range churn and absorption)
- Phase C: spring/shakeout before potential markup

## Selling Climax Bottom Anatomy

- Saturated bad-news environment
- High-volume panic with reduced downside follow-through
- Structural improvement after stabilization

## Breakout Quality

Real breakout:

- Strong close beyond level
- Elevated volume
- Follow-through and hold

Fake breakout:

- Wick-only break or weak close
- Limited volume support
- Immediate rejection back into prior range

## Reference Code

### Price-Volume Classification

```python
avg_vol_20 = df['volume'].rolling(20).mean()
df['vol_ratio'] = df['volume'] / avg_vol_20
df['chg'] = df['close'].pct_change()

def classify_pv(row):
    vol_high = row['vol_ratio'] > 1.2
    vol_low = row['vol_ratio'] < 0.8
    if row['chg'] > 0 and vol_high:
        return 'STRONG_UP'
    elif row['chg'] < 0 and vol_low:
        return 'HEALTHY_CORRECTION'
    elif row['chg'] > 0 and vol_low:
        return 'WEAK_RALLY'
    elif row['chg'] < 0 and vol_high:
        return 'DISTRIBUTION'
    return 'NEUTRAL'

df['pv_signal'] = df.apply(classify_pv, axis=1)
```
