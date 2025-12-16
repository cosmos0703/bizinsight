
import csv
import sys

files = [
    'src/data/서울시 상권분석서비스(추정매출-행정동)_2024년.csv',
    'src/data/서울시 상권분석서비스(길단위인구-행정동).csv'
]

target = "종로"

for fpath in files:
    print(f"Checking {fpath}...")
    try:
        with open(fpath, 'r', encoding='euc-kr') as f:
            reader = csv.reader(f)
            for row in reader:
                for col in row:
                    if target in col:
                        print(f"Found in {fpath}: {col}")
                        if "1" in col and "2" in col: # Look for 1,2,3,4
                             sys.exit(0)
    except Exception as e:
        print(f"Error reading {fpath}: {e}")
