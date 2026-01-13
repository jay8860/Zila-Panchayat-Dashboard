import React from 'react';
import { ArrowRight, TrendingUp, AlertCircle, Settings2, FileText } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

const SchemeCard = ({ scheme, onClick, onEdit, onBriefing }) => {
    const { getDistrictAverage, nodalOfficers } = useDashboard();
    const average = getDistrictAverage(scheme);
    const officer = nodalOfficers[scheme] || { name: 'Unassigned', designation: 'N/A' };

    // Determine color based on average (if it's a number)
    let statusColor = "text-yellow-500";
    let bgGradient = "from-yellow-500/10 to-transparent";

    if (typeof average === 'number') {
        if (average >= 75) {
            statusColor = "text-emerald-500";
            bgGradient = "from-emerald-500/10 to-transparent";
        } else if (average < 40) {
            statusColor = "text-red-500";
            bgGradient = "from-red-500/10 to-transparent";
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

                <div className="mb-4">
                    <div className="text-3xl font-bold font-mono">
                        {average}{typeof average === 'number' ? '%' : ''}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">District Average</p>
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
            </div>
        </div >
    );
};

export default SchemeCard;
