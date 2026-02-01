# Technical Analysis Code Patterns

Common calculation patterns for technical analysis. Adapt these based on context - not all patterns apply to every situation.

## Indicators

### Moving Averages

```python
for n in [5, 10, 20, 50]:
    df[f'MA{n}'] = df['close'].rolling(n).mean()

# Context matters:
# - Fast stocks: Focus on MA5, MA10
# - Medium stocks: MA20 is key dynamic support
# - Slow stocks: MA50 is trend benchmark
```

### ATR (Average True Range)

```python
high, low, close = df['high'], df['low'], df['close']
prev_close = close.shift(1)
tr = pd.concat([
    (high - low).abs(),
    (high - prev_close).abs(), 
    (low - prev_close).abs()
], axis=1).max(axis=1)
df['ATR14'] = tr.rolling(14).mean()
```

### Swing Points (N=2)

```python
n = 2
# Swing Highs: current high > n highs on left AND right
swing_high = True
for i in range(1, n+1):
    swing_high &= (df['high'] > df['high'].shift(i))
    swing_high &= (df['high'] > df['high'].shift(-i))
df['swing_high'] = df['high'].where(swing_high)

# Swing Lows: current low < n lows on left AND right  
swing_low = True
for i in range(1, n+1):
    swing_low &= (df['low'] < df['low'].shift(i))
    swing_low &= (df['low'] < df['low'].shift(-i))
df['swing_low'] = df['low'].where(swing_low)
```

## Support/Resistance

### Clustering Levels

```python
def cluster_levels(levels, tolerance=0.03):
    """Group nearby levels (3% tolerance)."""
    if len(levels) == 0:
        return []
    clusters = []
    for level in sorted(set(levels), reverse=True):
        if not any(abs(level - c) / c < tolerance for c, _, _ in clusters):
            touches = sum(1 for x in levels if abs(x - level) / level < tolerance)
            strength = "UNTESTED" if touches == 1 else "STRONG" if touches >= 2 else "WEAK"
            clusters.append((level, touches, strength))
    return clusters

# Usage
recent = df.tail(90)
resistances = cluster_levels(recent[recent['swing_high'].notna()]['swing_high'].values)
supports = cluster_levels(recent[recent['swing_low'].notna()]['swing_low'].values)
```

## Trend Detection

```python
lookback = 5
highs = df[df['swing_high'].notna()]['swing_high'].tail(lookback).values
lows = df[df['swing_low'].notna()]['swing_low'].tail(lookback).values

if len(highs) >= 2 and len(lows) >= 2:
    higher_highs = all(highs[i] >= highs[i-1] for i in range(1, len(highs)))
    higher_lows = all(lows[i] >= lows[i-1] for i in range(1, len(lows)))
    lower_highs = all(highs[i] <= highs[i-1] for i in range(1, len(highs)))
    lower_lows = all(lows[i] <= lows[i-1] for i in range(1, len(lows)))
    
    if higher_highs and higher_lows:
        trend = "UPTREND"
    elif lower_highs and lower_lows:
        trend = "DOWNTREND"
    else:
        trend = "SIDEWAYS"
```

## Price-Volume Analysis (Wyckoff Matrix)

```python
# Calculate volume metrics
avg_vol_20 = df['volume'].rolling(20).mean()
df['vol_ratio'] = df['volume'] / avg_vol_20
df['chg'] = df['close'].pct_change()
df['abs_chg'] = df['chg'].abs()

# Price-Volume Classification
def classify_pv(row):
    vol_high = row['vol_ratio'] > 1.2
    vol_low = row['vol_ratio'] < 0.8
    price_up = row['chg'] > 0
    price_down = row['chg'] < 0
    
    if price_up and vol_high:
        return "STRONG_UP"
    elif price_down and vol_low:
        return "HEALTHY_CORRECTION"
    elif price_up and vol_low:
        return "WEAK_RALLY"
    elif price_down and vol_high:
        return "DISTRIBUTION"  # Important exit signal
    else:
        return "NEUTRAL"

df['pv_signal'] = df.apply(classify_pv, axis=1)

# Count patterns in recent period
distribution_days = len(df[df['pv_signal'] == 'DISTRIBUTION'].tail(20))
strong_up_days = len(df[df['pv_signal'] == 'STRONG_UP'].tail(20))
```

## Risk Assessment Patterns

### Red Flags Detection

```python
def analyze_red_flags(df, current_price, user_entry=None, stop_loss=None):
    """
    Detect warning signs. Use judgment on which matter most for context.
    """
    flags = []
    
    # Technical structure flags
    if current_price < df['MA20'].iloc[-1]:
        flags.append({
            'category': 'Structure',
            'signal': 'Below MA20',
            'severity': 'HIGH',
            'evidence': f"Price {current_price} < MA20 {df['MA20'].iloc[-1]:.1f}"
        })
    
    if current_price < df['MA50'].iloc[-1]:
        flags.append({
            'category': 'Structure', 
            'signal': 'Below MA50',
            'severity': 'CRITICAL',
            'evidence': f"Long-term trend compromised"
        })
    
    # Check trend structure
    recent_highs = df[df['swing_high'].notna()]['swing_high'].tail(3).values
    if len(recent_highs) >= 2 and recent_highs[-1] < recent_highs[-2]:
        flags.append({
            'category': 'Structure',
            'signal': 'Lower highs pattern',
            'severity': 'HIGH',
            'evidence': f"Recent high {recent_highs[-1]:.0f} < previous {recent_highs[-2]:.0f}"
        })
    
    # Volume flags
    recent = df.tail(20)
    dist_days = recent[(recent['chg'] < -0.03) & (recent['vol_ratio'] > 1.2)]
    if len(dist_days) > 0:
        flags.append({
            'category': 'Volume',
            'signal': f'Distribution detected ({len(dist_days)} days)',
            'severity': 'HIGH',
            'evidence': f"High volume selling without news catalyst"
        })
    
    # Position risk flags
    if user_entry and current_price < user_entry:
        loss_pct = (current_price - user_entry) / user_entry * 100
        flags.append({
            'category': 'Position',
            'signal': 'Position underwater',
            'severity': 'MEDIUM' if loss_pct > -10 else 'HIGH',
            'evidence': f"Down {loss_pct:.1f}% from entry"
        })
    
    if stop_loss:
        distance = abs((current_price - stop_loss) / current_price * 100)
        if distance < 5:
            flags.append({
                'category': 'Position',
                'signal': 'Close to stop loss',
                'severity': 'HIGH',
                'evidence': f"Only {distance:.1f}% to stop at {stop_loss}"
            })
    
    return flags
```

### Informed Money Analysis

```python
def analyze_informed_money_signals(df, context=None):
    """
    Assess whether distribution patterns suggest informed selling.
    Context matters: More relevant for speculative plays than blue chips.
    """
    signals = []
    recent = df.tail(30)
    
    # Distribution near peaks
    recent_high = recent['high'].max()
    high_idx = df.index.get_loc(recent['high'].idxmax())
    days_since_peak = len(df) - high_idx - 1
    
    if days_since_peak <= 10:
        # Check for selling pressure near highs
        near_peak = recent[recent['high'] > recent_high * 0.95]
        if len(near_peak) > 0:
            avg_vol = near_peak['vol_ratio'].mean()
            if avg_vol > 1.3:
                signals.append({
                    'type': 'Peak Distribution',
                    'evidence': f'High volume ({avg_vol:.1f}x) near recent high',
                    'interpretation': 'Selling into strength'
                })
    
    # Multiple distribution days
    dist_days = recent[(recent['chg'] < -0.03) & (recent['vol_ratio'] > 1.2)]
    if len(dist_days) >= 2:
        signals.append({
            'type': 'Persistent Distribution',
            'evidence': f'{len(dist_days)} distribution days in recent period',
            'interpretation': 'Sustained selling pressure'
        })
    
    # Weak recovery after declines
    if len(dist_days) > 0:
        last_dist = dist_days.index[-1]
        days_after = len(df) - df.index.get_loc(last_dist) - 1
        if days_after >= 2:
            recovery = df.loc[last_dist:].iloc[1:min(days_after+1, 4)]
            if len(recovery) >= 2:
                gain = (recovery['close'].iloc[-1] - recovery['close'].iloc[0]) / recovery['close'].iloc[0]
                if gain < 0.03:  # Less than 3% recovery
                    signals.append({
                        'type': 'Weak Recovery',
                        'evidence': f'Only {gain*100:.1f}% bounce after distribution',
                        'interpretation': 'No strong buyers defending'
                    })
    
    return signals

# Context-aware interpretation
if context and context.get('thesis_type') in ['MSCI_INCLUSION', 'MERGER', 'SPECULATIVE']:
    if len(signals) >= 2:
        interpretation = "Multiple distribution signals in speculative play. Smart money may be exiting before news."
    elif len(signals) == 1:
        interpretation = "Some distribution detected. Monitor for additional signals."
    else:
        interpretation = "No clear informed money signals."
else:
    # For established stocks, distribution may be normal profit-taking
    interpretation = "Analyze distribution in context of overall trend and fundamentals."
```

## Volume Profile (VPVR)

```python
def calculate_volume_profile(df, bins=50):
    """
    Calculate Point of Control (POC) and Value Area.
    """
    price_range = np.linspace(df['low'].min(), df['high'].max(), bins+1)
    vol_by_price = np.zeros(bins)
    
    # Distribute volume across price bins
    for _, row in df.iterrows():
        low_idx = np.searchsorted(price_range, row['low']) - 1
        high_idx = np.searchsorted(price_range, row['high']) - 1
        if low_idx == high_idx:
            vol_by_price[max(0, low_idx)] += row['volume']
        else:
            price_span = row['high'] - row['low']
            for i in range(max(0, low_idx), min(bins, high_idx + 1)):
                bin_low = price_range[i]
                bin_high = price_range[i+1]
                overlap = min(bin_high, row['high']) - max(bin_low, row['low'])
                if overlap > 0:
                    vol_by_price[i] += row['volume'] * (overlap / price_span)
    
    # POC = price level with highest volume
    poc_idx = np.argmax(vol_by_price)
    poc_price = (price_range[poc_idx] + price_range[poc_idx + 1]) / 2
    
    # Value Area (70% of volume)
    total_vol = vol_by_price.sum()
    target_vol = total_vol * 0.70
    sorted_indices = np.argsort(vol_by_price)[::-1]
    cum_vol = 0
    value_area_prices = []
    for idx in sorted_indices:
        cum_vol += vol_by_price[idx]
        value_area_prices.append((price_range[idx] + price_range[idx+1]) / 2)
        if cum_vol >= target_vol:
            break
    
    va_high = max(value_area_prices)
    va_low = min(value_area_prices)
    
    # High Volume Nodes (top 20% of volume bins)
    hvn_threshold = np.percentile(vol_by_price, 80)
    hvn_indices = np.where(vol_by_price >= hvn_threshold)[0]
    hvns = [(price_range[i] + price_range[i+1]) / 2 for i in hvn_indices]
    
    return {
        'poc': poc_price,
        'va_high': va_high,
        'va_low': va_low,
        'hvns': hvns[:5]  # Top 5
    }
```

## Fibonacci Retracement

```python
def calculate_fibonacci_levels(swing_high, swing_low, trend='uptrend'):
    """Calculate Fibonacci levels. Use as confluence tool, not standalone S/R."""
    if trend == 'uptrend':
        diff = swing_high - swing_low
        return {
            '0%': swing_low,
            '38.2%': swing_low + diff * 0.382,
            '50%': swing_low + diff * 0.5,
            '61.8%': swing_low + diff * 0.618,
            '100%': swing_high
        }
    else:
        diff = swing_low - swing_high
        return {
            '0%': swing_high,
            '38.2%': swing_high + diff * 0.382,
            '50%': swing_high + diff * 0.5,
            '61.8%': swing_high + diff * 0.618,
            '100%': swing_low
        }

# Usage - look for confluence with other S/R
fib_levels = calculate_fibonacci_levels(last_high, last_low, trend)
# Check if 61.8% aligns with a previous support level
```

## Stop Loss

```python
# Structural: just below nearest support (buffer for manipulation)
structural_stop = nearest_support * 0.98 if nearest_support else None

# ATR-based: 2x ATR below current price
atr_stop = current_price - (atr * 2)

# Choose based on context:
# - Aggressive protection: max(structural_stop, atr_stop)
# - Swing trade buffer: min(structural_stop, atr_stop) if structural_stop else atr_stop
# - Must make sense with S/R levels - not arbitrary

# The stop defines where your thesis is invalidated
# If price reaches here, you're wrong - exit regardless of hope
```

## Chart Generation (mplfinance)

### Chart 1: Context View (Full History)

```python
import mplfinance as mpf

plot_df = df[['open', 'high', 'low', 'close', 'volume']].copy()

# Mark major swing highs/lows
recent_swing_highs = df[df['swing_high'].notna()]['swing_high'].tail(20)
recent_swing_lows = df[df['swing_low'].notna()]['swing_low'].tail(20)

# Horizontal lines for major historical levels
alines = []
colors = []
for level in recent_swing_highs.values[:5]:
    alines.append([(plot_df.index[0], level), (plot_df.index[-1], level)])
    colors.append('red')
for level in recent_swing_lows.values[:5]:
    alines.append([(plot_df.index[0], level), (plot_df.index[-1], level)])
    colors.append('green')

style = mpf.make_mpf_style(base_mpf_style='yahoo', gridstyle=':', rc={'font.size': 8})

mpf.plot(
    plot_df, type='candle', volume=True, style=style,
    alines=dict(alines=alines, colors=colors, linewidths=[0.8]*len(colors), linestyle='--'),
    title=f'{ticker} Full Context (as of {asof_date})',
    savefig=dict(fname='artifacts/{ticker}_context.png', dpi=150, bbox_inches='tight')
)
```

### Chart 2: Recent Action View (120-180 days)

```python
plot_df = df[['open', 'high', 'low', 'close', 'volume', 'MA20', 'MA50']].copy()
plot_df = plot_df.tail(150)

apds = [
    mpf.make_addplot(plot_df['MA20'], color='orange', width=1.5),
    mpf.make_addplot(plot_df['MA50'], color='red', width=1.5)
]

# Recent S/R levels
alines = []
colors = []
for level, touches, strength in resistance_levels[:3]:
    alines.append([(plot_df.index[0], level), (plot_df.index[-1], level)])
    colors.append('red')
for level, touches, strength in support_levels[:3]:
    alines.append([(plot_df.index[0], level), (plot_df.index[-1], level)])
    colors.append('green')

# Add user's entry price if holding
if user_entry_price:
    alines.append([(plot_df.index[0], user_entry_price), (plot_df.index[-1], user_entry_price)])
    colors.append('blue')

mpf.plot(
    plot_df, type='candle', volume=True, style=style, addplot=apds,
    alines=dict(alines=alines, colors=colors, linewidths=[0.8]*len(colors), linestyle='--'),
    title=f'{ticker} Recent Action (as of {asof_date}, Close {close_price})',
    savefig=dict(fname='artifacts/{ticker}_recent.png', dpi=150, bbox_inches='tight')
)
```

### Chart 3: Detail View (Critical Period)

```python
# Zoom into specific period
detail_df = df.loc['2025-12-01':asof_date].copy()

# Add swing points markers
markers_high = detail_df['swing_high'].dropna()
markers_low = detail_df['swing_low'].dropna()

# Mark volume anomalies
vol_anomaly_days = detail_df[(detail_df['vol_ratio'] > 1.5) | (detail_df['vol_ratio'] < 0.5)]

apds = [
    mpf.make_addplot(detail_df['MA20'], color='orange', width=1),
    mpf.make_addplot(detail_df['MA50'], color='red', width=1),
    mpf.make_addplot(markers_high, type='scatter', markersize=50, color='red', marker='v'),
    mpf.make_addplot(markers_low, type='scatter', markersize=50, color='green', marker='^'),
    mpf.make_addplot(vol_anomaly_days['close'], type='scatter', markersize=30, color='purple', marker='o')
]

mpf.plot(
    detail_df, type='candle', volume=True, style=style, addplot=apds,
    title=f'{ticker} Detail: Pattern Analysis',
    savefig=dict(fname='artifacts/{ticker}_detail.png', dpi=150, bbox_inches='tight')
)
```

## Key Principle

**All patterns are context-dependent.**

- Distribution in a speculative play = suspicious
- Distribution in a mature stock = normal profit-taking
- Volume spike on breakout = confirmation
- Volume spike on breakdown = exit signal

Use these patterns as tools, not rigid rules. The market is probabilistic, not deterministic.
