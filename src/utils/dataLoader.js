import { loadCSV } from '../data/csvLoader';
import { DONG_COORDINATES } from '../data/dongCoordinates';

// Filenames
const FILE_RENT = '행정동별 임대료_2025_2분기_환산임대료.csv'; // Copied exact name from 'ls' output to avoid normalization issues
const FILE_POP = '서울시 상권분석서비스(길단위인구-행정동).csv';
const FILE_OPENINGS = '서울시 상권분석서비스(점포-행정동)_2024년 2.csv';
const FILE_REVENUE = '서울시 상권분석서비스(추정매출-행정동)_2024년.csv';

export const loadAllData = async () => {
    try {
        const [rentRaw, popRaw, openingsRaw, revenueRaw] = await Promise.all([
            loadCSV(FILE_RENT, 'UTF-8'), // Trying UTF-8 first
            loadCSV(FILE_POP, 'EUC-KR'),
            loadCSV(FILE_OPENINGS, 'EUC-KR'),
            loadCSV(FILE_REVENUE, 'EUC-KR'),
        ]);

        const dongData = {};

        // Initialize Data Structure for Target Dongs
        Object.keys(DONG_COORDINATES).forEach(dong => {
            dongData[dong] = { rent: 0, population: 0, openings: 0, revenue: 0 };
        });

        // 1. Rent Data (Administrative Dong Level)
        rentRaw.forEach(row => {
            const dongName = row['행정구역'];
            const rawValue = row['전체'];
            
            if (dongName && rawValue && dongData[dongName]) {
                // Parse "126,013" -> 126013
                const rentSqM = parseInt(String(rawValue).replace(/,/g, ''), 10);
                
                if (!isNaN(rentSqM)) {
                    // Convert KRW/m2 -> Man-won/Pyeong
                    // 1 Pyeong = 3.3058 m2
                    const rentPyeong = Math.round((rentSqM * 3.3058) / 10000);
                    dongData[dongName].rent = rentPyeong;
                }
            }
        });

        // 2. Population Data
        popRaw.forEach(row => {
            const dongName = row['행정동_코드_명'];
            const popVal = parseInt(row['총_유동인구_수'] || 0);
            if (dongName && dongData[dongName]) {
                dongData[dongName].population = popVal;
            }
        });

        // 3. Openings Data
        openingsRaw.forEach(row => {
            const dongName = row['행정동_코드_명']; 
            const openVal = parseInt(row['개업_점포_수'] || 0);
            if (dongName && dongData[dongName]) {
                dongData[dongName].openings += openVal; 
            }
        });

        // 4. Revenue Data
        revenueRaw.forEach(row => {
            const dongName = row['행정동_코드_명'];
            const salesVal = parseInt(row['분기당_매출_금액'] || 0);
            if (dongName && dongData[dongName]) {
                dongData[dongName].revenue += salesVal; 
            }
        });

        const formattedData = {};
        Object.keys(dongData).forEach(dong => {
            const d = dongData[dong];
            formattedData[dong] = {
                rent: d.rent, 
                population: d.population,
                openings: d.openings,
                revenue: Math.round(d.revenue / 10000) 
            };
        });

        return formattedData;

    } catch (error) {
        console.error("Error loading dong data:", error);
        return {};
    }
};