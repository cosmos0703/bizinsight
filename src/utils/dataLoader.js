import { loadCSV } from '../data/csvLoader';
import { DONG_COORDINATES } from '../data/dongCoordinates';

// Filenames
const FILE_RENT = '행정동별 임대료_2025_2분기_환산임대료.csv'; 
const FILE_POP = '서울시 상권분석서비스(길단위인구-행정동).csv';
const FILE_OPENINGS = '서울시 상권분석서비스(점포-행정동)_2024년 2.csv';
const FILE_REVENUE = '서울시 상권분석서비스(추정매출-행정동)_2024년.csv';

export const loadAllData = async () => {
    try {
        const [rentRaw, popRaw, openingsRaw, revenueRaw] = await Promise.all([
            loadCSV(FILE_RENT, 'UTF-8'),
            loadCSV(FILE_POP, 'EUC-KR'),
            loadCSV(FILE_OPENINGS, 'EUC-KR'),
            loadCSV(FILE_REVENUE, 'EUC-KR'),
        ]);

        const dongData = {};

        // Initialize Data Structure
        Object.keys(DONG_COORDINATES).forEach(dong => {
            dongData[dong] = { 
                rent: 0, 
                population: 0, 
                openings: 0, 
                closeCount: 0, 
                totalStores: 0, // Add Total Stores
                revenue: 0,
                revenueHistory: {}, // Store quarterly revenue
                // Detail Data Containers
                revenueByTime: Array(6).fill(0), // 00-06, 06-11, 11-14, 14-17, 17-21, 21-24
                revenueByAge: { '10':0, '20':0, '30':0, '40':0, '50':0, '60':0 },
                revenueByDay: { 'Mon':0, 'Tue':0, 'Wed':0, 'Thu':0, 'Fri':0, 'Sat':0, 'Sun':0 }
            };
        });

        // 1. Rent Data
        rentRaw.forEach(row => {
            let dongName = row['행정구역'];
            if (dongName) dongName = dongName.replace(/·/g, '.');

            const rawValue = row['전체'];
            
            if (dongName && rawValue && dongData[dongName]) {
                const rentSqM = parseInt(String(rawValue).replace(/,/g, ''), 10);
                if (!isNaN(rentSqM)) {
                    const rentPyeong = Math.round((rentSqM * 3.3058) / 10000);
                    dongData[dongName].rent = rentPyeong;
                }
            }
        });

        // 2. Population Data
        popRaw.forEach(row => {
            let dongName = row['행정동_코드_명'];
            if (dongName) dongName = dongName.replace(/·/g, '.');

            const popVal = parseInt(row['총_유동인구_수'] || 0);
            if (dongName && dongData[dongName]) {
                dongData[dongName].population = popVal;
            }
        });

        // 3. Openings Data (Store Status)
        openingsRaw.forEach(row => {
            let dongName = row['행정동_코드_명']; 
            if (dongName) dongName = dongName.replace(/·/g, '.');

            const openVal = parseInt(row['개업_점포_수'] || 0);
            const closeVal = parseInt(row['폐업_점포_수'] || 0); 
            const totalStoreVal = parseInt(row['점포_수'] || 0); // Parse Total Stores

            if (dongName && dongData[dongName]) {
                dongData[dongName].openings += openVal; 
                dongData[dongName].closeCount += closeVal;
                dongData[dongName].totalStores += totalStoreVal;
            }
        });

        // 4. Revenue Data (Detailed Parsing)
        revenueRaw.forEach(row => {
            let dongName = row['행정동_코드_명'];
            if (dongName) dongName = dongName.replace(/·/g, '.');

            const salesVal = parseInt(row['당월_매출_금액'] || row['분기당_매출_금액'] || 0); // Try both keys just in case
            const quarter = row['기준_분기_코드']; // '1', '2', '3', '4'

            if (dongName && dongData[dongName]) {
                dongData[dongName].revenue += salesVal;

                // Accumulate Quarterly History
                if (quarter) {
                    if (!dongData[dongName].revenueHistory[quarter]) dongData[dongName].revenueHistory[quarter] = 0;
                    dongData[dongName].revenueHistory[quarter] += salesVal;
                }

                // Parse Detailed Revenue
                // Time
                dongData[dongName].revenueByTime[0] += parseInt(row['시간대_00~06_매출_금액'] || 0);
                dongData[dongName].revenueByTime[1] += parseInt(row['시간대_06~11_매출_금액'] || 0);
                dongData[dongName].revenueByTime[2] += parseInt(row['시간대_11~14_매출_금액'] || 0);
                dongData[dongName].revenueByTime[3] += parseInt(row['시간대_14~17_매출_금액'] || 0);
                dongData[dongName].revenueByTime[4] += parseInt(row['시간대_17~21_매출_금액'] || 0);
                dongData[dongName].revenueByTime[5] += parseInt(row['시간대_21~24_매출_금액'] || 0);

                // Age
                dongData[dongName].revenueByAge['10'] += parseInt(row['연령대_10_매출_금액'] || 0);
                dongData[dongName].revenueByAge['20'] += parseInt(row['연령대_20_매출_금액'] || 0);
                dongData[dongName].revenueByAge['30'] += parseInt(row['연령대_30_매출_금액'] || 0);
                dongData[dongName].revenueByAge['40'] += parseInt(row['연령대_40_매출_금액'] || 0);
                dongData[dongName].revenueByAge['50'] += parseInt(row['연령대_50_매출_금액'] || 0);
                dongData[dongName].revenueByAge['60'] += parseInt(row['연령대_60_이상_매출_금액'] || 0);

                // Day
                dongData[dongName].revenueByDay['Mon'] += parseInt(row['월요일_매출_금액'] || 0);
                dongData[dongName].revenueByDay['Tue'] += parseInt(row['화요일_매출_금액'] || 0);
                dongData[dongName].revenueByDay['Wed'] += parseInt(row['수요일_매출_금액'] || 0);
                dongData[dongName].revenueByDay['Thu'] += parseInt(row['목요일_매출_금액'] || 0);
                dongData[dongName].revenueByDay['Fri'] += parseInt(row['금요일_매출_금액'] || 0);
                dongData[dongName].revenueByDay['Sat'] += parseInt(row['토요일_매출_금액'] || 0);
                dongData[dongName].revenueByDay['Sun'] += parseInt(row['일요일_매출_금액'] || 0);
            }
        });

        const formattedData = {};
        Object.keys(dongData).forEach(dong => {
            const d = dongData[dong];
            
            // 1. Revenue: Calculate Monthly Revenue per Store
            // d.revenue is Quarterly Total.
            // Monthly Avg = (Total / StoreCount) / 3
            // Use Total Store Count from data
            const storeCount = d.totalStores || (d.openings + d.closeCount) || 1; 
            const monthlyRevenuePerStore = (d.revenue / storeCount) / 3;
            
            // 2. Population: Calculate Daily Floating Population
            // d.population is Quarterly Total.
            const dailyPopulation = d.population / 90;

            // 3. Trends
            // Convert history object to array, sorted by quarter
            const trendArray = Object.keys(d.revenueHistory).sort().map(q => d.revenueHistory[q]);

            formattedData[dong] = {
                rent: d.rent, 
                population: Math.round(dailyPopulation),
                openings: d.openings,
                closeCount: d.closeCount,
                totalStores: d.totalStores, // Add Total Stores to return
                revenue: Math.round(monthlyRevenuePerStore / 10000), // Man-won unit
                trendHistory: trendArray, // Add Trend History
                details: {
                    time: d.revenueByTime,
                    age: d.revenueByAge,
                    day: d.revenueByDay
                }
            };
        });

        return formattedData;

    } catch (error) {
        console.error("Error loading dong data:", error);
        return {};
    }
};
