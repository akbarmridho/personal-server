from __future__ import annotations

from typing import Any


SETUP_STATUS_RANK = {"invalid": 0, "watchlist_only": 1, "valid": 2}
SETUP_PRIORITY = {"S1": 3, "S2": 2, "S3": 4, "S4": 1, "S5": 5}


def apply_intraday_setup_adjustment(
    setup_id: str,
    status: str,
    score: int,
    drivers: list[str],
    intraday_timing: dict[str, Any],
) -> tuple[str, int, list[str]]:
    timing_authority = str(intraday_timing.get("timing_authority", "full_15m"))
    intraday_structure = str(
        intraday_timing.get("intraday_structure_state", "unclear")
    )
    participation = str(
        intraday_timing.get("raw_participation_quality", "adequate")
    )

    if intraday_structure == "aligned":
        score += 1
        drivers.append("intraday_aligned")
    elif intraday_structure == "counter_thesis":
        score -= 1
        drivers.append("intraday_counter_thesis")
        if status == "valid":
            status = "watchlist_only"
    elif intraday_structure == "conflicted":
        drivers.append("intraday_conflicted")

    if timing_authority == "wait_only":
        score -= 1
        drivers.append("timing_wait_only")
        if status == "valid":
            status = "watchlist_only"

    if participation == "strong":
        score += 1
        drivers.append("participation_strong")
    elif participation == "weak":
        score -= 1
        drivers.append("participation_weak")
        if status == "valid" and setup_id in {"S1", "S5"}:
            status = "watchlist_only"

    return status, score, list(dict.fromkeys(v for v in drivers if v))


def setup_candidate_payload(
    setup_id: str, status: str, score: int, drivers: list[str]
) -> dict[str, Any]:
    return {
        "setup_id": setup_id,
        "status": status,
        "score": int(score),
        "drivers": list(dict.fromkeys(v for v in drivers if v)),
    }


def summarize_candidate_evaluations(
    ranked_candidates: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    viable = [
        candidate
        for candidate in ranked_candidates
        if str(candidate.get("status")) != "invalid"
    ]
    if viable:
        selected = viable
    else:
        substantive_invalid = [
            candidate
            for candidate in ranked_candidates
            if any(
                not str(driver).startswith(("intraday_", "participation_", "timing_"))
                for driver in candidate.get("drivers", [])
            )
        ]
        selected = substantive_invalid[:1] if substantive_invalid else ranked_candidates[:1]
    return [
        {
            "setup_id": str(candidate["setup_id"]),
            "status": str(candidate["status"]),
            "score": int(candidate["score"]),
            "drivers": list(candidate["drivers"]),
        }
        for candidate in selected
    ]


def candidate_setup_ids_from_evaluations(
    candidate_evaluations: list[dict[str, Any]],
) -> list[str]:
    return (
        list(
            dict.fromkeys(
                str(candidate.get("setup_id"))
                for candidate in candidate_evaluations
                if str(candidate.get("setup_id"))
            )
        )
        or ["NO_VALID_SETUP"]
    )


def evaluate_setup_candidates(
    regime: str,
    trend_bias: str,
    breakout_state: str,
    structure_state: str,
    spring_confirmed: bool,
    location_state: str,
    intraday_timing: dict[str, Any],
    supports: list[dict[str, Any]],
    displacement: str | None,
) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    bullish_continuation = regime == "trend_continuation" and trend_bias == "bullish"
    at_support = location_state == "near_support_in_bullish_structure"
    above_resistance = location_state == "accepted_above_resistance"
    at_range_edge = location_state == "at_range_edge"
    breakout_valid = breakout_state == "valid_breakout"
    breakout_failed = breakout_state == "failed_breakout"
    structure_confirmed = structure_state == "choch_plus_bos_confirmed"
    structure_warning = structure_state == "choch_only"
    nearest_support = supports[0] if supports else None

    s1_status = "invalid"
    s1_score = 0
    s1_drivers: list[str] = []
    if bullish_continuation:
        s1_drivers.append("trend_continuation_context")
        if breakout_failed:
            s1_drivers.append("failed_breakout")
            s1_score -= 3
        else:
            if breakout_valid:
                s1_score += 4
                s1_drivers.append("valid_breakout")
            if above_resistance:
                s1_score += 3
                s1_drivers.append("accepted_above_resistance")
            elif at_support:
                s1_score += 2
                s1_drivers.append("retest_zone_active")
            if displacement == "clean_displacement":
                s1_score += 1
                s1_drivers.append("clean_displacement")

            if breakout_valid and (above_resistance or at_support):
                s1_status = "valid"
            elif breakout_valid or above_resistance:
                s1_status = "watchlist_only"
    s1_status, s1_score, s1_drivers = apply_intraday_setup_adjustment(
        "S1", s1_status, s1_score, s1_drivers, intraday_timing
    )
    candidates.append(setup_candidate_payload("S1", s1_status, s1_score, s1_drivers))

    s2_status = "invalid"
    s2_score = 0
    s2_drivers: list[str] = []
    if bullish_continuation and at_support:
        s2_drivers.extend(["trend_continuation_context", "pullback_to_demand"])
        s2_score += 4
        if nearest_support is not None:
            support_strength = str(nearest_support.get("strength", "moderate"))
            if support_strength == "strong":
                s2_score += 1
                s2_drivers.append("support_strength_strong")
            elif support_strength == "weak":
                s2_score -= 1
                s2_drivers.append("support_strength_weak")
        if breakout_failed:
            s2_score -= 1
            s2_drivers.append("breakout_failure_overhang")
            s2_status = "watchlist_only"
        else:
            s2_status = "valid"
    s2_status, s2_score, s2_drivers = apply_intraday_setup_adjustment(
        "S2", s2_status, s2_score, s2_drivers, intraday_timing
    )
    candidates.append(setup_candidate_payload("S2", s2_status, s2_score, s2_drivers))

    s3_status = "invalid"
    s3_score = 0
    s3_drivers: list[str] = []
    if not spring_confirmed:
        if structure_confirmed:
            s3_status = "valid"
            s3_score += 5
            s3_drivers.append("choch_plus_bos_confirmed")
        elif structure_warning:
            s3_status = "watchlist_only"
            s3_score += 2
            s3_drivers.append("choch_only")
        elif regime == "potential_reversal":
            s3_status = "watchlist_only"
            s3_score += 1
            s3_drivers.append("potential_reversal_context")
        if location_state in {
            "near_support_in_bullish_structure",
            "accepted_below_support",
        }:
            s3_score += 1
            s3_drivers.append("reversal_location_active")
    s3_status, s3_score, s3_drivers = apply_intraday_setup_adjustment(
        "S3", s3_status, s3_score, s3_drivers, intraday_timing
    )
    candidates.append(setup_candidate_payload("S3", s3_status, s3_score, s3_drivers))

    s4_status = "invalid"
    s4_score = 0
    s4_drivers: list[str] = []
    if regime == "range_rotation" and at_range_edge:
        s4_status = "valid"
        s4_score += 4
        s4_drivers.extend(["range_rotation_context", "range_edge_active"])
    s4_status, s4_score, s4_drivers = apply_intraday_setup_adjustment(
        "S4", s4_status, s4_score, s4_drivers, intraday_timing
    )
    candidates.append(setup_candidate_payload("S4", s4_status, s4_score, s4_drivers))

    s5_status = "invalid"
    s5_score = 0
    s5_drivers: list[str] = []
    if spring_confirmed:
        s5_status = "valid"
        s5_score += 5
        s5_drivers.append("spring_detected")
        if regime in {"range_rotation", "potential_reversal"}:
            s5_score += 1
            s5_drivers.append("spring_context_supported")
        if location_state in {
            "near_support_in_bullish_structure",
            "at_range_edge",
            "accepted_below_support",
        }:
            s5_score += 1
            s5_drivers.append("spring_location_active")
    s5_status, s5_score, s5_drivers = apply_intraday_setup_adjustment(
        "S5", s5_status, s5_score, s5_drivers, intraday_timing
    )
    candidates.append(setup_candidate_payload("S5", s5_status, s5_score, s5_drivers))

    return sorted(
        candidates,
        key=lambda candidate: (
            SETUP_STATUS_RANK.get(str(candidate["status"]), 0),
            int(candidate["score"]),
            SETUP_PRIORITY.get(str(candidate["setup_id"]), 0),
        ),
        reverse=True,
    )


def select_setup(
    regime: str,
    trend_bias: str,
    breakout_state: str,
    structure_state: str,
    spring_confirmed: bool,
    location_state: str,
    intraday_timing: dict[str, Any],
    supports: list[dict[str, Any]],
    displacement: str | None,
) -> dict[str, Any]:
    ranked_candidates = evaluate_setup_candidates(
        regime=regime,
        trend_bias=trend_bias,
        breakout_state=breakout_state,
        structure_state=structure_state,
        spring_confirmed=spring_confirmed,
        location_state=location_state,
        intraday_timing=intraday_timing,
        supports=supports,
        displacement=displacement,
    )
    viable_candidates = [
        candidate
        for candidate in ranked_candidates
        if str(candidate["status"]) != "invalid"
    ]
    if not viable_candidates:
        candidate_evaluations = summarize_candidate_evaluations(ranked_candidates)
        return {
            "primary_setup": "NO_VALID_SETUP",
            "candidate_setups": candidate_setup_ids_from_evaluations(
                candidate_evaluations
            ),
            "candidate_evaluations": candidate_evaluations,
            "setup_drivers": list(
                dict.fromkeys(
                    value
                    for value in [regime, trend_bias, location_state, breakout_state]
                    if value
                )
            ),
            "setup_validity": "invalid",
            "ranked_candidates": ranked_candidates,
        }

    primary_candidate = viable_candidates[0]
    candidate_evaluations = summarize_candidate_evaluations(ranked_candidates)
    return {
        "primary_setup": str(primary_candidate["setup_id"]),
        "candidate_setups": candidate_setup_ids_from_evaluations(
            candidate_evaluations
        ),
        "candidate_evaluations": candidate_evaluations,
        "setup_drivers": list(primary_candidate["drivers"]),
        "setup_validity": str(primary_candidate["status"]),
        "ranked_candidates": ranked_candidates,
    }
