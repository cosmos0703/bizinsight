import csv
import os

# Hardcoded DONG_COORDINATES keys (copied from JS)
TARGET_DONGS = [
    '청운효자동', '사직동', '삼청동', '부암동', '평창동', '종로1·2·3·4가동', '혜화동',
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

FILES = {
    'pop': { 'src': 'public/data/pop_dong.csv', 'dst': 'public/data/pop_dong_filtered.csv', 'key': '행정동_코드_명', 'enc': 'euc-kr' },
    'store': { 'src': 'public/data/store_dong.csv', 'dst': 'public/data/store_dong_filtered.csv', 'key': '행정동_코드_명', 'enc': 'euc-kr' },
    'revenue': { 'src': 'public/data/revenue_dong.csv', 'dst': 'public/data/revenue_dong_filtered.csv', 'key': '행정동_코드_명', 'enc': 'euc-kr' },
    'rent': { 'src': 'public/data/rent_dong.csv', 'dst': 'public/data/rent_dong_filtered.csv', 'key': '행정구역', 'enc': 'utf-8' }
}

for name, conf in FILES.items():
    print(f"Processing {name}...")
    try:
        with open(conf['src'], 'r', encoding=conf['enc']) as f_in, \
             open(conf['dst'], 'w', encoding='utf-8', newline='') as f_out: # Write as UTF-8
            
            reader = csv.DictReader(f_in)
            writer = csv.DictWriter(f_out, fieldnames=reader.fieldnames)
            writer.writeheader()
            
            count = 0
            for row in reader:
                # key_val = row.get(conf['key'])
                # if key_val and key_val.strip() in TARGET_DONGS:
                writer.writerow(row)
                count += 1
            print(f"  Saved {count} rows.")
            
    except Exception as e:
        print(f"  Error: {e}")

print("Done.")
