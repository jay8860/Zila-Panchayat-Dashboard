import { getPrimaryMetric, cleanValue } from './metricUtils';

// Helper: safe formatting
const fmt = (num) => (num !== undefined && num !== null) ? num.toLocaleString() : '0';

// Helper: Normalize Block Names
// Maps Hindi/Case variations to Canonical English Names
export const normalizeBlockName = (name) => {
    if (!name) return "";
    const lower = name.trim().toLowerCase();

    // Dantewada
    if (lower.includes('dantewada') || lower.includes('दंतेवाड़ा') || lower.includes('dantewada')) return 'Dantewada';

    // Geedam
    if (lower.includes('geedam') || lower.includes('gidam') || lower.includes('गीदम')) return 'Geedam';

    // Katekalyan
    if (lower.includes('katekalyan') || lower.includes('katikalyan') || lower.includes('कटेकल्याण')) return 'Katekalyan';

    // Kuwakonda
    if (lower.includes('kuwakonda') || lower.includes('kuakonda') || lower.includes('kuakonta') || lower.includes('कुआकोन्डा')) return 'Kuwakonda';

    return name.trim(); // Return original if no match (fallback)
};

export const generateCEOReport = ({ blockName, schemeGroups, data, schemes }) => {
    let reportChunks = [];
    const targetedBlock = normalizeBlockName(blockName);

    // Header
    reportChunks.push(`*🚨 CEO BLOCK PROGRESS REPORT: ${targetedBlock.toUpperCase()}*`);
    reportChunks.push(`_generated on ${new Date().toLocaleDateString()}_`);
    reportChunks.push("--------------------------------------------------");

    schemeGroups.forEach(group => {
        // Only process groups that have active schemes with data
        const activeSchemesInGroup = group.schemes.filter(s =>
            data[s] && data[s].length > 0 && schemes.includes(s)
        );

        if (activeSchemesInGroup.length === 0) return;

        let groupChunk = [`\n*📂 GROUP: ${group.title.toUpperCase()}*`];
        let hasDataInGroup = false;

        activeSchemesInGroup.forEach(scheme => {
            const schemeData = data[scheme] || [];
            if (schemeData.length === 0) return;

            const keys = Object.keys(schemeData[0]);

            // 1. Identify Metric using Centralized Logic
            const metric = getPrimaryMetric(keys);

            if (!metric) return; // Skip if no valid metric found

            // Find Block and GP Keys
            const blockKey = keys.find(k => k.toLowerCase().includes('block') || k.toLowerCase().includes('name of block'));
            const gpKey = keys.find(k => k.toLowerCase().includes('gram panchayat') || k.toLowerCase().includes('gp name') || k.toLowerCase().includes('gp') || k.toLowerCase().includes('name of gp'));

            if (!blockKey) return;

            // 2. Aggregation Logic
            // Create Block Map for Benchmarking
            const blockMap = {};
            // Track GPs for CURRENT block
            const currentBlockGPs = [];

            schemeData.forEach(row => {
                const rawBName = row[blockKey]?.trim();
                // Skip invalid rows or total rows
                if (!rawBName || rawBName.toLowerCase() === 'total' || rawBName.toLowerCase().includes('district') || rawBName.includes('योग')) return;

                const normBName = normalizeBlockName(rawBName);

                // Get Value
                let val = 0;
                let target = 0;
                let done = 0;

                if (metric.type === 'DIRECT' || metric.type === 'COUNT') {
                    val = cleanValue(row[metric.key]);
                } else if (metric.type === 'CALCULATED') {
                    target = cleanValue(row[metric.targetKey]);
                    done = cleanValue(row[metric.doneKey]);
                    if (target > 0) val = Math.round((done / target) * 100);
                    else val = 0;
                }

                // If Calculated or Direct, we might still want T/D context if available
                if (metric.targetKey && metric.doneKey) {
                    target = cleanValue(row[metric.targetKey]);
                    done = cleanValue(row[metric.doneKey]);
                }

                // Benchmarking Data
                if (!blockMap[normBName]) blockMap[normBName] = { sum: 0, count: 0 };
                blockMap[normBName].sum += val;
                blockMap[normBName].count += 1;

                // Current Block Data
                if (normBName === targetedBlock) {
                    currentBlockGPs.push({
                        name: row[gpKey] || 'Unknown GP',
                        val: val,
                        target: target ? cleanValue(target) : '-',
                        done: done ? cleanValue(done) : '-'
                    });
                }
            });

            // Skip scheme if selected block has no data (unless we want to show it as missing)
            if (currentBlockGPs.length === 0) return;
            hasDataInGroup = true;

            // 3. Analyze Benchmarks
            let maxAvg = -1;
            let topBlock = '';
            let currentBlockAvg = 0;

            Object.entries(blockMap).forEach(([bName, stats]) => {
                const avg = stats.count > 0 ? Math.round(stats.sum / stats.count) : 0;
                if (avg > maxAvg) {
                    maxAvg = avg;
                    topBlock = bName;
                }
                if (bName === targetedBlock) {
                    currentBlockAvg = avg;
                }
            });

            // 4. Analyze Bottom GPs (Root Cause)
            // Sort Ascending (Lowest first)
            currentBlockGPs.sort((a, b) => a.val - b.val);
            const bottom10 = currentBlockGPs.slice(0, 10);

            const gap = maxAvg - currentBlockAvg;
            const statusEmoji = gap > 20 ? '🔴' : (gap > 10 ? '🟠' : '🟢');

            // 5. Construct Section
            groupChunk.push(`\n*📌 Scheme: ${scheme}*`);

            // Format Value based on Metric Type
            const valSuffix = metric.isPercentage ? '%' : '';

            groupChunk.push(`${statusEmoji} Your Avg *(${metric.label})*: *${currentBlockAvg}${valSuffix}*`);
            groupChunk.push(`| Top Block (${topBlock}): *${maxAvg}${valSuffix}*`);

            if (currentBlockAvg < maxAvg) {
                groupChunk.push(`📉 Gap: -${gap}${valSuffix} from Top`);
            } else {
                groupChunk.push(`🏆 You are the Top Performer!`);
            }

            if (bottom10.length > 0) {
                groupChunk.push(`\n_⚠️ Weakest Links (Bottom 10 GPs):_`);
                bottom10.forEach((gp, idx) => {
                    let details = `(${gp.val}${valSuffix})`;
                    if (gp.target !== '-' && gp.done !== '-') {
                        details = `(${gp.val}${valSuffix} | Target: ${fmt(gp.target)} / Done: ${fmt(gp.done)})`;
                    }
                    groupChunk.push(`${idx + 1}. ${gp.name} ${details}`);
                });
            } else {
                groupChunk.push(`_No data available for GPs in this block_`);
            }
            groupChunk.push(`\n`);
        });

        if (hasDataInGroup) {
            reportChunks = [...reportChunks, ...groupChunk];
        }
    });

    if (reportChunks.length <= 3) {
        return "No data found for this block across active schemes.\nPlease check if the block name matches the data sheets.";
    }

    reportChunks.push("--------------------------------------------------");
    reportChunks.push("Action Required: Review these low performing GPs and initiate review meetings.");

    return reportChunks.join('\n');
};
