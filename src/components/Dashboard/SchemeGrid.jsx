import React, { useEffect, useMemo } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { useConfig } from '../../context/ConfigContext';
import { ArrowRight, TrendingUp, AlertCircle, Settings2, FileText, Activity, Clock } from 'lucide-react';


const SchemeCard = ({ scheme, onClick, onEdit, onBriefing }) => {
    const { getDistrictAverage, nodalOfficers, data } = useDashboard();
    const { snapshots, updateSnapshot } = useConfig();

    const { value: average, isPercentage, label } = getDistrictAverage(scheme);
    const officer = nodalOfficers[scheme] || { name: 'Unassigned', designation: 'N/A' };

    // --- Daily Progress Logic ---
    const { headlineValue, headlineLabel, progressDiff, isStale, lastUpdated } = useMemo(() => {
        const schemeData = data[scheme] || [];
        if (schemeData.length === 0) return {};

        // 1. Find Headline Column ($)
        const keys = Object.keys(schemeData[0]);
        const headlineKey = keys.find(k => k.includes('$'));

        let val = 0;
        let diff = null;
        let stale = false;

        if (headlineKey) {
            // Sum it up
            val = schemeData.reduce((acc, row) => {
                const num = parseFloat(row[headlineKey] || 0);
                return acc + (isNaN(num) ? 0 : num);
            }, 0);

            // Compare with Snapshot
            const snap = snapshots[scheme];
            if (snap) {
                // Formatting date to check equality
                const today = new Date().toISOString().split('T')[0];
                if (snap.currDate === today) {
                    // Start of day diff (Curr - Prev)
                    diff = val - snap.prevValue;
                } else {
                    // If no snapshot for today yet, diff is (Current - LastKnown)
                    // But usually useEffect below handles the update first.
                    // Let's rely on prevValue which persists across days.
                    diff = val - snap.currValue; // Actually prevValue is better if shifted.
                }

                // Stale Check: If > 11 AM and val == prevValue (no change for > 1 day)
                // Actually user said "if by 11 AM, there is no change... show it".
                const now = new Date();
                const cutoff = new Date();
                cutoff.setHours(11, 0, 0, 0);

                if (now > cutoff && diff === 0) {
                    stale = true;
                }
            }
        }

        return {
            headlineValue: val,
            headlineLabel: headlineKey ? headlineKey.replace('$', '').trim() : null,
            progressDiff: diff,
            isStale: stale,
            lastUpdated: snapshots[scheme]?.lastUpdated
        };
    }, [data, scheme, snapshots]);

    const schemeDataHash = JSON.stringify(data[scheme] || []);

    // --- Sync Logic ---
    useEffect(() => {
        // Trigger update if we have data (even empty array is technically data, but let's require length > 0 for valid hash if needed, 
        // though empty sheet might be a valid state. Let's stick to existing condition + hash check)

        // We allow update even if value is 0, to capture "Zero Progress" confirmation via Hash change.
        if (schemeDataHash !== '[]') {
            updateSnapshot(scheme, headlineValue || 0, schemeDataHash);
        }
    }, [headlineValue, schemeDataHash, scheme, updateSnapshot]);


    // Determine color based on average (if it's a number)
    let statusColor = "text-yellow-500";
    let bgGradient = "from-yellow-500/10 to-transparent";

    if (typeof average === 'number') {
        if (isPercentage) {
            // Percentage Logic
            if (average >= 75) {
                statusColor = "text-emerald-500";
                bgGradient = "from-emerald-500/10 to-transparent";
            } else if (average < 40) {
                statusColor = "text-red-500";
                bgGradient = "from-red-500/10 to-transparent";
            }
        } else {
            // Count Logic (Neutral/Info)
            statusColor = "text-indigo-500";
            bgGradient = "from-indigo-500/10 to-transparent";
        }
    }

    return (
        <div
            onClick={onClick}
            className={`group relative overflow-hidden bg-card border border-border p-5 rounded-xl cursor-pointer hover:shadow-lg transition-all hover:border-primary/50`}
        >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${bgGradient} blur-2xl -mr-10 -mt-10 opacity-50`} />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-lg leading-tight w-3/4">{scheme}</h3>
                    {typeof average === 'number' ? (
                        <TrendingUp size={20} className={statusColor} />
                    ) : (
                        <AlertCircle size={20} className="text-muted-foreground" />
                    )}
                </div>

                <div className="mb-4 flex items-end justify-between">
                    <div>
                        <div className="text-3xl font-bold font-mono">
                            {average && average.toLocaleString()}{isPercentage ? '%' : ''}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {isPercentage ? 'District Average' : (label ? `Total ${label}` : 'Total Count')}
                        </p>
                    </div>

                    {/* Daily Progress Section */}
                    {headlineLabel && (
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-1">
                                <span className={`text-xl font-bold font-mono ${progressDiff > 0 ? 'text-emerald-400' : 'text-foreground'}`}>
                                    {headlineValue.toLocaleString()}
                                </span>
                                {progressDiff !== null && progressDiff !== 0 && (
                                    <div className={`text-xs px-1.5 py-0.5 rounded-full flex items-center ${progressDiff > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {progressDiff > 0 ? '+' : ''}{progressDiff.toLocaleString()}
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{headlineLabel}</p>
                        </div>
                    )}
                </div>

                <div className="border-t border-border pt-3 mt-3 flex justify-between items-center">
                    <div className="flex-grow"> {/* Added flex-grow to push arrow to the right */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Nodal Officer</p>
                                <p className="text-sm font-medium">{officer?.name || 'Unassigned'}</p>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(); }}
                                className="text-xs text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-primary/10"
                                title="Edit Officer"
                            >
                                <Settings2 size={14} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); if (onBriefing) onBriefing(); }}
                                className="text-xs text-muted-foreground hover:text-blue-400 transition-colors p-1 rounded-md hover:bg-blue-500/10 ml-1"
                                title="Generate Briefing"
                            >
                                <FileText size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors ml-4"> {/* Added ml-4 for spacing */}
                        <ArrowRight size={14} />
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-3 pt-2 border-t border-border/50 flex flex-col gap-1">
                    {/* Always show Last Updated if available */}
                    {headlineLabel && lastUpdated && (
                        <div className="flex items-center space-x-2 text-muted-foreground">
                            <Clock size={12} />
                            <span className="text-[10px] font-medium">
                                Updated: {new Date(lastUpdated).toLocaleDateString() === new Date().toLocaleDateString()
                                    ? `Today, ${new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                    : new Date(lastUpdated).toLocaleDateString()}
                            </span>
                        </div>
                    )}

                    {/* Show Stale Warning separately if needed */}
                    {isStale && (
                        <div className="flex items-center space-x-2 text-red-400 animate-pulse">
                            <AlertCircle size={12} />
                            <span className="text-[10px] font-medium">No progress by 11:00 AM</span>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default SchemeCard;
