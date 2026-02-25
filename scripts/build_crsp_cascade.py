"""
Build a cascade-ready CRSP data structure for the calculator UI.

Output: data/crsp_cascade.json
Shape:
{
  "categories": ["Motorcycle", "SUV", ...],
  "data": {
    "Motorcycle": {
      "Honda": [
        {"model": "CB400X", "cc": 399, "fuel": "GASOLINE", "crsp": 971615},
        ...
      ]
    },
    "SUV": {
      "Toyota": [ ... ]
    }
  }
}
"""

import json
from pathlib import Path
from collections import defaultdict

DATA_DIR = Path(__file__).parent.parent / "data"

# ── Normalize body types to clean display categories ─────────────────────────

CATEGORY_MAP = {
    # SUV / Crossover
    "SUV": "SUV",
    "SUV-COUPE": "SUV",
    "CROSSOVER": "SUV",
    "suv": "SUV",
    # Sedan / Saloon
    "SEDAN": "Sedan",
    "SALOON": "Sedan",
    "SAL": "Sedan",
    # Hatchback
    "HATCHBACK": "Hatchback",
    "HATCBACK": "Hatchback",
    # Station Wagon
    "WAGON": "Station Wagon",
    "S/WAGON": "Station Wagon",
    "S. WAGON": "Station Wagon",
    "STATION WAGON": "Station Wagon",
    # Van / Minivan
    "VAN": "Van",
    "MINIVAN": "Van",
    "MINVAN": "Van",
    # Coupe / Convertible
    "COUPE": "Coupe",
    "CONVERTIBLE": "Convertible",
    "CONVRTIBLE": "Convertible",
    "ROADSTER": "Convertible",
    # Pickup / Truck
    "TRUCK": "Pickup / Truck",
    "TRK": "Pickup / Truck",
    "SINGLE CAB": "Pickup / Truck",
    "SINGLE CABIN": "Pickup / Truck",
    "S/CAB": "Pickup / Truck",
    "S/CABIN": "Pickup / Truck",
    "DUAL CAB": "Pickup / Truck",
    "D/CAB": "Pickup / Truck",
    "DOUBLE CABIN": "Pickup / Truck",
    "DOUBLE CAB": "Pickup / Truck",
    "DOUBLE  CAB": "Pickup / Truck",
    "CREW CAB": "Pickup / Truck",
    "PICK UP": "Pickup / Truck",
    "PICKUP": "Pickup / Truck",
    # Bus
    "BUS": "Bus",
    "MINI BUS": "Bus",
    "PEOPLE MOVER": "Bus",
    # Commercial
    "TIPPER": "Commercial",
    "MIXER": "Commercial",
    "TRANSIT  MIXER": "Commercial",
    "TRACTOR": "Commercial",
    "AMBULANCE": "Commercial",
    "PRIM£ MOVER": "Commercial",
    "PM": "Commercial",
    "3": "Commercial",
    "OTHER": "Commercial",
}

# Display order for category buttons
CATEGORY_ORDER = [
    "Motorcycle",
    "SUV",
    "Sedan",
    "Hatchback",
    "Station Wagon",
    "Van",
    "Pickup / Truck",
    "Coupe",
    "Convertible",
    "Bus",
    "Commercial",
]


def title_case(s):
    """Toyota HARRIER 2.0 → Toyota Harrier 2.0"""
    return " ".join(w.capitalize() if w.isupper() else w for w in s.split())


def build():
    vehicles = json.loads((DATA_DIR / "crsp_vehicles.json").read_text())
    motorcycles = json.loads((DATA_DIR / "crsp_motorcycles.json").read_text())

    cascade = defaultdict(lambda: defaultdict(list))

    # Motor vehicles
    skipped = 0
    for v in vehicles:
        body = (v.get("body_type") or "").strip()
        category = CATEGORY_MAP.get(body)
        if not category:
            skipped += 1
            continue

        make = title_case(v["make"])
        entry = {
            "model": title_case(v["model"]),
            "crsp": v["crsp_kes"],
        }
        mn = v.get("model_number")
        if mn and mn != "None":
            entry["mn"] = mn
        if v.get("engine_cc"):
            entry["cc"] = v["engine_cc"]
        if v.get("fuel"):
            entry["fuel"] = v["fuel"].title()
        if v.get("transmission"):
            entry["tx"] = v["transmission"]

        cascade[category][make].append(entry)

    # Motorcycles (separate source sheet)
    for m in motorcycles:
        make = title_case(m["make"])
        entry = {
            "model": title_case(m["model"]),
            "crsp": m["crsp_kes"],
        }
        if m.get("engine_cc"):
            entry["cc"] = m["engine_cc"]
        if m.get("fuel"):
            entry["fuel"] = m["fuel"].title()
        cascade["Motorcycle"][make].append(entry)

    # Sort makes and models alphabetically
    sorted_cascade = {}
    for cat in CATEGORY_ORDER:
        if cat in cascade:
            sorted_cascade[cat] = {
                make: sorted(models, key=lambda x: x["model"])
                for make, models in sorted(cascade[cat].items())
            }

    out = {
        "categories": [c for c in CATEGORY_ORDER if c in sorted_cascade],
        "data": sorted_cascade,
    }

    raw = json.dumps(out, separators=(",", ":"), ensure_ascii=False)
    (DATA_DIR / "crsp_cascade.json").write_text(raw)

    total = sum(len(models) for cat in sorted_cascade.values() for models in cat.values())
    print(f"Categories: {len(sorted_cascade)}")
    for cat, makes in sorted_cascade.items():
        model_count = sum(len(m) for m in makes.values())
        print(f"  {cat:<20} {len(makes):>4} makes  {model_count:>5} models")
    print(f"\nTotal entries: {total}  (skipped: {skipped})")
    print(f"Output size:   {len(raw)/1024:.1f} KB")
    print("Written → data/crsp_cascade.json")


if __name__ == "__main__":
    build()
