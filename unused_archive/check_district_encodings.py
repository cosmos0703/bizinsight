import csv
import os

files = {
    'openings_district': 'public/data/openings_district.csv',
    'closures_district': 'public/data/closures_district.csv',
    'revenue_district': 'public/data/revenue_district.csv',
    'rent_district': 'public/data/rent_district.csv'
}

for key, path in files.items():
    print(f"--- {key} ({path}) ---")
    encodings_to_try = ['euc-kr', 'utf-8', 'cp949']
    success = False
    for enc in encodings_to_try:
        try:
            with open(path, 'r', encoding=enc) as f:
                reader = csv.reader(f)
                headers = next(reader)
                print(f"Success with encoding: {enc}")
                print(f"Headers: {headers}")
                success = True
                break
        except Exception:
            pass
    if not success:
        print("FAILED")
    print("\n")
