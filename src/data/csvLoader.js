import Papa from 'papaparse';

// CSV Data Loaders for Seoul Open Data

export const loadCSV = async (filename, encoding = 'UTF-8') => {
    try {
        const response = await fetch(`/data/${filename}`);
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder(encoding);
        const csvText = decoder.decode(buffer);

        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results.data),
                error: (error) => reject(error),
            });
        });
    } catch (error) {
        console.error(`Error loading ${filename}:`, error);
        return [];
    }
};

// ... other export functions can remain or be updated if needed