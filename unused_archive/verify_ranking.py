import csv
import math

# 1. Configuration
CAPITAL = 12000 # Default capital in the UI (1억 2천)
BUDGET_POWER = CAPITAL / 50 # Logic from JSX

# 2. Load Data
data = {}

def load_csv(filename, key_col, val_col, value_processor=None):
    with open(f'public/data/{filename}', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = row[key_col]
            if key not in data: data[key] = {'rent':0, 'pop':0, 'store':0}
            
            val = row[val_col].replace(',', '')
            if value_processor:
                val = value_processor(val)
            else:
                val = float(val) if val else 0
            
            if 'rent' in filename: data[key]['rent'] = val
            if 'pop' in filename: data[key]['pop'] = val
            if 'store' in filename: data[key]['store'] += val # Accumulate openings + closures? 
            # Wait, JSX logic: 
            # stores: d.totalStores || d.openings
            # In dataLoader.js: totalStores += parseInt(row['점포_수'])
            if 'store' in filename and val_col == '점포_수': data[key]['store'] = val

# Rent: Won/m2 -> ManWon/Pyeong
def process_rent(val):
    try:
        rent_sqm = float(val)
        return round((rent_sqm * 3.3058) / 10000, 1)
    except: return 0

# Pop: Just int
def process_pop(val):
    return int(val) if val else 0

# Store: Just int
def process_store(val):
    return int(val) if val else 0

load_csv('rent_dong_filtered.csv', '행정구역', '전체', process_rent)
load_csv('pop_dong_filtered.csv', '행정동_코드_명', '총_유동인구_수', process_pop)
load_csv('store_dong_filtered.csv', '행정동_코드_명', '점포_수', process_store)

# 3. Score Calculation
results = []
dongs = [k for k, v in data.items() if v['pop'] > 0] # Filter valid ones

# Find Min/Max for Normalization
pops = [data[d]['pop'] for d in dongs]
stores = [data[d]['store'] for d in dongs]

min_pop, max_pop = min(pops), max(pops)
min_store, max_store = min(stores), max(stores)

print(f"Stats - Pop: {min_pop}~{max_pop}, Store: {min_store}~{max_store}")

for d in dongs:
    item = data[d]
    rent = item['rent']
    pop = item['pop']
    store = item['store']
    
    # Capital Score
    if rent <= BUDGET_POWER:
        capital_score = 100 - ((rent / (BUDGET_POWER or 1)) * 20)
    else:
        over_ratio = rent / (BUDGET_POWER or 1)
        capital_score = max(0, 100 - (over_ratio * 50))
        
    # Store Score
    store_score = ((store - min_store) / (max_store - min_store)) * 100
    
    # Traffic Score (Population)
    traffic_score = ((pop - min_pop) / (max_pop - min_pop)) * 100
    
    # Total
    # Logic: (capitalScore * 0.2) + (storeScore * 0.3) + (trafficScore * 0.5);
    total = (capital_score * 0.2) + (store_score * 0.3) + (traffic_score * 0.5)
    
    results.append({
        'name': d,
        'total': round(total, 1),
        'scores': (round(capital_score,1), round(store_score,1), round(traffic_score,1)),
        'raw': (rent, store, pop)
    })

# 4. Sort and Print
results.sort(key=lambda x: x['total'], reverse=True)

print("\n--- TOP 10 RANKING ---")
for i, r in enumerate(results[:10]):
    print(f"{i+1}. {r['name']} : {r['total']}점 (Rent:{r['raw'][0]}, Store:{r['raw'][1]}, Pop:{r['raw'][2]})")

print("\n--- Target Check ---")
targets = ['연남동', '신사동', '성수1가1동', '성수2가1동']
for t in targets:
    found = next((r for r in results if r['name'] == t), None)
    if found:
        rank = results.index(found) + 1
        print(f"{rank}위. {t} : {found['total']}점 (Scores: Cap {found['scores'][0]}, Store {found['scores'][1]}, Pop {found['scores'][2]})")
    else:
        print(f"{t}: Not found")
