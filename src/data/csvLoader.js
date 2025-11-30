import Papa from 'papaparse';
import { getFromDB, putToDB } from '../utils/db';

// CSV Data Loaders for Seoul Open Data

export const loadCSV = async (filename, encoding = 'UTF-8', requiredColumns = []) => {
    try {
        // 1. Check Cache
        const cached = await getFromDB(filename);
        if (cached) {
            console.log(`[Cache Hit] ${filename}`);
            return cached;
        }

        console.log(`[Cache Miss] Fetching ${filename}...`);
        const response = await fetch(`/data/${encodeURIComponent(filename)}`);
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder(encoding);
        const csvText = decoder.decode(buffer);

        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    let data = results.data;

                    // 2. Filter Columns (Optimization)
                    if (requiredColumns.length > 0) {
                        data = data.map(row => {
                            const filteredRow = {};
                            requiredColumns.forEach(col => {
                                filteredRow[col] = row[col];
                            });
                            return filteredRow;
                        });
                    }

                    // 3. Cache Data
                    try {
                        await putToDB(filename, data);
                        console.log(`[Cache Saved] ${filename}`);
                    } catch (err) {
                        console.warn("Failed to cache data:", err);
                    }

                    resolve(data);
                },
                error: (error) => reject(error),
            });
        });
    } catch (error) {
        console.error(`Error loading ${filename}:`, error);
        return [];
    }
};

// ... other export functions can remain or be updated if needed