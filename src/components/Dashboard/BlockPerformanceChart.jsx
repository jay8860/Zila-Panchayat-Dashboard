import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

const BlockPerformanceChart = ({ scheme, onBack, onBlockClick }) => {
    const { data } = useDashboard();

    const [selectedMetric, setSelectedMetric] = React.useState('');

    // Extract available numeric keys
    const availableMetrics = useMemo(() => {
        const schemeData = data[scheme] || [];
        if (schemeData.length === 0) return [];

        const firstRow = schemeData[0];
        return Object.keys(firstRow).filter(key => {
            if (key.toLowerCase().includes('block')) return false;
            // Check if value is numeric-ish
            const val = firstRow[key];
            return !isNaN(parseFloat(val));
        });
    }, [data, scheme]);


    React.useEffect(() => {
        if (availableMetrics.length > 0 && !selectedMetric) {
            // Smart Default: Look for %, then Target/Done, else first
            const percentKey = availableMetrics.find(k => k.includes('%') || k.toLowerCase().includes('percent'));
            setSelectedMetric(percentKey || availableMetrics[0]);
        }
    }, [availableMetrics]);

    // Detect Percentage Metric (based on Data or Name)
    // Heuristic: If ANY row's value is a string containing '%', it's a percentage.
    const isPercentageMetric = useMemo(() => {
        const schemeData = data[scheme] || [];
        if (!selectedMetric || schemeData.length === 0) return false;

        // 1. Check Data for '%' symbol
        const hasPercentInData = schemeData.some(row => {
            const val = row[selectedMetric];
            return typeof val === 'string' && val.includes('%');
        });
        if (hasPercentInData) return true;

        // 2. Fallback: Check Name for keywords
        const lower = selectedMetric.toLowerCase();
        return lower.includes('%') || lower.includes('percent');
    }, [data, scheme, selectedMetric]);

    const chartData = useMemo(() => {
        const schemeData = data[scheme] || [];
        if (schemeData.length === 0 || !selectedMetric) return [];

        const blockKey = Object.keys(schemeData[0]).find(k => k.toLowerCase().includes('block')) || "Block";

        // Aggregate by Block
        const blockMap = {};
        schemeData.forEach(row => {
            const block = row[blockKey];
            if (!block) return;
            const safeBlock = block.trim();

            if (!blockMap[safeBlock]) {
                blockMap[safeBlock] = { total: 0, count: 0 };
            }

            const val = parseFloat(row[selectedMetric] || 0);
            if (!isNaN(val)) {
                blockMap[safeBlock].total += val;
                blockMap[safeBlock].count += 1;
            }
        });

        // Calculate District Total Stats
        let districtSum = 0;
        let districtCount = 0; // Count of GPs/items across all blocks

        Object.values(blockMap).forEach(b => {
            districtSum += b.total;
            districtCount += b.count;
        });

        // Detect Percentage based on Data content (Does it contain %?)
        // Fallback to name check if data is ambiguous, but prioritize data.
        const isPercentageData = schemeData.some(row => {
            const val = row[selectedMetric];
            return typeof val === 'string' && val.includes('%');
        });

        // Also keep legacy name check just in case, but data check rules.
        const isPercentageName = selectedMetric.includes('%') || selectedMetric.toLowerCase().includes('percent');

        const isPercentage = isPercentageData || isPercentageName;

        const aggregated = Object.keys(blockMap).map(block => {
            let val = 0;
            if (isPercentage) {
                // Block Average
                val = blockMap[block].count > 0 ? (blockMap[block].total / blockMap[block].count) : 0;
            } else {
                // Block Sum
                val = blockMap[block].total;
            }

            return {
                name: block,
                value: Math.round(val * 10) / 10, // 1 decimal place max
                isTotal: block.toLowerCase().includes('total') // Existing totals in data
            };
        });

        // Add District Total Bar
        let districtVal = 0;
        if (isPercentage) {
            // District Average = Total Sum / Total Count (Weighted Average)
            districtVal = districtCount > 0 ? (districtSum / districtCount) : 0;
        } else {
            // District Total = Sum of all work
            districtVal = districtSum;
        }

        aggregated.push({
            name: "District Total",
            value: Math.round(districtVal * 10) / 10,
            isDistrictTotal: true
        });

        // Sort: District Total First, then Descending Value
        return aggregated.sort((a, b) => {
            if (a.isDistrictTotal) return -1;
            if (b.isDistrictTotal) return 1;
            if (a.isTotal) return -1; // Keep original total if exists (though we are calculating our own now)
            if (b.isTotal) return 1;
            return b.value - a.value;
        });
    }, [data, scheme, selectedMetric]);

    // Handle click on bar
    const handleBarClick = (data, index) => {
        // ALWAYS drill down. GPTable handles "No Data" gracefully.
        // Pass the selectedMetric to enable smart column focus in the next view
        onBlockClick(data.name, selectedMetric);
    };

    // Color logic
    const getColor = (value) => {
        if (value >= 75) return '#10b981'; // emerald-500
        if (value < 40) return '#ef4444'; // red-500
        return '#f59e0b'; // amber-500
    };



    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex items-center mb-6">
                <button
                    onClick={onBack}
                    className="mr-4 p-2 rounded-full hover:bg-muted transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold">{scheme}</h2>
                    <p className="text-muted-foreground">Block-wise Performance Analysis</p>
                </div>
            </div>

            {/* Metric Selector */}
            <div className="mb-4">
                <label className="text-sm text-muted-foreground mr-2">Display Metric:</label>
                <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    className="bg-card border border-border rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    {availableMetrics.map(m => (
                        <option key={m} value={m}>{m.replace('$', '').trim()}</option>
                    ))}
                </select>
            </div>

            <div className="flex-1 w-full min-h-[400px] bg-card/50 rounded-xl p-4 border border-border/50">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }} // Extra bottom for labels
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis
                            dataKey="name"
                            type="category"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            interval={0}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            type="number"
                            domain={['auto', 'auto']}
                            hide
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-card border border-border p-3 rounded shadow-xl">
                                            <p className="font-semibold text-lg">{label}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {isPercentageMetric ? 'Average Performance:' : 'Total Count:'}
                                                <span className="font-bold text-foreground ml-1">
                                                    {payload[0].value}{isPercentageMetric ? '%' : ''}
                                                </span>
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">Click to view GPs</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar
                            dataKey="value"
                            radius={[0, 4, 4, 0]}
                            barSize={40}
                            onClick={handleBarClick}
                            cursor="pointer"
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.isDistrictTotal ? '#6366f1' : getColor(entry.value)}
                                    stroke={entry.isDistrictTotal ? '#4f46e5' : 'none'}
                                    strokeWidth={entry.isDistrictTotal ? 2 : 0}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Legend - Only show for Percentages */}
            {isPercentageMetric && (
                <div className="mt-6 flex gap-6 justify-center">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-sm text-muted-foreground">Good (&gt;75%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="text-sm text-muted-foreground">Average (40-75%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-sm text-muted-foreground">Critical (&lt;40%)</span>
                    </div>
                </div>
            )}
        </div >
    );
};

export default BlockPerformanceChart;
