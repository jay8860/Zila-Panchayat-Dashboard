
// Helper: Clean numeric values (remove %, trim)
const cleanValue = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = val.toString().replace('%', '').trim();
    return parseFloat(clean) || 0;
};

// Helper: safe formatting
const fmt = (num) => (num !== undefined && num !== null) ? num.toLocaleString() : '0';

// Helper: Find columns by keywords
const findKey = (keys, keywords) => {
    return keys.find(k => keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase())));
};

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

            // 1. Identify Keys
            const blockKey = findKey(keys, ['block', 'name of block']);
            const gpKey = findKey(keys, ['gram panchayat', 'gp name', 'gp', 'name of gp']);

            // Metrics
            const percentageKey = findKey(keys, ['%', 'percentage', 'achievement', 'progress']);
            const targetKey = findKey(keys, ['target', 'goal']);
            const doneKey = findKey(keys, ['completed', 'accomplished', 'done', 'sanction', 'works']); // Broad "Done" matching

            if (!blockKey || !percentageKey) return; // Skip if cant analyze progress

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

                // Benchmarking Data
                if (!blockMap[normBName]) blockMap[normBName] = { sum: 0, count: 0 };
                const val = cleanValue(row[percentageKey]);
                blockMap[normBName].sum += val;
                blockMap[normBName].count += 1;

                // Current Block Data (Using Normalized Check)
                if (normBName === targetedBlock) {
                    currentBlockGPs.push({
                        name: row[gpKey] || 'Unknown GP',
                        val: val,
                        target: targetKey ? cleanValue(row[targetKey]) : '-',
                        done: doneKey ? cleanValue(row[doneKey]) : '-'
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
            groupChunk.push(`${statusEmoji} Your Avg: *${currentBlockAvg}%* | Top Block (${topBlock}): *${maxAvg}%*`);

            if (currentBlockAvg < maxAvg) {
                groupChunk.push(`📉 Gap: -${gap}% from Top`);
            } else {
                groupChunk.push(`🏆 You are the Top Performer!`);
            }

            if (bottom10.length > 0) {
                groupChunk.push(`_⚠️ Weakest Links (Bottom 10 GPs):_`);
                bottom10.forEach((gp, idx) => {
                    let details = `(${gp.val}%)`;
                    if (gp.target !== '-' && gp.done !== '-') {
                        details = `(${gp.val}% | T:${fmt(gp.target)}/D:${fmt(gp.done)})`;
                    }
                    groupChunk.push(`${idx + 1}. ${gp.name} ${details}`);
                });
            }
        });

        if (hasDataInGroup) {
            reportChunks = [...reportChunks, ...groupChunk];
        }
    });

    if (reportChunks.length <= 3) {
        return "No data found for this block across active schemes.\nPlease check if the block name matches the data sheets.";
    }

    reportChunks.push("\n--------------------------------------------------");
    reportChunks.push("Action Required: Review these low performing GPs and initiate review meetings.");

    return reportChunks.join('\n');
};
