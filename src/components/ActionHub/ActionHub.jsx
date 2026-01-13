import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { AlertTriangle, Copy, Check, FileText, Filter, Building2, Home } from 'lucide-react';

const ActionHub = () => {
    const { schemes, data, nodalOfficers, briefingScheme, setBriefingScheme } = useDashboard();
    const [generatedBriefs, setGeneratedBriefs] = useState([]);
    const [selectedScheme, setSelectedScheme] = useState('All');
    const [reportLevel, setReportLevel] = useState('GP'); // 'GP' | 'BLOCK'

    // Sync with global briefing selection (from Dashboard click)
    useEffect(() => {
        if (briefingScheme) {
            setSelectedScheme(briefingScheme);
        }
    }, [briefingScheme]);

    // Internal auto-generate when params change
    useEffect(() => {
        generateBriefing();
    }, [selectedScheme, reportLevel]); // Re-run if Scheme or Level changes

    const cleanValue = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        // Remove % and trim
        const clean = val.toString().replace('%', '').trim();
        return parseFloat(clean) || 0;
    };

    const findColumn = (keys, keywords) => {
        return keys.find(k => keywords.some(keyword => k.toLowerCase().includes(keyword.toLowerCase())));
    };

    const generateBriefing = () => {
        const briefs = [];
        const schemesToProcess = selectedScheme === 'All' ? schemes : [selectedScheme];

        schemesToProcess.forEach(scheme => {
            const schemeData = data[scheme] || [];
            const officer = nodalOfficers[scheme];

            if (schemeData.length === 0) return;

            const keys = Object.keys(schemeData[0]);

            // 1. Identify Columns
            // Progress
            const progressKeywords = ['%', 'percentage', 'progress', 'achievement', 'completion', 'rate'];
            const progressKey = findColumn(keys, progressKeywords);

            // GP Name
            const gpKeywords = ['gram panchayat', 'gp name', 'gp', 'panchayat', 'name of gp'];
            const gpKey = findColumn(keys, gpKeywords);

            // Block Name
            const blockKeywords = ['block', 'block name', 'name of block'];
            const blockKey = findColumn(keys, blockKeywords);

            if (!progressKey || !gpKey) {
                console.warn(`[ActionHub] Skipping ${scheme}: Missing columns (Progress: ${progressKey}, GP: ${gpKey})`);
                return;
            }

            // Common Logic: Filter Valid Rows
            const validRows = schemeData.filter(row => {
                // Filter headers/totals
                if (row[gpKey]?.toLowerCase() === 'total') return false;
                return true;
            });

            if (reportLevel === 'GP') {
                // --- GP LEVEL LOGIC ---
                // Filter < 40%
                const critical = validRows.filter(row => {
                    const val = cleanValue(row[progressKey]);
                    return val < 40 && val >= 0;
                });

                // Sort Ascending (worst first)
                critical.sort((a, b) => cleanValue(a[progressKey]) - cleanValue(b[progressKey]));

                // Take bottom 10 (Updated from 5)
                const bottom10 = critical.slice(0, 10);

                bottom10.forEach(row => {
                    const val = cleanValue(row[progressKey]);
                    const gpName = row[gpKey] || 'Unknown GP';
                    const blockName = blockKey ? row[blockKey] : 'Unknown Block';
                    const officerName = officer?.name || 'District Nodal';

                    const message = `In ${scheme}, Gram Panchayat ${gpName} of ${blockName} Block is at ${val}%. Please coordinate with ${officerName} and resolve this immediately.`;

                    briefs.push({
                        id: Math.random().toString(36).substr(2, 9),
                        type: 'GP',
                        scheme,
                        block: blockName,
                        title: gpName,
                        value: val,
                        message
                    });
                });

            } else {
                // --- BLOCK LEVEL LOGIC ---
                if (!blockKey) {
                    // Only warn once per scheme
                    return;
                }

                // Group by Block
                const blocks = {};
                validRows.forEach(row => {
                    const bName = row[blockKey] || 'Unknown';
                    if (!blocks[bName]) blocks[bName] = [];
                    blocks[bName].push(row);
                });

                Object.entries(blocks).forEach(([blockName, rows]) => {
                    // Calculate Average
                    const sum = rows.reduce((acc, r) => acc + cleanValue(r[progressKey]), 0);
                    const avg = rows.length > 0 ? Math.round(sum / rows.length) : 0;

                    // Find Bottom 10 GPs
                    const sortedGPs = [...rows].sort((a, b) => cleanValue(a[progressKey]) - cleanValue(b[progressKey]));
                    const bottom10 = sortedGPs.slice(0, 10);

                    // Construct Message
                    let gpList = bottom10.map((r, i) => `${i + 1}. ${r[gpKey]} (${cleanValue(r[progressKey])}%)`).join('\n');

                    const message = `*${scheme} - ${blockName} Block Report*\n` +
                        `To Block Nodal,\n` +
                        `Overall Block Progress: *${avg}%*\n\n` +
                        `*Bottom 10 GPs requiring immediate attention:*\n` +
                        `${gpList}\n\n` +
                        `Please direct AOs/Secretaries to improve coverage immediately.`;

                    briefs.push({
                        id: Math.random().toString(36).substr(2, 9),
                        type: 'BLOCK',
                        scheme,
                        block: blockName,
                        title: blockName,
                        value: avg,
                        message,
                        details: bottom10 // For potential UI expansion
                    });
                });
            }
        });

        setGeneratedBriefs(briefs);
    };

    const [copiedId, setCopiedId] = useState(null);

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Action Hub</h2>
                    <p className="text-muted-foreground mt-2">
                        Automated insight & intervention generation.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
                    {/* Level Toggle */}
                    <div className="bg-muted p-1 rounded-lg flex">
                        <button
                            onClick={() => setReportLevel('GP')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${reportLevel === 'GP' ? 'bg-card shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Home size={16} />
                            Gram Panchayat
                        </button>
                        <button
                            onClick={() => setReportLevel('BLOCK')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${reportLevel === 'BLOCK' ? 'bg-card shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Building2 size={16} />
                            Block Wise
                        </button>
                    </div>

                    {/* Scheme Selector */}
                    <div className="relative">
                        <select
                            value={selectedScheme}
                            onChange={(e) => {
                                setSelectedScheme(e.target.value);
                                setBriefingScheme(e.target.value === 'All' ? null : e.target.value);
                            }}
                            className="bg-card border border-border rounded-lg px-4 py-3 pr-10 appearance-none outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer min-w-[200px]"
                        >
                            <option value="All">All Schemes</option>
                            {schemes.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <Filter className="absolute right-3 top-3.5 text-muted-foreground pointer-events-none" size={16} />
                    </div>

                    <button
                        onClick={generateBriefing}
                        className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium shadow-lg hover:bg-primary/90 transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                        <AlertTriangle size={18} />
                        Refresh Briefing
                    </button>
                </div>
            </header>

            {generatedBriefs.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-16 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="text-muted-foreground" size={32} />
                    </div>
                    <h3 className="text-lg font-medium">No Alerts Found</h3>
                    <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                        {reportLevel === 'GP'
                            ? "No GPs found with <40% progress."
                            : "No Block data available."}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {generatedBriefs.map(brief => (
                        <div key={brief.id} className="bg-card border border-border p-5 rounded-xl flex gap-4 hover:border-primary/50 transition-colors group">
                            <div className={`w-1 rounded-full h-auto ${brief.type === 'GP' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        <span className="bg-muted px-2 py-0.5 rounded">{brief.scheme}</span>
                                        {brief.type === 'GP' ? (
                                            <>
                                                <span className="bg-muted px-2 py-0.5 rounded">{brief.block} Block</span>
                                                <span className="bg-muted px-2 py-0.5 rounded">{brief.title}</span>
                                            </>
                                        ) : (
                                            <span className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded">{brief.title} Block Report</span>
                                        )}
                                    </div>
                                    <span className={`font-bold px-2 py-0.5 rounded text-sm ${brief.type === 'GP' ? 'text-red-500 bg-red-500/10' : 'text-blue-500 bg-blue-500/10'}`}>
                                        {brief.value}%
                                    </span>
                                </div>

                                <div className="bg-muted/30 p-4 rounded-lg font-mono text-sm text-foreground/90 whitespace-pre-wrap border border-transparent group-hover:border-border/50 transition-colors">
                                    {brief.message}
                                </div>
                            </div>

                            <div className="flex flex-col justify-center">
                                <button
                                    onClick={() => copyToClipboard(brief.message, brief.id)}
                                    className="p-3 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-primary-foreground transition-all"
                                    title="Copy for WhatsApp"
                                >
                                    {copiedId === brief.id ? <Check size={20} /> : <Copy size={20} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActionHub;
