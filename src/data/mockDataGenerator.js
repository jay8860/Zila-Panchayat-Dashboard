import { BLOCKS } from './config';

const GP_NAMES = [
    "Chitalanka", "Mendka", "Pahurnar", "Gumiapal", "Heeranar",
    "Kamlur", "Balud", "Chhote Tumnar", "Barsoor", "Mangnar",
    "Karli", "Mokpal", "Nakulnar", "Gongpal", "Samalwar"
];

// Helper to get random number between min and max
const getRandom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to get random subset of GPs for a block (to simulate realism)
const getGPsForBlock = (blockName) => {
    // In a real scenario, this mapping would be fixed.
    // We'll deterministically slice the array based on block name length for consistency
    const start = blockName.length % 5;
    return GP_NAMES.slice(start, start + 8);
};

export const generateMockData = (schemes) => {
    const data = {};

    schemes.forEach(scheme => {
        const schemeData = [];

        BLOCKS.forEach(block => {
            const gps = getGPsForBlock(block);

            gps.forEach(gp => {
                // Common fields
                const row = {
                    "Block": block,
                    "Gram Panchayat": gp,
                };

                // Scheme specific fields
                if (scheme === "MNREGA") {
                    row["Active Workers"] = getRandom(50, 500);
                    row["Man-days Generated"] = getRandom(1000, 5000);
                    row["Fund Utilized (%)"] = getRandom(20, 100);
                    row["Work Completion (%)"] = getRandom(10, 100);
                } else if (scheme === "Swachh Bharat Mission (SBM)") {
                    row["Toilets Constructed"] = getRandom(10, 100);
                    row["Geo-tagged (%)"] = getRandom(30, 100);
                    row["ODF Status"] = Math.random() > 0.3 ? "Yes" : "No";
                    row["Payment Processed (%)"] = getRandom(20, 100);
                } else if (scheme === "Pradhan Mantri Awas Yojana (PMAY)") {
                    row["Sanctioned Houses"] = getRandom(20, 150);
                    row["Completed Houses"] = getRandom(5, 100);
                    row["First Installment Paid"] = getRandom(15, 140);
                    row["Completion Rate (%)"] = getRandom(10, 100);
                } else {
                    // Generic random fields for other schemes
                    row["Beneficiaries"] = getRandom(100, 1000);
                    row["Target Achieved"] = getRandom(50, 900);
                    row["Progress (%)"] = getRandom(0, 100);
                }

                schemeData.push(row);
            });
        });

        data[scheme] = schemeData;
    });

    return data;
};
