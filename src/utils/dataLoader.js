import { loadCSV } from '../data/csvLoader';

// Filenames
// Changed to the new rent file
const FILE_RENT = '임대동향 지역별 임대료(2024년3분기~)_소규모 상가.csv';
// Street Population
const FILE_POP = '서울시 상권분석서비스(길단위인구-자치구).csv';
const FILE_OPENINGS = '영세자영업+자치구별+개업+점포수_20251128221709.csv';
// Estimated Revenue
const FILE_REVENUE = '서울시 상권분석서비스(추정매출-행정동)_2024년.csv';
// Closure Data
const FILE_CLOSURE = '영세자영업+종사자+규모별+폐업+점포수_20251128221620.csv';

export const loadAllData = async () => {
    try {
        const [rentRaw, popRaw, openingsRaw, revenueRaw, closureRaw] = await Promise.all([
            loadCSV(FILE_RENT, 'windows-949'), // Use standard encoding label
            loadCSV(FILE_POP, 'EUC-KR'),
            loadCSV(FILE_OPENINGS, 'UTF-8'),
            loadCSV(FILE_REVENUE, 'EUC-KR'),
            loadCSV(FILE_CLOSURE, 'UTF-8')
        ]);

        console.log("DEBUG: Rent Raw Loaded", rentRaw.length);
        if (rentRaw.length > 0) {
            console.log("DEBUG: Rent First Row Values", Object.values(rentRaw[0]));
        }

        // 1. Process Rent Data
        // File Structure (based on assumption): No, Region1, Region2, Region3, 2024.3Q, ...
        // We need to inspect the keys. Based on 'head', it seems multi-line header.
        // But loadCSV likely treats first line as header.
        // Let's assume the columns are indices or names.
        
        const rentData = {};
        
        // Helper to normalize district names
        const normalizeDistrict = (name) => {
            if (!name) return '';
            const trimmed = name.trim();
            if (trimmed.endsWith('구')) return trimmed;
            return trimmed + '구';
        };

        // Mapping table for Sub-districts/Commercial Areas to Gu
        
        rentRaw.forEach(row => {
            // Skip metadata/header rows
            const rowValues = Object.values(row);
            if (rowValues.some(v => v === '지역' || v === '임대료' || v === '소계')) return;

            let districtName = null;

            // Find District Name (Iterate columns to find a Gu name)
            for (const val of rowValues) {
                if (typeof val === 'string') {
                    const norm = normalizeDistrict(val);
                    if (['종로구','중구','용산구','성동구','광진구','동대문구','중랑구','성북구','강북구','도봉구','노원구','은평구','서대문구','마포구','양천구','강서구','구로구','금천구','영등포구','동작구','관악구','서초구','강남구','송파구','강동구'].includes(norm)) {
                        districtName = norm;
                        break;
                    }
                }
            }

            // Find Rent Value
            // Try specific keys found in logs first
            let rawValue = row['2024년 3분기'] || row['2024.3Q'] || row['2024.09'];
            
            // If not found by key, try finding a number-like string in values
            if (!rawValue) {
                 // heuristic: finding a float between 10 and 1000
                 rawValue = rowValues.find(v => !isNaN(parseFloat(v)) && parseFloat(v) > 10 && parseFloat(v) < 1000);
            }

            if (districtName === '노원구') {
                console.log('DEBUG Nowon-gu:', { districtName, rawValue, row });
            }

            if (districtName && rawValue) {
                const rentSqM = parseFloat(rawValue);
                // Convert (Thousand Won / m2) -> (Ten Thousand Won / Pyeong)
                // 1 Pyeong = 3.3 m2
                // Val: 50.0 (50,000 KRW/m2) -> 50 * 3.3 = 165,000 KRW/Pyeong = 16.5 Man-won
                const rentPyeong = (rentSqM * 3.3) / 10;
                
                if (rentData[districtName]) {
                    rentData[districtName] = Math.round((rentData[districtName] + rentPyeong) / 2);
                } else {
                    rentData[districtName] = Math.round(rentPyeong);
                }
            }
        });

        // 2. Process Population Data
        const popData = {};
        popRaw.forEach(row => {
            const rawDistrict = row['자치구_코드_명'];
            if (rawDistrict) {
                const district = normalizeDistrict(rawDistrict);
                popData[district] = parseInt(row['총_유동인구_수'] || 0);
            }
        });

        // 3. Process Openings Data
        const openingsData = {};
        openingsRaw.forEach(row => {
            const rawDistrict = row['자치구별(1)'];
            if (rawDistrict && rawDistrict !== '서울시' && rawDistrict !== '합계') {
                const district = normalizeDistrict(rawDistrict);
                openingsData[district] = parseInt(row['전체'] || 0);
            }
        });

        // 4. Process Revenue Data
        const GU_CODES = {
            '11110': '종로구', '11140': '중구', '11170': '용산구', '11200': '성동구', '11215': '광진구',
            '11230': '동대문구', '11260': '중랑구', '11290': '성북구', '11305': '강북구', '11320': '도봉구',
            '11350': '노원구', '11380': '은평구', '11410': '서대문구', '11440': '마포구', '11470': '양천구',
            '11500': '강서구', '11530': '구로구', '11545': '금천구', '11560': '영등포구', '11590': '동작구',
            '11620': '관악구', '11650': '서초구', '11680': '강남구', '11710': '송파구', '11740': '강동구'
        };

        const revenueData = {}; 

        revenueRaw.forEach(row => {
            const dongCode = row['행정동_코드']; 
            if (!dongCode) return;
            
            const guCode = dongCode.toString().substring(0, 5);
            const guName = GU_CODES[guCode];

            if (guName) {
                if (!revenueData[guName]) {
                    revenueData[guName] = { totalSales: 0, count: 0 };
                }
                const sales = parseInt(row['분기당_매출_금액'] || 0);
                revenueData[guName].totalSales += sales;
                revenueData[guName].count += 1;
            }
        });

        const finalRevenue = {};
        Object.keys(revenueData).forEach(gu => {
            finalRevenue[gu] = Math.round(revenueData[gu].totalSales / 10000); 
        });

        // 5. Process Closure Data
        const closureData = [];
        closureRaw.forEach(row => {
             if(row['생활밀접업종별(2)'] && row['생활밀접업종별(2)'] !== '소계') {
                 closureData.push({
                     sector: row['생활밀접업종별(2)'],
                     count: parseInt(row['2023'] || 0) 
                 });
             }
        });

        return {
            rent: rentData,
            population: popData, 
            openings: openingsData,
            revenue: finalRevenue,
            closures: closureData
        };

    } catch (error) {
        console.error("Error loading all data:", error);
        return { rent: {}, population: {}, openings: {}, revenue: {}, closures: [] };
    }
};
