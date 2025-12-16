
import csv
import sys

# Since I can't import the DONG_COORDINATES easily, I'll just check specific names if needed,
# or better, just list all dongs in the CSV.

file_path = 'src/data/서울시 상권분석서비스(추정매출-행정동)_2024년.csv'
dongs_in_csv = set()

try:
    with open(file_path, 'r', encoding='euc-kr') as f:
        reader = csv.DictReader(f)
        for row in reader:
            dong = row.get('행정동_코드_명')
            if dong:
                dongs_in_csv.add(dong.replace('·', '.'))

    # List of dongs from dongCoordinates.js (extracted manually or passed)
    # I will just print the dongs found in CSV to stdout so I can grep or inspect.
    print("Dongs found in CSV:")
    for d in sorted(list(dongs_in_csv)):
        print(d)

except Exception as e:
    print(f"Error: {e}")
