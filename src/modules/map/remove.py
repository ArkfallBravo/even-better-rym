#!/usr/bin/env python3

import csv

input_file = "geo.csv"
output_file = "geo.sorted.csv"

seen = set()
duplicates = []

with open(input_file, "r", newline="", encoding="utf-8") as infile:
    reader = csv.reader(infile)

    # Preserve header
    header = next(reader)

    unique_rows = []

    for row in reader:
        row_key = tuple(row)

        if row_key in seen:
            duplicates.append(row)
        else:
            seen.add(row_key)
            unique_rows.append(row)

# Report duplicates
if duplicates:
    print("Duplicates found and removed:")
    for dup in duplicates:
        print(",".join(dup))
else:
    print("No duplicates found.")

# Optional: sort output rows
unique_rows.sort()

# Write deduplicated file
with open(output_file, "w", newline="", encoding="utf-8") as outfile:
    writer = csv.writer(outfile)
    writer.writerow(header)
    writer.writerows(unique_rows)

print(f"\nWrote {len(unique_rows)} unique rows to {output_file}")
print(f"Removed {len(duplicates)} duplicate rows")