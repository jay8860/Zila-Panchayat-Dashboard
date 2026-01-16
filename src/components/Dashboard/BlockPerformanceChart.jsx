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

    // Set default metric on load
    React.useEffect(() => {
        if (availableMetrics.length > 0 && !selectedMetric) {
            // Smart Default: Look for %, then Target/Done, else first
            const percentKey = availableMetrics.find(k => k.includes('%') || k.toLowerCase().includes('percent'));
            setSelectedMetric(percentKey || availableMetrics[0]);
        }
    }, [availableMetrics]);

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
            blockMap[safeBlock].total += val;
            blockMap[safeBlock].count += 1;
        });

        const aggregated = Object.keys(blockMap).map(block => {
            // If it looks like a percentage (0-100 range likely), avg it. Else sum it.
            // Heuristic: If name contains %, average. Else Sum.
            const isPercentage = selectedMetric.includes('%') || selectedMetric.toLowerCase().includes('percent');

            let val = 0;
            if (isPercentage) {
                val = blockMap[block].count > 0 ? Math.round(blockMap[block].total / blockMap[block].count) : 0;
            } else {
                val = Math.round(blockMap[block].total);
            }

            return {
                name: block,
                value: val,
                isTotal: block.toLowerCase().includes('total')
            };
        });

        // Sort
        return aggregated.sort((a, b) => {
            if (a.isTotal) return -1;
            if (b.isTotal) return 1;
            return b.value - a.value;
        });
    }, [data, scheme, selectedMetric]);

    // Handle click on bar
    const handleBarClick = (data, index) => {
        // ALWAYS drill down. GPTable handles "No Data" gracefully.
        onBlockClick(data.name);
    };

    // Color logic
    const getColor = (value) => {
        if (value >= 75) return '#10b981'; // emerald-500
        if (value < 40) return '#ef4444'; // red-500
        return '#f59e0b'; // amber-500
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-card border border-border p-3 rounded shadow-xl">
                    <p className="font-semibold text-lg">{label}</p>
                    <p className="text-sm text-muted-foreground">
                        Average Performance: <span className="font-bold text-foreground">{payload[0].value}%</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Click to view GPs</p>
                </div>
            );
        }
        return null;
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
                            domain={[0, 100]}
                            hide
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                        <Bar
                            dataKey="value"
                            radius={[0, 4, 4, 0]}
                            barSize={40}
                            onClick={handleBarClick}
                            cursor="pointer"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getColor(entry.value)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

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
        </div>
    );
};

export default BlockPerformanceChart;
