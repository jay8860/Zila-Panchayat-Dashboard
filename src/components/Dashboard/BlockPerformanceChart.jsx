import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

const BlockPerformanceChart = ({ scheme, onBack, onBlockClick }) => {
    const { data } = useDashboard();

    const chartData = useMemo(() => {
        const schemeData = data[scheme] || [];
        if (schemeData.length === 0) return [];

        // Identify keys
        const keys = Object.keys(schemeData[0]);
        // Progress Key (Fallback)
        let progressKey = keys.find(k => k.toLowerCase().includes('sanction %') || k.toLowerCase().includes('sanction percentage'));
        if (!progressKey) progressKey = keys.find(k => k.toLowerCase().includes('completion %'));
        if (!progressKey) progressKey = keys.find(k => k.toLowerCase().includes("(%)") || k.toLowerCase().includes("percentage") || k.includes("%"));

        // Numerator/Denominator Keys
        const targetKey = keys.find(k => k.toLowerCase().includes('target') && !k.toLowerCase().includes('achievement'));
        let doneKey = keys.find(k => k.toLowerCase().includes('sanction done'));
        if (!doneKey) doneKey = keys.find(k => k.toLowerCase().includes('registration done'));
        if (!doneKey) doneKey = keys.find(k => k.toLowerCase().includes('completed') || k.toLowerCase().includes('achievement'));

        const blockKey = keys.find(k => k.toLowerCase().includes('block')) || "Block";

        // Aggregate by Block
        const blockMap = {};
        schemeData.forEach(row => {
            const block = row[blockKey];
            if (!block) return;

            const safeBlock = block.trim();
            if (!blockMap[safeBlock]) {
                blockMap[safeBlock] = { total: 0, count: 0, numerator: 0, denominator: 0 };
            }

            if (targetKey && doneKey) {
                blockMap[safeBlock].denominator += parseFloat(row[targetKey] || 0);
                blockMap[safeBlock].numerator += parseFloat(row[doneKey] || 0);
            } else if (progressKey) {
                blockMap[safeBlock].total += parseFloat(row[progressKey] || 0);
            }
            blockMap[safeBlock].count += 1;
        });

        const aggregated = Object.keys(blockMap).map(block => {
            let val = 0;
            // Prefer Weighted Average
            if (targetKey && doneKey && blockMap[block].denominator > 0) {
                val = Math.round((blockMap[block].numerator / blockMap[block].denominator) * 100);
            } else if (progressKey && blockMap[block].count > 0) {
                val = Math.round(blockMap[block].total / blockMap[block].count);
            }

            return {
                name: block,
                value: val,
                rawKey: progressKey || doneKey,
                isTotal: block.toLowerCase().includes('total')
            };
        });

        // Ensure "Total" exists. If not, calculate it from the other blocks.
        const hasTotal = aggregated.some(item => item.isTotal);
        if (!hasTotal && aggregated.length > 0) {
            let totalVal = 0;
            if (targetKey && doneKey) {
                // Sum of all blocks
                const grandNum = Object.values(blockMap).reduce((acc, curr) => acc + curr.numerator, 0);
                const grandDenom = Object.values(blockMap).reduce((acc, curr) => acc + curr.denominator, 0);
                if (grandDenom > 0) {
                    totalVal = Math.round((grandNum / grandDenom) * 100);
                }
            } else {
                // Average of averages
                const sumVals = aggregated.reduce((acc, curr) => acc + curr.value, 0);
                totalVal = Math.round(sumVals / aggregated.length);
            }

            aggregated.push({
                name: "District Total",
                value: totalVal,
                rawKey: "Calculated",
                isTotal: true
            });
        }

        // Sort: Total first, then Descending Value
        return aggregated.sort((a, b) => {
            if (a.isTotal) return -1;
            if (b.isTotal) return 1;
            return b.value - a.value;
        });
    }, [data, scheme]);

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

            <div className="flex-1 w-full min-h-[400px] bg-card/50 rounded-xl p-4 border border-border/50">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        layout="vertical" // Horizontal bars are better for block names
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={100}
                            tick={{ fill: '#94a3b8', fontSize: 14 }}
                            axisLine={false}
                            tickLine={false}
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
