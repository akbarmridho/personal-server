# Execution And Risk Protocol

## Entry Frameworks

- Trend breakout entry when level break is volume-supported
- Pullback-to-value entry near demand zones in intact uptrend
- Spring/reclaim entry after failed downside break in range

## Position Sizing

Use 1% risk sizing:

```text
Position Size = (Capital x 1%) / (Entry - Stop)
```

Guidelines:

- Start 30-70% of max size by conviction
- Add to winners, not to structurally broken losers

## Exit Frameworks

- Structural exit: close below key MA and broken structure
- Target-based partial exit at major resistance/extension zones
- Emergency exit on high-volume support failure or heavy churning

## Bearish Divergence Protocol

Divergence is warning first, not automatic reversal call.

Action ladder:

1. Unconfirmed divergence: trim risk, tighten stops, avoid fresh adds
2. Divergence plus structural confirmation: de-risk aggressively or exit by structure
3. No structural confirmation: remain reactive, do not front-run top calls

Always report divergence status explicitly.

## No-Resistance Phase

When price is in discovery above major historical ceilings:

- avoid arbitrary hard targets
- trail by structure and risk rules
- wait for break evidence instead of narrative overvaluation arguments

## Reference Code

### Bearish Divergence Detection

```python
def calculate_rsi(close, period=14):
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))

df['RSI14'] = calculate_rsi(df['close'])
```

### Stop-Loss Examples

```python
structural_stop = nearest_support * 0.98
atr_stop = current_price - (atr * 2)
```
