
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

export const generateCEOReport = ({ blockName, schemeGroups, data, schemes }) => {
    let reportChunks = [];
    const blockUpper = blockName.toUpperCase();

    // Header
    reportChunks.push(`*🚨 CEO BLOCK PROGRESS REPORT: ${blockUpper}*`);
    reportChunks.push(`_generated on ${new Date().toLocaleDateString()}_`);
    reportChunks.push("--------------------------------------------------");

    schemeGroups.forEach(group => {
        // Only process groups that have active schemes with data
        const activeSchemesInGroup = group.schemes.filter(s =>
            data[s] && data[s].length > 0 && schemes.includes(s)
        );

        if (activeSchemesInGroup.length === 0) return;

        reportChunks.push(`\n*📂 GROUP: ${group.title.toUpperCase()}*`);

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
                const bName = row[blockKey]?.trim();
                if (!bName || bName.toLowerCase() === 'total') return;

                // Benchmarking Data
                if (!blockMap[bName]) blockMap[bName] = { sum: 0, count: 0, rows: [] };
                const val = cleanValue(row[percentageKey]);
                blockMap[bName].sum += val;
                blockMap[bName].count += 1;

                // Current Block Data
                if (bName.toLowerCase() === blockName.toLowerCase()) {
                    currentBlockGPs.push({
                        name: row[gpKey] || 'Unknown GP',
                        val: val,
                        target: targetKey ? cleanValue(row[targetKey]) : '-',
                        done: doneKey ? cleanValue(row[doneKey]) : '-'
                    });
                }
            });

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
                if (bName.toLowerCase() === blockName.toLowerCase()) {
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
            reportChunks.push(`\n*📌 Scheme: ${scheme}*`);
            reportChunks.push(`${statusEmoji} Your Avg: *${currentBlockAvg}%* | Top Block (${topBlock}): *${maxAvg}%*`);
            reportChunks.push(`📉 Gap: -${gap}% from Top`);

            if (bottom10.length > 0) {
                reportChunks.push(`\n_⚠️ Weakest Links (Bottom 10 GPs):_`);
                bottom10.forEach((gp, idx) => {
                    let details = `(${gp.val}%)`;
                    if (gp.target !== '-' && gp.done !== '-') {
                        details = `(${gp.val}% | T:${fmt(gp.target)}/D:${fmt(gp.done)})`;
                    }
                    reportChunks.push(`${idx + 1}. ${gp.name} ${details}`);
                });
            } else {
                reportChunks.push(`_No data available for GPs in this block_`);
            }
            reportChunks.push(`\n`);
        });
    });

    reportChunks.push("--------------------------------------------------");
    reportChunks.push("Action Required: Review these low performing GPs and initiate review meetings.");

    return reportChunks.join('\n');
};
