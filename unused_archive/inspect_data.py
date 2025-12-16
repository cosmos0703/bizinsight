import csv

# 1. Load Target Dongs from coordinates file (simulated)
# Copied from filter_data.py / DONG_COORDINATES
TARGET_DONGS = [
    '청운효자동', '사직동', '삼청동', '부암동', '평창동', '종로1.2.3.4가동', '혜화동',
    '소공동', '회현동', '명동', '을지로동', '광희동', '신당동',
    '용산2가동', '이태원1동', '이태원2동', '한남동', '용문동', '이촌1동',
    '성수1가1동', '성수2가1동', '행당1동',
    '화양동',
    '서교동', '연남동', '망원1동', '합정동', '상암동', '공덕동', '도화동',
    '신촌동', '충현동',
    '신사동', '논현1동', '압구정동', '청담동', '삼성1동', '역삼1동', '대치2동',
    '서초3동', '반포4동', '양재1동',
    '잠실3동', '잠실본동', '가락1동', '가락본동', '문정2동', '장지동', '위례동', '풍납1동', '풍납2동', '방이1동', '방이2동', '오금동', '송파1동', '석촌동', '삼전동',
    '천호2동', '성내1동', '성내2동', '길동', '둔촌2동', '명일1동', '고덕1동', '암사1동',
    '가양1동', '발산1동', '화곡1동', '등촌1동', '목1동', '신정4동',
    '구로3동', '신도림동', '가산동', '독산1동', '신림동', '청룡동', '행운동', '낙성대동',
    '노량진1동', '대방동', '사당1동',
    '여의동', '문래동', '양평1동', '양평2동', '당산1동', '당산2동', '신길1동',
    '진관동', '대조동', '갈현1동', '불광1동',
    '제기동', '전농1동', '안암동', '성북동', '상봉2동', '면목본동',
    '상계2동', '중계본동', '월계1동', '창4동', '쌍문1동', '수유3동', '미아동'
]

def check_file(filename, key_col):
    path = f'public/data/{filename}'
    found_dongs = set()
    try:
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                found_dongs.add(row[key_col].strip())
    except FileNotFoundError:
        print(f"File not found: {path}")
        return

    missing = [d for d in TARGET_DONGS if d not in found_dongs]
    print(f"--- {filename} ---")
    print(f"Missing Dongs ({len(missing)}): {missing}")
    
    # Special Check for Jegi-dong
    if 'rent' in filename:
        print("\n[Jegi-dong Rent Check]")
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row[key_col].strip() == '제기동':
                    print(f"Row Data: {row}")
                    val = row.get('전체', '0').replace(',', '')
                    try:
                        rent_sqm = int(val)
                        rent_pyeong = (rent_sqm * 3.3058) / 10000
                        print(f"Rent(m2): {rent_sqm}")
                        print(f"Rent(Pyeong/Man-won): {rent_pyeong:.2f}")
                    except:
                        print("Error parsing rent value")

    if 'revenue' in filename:
        print("\n[Jegi-dong Revenue Check]")
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row[key_col].strip() == '제기동':
                    print(f"Row Data Sample: {list(row.values())[:5]}...")
                    # Revenue Logic from Code
                    # const salesVal = parseInt(row['당월_매출_금액'] || row['분기당_매출_금액'] || 0);
                    val = row.get('당월_매출_금액', row.get('분기당_매출_금액', '0'))
                    print(f"Revenue Raw: {val}")
                    # Monthly Avg = (Total / StoreCount) / 3  <-- This logic is in JS, but let's see raw total
                    break

def find_jongno_name():
    path = 'public/data/rent_dong.csv' # Original File
    print("\n[Searching for Jongno in Original Rent File]")
    try:
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if '종로' in row['행정구역']:
                    print(f"Found: {row['행정구역']}")
    except Exception as e:
        print(f"Error: {e}")

print("Checking Missing Dongs & Jegi-dong Value...\n")
check_file('rent_dong_filtered.csv', '행정구역')
check_file('revenue_dong_filtered.csv', '행정동_코드_명')
find_jongno_name()
