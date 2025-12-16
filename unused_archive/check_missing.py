
import csv
import sys

files = [
    'src/data/서울시 상권분석서비스(추정매출-행정동)_2024년.csv',
    'src/data/서울시 상권분석서비스(길단위인구-행정동).csv'
]

targets = ["동작", "대방"]

for fpath in files:
    print(f"Checking {fpath}...")
    try:
        with open(fpath, 'r', encoding='euc-kr') as f:
            reader = csv.reader(f)
            for row in reader:
                for col in row:
                    for t in targets:
                        if t in col:
                            print(f"Found in {fpath}: {col}")
                            if "사당" in col or "상도" in col: # Just sample check
                                pass
    except Exception as e:
        print(f"Error reading {fpath}: {e}")
