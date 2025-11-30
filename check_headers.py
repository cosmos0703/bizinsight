
import csv

file_path = 'src/data/서울시 상권분석서비스(길단위인구-행정동).csv'
try:
    with open(file_path, 'r', encoding='euc-kr') as f:
        reader = csv.reader(f)
        headers = next(reader)
        print(headers)
except Exception as e:
    print(e)
