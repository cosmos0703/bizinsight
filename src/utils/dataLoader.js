import { DONG_COORDINATES } from '../data/dongCoordinates';

// File Path
const FILE_JSON = '/data/seoul_biz_data.json';

export const loadAllData = async (targetCategory = null) => {
    try {
        const response = await fetch(FILE_JSON);
        const rawData = await response.json();

        const formattedData = {};
        
        // Iterate over defined coordinates to ensure we only return valid dongs on the map
        Object.keys(DONG_COORDINATES).forEach(dong => {
            // Default Empty Data
            let item = {
                rent: 0,
                population: 0,
                openings: 0,
                closeCount: 0,
                totalStores: 0,
                revenue: 0,
                investment: 0,
                revenueHistory: [],
                details: {
                    time: Array(6).fill(0),
                    age: { '10':0, '20':0, '30':0, '40':0, '50':0, '60':0 },
                    day: { 'Mon':0, 'Tue':0, 'Wed':0, 'Thu':0, 'Fri':0, 'Sat':0, 'Sun':0 }
                }
            };

            const dongData = rawData[dong];
            if (dongData) {
                // 1. Common Data
                item.population = dongData.pop || 0;
                item.rent = dongData.rent || 0;

                // 2. Industry Specific Data
                // If targetCategory is provided, try to find it.
                // If not found or not provided, aggregate ALL industries (or pick a default 'major' one?)
                // Strategy: If targetCategory provided, look for exact match.
                // If not found, look for partial match.
                // If still not found (or no target), sum up everything (Market Scale).
                
                let targetIndData = null;
                
                if (targetCategory) {
                    // Map display name back to data key if necessary
                    let lookupKey = targetCategory;
                    if (targetCategory === '카페/디저트') lookupKey = '커피-음료';

                    targetIndData = dongData.industries[lookupKey];
                    if (!targetIndData) {
                        // Try partial match
                        const key = Object.keys(dongData.industries).find(k => k.includes(lookupKey) || lookupKey.includes(k));
                        if (key) targetIndData = dongData.industries[key];
                    }
                }

                if (targetIndData) {
                    // Specific Industry Data
                    item.openings = targetIndData.open;
                    item.closeCount = targetIndData.close;
                    item.totalStores = targetIndData.count;
                    item.investment = targetIndData.cost || 0;
                    
                    // Revenue: Raw is Total Sum over period.
                    // Normalize to Monthly Avg per Store for display
                    // Assuming data is approx 1 year (4 quarters) sum.
                    // Monthly Avg = (Total / StoreCount) / 12
                    const storeCount = targetIndData.count || 1;
                    const monthlyRev = Math.round((targetIndData.rev / storeCount) / 12 / 10000); // Man-Won
                    item.revenue = monthlyRev; 

                    item.details = targetIndData; // Pass details directly
                } else {
                    // Aggregate ALL (General Market Status of Dong)
                    let totalRev = 0;
                    let totalStore = 0;
                    let totalOpen = 0;
                    let totalClose = 0;
                    
                    // Initialize aggregated details
                    const aggDetails = {
                        time: Array(6).fill(0),
                        age: { '10':0, '20':0, '30':0, '40':0, '50':0, '60':0 },
                        day: { 'Mon':0, 'Tue':0, 'Wed':0, 'Thu':0, 'Fri':0, 'Sat':0, 'Sun':0 }
                    };

                    Object.values(dongData.industries).forEach(ind => {
                        totalRev += ind.rev;
                        totalStore += ind.count;
                        totalOpen += ind.open;
                        totalClose += ind.close;

                        // Aggregate Time
                        if (ind.time) ind.time.forEach((t, i) => aggDetails.time[i] += t);
                        // Aggregate Age
                        if (ind.age) Object.keys(ind.age).forEach(k => aggDetails.age[k] += ind.age[k]);
                        // Aggregate Day
                        if (ind.day) Object.keys(ind.day).forEach(k => aggDetails.day[k] += ind.day[k]);
                    });

                    item.openings = totalOpen;
                    item.closeCount = totalClose;
                    item.totalStores = totalStore;
                    item.revenue = totalStore > 0 ? Math.round((totalRev / totalStore) / 12 / 10000) : 0; 
                    item.investment = 0; 
                    item.details = aggDetails; // Assign aggregated details
                }
            }

            formattedData[dong] = item;
        });

        return formattedData;

    } catch (error) {
        console.error("Error loading seoul biz data:", error);
        return {};
    }
};
