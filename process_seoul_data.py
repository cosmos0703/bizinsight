import csv
import json
import os

# File Paths
FILE_REVENUE = 'public/data/revenue_dong.csv'
FILE_STORE = 'public/data/store_dong.csv'
FILE_COST = 'public/data/startup_costs_2024.csv'
FILE_POP = 'public/data/pop_dong_filtered.csv' # Use filtered pop/rent for efficiency
FILE_RENT = 'public/data/rent_dong_filtered.csv'
OUTPUT_FILE = 'public/data/seoul_biz_data.json'

# Mappings
NAME_MAPPING = {
    "한식": "한식음식점", "중식": "중식음식점", "일식": "일식음식점", "서양식": "양식음식점",
    "제과제빵": "제과점", "피자": "패스트푸드점", "치킨": "치킨전문점", "분식": "분식전문점",
    "주점": "호프-간이주점", "커피": "커피-음료", "편의점": "편의점", "종합소매점": "슈퍼마켓",
    "화장품": "화장품", "이미용": "미용실", "네일": "네일숍", "피부": "피부관리실",
    "세탁": "세탁소", "교습": "일반교습학원", "외국어": "외국어학원", "예체능": "예술학원",
    "부동산": "부동산중개업", "PC방": "PC방", "노래방": "노래방", "독서실": "독서실",
    "고시원": "고시원", "숙박": "여관", "의류": "일반의류", "가방": "가방",
    "신발": "신발", "안경": "안경", "의약품": "의약품", "일반의원": "일반의원",
    "치과의원": "치과의원", "한의원": "한의원", "가구": "가구", "인테리어": "인테리어",
    "반찬": "반찬가게", "청과": "청과상", "수산물": "수산물판매", "육류": "육류판매",
    "화초": "화초", "운동": "운동/경기용품", "골프": "골프연습장", "자동차수리": "자동차수리",
    "서적": "서적", "문구": "문구", "스포츠클럽": "스포츠클럽"
}

def load_startup_costs():
    costs = {}
    try:
        with open(FILE_COST, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row.get('서비스_업종_코드_명')
                total = row.get('합계금액')
                if name and total:
                    try:
                        val = float(total.replace(',', ''))
                        if name in NAME_MAPPING.values(): costs[name] = val
                        else: costs[name] = val # Store all for fallback
                    except ValueError: pass
    except Exception as e:
        print(f"Error loading costs: {e}")
    return costs

def normalize_dong(name):
    if not name: return None
    # Standardize separators
    name = name.replace('·', '.').replace(',', '.').strip()
    # Handle specific complex cases
    if '종로' in name and '1' in name and '2' in name and '3' in name and '4' in name:
        return '종로1.2.3.4가동'
    return name

def load_pop_rent():
    pop_map = {}
    rent_map = {}
    
    # Pop (utf-8)
    try:
        with open(FILE_POP, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                dong = normalize_dong(row.get('행정동_코드_명'))
                if dong:
                    pop_map[dong] = int(row.get('총_유동인구_수', 0))
    except Exception as e: print(f"Pop error: {e}")

    # Rent (utf-8)
    try:
        with open(FILE_RENT, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                dong = normalize_dong(row.get('행정구역'))
                if dong:
                    val = row.get('전체', '0')
                    try:
                        rent_sqm = int(val.replace(',', ''))
                        rent_pyeong = round((rent_sqm * 3.3058) / 10000)
                        rent_map[dong] = rent_pyeong
                    except: pass
    except Exception as e: print(f"Rent error: {e}")
    
    return pop_map, rent_map

def process_data():
    costs = load_startup_costs()
    pop_map, rent_map = load_pop_rent()
    
    final_data = {} 

    def get_dong_entry(dong):
        dong = normalize_dong(dong)
        if not dong: return None
        
        if dong not in final_data:
            final_data[dong] = {
                'pop': pop_map.get(dong, 0),
                'rent': rent_map.get(dong, 0),
                'industries': {}
            }
        return final_data[dong]

    # 1. Store Data (cp949)
    print("Processing Store Data...")
    try:
        with open(FILE_STORE, 'r', encoding='cp949') as f:
            reader = csv.DictReader(f)
            for row in reader:
                yr = row.get('기준_년분기_코드', '')[:4]
                if yr not in ['2023', '2024']: continue
                
                dong = row.get('행정동_코드_명')
                entry = get_dong_entry(dong)
                if not entry: continue
                ind = row.get('서비스_업종_코드_명')

                if ind not in entry['industries']:
                    entry['industries'][ind] = {
                        'rev': 0, 'count': 0, 'open': 0, 'close': 0, 
                        'cost': costs.get(ind, 0),
                        'time': [0]*6,
                        'age': {'10':0, '20':0, '30':0, '40':0, '50':0, '60':0},
                        'day': {'Mon':0, 'Tue':0, 'Wed':0, 'Thu':0, 'Fri':0, 'Sat':0, 'Sun':0}
                    }
                
                target = entry['industries'][ind]
                try:
                    target['count'] = max(target['count'], int(row.get('점포_수', 0))) 
                    target['open'] += int(row.get('개업_점포_수', 0))
                    target['close'] += int(row.get('폐업_점포_수', 0))
                except: pass
    except Exception as e: print(f"Store error: {e}")

    # 2. Revenue Data (cp949)
    print("Processing Revenue Data...")
    try:
        with open(FILE_REVENUE, 'r', encoding='cp949') as f:
            reader = csv.DictReader(f)
            for row in reader:
                yr = row.get('기준_년분기_코드', '')[:4]
                if yr not in ['2023', '2024']: continue

                dong = row.get('행정동_코드_명')
                entry = get_dong_entry(dong)
                if not entry: continue
                ind = row.get('서비스_업종_코드_명')
                
                if ind not in entry['industries']:
                     entry['industries'][ind] = {
                        'rev': 0, 'count': 1, 'open': 0, 'close': 0, 
                        'cost': costs.get(ind, 0),
                        'time': [0]*6,
                        'age': {'10':0, '20':0, '30':0, '40':0, '50':0, '60':0},
                        'day': {'Mon':0, 'Tue':0, 'Wed':0, 'Thu':0, 'Fri':0, 'Sat':0, 'Sun':0}
                    }

                target = entry['industries'][ind]
                try:
                    rev = int(row.get('당월_매출_금액', 0))
                    target['rev'] += rev
                    
                    target['time'][0] += int(row.get('시간대_00~06_매출_금액', 0))
                    target['time'][1] += int(row.get('시간대_06~11_매출_금액', 0))
                    target['time'][2] += int(row.get('시간대_11~14_매출_금액', 0))
                    target['time'][3] += int(row.get('시간대_14~17_매출_금액', 0))
                    target['time'][4] += int(row.get('시간대_17~21_매출_금액', 0))
                    target['time'][5] += int(row.get('시간대_21~24_매출_금액', 0))

                    target['age']['10'] += int(row.get('연령대_10_매출_금액', 0))
                    target['age']['20'] += int(row.get('연령대_20_매출_금액', 0))
                    target['age']['30'] += int(row.get('연령대_30_매출_금액', 0))
                    target['age']['40'] += int(row.get('연령대_40_매출_금액', 0))
                    target['age']['50'] += int(row.get('연령대_50_매출_금액', 0))
                    target['age']['60'] += int(row.get('연령대_60_이상_매출_금액', 0))

                    target['day']['Mon'] += int(row.get('월요일_매출_금액', 0))
                    target['day']['Tue'] += int(row.get('화요일_매출_금액', 0))
                    target['day']['Wed'] += int(row.get('수요일_매출_금액', 0))
                    target['day']['Thu'] += int(row.get('목요일_매출_금액', 0))
                    target['day']['Fri'] += int(row.get('금요일_매출_금액', 0))
                    target['day']['Sat'] += int(row.get('토요일_매출_금액', 0))
                    target['day']['Sun'] += int(row.get('일요일_매출_금액', 0))
                except: pass

    except Exception as e: print(f"Revenue error: {e}")

    # 3. Post-process: Average Revenue (Quarterly Sum -> Monthly Avg)
    # Note: If we summed 4 quarters, div by 12. If 1 quarter, div by 3.
    # To be simple, we just assume we aggregated available data. 
    # Better: Use 'rev' as-is for ranking, but for display (Monthly), we need to normalize.
    # Let's assume the aggregation above is "Total Revenue over analyzed period".
    # For simplicity in this demo, we'll take the Raw Sum and let frontend handle or just use it for relative scoring.
    # Actually, let's normalize to "Monthly Average per Store" here to save frontend work.
    # But wait, we don't know how many months were aggregated. 
    # Let's keep it raw sum for scoring, but maybe add a 'months_aggregated' field? 
    # Or just assume 1 year (4 quarters) if data is full.
    
    # Simplification: Just output the structure. Frontend will interpret 'rev' as "Total Market Scale" (good for scoring).
    # For "Monthly Revenue per Store": (rev / count) / (quarters * 3).
    # We will just save raw sums.

    print(f"Writing {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, ensure_ascii=False)
    print("Done.")

if __name__ == "__main__":
    process_data()