#!/usr/bin/env python3

import csv

input_file = "geo.merged.csv"
output_file = "geo.merged.sorted.csv"

with open(input_file, "r", newline="", encoding="utf-8") as infile:
    reader = csv.reader(infile)
    rows = list(reader)

# Sort by second column (index 1)
rows.sort(key=lambda row: row[1].strip().lower() if len(row) > 1 else "")

with open(output_file, "w", newline="", encoding="utf-8") as outfile:
    writer = csv.writer(outfile)
    writer.writerows(rows)

print(f"Sorted {len(rows)} rows by column 2")
print(f"Output written to {output_file}")