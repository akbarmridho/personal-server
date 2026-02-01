# Technical Analysis Code Reference ("The Cookbook")

This file contains the core Python algorithms for the Technical Analyst Agent.
**Usage:** When generating analysis scripts, copy/adapt these functions rather than writing them from scratch to ensure standard methodology.

---

## 1. Market Structure (Trends)

### Swing Point Identification (N-Candle Rule)

```python
def identify_swing_points(df, n=2):
    """
    Identify swing highs/lows. 
    Rule: High > N candles left & right.
    """
    # Swing Highs
    swing_high = True
    for i in range(1, n + 1):
        swing_high &= (df['high'] > df['high'].shift(i))
        swing_high &= (df['high'] > df['high'].shift(-i))
    df['swing_high'] = df['high'].where(swing_high)

    # Swing Lows
    swing_low = True
    for i in range(1, n + 1):
        swing_low &= (df['low'] < df['low'].shift(i))
        swing_low &= (df['low'] < df['low'].shift(-i))
    df['swing_low'] = df['low'].where(swing_low)
    
    return df
```

### Trend Structure (HH/HL Analysis)

```python
def detect_trend_structure(df, lookback=5):
    """
    Returns: 'UPTREND' (HH+HL), 'DOWNTREND' (LH+LL), or 'SIDEWAYS'.
    """
    # Get recent valid swing points
    highs = df[df['swing_high'].notna()]['swing_high'].tail(lookback).values
    lows = df[df['swing_low'].notna()]['swing_low'].tail(lookback).values

    if len(highs) < 2 or len(lows) < 2: return "INSUFFICIENT_DATA"

    # Check Higher Highs/Lows
    higher_highs = all(highs[i] >= highs[i-1] for i in range(1, len(highs)))
    higher_lows = all(lows[i] >= lows[i-1] for i in range(1, len(lows)))
    
    # Check Lower Highs/Lows
    lower_highs = all(highs[i] <= highs[i-1] for i in range(1, len(highs)))
    lower_lows = all(lows[i] <= lows[i-1] for i in range(1, len(lows)))

    if higher_highs and higher_lows: return "UPTREND"
    elif lower_highs and lower_lows: return "DOWNTREND"
    else: return "SIDEWAYS"
```

---

## 2. Levels (Support & Resistance)

### S/R Identification (Clustering)

```python
def identify_support_resistance(df, tolerance=0.03, lookback=90):
    """
    Cluster swing points into Zones. 
    tolerance=3% means levels within 3% are grouped.
    """
    recent = df.tail(lookback)
    highs = recent[recent['swing_high'].notna()]['swing_high'].values
    lows = recent[recent['swing_low'].notna()]['swing_low'].values

    def cluster(levels):
        if len(levels) == 0: return []
        clusters = []
        for level in sorted(set(levels), reverse=True):
            # If level matches existing cluster within tolerance
            if not any(abs(level - c)/c < tolerance for c,_,_ in clusters):
                touches = sum(1 for x in levels if abs(x-level)/level < tolerance)
                # Strength logic
                strength = "UNTESTED" if touches==1 else "STRONG" if touches==2 else "WEAK"
                clusters.append((level, touches, strength))
        return clusters

    return cluster(highs), cluster(lows) # Returns (resistances, supports)
```

### Volume Profile (POC & Value Area)

```python
def calculate_volume_profile(df, bins=50):
    """Calculate Point of Control (POC) and Value Area."""
    price_range = np.linspace(df['low'].min(), df['high'].max(), bins+1)
    vol_by_price = np.zeros(bins)
    
    # Distribute volume
    for _, row in df.iterrows():
        l, h, v = row['low'], row['high'], row['volume']
        # Simple proportional distribution logic here...
        # [See full implementation in Module 2 if detailed math needed]
    
    poc_idx = np.argmax(vol_by_price)
    # Value Area logic (70% of volume)...
    
    return {'poc': price_range[poc_idx], 'volume_profile': vol_by_price}
```

---

## 3. Price Action (Wyckoff)

### Price-Volume Matrix

```python
def analyze_price_volume(df, vol_high=1.2, vol_low=0.8):
    """
    Wyckoff Logic:
    - Price UP + Vol HIGH = STRONG UP
    - Price DOWN + Vol LOW = HEALTHY CORRECTION
    - Price UP + Vol LOW = WEAK RALLY
    - Price DOWN + Vol HIGH = DISTRIBUTION
    """
    df['avg_vol'] = df['volume'].rolling(20).mean()
    df['vol_ratio'] = df['volume'] / df['avg_vol']
    df['chg'] = df['close'].pct_change()
    
    # Logic applied row-by-row...
    return df
```

### Breakout Detection

```python
def detect_breakout(df, level):
    """
    Valid Breakout = Close > Level AND Vol Ratio > 1.5
    """
    candle = df.iloc[-1]
    is_break = candle['close'] > level and candle['vol_ratio'] > 1.5
    return "VALID_BREAKOUT" if is_break else "WEAK_BREAK_OR_FAIL"
```

---

## 4. Risk Management

### Stop Loss Calculation

```python
def calculate_stop_loss(current_price, nearest_support, atr):
    """
    Combine Structural and ATR stops.
    """
    structural = nearest_support * 0.98 if nearest_support else 0
    atr_stop = current_price - (atr * 2)
    
    # Be aggressive: use the TIGHTER valid stop (higher price) 
    # to protect capital, OR wider for swing? Definition depends on user.
    # Standard Rule: Max(Structural, ATR_Stop)
    return max(structural, atr_stop)
```

### Position Sizing (The 1% Rule)

```python
def calculate_position_size(capital, entry, stop, risk_pct=0.01):
    risk_per_share = abs(entry - stop)
    if risk_per_share == 0: return 0
    
    total_risk = capital * risk_pct
    shares = int(total_risk / risk_per_share)
    return shares # Convert to lots (shares // 100)
```

---

## 5. Visualization (mplfinance)

### Standard Chart Setup

```python
def generate_chart(df, analysis):
    """
    Standard mplfinance setup for consistency.
    """
    import mplfinance as mpf
    
    # Custom Style
    style = mpf.make_mpf_style(marketcolors=mpf.make_marketcolors(up='g', down='r'), gridstyle=':')
    
    # plots
    apds = [
        mpf.make_addplot(df['MA20'], color='orange'),
        mpf.make_addplot(df['MA50'], color='red')
    ]
    
    # Add Swing Points
    # Add S/R Lines (hlines)
    
    mpf.plot(df, type='candle', style=style, addplot=apds, volume=True, hlines=...)
```
