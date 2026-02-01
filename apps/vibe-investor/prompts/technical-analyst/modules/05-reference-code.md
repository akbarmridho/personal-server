# Technical Analysis Code Patterns

Common calculation patterns for technical analysis.

## Indicators

### Moving Averages

```python
for n in [5, 10, 20, 50]:
    df[f'MA{n}'] = df['close'].rolling(n).mean()
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

# Price-Volume Classification (last 20 days)
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
        return "DISTRIBUTION"
    else:
        return "NEUTRAL"

df['pv_signal'] = df.apply(classify_pv, axis=1)

# Count distribution days (high concern)
distribution_days = len(df[df['pv_signal'] == 'DISTRIBUTION'].tail(20))
strong_up_days = len(df[df['pv_signal'] == 'STRONG_UP'].tail(20))

print(f"Last 20 days: Distribution={distribution_days}, Strong Up={strong_up_days}")

# Volume Anomalies Detection
vol_anomalies = df[(df['vol_ratio'] > 1.5) | (df['vol_ratio'] < 0.5)]
print(f"Volume anomalies: {len(vol_anomalies)} days")
if len(vol_anomalies) > 0:
    print(vol_anomalies[['close', 'volume', 'vol_ratio', 'chg']].tail())
```

## Volume Profile (VPVR)

```python
def calculate_volume_profile(df, bins=50):
    """
    Calculate Point of Control (POC) and Value Area.
    Returns price level with highest volume (POC).
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
            # Distribute proportionally
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
    
    # Start from POC and expand
    sorted_indices = np.argsort(vol_by_price)[::-1]  # Highest volume first
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
        'hvns': hvns
    }

# Usage
vp = calculate_volume_profile(df.tail(120))  # Last 120 days
print(f"POC: {vp['poc']:.0f}")
print(f"Value Area: {vp['va_low']:.0f} - {vp['va_high']:.0f}")
print(f"HVN levels: {[f'{x:.0f}' for x in vp['hvns'][:5]]}")
```

## Fibonacci Retracement

```python
def calculate_fibonacci_levels(swing_high, swing_low, trend='uptrend'):
    """
    Calculate Fibonacci retracement levels.
    For uptrend: measure from low to high
    For downtrend: measure from high to low
    """
    if trend == 'uptrend':
        diff = swing_high - swing_low
        levels = {
            '0%': swing_low,
            '23.6%': swing_low + diff * 0.236,
            '38.2%': swing_low + diff * 0.382,
            '50%': swing_low + diff * 0.5,
            '61.8%': swing_low + diff * 0.618,
            '78.6%': swing_low + diff * 0.786,
            '100%': swing_high
        }
    else:
        diff = swing_low - swing_high  # Negative
        levels = {
            '0%': swing_high,
            '23.6%': swing_high + diff * 0.236,
            '38.2%': swing_high + diff * 0.382,
            '50%': swing_high + diff * 0.5,
            '61.8%': swing_high + diff * 0.618,
            '78.6%': swing_high + diff * 0.786,
            '100%': swing_low
        }
    return levels

# Usage - find last major swing
last_swing_high = df[df['swing_high'].notna()]['swing_high'].iloc[-1]
last_swing_low = df[df['swing_low'].notna()]['swing_low'].iloc[-1]
last_swing_high_idx = df[df['swing_high'].notna()].index[-1]
last_swing_low_idx = df[df['swing_low'].notna()].index[-1]

# Determine which came first
if last_swing_high_idx > last_swing_low_idx:
    # Uptrend - low came first
    fib_levels = calculate_fibonacci_levels(last_swing_high, last_swing_low, 'uptrend')
else:
    # Downtrend - high came first  
    fib_levels = calculate_fibonacci_levels(last_swing_high, last_swing_low, 'downtrend')

print("Fibonacci Levels:")
for level, price in fib_levels.items():
    print(f"  {level}: {price:.0f}")
```

## Wyckoff Pattern Detection

```python
def detect_selling_climax(df, window=20):
    """
    Detect potential selling climax:
    - Massive volume spike at lows
    - Followed by price stability
    """
    recent = df.tail(window)
    avg_vol = recent['volume'].mean()
    
    # Find days with >2x average volume and negative change
    climax_candidates = recent[
        (recent['vol_ratio'] > 2.0) & 
        (recent['chg'] < -0.03)  # Down more than 3%
    ]
    
    if len(climax_candidates) == 0:
        return None
    
    # Check if followed by stability (no new lows)
    for idx, row in climax_candidates.iterrows():
        after_idx = df.index.get_loc(idx) + 1
        if after_idx < len(df):
            subsequent = df.iloc[after_idx:min(after_idx + 5, len(df))]
            if subsequent['low'].min() >= row['low'] * 0.98:  # No significant new lows
                return {
                    'date': idx,
                    'price': row['close'],
                    'volume_ratio': row['vol_ratio'],
                    'confirmed': True
                }
    
    return None

def detect_spring_pattern(df, support_level, window=30):
    """
    Detect Wyckoff Spring pattern:
    - Price breaks below support
    - On LOW volume
    - Quick recovery back above support
    """
    recent = df.tail(window)
    
    # Find breaks below support
    breaks = recent[recent['low'] < support_level * 0.99]
    
    for idx, row in breaks.iterrows():
        # Check if low volume break
        if row['vol_ratio'] < 0.8:
            # Check if recovered within 1-3 days
            idx_loc = df.index.get_loc(idx)
            if idx_loc + 3 < len(df):
                recovery = df.iloc[idx_loc + 1:idx_loc + 4]
                if any(recovery['close'] > support_level):
                    return {
                        'date': idx,
                        'break_price': row['low'],
                        'recovery_price': recovery['close'].iloc[-1],
                        'volume_ratio': row['vol_ratio'],
                        'confirmed': True
                    }
    
    return None

# Usage
climax = detect_selling_climax(df)
if climax:
    print(f"⚠️ Selling Climax detected on {climax['date']}!")
    print(f"   Volume: {climax['volume_ratio']:.1f}x average")

spring = detect_spring_pattern(df, nearest_support)
if spring:
    print(f"✅ Spring pattern detected!")
    print(f"   Break: {spring['break_price']:.0f}, Recovery: {spring['recovery_price']:.0f}")
```

## Stop Loss

```python
# Structural: just below nearest support (2% buffer for bandar manipulation)
structural_stop = nearest_support * 0.98 if nearest_support else 0

# ATR-based: 2x ATR below current price
atr_stop = current_price - (atr * 2)

# Use tighter of the two for protection
stop_loss = max(structural_stop, atr_stop)

# Alternative: Wider stop for swing trades
# stop_loss = min(structural_stop, atr_stop)
```

## Chart Generation (mplfinance)

### Chart 1: Context View (Full History)

```python
import mplfinance as mpf

# Full available data for historical context
plot_df = df[['open', 'high', 'low', 'close', 'volume']].copy()

# Mark major swing highs/lows from entire history
recent_swing_highs = df[df['swing_high'].notna()]['swing_high'].tail(20)
recent_swing_lows = df[df['swing_low'].notna()]['swing_low'].tail(20)

# Horizontal lines for major historical levels
alines = []
colors = []
for level in recent_swing_highs.values[:5]:  # Top 5 resistance levels
    alines.append([(plot_df.index[0], level), (plot_df.index[-1], level)])
    colors.append('red')
for level in recent_swing_lows.values[:5]:  # Top 5 support levels  
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
# Recent data with moving averages
plot_df = df[['open', 'high', 'low', 'close', 'volume', 'MA20', 'MA50']].copy()
plot_df = plot_df.tail(150)  # Last ~6 months

# Add MAs
apds = [
    mpf.make_addplot(plot_df['MA20'], color='orange', width=1.5, label='MA20'),
    mpf.make_addplot(plot_df['MA50'], color='red', width=1.5, label='MA50')
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

# Add POC if calculated
if 'poc' in locals():
    alines.append([(plot_df.index[0], poc), (plot_df.index[-1], poc)])
    colors.append('purple')

# Add user's entry price if holding
if user_entry_price:
    alines.append([(plot_df.index[0], user_entry_price), (plot_df.index[-1], user_entry_price)])
    colors.append('blue')

# Add Fibonacci levels if calculated
for fib_name, fib_price in fib_levels.items():
    if fib_name not in ['0%', '100%']:  # Don't duplicate swing points
        alines.append([(plot_df.index[0], fib_price), (plot_df.index[-1], fib_price)])
        colors.append('gray')

mpf.plot(
    plot_df, type='candle', volume=True, style=style, addplot=apds,
    alines=dict(alines=alines, colors=colors, linewidths=[0.8]*len(colors), linestyle='--'),
    title=f'{ticker} Recent Action (as of {asof_date}, Close {close_price})',
    savefig=dict(fname='artifacts/{ticker}_recent.png', dpi=150, bbox_inches='tight')
)
```

### Chart 3: Detail View (Critical Period)

```python
# Zoom into specific period of interest (e.g., breakdown event)
detail_df = df.loc['2025-12-01':asof_date].copy()  # Last 2 months before asof

# Add swing points markers
markers_high = detail_df['swing_high'].dropna()
markers_low = detail_df['swing_low'].dropna()

# Mark volume anomalies
vol_anomaly_days = detail_df[(detail_df['vol_ratio'] > 1.5) | (detail_df['vol_ratio'] < 0.5)]

apds = [
    mpf.make_addplot(detail_df['MA20'], color='orange', width=1),
    mpf.make_addplot(detail_df['MA50'], color='red', width=1),
    # Mark swing highs with scatter
    mpf.make_addplot(markers_high, type='scatter', markersize=50, color='red', marker='v'),
    # Mark swing lows with scatter  
    mpf.make_addplot(markers_low, type='scatter', markersize=50, color='green', marker='^'),
    # Mark volume anomalies
    mpf.make_addplot(vol_anomaly_days['close'], type='scatter', markersize=30, color='purple', marker='o')
]

mpf.plot(
    detail_df, type='candle', volume=True, style=style, addplot=apds,
    title=f'{ticker} Detail: Pattern Analysis',
    savefig=dict(fname='artifacts/{ticker}_detail.png', dpi=150, bbox_inches='tight')
)
```

### Chart 4: Volume Profile View

```python
# Volume-focused view with VPVR overlay
vol_df = df[['volume']].copy()
vol_df['avg_vol_20'] = vol_df['volume'].rolling(20).mean()
vol_df['ratio'] = vol_df['volume'] / vol_df['avg_vol_20']

# Find anomalies (>1.5x average or <0.5x average)
anomalies = vol_df[(vol_df['ratio'] > 1.5) | (vol_df['ratio'] < 0.5)]

# Add POC line
poc_line = pd.Series([vp['poc']] * len(plot_df), index=plot_df.index) if 'vp' in locals() else None

apds = [
    mpf.make_addplot(vol_df['avg_vol_20'], color='blue', width=1, panel=1, secondary_y=False),
    mpf.make_addplot(anomalies['volume'], type='scatter', markersize=30, color='red', panel=1),
]

if poc_line is not None:
    apds.append(mpf.make_addplot(poc_line, color='purple', width=2))

plot_df = df[['open', 'high', 'low', 'close', 'volume']].tail(180)

mpf.plot(
    plot_df, type='candle', volume=True, style=style, addplot=apds,
    title=f'{ticker} Volume Profile Analysis',
    savefig=dict(fname='artifacts/{ticker}_volume.png', dpi=150, bbox_inches='tight')
)
```
