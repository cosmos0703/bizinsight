import Papa from 'papaparse';

// Load rent data from CSV
export const loadRentData = async () => {
    try {
        const response = await fetch('/data/rent_dong_filtered.csv');
        const csvText = await response.text();

        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    // Transform and aggregate by district
                    const districtRents = {};
                    results.data.forEach(row => {
                        const district = row['자치구명'] || row['법정동명'];
                        if (!district) return;

                        // [Business Logic] Filter for Commercial & Monthly Rent
                        // 1. 전월세구분 == "월세"
                        // 2. 건물용도 in ["제1종근린생활", "제2종근린생활", "판매시설"]
                        const isMonthly = row['전월세구분'] === '월세';
                        const isCommercial = ['제1종근린생활', '제2종근린생활', '판매시설'].some(type => row['건물용도']?.includes(type));

                        if (!isMonthly || !isCommercial) return;

                        const rent = parseInt(row['월세금액'] || 0);
                        const area = parseFloat(row['임대면적'] || 1); // Avoid division by zero

                        if (rent > 0 && area > 0) {
                            if (!districtRents[district]) {
                                districtRents[district] = { totalRentPerArea: 0, count: 0 };
                            }
                            // Calculate Rent per Area (Pyeong approx)
                            // 평당 임대료 = (임대료 / 임대면적) * 3.3
                            const rentPerArea = (rent / area) * 3.3;

                            districtRents[district].totalRentPerArea += rentPerArea;
                            districtRents[district].count += 1;
                        }
                    });

                    // Calculate averages (Rent per Pyeong)
                    const averages = {};
                    Object.keys(districtRents).forEach(district => {
                        const data = districtRents[district];
                        // Remove outliers if needed (simple average for now)
                        averages[district] = Math.round(data.totalRentPerArea / data.count);
                    });

                    resolve(averages);
                },
                error: reject
            });
        });
    } catch (error) {
        console.error('Error loading rent data:', error);
        return {};
    }
};
