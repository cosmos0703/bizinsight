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
                    targetIndData = dongData.industries[targetCategory];
                    if (!targetIndData) {
                        // Try partial match
                        const key = Object.keys(dongData.industries).find(k => k.includes(targetCategory) || targetCategory.includes(k));
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
                    // Note: Investment is tricky for "All". Use average or 0.
                    let totalRev = 0;
                    let totalStore = 0;
                    let totalOpen = 0;
                    let totalClose = 0;
                    
                    Object.values(dongData.industries).forEach(ind => {
                        totalRev += ind.rev;
                        totalStore += ind.count;
                        totalOpen += ind.open;
                        totalClose += ind.close;
                    });

                    item.openings = totalOpen;
                    item.closeCount = totalClose;
                    item.totalStores = totalStore;
                    // For aggregate, Revenue represents "Total Commercial Scale" of the Dong
                    // So we just use a scaled down version or Raw Sum?
                    // Let's use Monthly Avg per Store again to be consistent with scale
                    item.revenue = totalStore > 0 ? Math.round((totalRev / totalStore) / 12 / 10000) : 0; 
                    item.investment = 0; // "All" doesn't have a specific cost
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
