import csv

def inspect_dong(target_dong):
    print(f"--- Inspecting {target_dong} ---")
    
    # 1. Revenue
    total_revenue = 0
    with open('public/data/revenue_dong_filtered.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['행정동_코드_명'].strip() == target_dong:
                val = int(row.get('당월_매출_금액', row.get('분기당_매출_금액', '0')))
                total_revenue += val
    
    print(f"Total Quarterly Revenue (Won): {total_revenue:,.0f}")
    
    # 2. Stores
    total_stores = 0
    with open('public/data/store_dong_filtered.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['행정동_코드_명'].strip() == target_dong:
                total_stores += int(row['점포_수'])
                
    print(f"Total Stores: {total_stores}")
    
    # 3. Rent
    rent_pyeong = 0
    with open('public/data/rent_dong_filtered.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['행정구역'].strip() == target_dong:
                # Rent raw is Won/m2
                rent_sqm = float(row['전체'].replace(',', ''))
                rent_pyeong = (rent_sqm * 3.3058) / 10000 # Man-won
                break
    
    print(f"Rent (Man-won/Pyeong): {rent_pyeong:.2f}")

    # 4. Calculate Yield Elements
    if total_stores > 0:
        monthly_rev_won = (total_revenue / total_stores) / 3
        monthly_rev_man = monthly_rev_won / 10000
        
        print(f"Monthly Avg Revenue (Won): {monthly_rev_won:,.0f}")
        print(f"Monthly Avg Revenue (Man-won): {monthly_rev_man:.1f}")
        
        # Assumptions from code
        STORE_SIZE = 20
        DEPOSIT_MO = 10
        CAPITAL = 12000 # 1.2억
        
        monthly_rent_man = rent_pyeong * STORE_SIZE
        deposit_man = monthly_rent_man * DEPOSIT_MONTHS if 'DEPOSIT_MONTHS' in locals() else monthly_rent_man * 10
        total_invest = CAPITAL + deposit_man
        
        monthly_profit = monthly_rev_man - monthly_rent_man
        
        print(f"Monthly Rent (20py): {monthly_rent_man:.1f} Man-won")
        print(f"Total Invest: {total_invest:.1f} Man-won")
        print(f"Monthly Profit: {monthly_profit:.1f} Man-won")
        
        if total_invest > 0:
            yield_val = (monthly_profit * 12 / total_invest) * 100
            print(f"Calculated Yield: {yield_val:.1f}%")

inspect_dong('제기동')
