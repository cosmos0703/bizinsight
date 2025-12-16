import csv
import os

files = {
    'pop': 'public/data/pop_dong.csv',
    'store': 'public/data/store_dong.csv',
    'revenue': 'public/data/revenue_dong.csv',
    'rent': 'public/data/rent_dong.csv'
}

for key, path in files.items():
    print(f"--- {key} ({path}) ---")
    
    encodings_to_try = ['euc-kr', 'utf-8', 'cp949']
    if key == 'rent':
        encodings_to_try = ['utf-8', 'euc-kr']

    success = False
    for enc in encodings_to_try:
        try:
            with open(path, 'r', encoding=enc) as f:
                reader = csv.reader(f)
                headers = next(reader)
                first_row = next(reader)
                print(f"Success with encoding: {enc}")
                print(f"Headers ({len(headers)}): {headers}")
                print(f"First Row: {first_row}")
                success = True
                break
        except Exception as e:
            pass
            # print(f"Failed with {enc}: {e}")
    
    if not success:
        print("FAILED to read file with any common encoding.")
    print("\n")
