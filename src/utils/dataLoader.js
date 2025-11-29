import { loadCSV } from '../data/csvLoader';
import { DONG_COORDINATES } from '../data/dongCoordinates';

// Filenames
const FILE_RENT = '임대동향 지역별 임대료(2024년3분기~)_소규모 상가.csv';
const FILE_POP = '서울시 상권분석서비스(길단위인구-행정동).csv';
const FILE_OPENINGS = '서울시 상권분석서비스(점포-행정동)_2024년 2.csv';
const FILE_REVENUE = '서울시 상권분석서비스(추정매출-행정동)_2024년.csv';

// Helper Map: Rent Commercial Area -> Administrative Dong
const RENT_AREA_MAP = {
    '광화문': '사직동', '남대문': '회현동', '명동': '명동', '을지로': '을지로동', '종로': '종로1.2.3.4가동',
    '강남대로': '역삼1동', '교대역': '서초3동', '논현역': '논현1동', '신사역': '신사동', '압구정': '압구정동', '청담': '청담동', '테헤란로': '역삼1동',
    '공덕역': '공덕동', '동교/연남': '연남동', '망원역': '망원1동', '신촌/이대': '신촌동', '영등포역': '영등포본동', '홍대/합정': '서교동',
    '가락시장': '가락1동', '건대입구': '화양동', '군자': '군자동', '노량진': '노량진1동', '뚝섬': '성수1가1동', '목동': '목1동',
    '사당': '사당1동', '서울대입구역': '청룡동', '성신여대': '동선동', '수유': '수유3동', '숙명여대': '청파동', '신림역': '신림동',
    '여의도': '여의동', '연신내': '불광동', '왕십리': '행당1동', '용산역': '한강로동', '이태원': '이태원1동', '잠실/송파': '잠실본동',
    '천호': '천호2동', '혜화동': '혜화동'
};

export const loadAllData = async () => {
    try {
        const [rentRaw, popRaw, openingsRaw, revenueRaw] = await Promise.all([
            loadCSV(FILE_RENT, 'windows-949'),
            loadCSV(FILE_POP, 'EUC-KR'),
            loadCSV(FILE_OPENINGS, 'EUC-KR'),
            loadCSV(FILE_REVENUE, 'EUC-KR'),
        ]);

        const dongData = {};

        // Initialize Data Structure for Target Dongs
        Object.keys(DONG_COORDINATES).forEach(dong => {
            dongData[dong] = { rent: 0, population: 0, openings: 0, revenue: 0 };
        });

        // 1. Rent Data (Commercial Area -> Dong Mapping)
        rentRaw.forEach(row => {
            // Find rent value
            let rawValue = row['2024년 3분기'] || row['2024.3Q'];
            if (!rawValue) {
                 const vals = Object.values(row);
                 rawValue = vals.find(v => !isNaN(parseFloat(v)) && parseFloat(v) > 5 && parseFloat(v) < 1000);
            }
            if (!rawValue) return;

            const rentSqM = parseFloat(rawValue);
            const rentPyeong = Math.round((rentSqM * 3.3) / 10); // Man-won

            // Find matching dong
            const values = Object.values(row);
            let targetDong = null;
            
            // Direct map check
            for (const val of values) {
                if (RENT_AREA_MAP[val]) {
                    targetDong = RENT_AREA_MAP[val];
                    break;
                }
            }

            if (targetDong && dongData[targetDong]) {
                // If multiple areas map to same dong, average or take max (Taking max for conservative cost est)
                dongData[targetDong].rent = Math.max(dongData[targetDong].rent, rentPyeong);
            }
        });

        // 2. Population Data (Dong Level)
        popRaw.forEach(row => {
            const dongName = row['행정동_코드_명'];
            const popVal = parseInt(row['총_유동인구_수'] || 0);
            if (dongName && dongData[dongName]) {
                dongData[dongName].population = popVal;
            }
        });

        // 3. Openings Data (Dong Level)
        openingsRaw.forEach(row => {
            const dongName = row['행정동_코드_명']; // Assuming this file has dong name
            const openVal = parseInt(row['개업_점포_수'] || 0); // Check column name
            if (dongName && dongData[dongName]) {
                dongData[dongName].openings += openVal; // Add up (if multiple quarters)
            }
        });

        // 4. Revenue Data (Dong Level)
        revenueRaw.forEach(row => {
            const dongName = row['행정동_코드_명'];
            const salesVal = parseInt(row['분기당_매출_금액'] || 0);
            if (dongName && dongData[dongName]) {
                dongData[dongName].revenue += salesVal; // Add up all sectors
            }
        });

        // Format for UI consumption
        // Convert large numbers to Man-won unit
        const formattedData = {};
        Object.keys(dongData).forEach(dong => {
            const d = dongData[dong];
            formattedData[dong] = {
                rent: d.rent, // Man-won
                population: d.population,
                openings: d.openings,
                revenue: Math.round(d.revenue / 10000) // Man-won
            };
        });

        return formattedData;

    } catch (error) {
        console.error("Error loading dong data:", error);
        return {};
    }
};