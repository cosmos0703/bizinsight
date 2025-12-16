import csv

def inspect_dong(target_dong):
    print(f"--- Inspecting {target_dong} ---")
    
    # 1. Revenue
    total_revenue = 0
    with open('public/data/revenue_dong_filtered.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['행정동_코드_명'].strip() == target_dong:
                # 당월_매출_금액 or 분기당_매출_금액
                val = int(row.get('당월_매출_금액', row.get('분기당_매출_금액', '0')))
                total_revenue += val
    
    print(f"Total Quarterly Revenue (Won): {total_revenue:,}")
    
    # 2. Stores
    total_stores = 0
    with open('public/data/store_dong_filtered.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        # store_dong.csv has multiple rows per dong (one for each sector)
        # We need to sum '점포_수' for all sectors in that dong
        for row in reader:
            if row['행정동_코드_명'].strip() == target_dong:
                total_stores += int(row['점포_수'])
                
    print(f"Total Stores: {total_stores}")
    
    # 3. Calculate
    if total_stores > 0:
        monthly_avg_per_store = (total_revenue / total_stores) / 3
        print(f"Monthly Avg Revenue per Store (Won): {monthly_avg_per_store:,.0f}")
        print(f"Display (Man-won): {monthly_avg_per_store/10000:.1f}")
    else:
        print("No stores found.")

inspect_dong('연남동')
