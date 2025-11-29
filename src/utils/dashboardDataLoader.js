import Papa from 'papaparse';

// File Paths
const FILE_OPENINGS = '/src/data/영세자영업+자치구별+개업+점포수_20251128221709.csv';
const FILE_CLOSURES = '/src/data/영세자영업+종사자+규모별+폐업+점포수_20251128221620.csv';
const FILE_REVENUE = '/src/data/영세자영업+매장+규모별+면적(3.3㎡)당+매출액_20251128221135.csv';
const FILE_RENT = '/src/data/매장용빌딩+임대료·공실률+및+수익률_20251125213537.csv';

const parseCSV = async (url) => {
    try {
        const response = await fetch(url);
        const text = await response.text();
        return new Promise((resolve) => {
            Papa.parse(text, {
                header: false, // We'll handle headers manually due to multi-line mess
                skipEmptyLines: true,
                complete: (results) => resolve(results.data)
            });
        });
    } catch (error) {
        console.error(`Error loading ${url}:`, error);
        return [];
    }
};

export const loadDashboardData = async () => {
    const [rawOpenings, rawClosures, rawRevenue, rawRent] = await Promise.all([
        parseCSV(FILE_OPENINGS),
        parseCSV(FILE_CLOSURES),
        parseCSV(FILE_REVENUE),
        parseCSV(FILE_RENT)
    ]);

    // --- Process A: Openings (Map Data) ---
    // Header Row Index: 1 (0-based) -> "자치구별(1)", "전체", "외식업", ...
    // Data starts: 2
    const openings = rawOpenings.slice(2).map(row => ({
        district: row[0],
        total: parseInt(row[1] || 0),
        food: parseInt(row[2] || 0),
        service: parseInt(row[3] || 0),
        retail: parseInt(row[4] || 0)
    })).filter(d => d.district && d.district !== '서울시');

    // --- Process B: Closures (Risk) ---
    // Header Row Index: 1 -> "생활밀접업종별(2)", "0명", "1명"...
    // Data starts: 2
    const closureHeader = rawClosures[1];
    const closures = rawClosures.slice(2).map(row => {
        const item = {
            sectorGroup: row[0],
            sector: row[1],
            total: parseInt(row[2] || 0), // '소계' or 0 employees? Check CSV structure.
            // Assuming col 2 is total/sum based on typical structure, or need to sum specific cols.
            // Based on head: "서울시", "소계", 72144(Total?), 485(0명), 276(1명)...
            // So row[2] is likely the first data column. Wait, head said: "생활밀접업종별(1)","생활밀접업종별(2)","0명","1명"...
            // Actually head output: "생활밀접업종별(1)","생활밀접업종별(2)","0명","1명","2명","3명","4명"
            // So row[2] is "0명".
            size0: parseInt(row[2] || 0),
            size1: parseInt(row[3] || 0),
            size2: parseInt(row[4] || 0),
            size3: parseInt(row[5] || 0),
            size4: parseInt(row[6] || 0),
        };
        return item;
    }).filter(d => d.sector && d.sector !== '소계'); // Filter out aggregates if needed

    // --- Process C: Revenue (Efficiency) ---
    // Header Row Index: 1 -> "16.5㎡ 이하", ...
    const revenue = rawRevenue.slice(2).map(row => ({
        sectorGroup: row[0],
        sector: row[1],
        area16: parseFloat(row[2] || 0),
        area33: parseFloat(row[3] || 0),
        area66: parseFloat(row[4] || 0),
        area99: parseFloat(row[5] || 0),
        areaOver99: parseFloat(row[6] || 0),
    })).filter(d => d.sector && d.sector !== '소계');

    // --- Process D: Rent (Cost) ---
    // Header Row Index: 1 -> "임대료 (천원/㎡)", "공실률 (%)"
    // Columns: Region(1), Region(2), Rent, Vacancy...
    // Rent is col 2, Vacancy is col 3 (0-based)
    const rent = rawRent.slice(3).map(row => ({
        region: row[1] !== '소계' ? row[1] : row[0], // Handle "서울"-"소계" vs "도심지역"-"소계" vs District
        rent: parseFloat(row[2] || 0),
        vacancy: parseFloat(row[3] || 0),
        yield_invest: parseFloat(row[4] || 0)
    })).filter(d => d.region && d.region !== '서울'); // Filter out top level if needed

    return { openings, closures, revenue, rent };
};
