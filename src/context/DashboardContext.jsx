import React, { createContext, useContext, useState, useEffect } from 'react';
import { generateMockData } from '../data/mockDataGenerator';
import { fetchSheetData, normalizeSheetData } from '../services/sheetService';
import { useConfig } from './ConfigContext';

const DashboardContext = createContext();

export const useDashboard = () => useContext(DashboardContext);

export const DashboardProvider = ({ children }) => {
    const { schemes, nodalOfficers, sheetUrls } = useConfig();
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState({ state: 'IDLE', lastSynced: null });
    const [briefingScheme, setBriefingScheme] = useState(null); // Scheme selected for briefing

    // Function to load data (Mock or Real)
    const syncData = async () => {
        setSyncStatus(prev => ({ ...prev, state: 'SYNCING' }));

        try {
            const newData = {};

            const promises = schemes.map(async (scheme) => {
                const url = sheetUrls[scheme];
                if (url && url.trim() !== '') {
                    try {
                        const raw = await fetchSheetData(url);
                        newData[scheme] = normalizeSheetData(raw);
                    } catch (err) {
                        console.error(`Failed to fetch ${scheme}`, err);
                        // DO NOT fallback to mock data if URL is provided but fails.
                        // Leave it undefined so UI shows N/A or Error state.
                        newData[scheme] = [];
                    }
                } else {
                    // Only use Mock Data if NO URL is configured (Demo Mode)
                    // Per user request: DISABLE all mock data to prevent confusion.
                    // Only show data if explicitly linked.
                    if (!newData[scheme]) {
                        newData[scheme] = [];
                    }
                }
            });

            await Promise.all(promises);

            setData(newData);
            setSyncStatus({ state: 'SUCCESS', lastSynced: new Date() });
            setLoading(false);

        } catch (e) {
            console.error("Sync Failed", e);
            setSyncStatus(prev => ({ ...prev, state: 'ERROR' }));
            setLoading(false);
        }
    };

    // Initial Load & React to Scheme/URL Changes
    useEffect(() => {
        syncData();
    }, [schemes, sheetUrls]); // Re-sync when schemes or URLs change

    // Automatic Sync at 10:30 AM
    useEffect(() => {
        const checkTime = () => {
            const now = new Date();
            if (now.getHours() === 10 && now.getMinutes() === 30) {
                const last = syncStatus.lastSynced;
                const alreadySynced = last && last.getDate() === now.getDate() && last.getHours() === 10;

                if (!alreadySynced && syncStatus.state !== 'SYNCING') {
                    syncData();
                }
            }
        };
        const timer = setInterval(checkTime, 60000);
        return () => clearInterval(timer);
    }, [syncStatus]);

    // Helper: Identify the metric column
    const getProgressKey = (keys) => {
        const kLower = keys.map(k => k.toLowerCase());

        // Top Priority: Specific User Keys
        const sanctionKey = keys.find(k => k.toLowerCase().includes('sanction %') || k.toLowerCase().includes('sanction percentage'));
        if (sanctionKey) return sanctionKey;

        const completionKey = keys.find(k => k.toLowerCase().includes('completion %') || k.toLowerCase().includes('completion against target'));
        if (completionKey) return completionKey;

        // Priority 2: Generic Percentage
        let key = keys.find(k => k.toLowerCase().includes("(%)") || k.toLowerCase().includes("percentage") || k.includes("%"));
        if (key) return key;

        return null;
    };

    // Helper: Identify numerator/denominator interactions
    const getPerformanceKeys = (keys) => {
        // Denominator: Target
        const targetKey = keys.find(k => k.toLowerCase().includes('target') && !k.toLowerCase().includes('achievement'));

        // Numerator: Sanction Done, Registration Done, Achievement, Completed
        let doneKey = keys.find(k => k.toLowerCase().includes('sanction done'));
        if (!doneKey) doneKey = keys.find(k => k.toLowerCase().includes('registration done'));
        if (!doneKey) doneKey = keys.find(k => k.toLowerCase().includes('achievement'));
        if (!doneKey) doneKey = keys.find(k => k.toLowerCase().includes('completed'));

        return { targetKey, doneKey };
    };

    // Helper: District Average
    const getDistrictAverage = (schemeName) => {
        const schemeRows = data[schemeName];
        if (!schemeRows || schemeRows.length === 0) return { value: 0, isPercentage: false };

        const keys = Object.keys(schemeRows[0]);
        const progressKey = getProgressKey(keys);
        const blockKey = keys.find(k => k.toLowerCase().includes('block')) || 'Block';

        // 1. Precise Match: "Total" Row (Percentage)
        if (progressKey) {
            const totalRow = schemeRows.find(r => r[blockKey] && r[blockKey].trim().toLowerCase() === 'total');
            if (totalRow && !isNaN(parseFloat(totalRow[progressKey]))) {
                return { value: Math.round(parseFloat(totalRow[progressKey])), isPercentage: true };
            }
        }

        // 2. Weighted Average: Sum(Done) / Sum(Target) (Percentage)
        const { targetKey, doneKey } = getPerformanceKeys(keys);
        if (targetKey && doneKey) {
            let totalTarget = 0;
            let totalDone = 0;
            schemeRows.forEach(row => {
                if (row[blockKey] && row[blockKey].trim().toLowerCase() === 'total') return;
                totalTarget += parseFloat(row[targetKey]) || 0;
                totalDone += parseFloat(row[doneKey]) || 0;
            });

            if (totalTarget > 0) {
                return { value: Math.round((totalDone / totalTarget) * 100), isPercentage: true };
            }
        }

        // 3. Simple Average of Percentages (Percentage)
        if (progressKey) {
            const validRows = schemeRows.filter(r => {
                const isTotal = r[blockKey]?.toLowerCase() === 'total';
                return !isTotal && !isNaN(parseFloat(r[progressKey]));
            });

            if (validRows.length > 0) {
                const total = validRows.reduce((sum, row) => sum + parseFloat(row[progressKey]), 0);
                return { value: Math.round(total / validRows.length), isPercentage: true };
            }
        }

        // 4. FALLBACK: Sum of Count Metric (Count)
        // If no percentage found, look for "Count" metrics to sum up.
        // Priorities: Done > Target > Beneficiaries > Works > Amount
        const countKey = doneKey || targetKey || keys.find(k => {
            const lower = k.toLowerCase();
            return lower.includes('beneficiar') || lower.includes('works') || lower.includes('amount') || lower.includes('cost') || lower.includes('total');
        });

        if (countKey) {
            let totalSum = 0;
            schemeRows.forEach(row => {
                if (row[blockKey] && row[blockKey].trim().toLowerCase() === 'total') return;
                const val = parseFloat(row[countKey]);
                if (!isNaN(val)) totalSum += val;
            });
            // Heuristic: If sum is huge, it's definitely not a percentage.
            return { value: Math.round(totalSum), isPercentage: false, label: countKey };
        }

        return { value: "N/A", isPercentage: false };
    };

    return (
        <DashboardContext.Provider value={{
            schemes,
            data,
            loading,
            syncStatus,
            syncData,
            getDistrictAverage,
            nodalOfficers,
            briefingScheme,
            setBriefingScheme
        }}>
            {children}
        </DashboardContext.Provider>
    );
};
