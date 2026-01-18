
// Helper: Clean numeric values (remove %, trim)
export const cleanValue = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = val.toString().replace('%', '').trim();
    return parseFloat(clean) || 0;
};

export const getPrimaryMetric = (keys) => {
    const kLower = keys.map(k => k.toLowerCase());

    // 1. Top Priority: Specific User Keys (Sanction %)
    const sanctionKey = keys.find(k => k.toLowerCase().includes('sanction %') || k.toLowerCase().includes('sanction percentage'));
    if (sanctionKey) return { key: sanctionKey, label: sanctionKey, type: 'DIRECT', isPercentage: true };

    // 2. Completion %
    const completionKey = keys.find(k => k.toLowerCase().includes('completion %') || k.toLowerCase().includes('completion against target'));
    if (completionKey) return { key: completionKey, label: completionKey, type: 'DIRECT', isPercentage: true };

    // 3. Generic Percentage
    let genericKey = keys.find(k => k.toLowerCase().includes("(%)") || k.toLowerCase().includes("percentage") || k.includes("%"));
    if (genericKey) return { key: genericKey, label: genericKey, type: 'DIRECT', isPercentage: true };

    // 4. Weighted Average (Target + Done pair)
    // Denominator: Target
    const targetKey = keys.find(k => k.toLowerCase().includes('target') && !k.toLowerCase().includes('achievement'));

    // Numerator: Sanction Done, Registration Done, Achievement, Completed
    let doneKey = keys.find(k => k.toLowerCase().includes('sanction done'));
    if (!doneKey) doneKey = keys.find(k => k.toLowerCase().includes('registration done'));
    if (!doneKey) doneKey = keys.find(k => k.toLowerCase().includes('achievement'));
    if (!doneKey) doneKey = keys.find(k => k.toLowerCase().includes('completed'));

    if (targetKey && doneKey) {
        // Label logic: Try to construct a meaningful label like "Achievement %" or "Sanction %" based on Done key
        let label = 'Achievement %';
        if (doneKey.toLowerCase().includes('sanction')) label = 'Sanction %';
        else if (doneKey.toLowerCase().includes('registration')) label = 'Registration %';
        else if (doneKey.toLowerCase().includes('completed')) label = 'Completion %';

        return {
            key: null, // No single key
            label: label,
            type: 'CALCULATED',
            isPercentage: true,
            targetKey,
            doneKey
        };
    }

    // 5. Fallback: Count Metric (Works, Beneficiaries, etc.)
    const countKey = doneKey || targetKey || keys.find(k => {
        const lower = k.toLowerCase();
        return lower.includes('beneficiar') || lower.includes('works') || lower.includes('amount') || lower.includes('cost') || lower.includes('total');
    });

    if (countKey) {
        return { key: countKey, label: countKey, type: 'COUNT', isPercentage: false };
    }

    return null;
};
