import Papa from 'papaparse';

const fixGoogleSheetUrl = (url) => {
    if (!url) return url;

    try {
        // 1. Convert pubhtml to pub
        let newUrl = url.replace('/pubhtml', '/pub');

        // 2. Ensure output=csv exists
        const urlObj = new URL(newUrl);
        urlObj.searchParams.set('output', 'csv');

        // 3. Keep other params (gid, single, etc are preserved by URL object)
        return urlObj.toString();

    } catch (e) {
        // Fallback for simple string manipulation if URL parsing fails (e.g. partial url)
        if (url.includes('/pubhtml')) {
            return url.replace('/pubhtml', '/pub?output=csv');
        }
        return url;
    }
};

export const fetchSheetData = async (url) => {
    const csvUrl = fixGoogleSheetUrl(url);
    console.log(`[SheetService] Fetching: ${csvUrl}`);

    return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
            download: true,
            header: false, // Parse as arrays first to find the real header
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const rows = results.data;
                    if (!rows || rows.length === 0) {
                        resolve([]);
                        return;
                    }

                    // 1. Smart Header Detection
                    // Look for the row that contains "Block" AND ("Target" OR "Percentage" OR "Sno")
                    let headerRowIndex = -1;
                    for (let i = 0; i < Math.min(rows.length, 10); i++) { // Check first 10 rows
                        const rowStr = JSON.stringify(rows[i]).toLowerCase();
                        if (rowStr.includes('block') && (rowStr.includes('target') || rowStr.includes('gp') || rowStr.includes('sno'))) {
                            headerRowIndex = i;
                            break;
                        }
                    }

                    if (headerRowIndex === -1) {
                        // Fallback: Assume first row is header if we couldn't find a better one
                        headerRowIndex = 0;
                    }

                    const headers = rows[headerRowIndex].map(h => h.trim());
                    const dataRows = rows.slice(headerRowIndex + 1);

                    // 2. Map Data to Headers
                    const mappedData = dataRows.map(row => {
                        const obj = {};
                        headers.forEach((header, index) => {
                            if (header) { // Only map non-empty headers
                                obj[header] = row[index];
                            }
                        });
                        return obj;
                    });

                    console.log(`[SheetService] Found headers on row ${headerRowIndex}:`, headers);
                    resolve(mappedData);

                } catch (err) {
                    console.error("[SheetService] Parsing Error", err);
                    reject(err);
                }
            },
            error: (error) => {
                console.error("[SheetService] Network/Parse Error", error);
                reject(error);
            }
        });
    });
};

export const normalizeSheetData = (data) => {
    // Basic cleanup
    return data;
};
