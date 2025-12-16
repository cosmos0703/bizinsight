import os
import shutil
import unicodedata

DIR = 'public/data'
files = os.listdir(DIR)

print("Files found:", files)

mapping = {
    '환산임대료': 'rent_dong.csv',
    '길단위인구-행정동': 'pop_dong.csv',
    '점포-행정동': 'store_dong.csv',
    '추정매출-행정동': 'revenue_dong.csv',
    '전월세가_2024': 'rent_seoul_2024.csv',
    '자치구별+개업': 'openings_district.csv',
    '규모별+폐업': 'closures_district.csv',
    '면적(3.3㎡)당+매출액': 'revenue_district.csv',
    '매장용빌딩+임대료': 'rent_district.csv'
}

for filename in files:
    # Normalize filename to NFC for matching
    norm_name = unicodedata.normalize('NFC', filename)
    
    for key, new_name in mapping.items():
        if key in norm_name:
            src = os.path.join(DIR, filename)
            dst = os.path.join(DIR, new_name)
            print(f"Renaming {filename} -> {new_name}")
            os.rename(src, dst)
            break
