---
name: bank-ckpn-writeoff-overdue-diagnostics
description: Indonesian banking asset-quality reference — CKPN vs provisi vs write-off (hapusbuku), kolektibilitas/overdue logic, and how to diagnose improvement vs “cleaning”.
---

# IDX Banks — CKPN / Provisi / Write-off / Overdue (Reference)

This entry focuses on **Indonesia banking terms** frequently used in reports/discussions:

- **CKPN** (Cadangan Kerugian Penurunan Nilai)
- **hapusbuku** (write-off)
- **kolektibilitas** buckets and **overdue** logic

## CKPN vs write-off: where it hits the statements

| Action | Income statement impact | Balance sheet impact | Cash flow impact |
|---|---|---|---|
| **Provisioning** (increase CKPN) | Expense increases → profit down | CKPN increases (contra-asset) | Non-cash (unless linked to recoveries) |
| **Write-off / hapusbuku** | Usually **no new expense** at write-off time (already provisioned) | Loans/receivables down; CKPN down | No direct cash (it’s an accounting removal) |
| **Recovery** of written-off loans | Can appear as other income / reduction in expenses (depends disclosure) | May rebuild asset line / reduce NPL metrics | Cash inflow occurs when collected |

## Journal intuition (reference)

| Event | Typical journal idea |
|---|---|
| Provisioning | `Dr Expense` / `Cr CKPN` |
| Write-off | `Dr CKPN` / `Cr Loan/Receivable` |

## Kolektibilitas & “Overdue” shorthand

Practical shorthand often used:

- **Overdue** = any delinquency bucket beyond current (commonly treated as Kolek **2–5**).
- A key operational threshold often cited is **>180 days** for the worst bucket (Kolek 5).

## Diagnostic: improvement vs “cleaning by write-off”

Write-offs can make headline ratios look better. The critical question is **what causes the improvement**.

| Observation | Better interpretation | Worse interpretation |
|---|---|---|
| Overdue balance drops after a big write-off period | Repayment improved | Overdue was “cleaned” by write-offs while new loans turn overdue |
| CKPN drops materially | Risk is genuinely reduced | CKPN reduced because assets were written-off, not recovered |
| Repayment Rate (RR) improves over time | Collection quality improving | RR stuck while write-offs spike |

## Practical ratio pointers (reference)

| Ratio / metric | What it signals |
|---|---|
| **Write-off / interest income** | How much yield is being eaten by credit losses |
| **Overdue trend vs write-off trend** | Whether risk is shifting or being resolved |
| **NPL coverage** | Buffer strength vs future losses |
