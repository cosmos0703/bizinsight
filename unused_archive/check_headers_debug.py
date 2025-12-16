import pandas as pd
import os

files = {
    'pop': 'bizinsight/public/data/pop_dong.csv',
    'store': 'bizinsight/public/data/store_dong.csv',
    'revenue': 'bizinsight/public/data/revenue_dong.csv',
    'rent': 'bizinsight/public/data/rent_dong.csv'
}

for key, path in files.items():
    print(f"--- {key} ({path}) ---")
    try:
        # Try EUC-KR first for the big ones
        if key in ['pop', 'store', 'revenue']:
            encoding = 'euc-kr'
        else:
            encoding = 'utf-8'
            
        df = pd.read_csv(path, encoding=encoding, nrows=2)
        print(f"Encoding used: {encoding}")
        print("Columns:", df.columns.tolist())
        print("First row:", df.iloc[0].tolist())
    except Exception as e:
        print(f"Error reading with {encoding}: {e}")
        # Fallback try
        try:
            alt_enc = 'utf-8' if encoding == 'euc-kr' else 'euc-kr'
            df = pd.read_csv(path, encoding=alt_enc, nrows=2)
            print(f"Fallback success with {alt_enc}")
            print("Columns:", df.columns.tolist())
        except Exception as e2:
            print(f"Fallback failed: {e2}")
    print("\n")
