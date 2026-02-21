# Analysis Checklists And Red Flags

## Analysis Checklist

### Structure

- Determine state first: balance or imbalance.
- Validate trend sequence and recent swing behavior.
- Check for structure breaks with close confirmation.
- Confirm MA and trendline context.

### Levels

- Mark nearest support/resistance zones.
- Assess test count and zone quality.
- Validate reaction volume at key levels.
- Check role reversal and fib confluence.

### Price Action

- Classify recent price-volume behavior.
- Detect accumulation/distribution clues.
- Run divergence scan and classify status.
- Validate breakout quality and fakeout risk.

## Red Flag Categories

1. MA breakdown and bearish MA alignment
2. Trend structure failure (LH/LL shifts)
3. Distribution/churning volume behavior
4. Weak support structure and asymmetric risk
5. Position risk (stop proximity, underwater deterioration)
6. Momentum divergence escalation

## Informed Money Signals

Context-dependent warning patterns:

- repeated distribution near highs
- weak bounce after heavy sell volume
- churning near resistance

Interpretation depends on context:

- speculative stories: more suspicious
- mature trends: can be normal profit rotation

## Severity

Assign severity with explicit evidence:

- LOW
- MEDIUM
- HIGH
- CRITICAL

## Reference Code

### Red Flags Detection

```python
def analyze_red_flags(df, current_price, user_entry=None, stop_loss=None, divergence_signal=None):
    flags = []
    if current_price < df['MA20'].iloc[-1]:
        flags.append({'category': 'Structure', 'signal': 'Below MA20', 'severity': 'HIGH'})
    if current_price < df['MA50'].iloc[-1]:
        flags.append({'category': 'Structure', 'signal': 'Below MA50', 'severity': 'CRITICAL'})

    recent_highs = df[df['swing_high'].notna()]['swing_high'].tail(3).values
    if len(recent_highs) >= 2 and recent_highs[-1] < recent_highs[-2]:
        flags.append({'category': 'Structure', 'signal': 'Lower highs', 'severity': 'HIGH'})

    recent = df.tail(20)
    dist_days = recent[(recent['chg'] < -0.03) & (recent['vol_ratio'] > 1.2)]
    if len(dist_days) > 0:
        flags.append({'category': 'Volume', 'signal': f'Distribution ({len(dist_days)} days)', 'severity': 'HIGH'})

    if divergence_signal and divergence_signal.get('status') == 'confirmed':
        flags.append({'category': 'Momentum', 'signal': 'Bearish divergence (confirmed)', 'severity': 'HIGH'})

    return flags
```

### Informed-Money Signal Scan

```python
def analyze_informed_money(df):
    signals = []
    recent = df.tail(30)
    dist_days = recent[(recent['chg'] < -0.03) & (recent['vol_ratio'] > 1.2)]

    if len(dist_days) >= 2:
        signals.append({'type': 'Persistent Distribution', 'evidence': f'{len(dist_days)} distribution days'})

    return signals
```

### Charting (mplfinance)

```python
import mplfinance as mpf

style = mpf.make_mpf_style(base_mpf_style='yahoo', gridstyle=':')

mpf.plot(
    plot_df,
    type='candle',
    volume=True,
    style=style,
    title=f'{symbol} Context',
    savefig=dict(fname=f'work/{symbol}_context.png', dpi=150, bbox_inches='tight'),
)
```
