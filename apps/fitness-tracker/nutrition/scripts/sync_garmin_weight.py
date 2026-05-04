#!/usr/bin/env python3
"""Push weight to Garmin Connect using shared token store."""

import sys

from garminconnect import Garmin


def main():
    if len(sys.argv) != 3:
        print("Usage: sync_garmin_weight.py <weight_kg> <date_YYYY-MM-DD>")
        sys.exit(1)

    weight = float(sys.argv[1])
    weight_date = sys.argv[2]

    token_store = "/app/garminconnect-tokens"

    garmin = Garmin()
    garmin.login(token_store)

    garmin.add_body_composition(
        timestamp=weight_date + "T12:00:00+07:00",
        weight=weight,
    )
    print(f"Synced {weight} kg for {weight_date} to Garmin Connect")


if __name__ == "__main__":
    main()
