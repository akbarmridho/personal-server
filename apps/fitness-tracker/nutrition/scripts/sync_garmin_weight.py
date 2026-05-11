#!/usr/bin/env python3
"""Push body composition to Garmin Connect using shared token store."""

import json
import sys

from garminconnect import Garmin


def main():
    if len(sys.argv) < 3:
        print("Usage: sync_garmin_weight.py <weight_kg> <date_YYYY-MM-DD> [json_body_comp]")
        sys.exit(1)

    weight = float(sys.argv[1])
    weight_date = sys.argv[2]
    timestamp = weight_date + "T12:00:00+07:00"

    body_comp = {}
    if len(sys.argv) >= 4:
        try:
            body_comp = json.loads(sys.argv[3])
        except json.JSONDecodeError:
            pass

    token_store = "/app/garminconnect-tokens"

    garmin = Garmin()
    garmin.login(token_store)

    garmin.add_body_composition(
        timestamp=timestamp,
        weight=weight,
        percent_fat=body_comp.get("percent_fat"),
        percent_hydration=body_comp.get("percent_hydration"),
        visceral_fat_mass=body_comp.get("visceral_fat_mass"),
        bone_mass=body_comp.get("bone_mass"),
        muscle_mass=body_comp.get("muscle_mass"),
        basal_met=body_comp.get("basal_met"),
        visceral_fat_rating=body_comp.get("visceral_fat_rating"),
        bmi=body_comp.get("bmi"),
    )

    fields = [f"weight={weight}kg"]
    if body_comp.get("percent_fat"):
        fields.append(f"bf={body_comp['percent_fat']}%")
    if body_comp.get("muscle_mass"):
        fields.append(f"muscle={body_comp['muscle_mass']}kg")
    if body_comp.get("visceral_fat_rating"):
        fields.append(f"vf={body_comp['visceral_fat_rating']}")
    if body_comp.get("bmi"):
        fields.append(f"bmi={body_comp['bmi']}")
    if body_comp.get("basal_met"):
        fields.append(f"bmr={body_comp['basal_met']}")

    print(f"Synced {', '.join(fields)} for {weight_date} to Garmin Connect")


if __name__ == "__main__":
    main()
