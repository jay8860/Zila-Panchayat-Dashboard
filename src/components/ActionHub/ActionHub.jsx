import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { AlertTriangle, Copy, Check, FileText, Filter, Building2, Home, BarChart2 } from 'lucide-react';
import { generateCEOReport, normalizeBlockName } from '../../utils/ceoReportGenerator';

const ActionHub = () => {
    const { schemes, data, nodalOfficers, briefingScheme, setBriefingScheme, schemeGroups } = useDashboard();
    const [generatedBriefs, setGeneratedBriefs] = useState([]);
    const [selectedScheme, setSelectedScheme] = useState('All');
    const [reportLevel, setReportLevel] = useState('GP'); // 'GP' | 'BLOCK'
    const [reportMode, setReportMode] = useState('BRIEF'); // 'BRIEF' | 'CEO_REPORT'
    const [selectedBlock, setSelectedBlock] = useState('');
    const [ceoReportText, setCeoReportText] = useState('');

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

            </header>

            {/* Mode Toggle */}
            <div className="flex justify-center mb-8">
                <div className="bg-muted p-1 rounded-lg flex shadow-sm">
                    <button
                        onClick={() => setReportMode('BRIEF')}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${reportMode === 'BRIEF' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <AlertTriangle size={16} />
                        Intervention Briefs
                    </button>
                    <button
                        onClick={() => setReportMode('CEO_REPORT')}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${reportMode === 'CEO_REPORT' ? 'bg-white shadow text-indigo-600' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <BarChart2 size={16} />
                        CEO Block Report
                    </button>
                </div>
            </div>

            {reportMode === 'CEO_REPORT' ? (
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Controls */}
                    <div className="bg-card border border-border p-6 rounded-xl flex flex-col md:flex-row gap-4 items-end shadow-sm">
                        <div className="flex-1 w-full">
                            <label className="text-sm font-medium text-muted-foreground mb-1 block">Select Block</label>
                            <select
                                value={selectedBlock}
                                onChange={(e) => setSelectedBlock(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="">-- Choose Block --</option>
                                {/* Normalized Block List */}
                                {(() => {
                                    const uniqueBlocks = new Set();
                                    schemes.forEach(s => {
                                        const d = data[s] || [];
                                        if (d.length > 0) {
                                            const keys = Object.keys(d[0]);
                                            const bKey = keys.find(k => k.toLowerCase().includes('block'));
                                            if (bKey) {
                                                d.forEach(r => {
                                                    const b = r[bKey]?.trim();
                                                    // Normalize & Filter
                                                    // Only add if it maps to a known block
                                                    const normalized = normalizeBlockName(b);
                                                    if (normalized && normalized !== b && normalized.length > 2) {
                                                        // Ensure we only add valid normalized names
                                                        uniqueBlocks.add(normalized);
                                                    } else if (normalized && ['Dantewada', 'Geedam', 'Katekalyan', 'Kuwakonda'].includes(normalized)) {
                                                        uniqueBlocks.add(normalized);
                                                    }
                                                });
                                            }
                                        }
                                    });
                                    // Fallback if data scanning fails or returns nothing: Show standard 4
                                    if (uniqueBlocks.size === 0) {
                                        ['Dantewada', 'Geedam', 'Katekalyan', 'Kuwakonda'].forEach(b => uniqueBlocks.add(b));
                                    }

                                    return Array.from(uniqueBlocks).sort().map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ));
                                })()}
                            </select>
                        </div>
                        <button
                            onClick={() => {
                                try {
                                    if (!selectedBlock) return alert("Please select a block first");
                                    console.log("Generating report for:", selectedBlock);
                                    const report = generateCEOReport({ blockName: selectedBlock, schemeGroups, data, schemes });
                                    setCeoReportText(report);
                                } catch (error) {
                                    console.error("Report Generation Failed:", error);
                                    alert(`Failed to generate report: ${error.message}`);
                                }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            Generate Report
                        </button>
                    </div>

                    {/* Report Output */}
                    {ceoReportText && (
                        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg animate-in fade-in zoom-in-95 duration-300">
                            <div className="bg-muted/30 p-4 border-b border-border flex justify-between items-center">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <FileText size={18} className="text-indigo-500" />
                                    Generated Report
                                </h3>
                                <button
                                    onClick={() => copyToClipboard(ceoReportText, 'full_report')}
                                    className="text-xs flex items-center gap-1.5 bg-background border border-border hover:bg-muted px-3 py-1.5 rounded-md transition-colors"
                                >
                                    {copiedId === 'full_report' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                    {copiedId === 'full_report' ? 'Copied!' : 'Copy to Clipboard'}
                                </button>
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-950/30">
                                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/80">
                                    {ceoReportText}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // EXISTING BRIEF UI WRAPPER
                <>
                    {/* Header Controls (Level & Scheme) only needed for Briefs */}
                    <div className="flex flex-col md:flex-row justify-end mb-6 gap-4">
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
                                className="bg-card border border-border rounded-lg px-4 py-2 pr-10 appearance-none outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer min-w-[200px]"
                            >
                                <option value="All">All Schemes</option>
                                {schemes.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <Filter className="absolute right-3 top-3 text-muted-foreground pointer-events-none" size={16} />
                        </div>

                        <button
                            onClick={generateBriefing}
                            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium shadow hover:bg-primary/90 transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                            <AlertTriangle size={18} />
                            Refresh Briefs
                        </button>
                    </div>


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
                </>
            )}
        </div>
    );
};

export default ActionHub;
