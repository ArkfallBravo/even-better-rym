#!/usr/bin/env python3

import csv
import re

input_file = "geo.sorted.csv"
output_file = "geo.merged.csv"

number_re = re.compile(r"^-?\d+(\.\d+)?$")

records = {}

def is_coordinate_row(row):
    return (
        len(row) >= 3
        and number_re.match(row[1].strip())
        and number_re.match(row[2].strip())
    )

with open(input_file, "r", newline="", encoding="utf-8") as infile:
    reader = csv.reader(infile)

    for row in reader:
        row = [c.strip() for c in row]

        if not row:
            continue

        key = row[0]

        if key not in records:
            records[key] = {
                "text": None,
                "coords": None
            }

        if is_coordinate_row(row):
            records[key]["coords"] = [row[1], row[2]]
        else:
            records[key]["text"] = row[1:]

merged_rows = []
unpaired_rows = []

for key, data in records.items():

    # Pair exists
    if data["text"] and data["coords"]:
        merged_rows.append(
            [key] + data["text"] + data["coords"]
        )

    # Text only
    elif data["text"]:
        unpaired_rows.append(
            [key] + data["text"]
        )

    # Coordinates only
    elif data["coords"]:
        unpaired_rows.append(
            [key] + data["coords"]
        )

with open(output_file, "w", newline="", encoding="utf-8") as outfile:
    writer = csv.writer(outfile)

    # Write merged rows first
    writer.writerows(merged_rows)

    # Then append all unpaired rows
    writer.writerows(unpaired_rows)

print(f"Merged rows: {len(merged_rows)}")
print(f"Unpaired rows appended: {len(unpaired_rows)}")
print(f"Output written to {output_file}")