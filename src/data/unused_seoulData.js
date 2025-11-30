// Seoul Open Data Schema Definitions

// Common Fields
// STDR_YY_CD: Standard Year Code (e.g., "2023")
// STDR_QU_CD: Standard Quarter Code (e.g., "1")
// TRDAR_SE_CD: Commercial Area Type Code
// TRDAR_SE_CD_NM: Commercial Area Type Name (e.g., "Golmok Sangwon")
// TRDAR_CD: Commercial Area Code
// TRDAR_CD_NM: Commercial Area Name (e.g., "Gangnam Station")

export const SEOUL_DATA_SCHEMA = {
    COMMERCIAL_AREA: {
        year: 'STDR_YY_CD',
        quarter: 'STDR_QU_CD',
        typeCode: 'TRDAR_SE_CD',
        typeName: 'TRDAR_SE_CD_NM',
        areaCode: 'TRDAR_CD',
        areaName: 'TRDAR_CD_NM',
        totalSales: 'THSMON_SELNG_AMT', // Monthly Sales Amount
        totalSalesCount: 'THSMON_SELNG_CO', // Monthly Sales Count
    },
    POPULATION: {
        year: 'STDR_YY_CD',
        quarter: 'STDR_QU_CD',
        areaCode: 'TRDAR_CD',
        areaName: 'TRDAR_CD_NM',
        totalPop: 'TOT_FLPOP_CO', // Total Floating Population
        malePop: 'ML_FLPOP_CO',
        femalePop: 'FML_FLPOP_CO',
    }
};

// Helper to transform raw CSV-like object to chart friendly format
export const transformSalesData = (rawData) => {
    return rawData.map(item => ({
        year: item[SEOUL_DATA_SCHEMA.COMMERCIAL_AREA.year],
        quarter: item[SEOUL_DATA_SCHEMA.COMMERCIAL_AREA.quarter],
        areaName: item[SEOUL_DATA_SCHEMA.COMMERCIAL_AREA.areaName],
        sales: parseInt(item[SEOUL_DATA_SCHEMA.COMMERCIAL_AREA.totalSales] || 0, 10),
        count: parseInt(item[SEOUL_DATA_SCHEMA.COMMERCIAL_AREA.totalSalesCount] || 0, 10),
    }));
};

export const transformPopulationData = (rawData) => {
    return rawData.map(item => ({
        areaName: item[SEOUL_DATA_SCHEMA.POPULATION.areaName],
        total: parseInt(item[SEOUL_DATA_SCHEMA.POPULATION.totalPop] || 0, 10),
        male: parseInt(item[SEOUL_DATA_SCHEMA.POPULATION.malePop] || 0, 10),
        female: parseInt(item[SEOUL_DATA_SCHEMA.POPULATION.femalePop] || 0, 10),
    }));
};
