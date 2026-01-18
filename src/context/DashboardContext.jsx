import React, { createContext, useContext, useState, useEffect } from 'react';
import { generateMockData } from '../data/mockDataGenerator';
import { fetchSheetData, normalizeSheetData } from '../services/sheetService';
import { useConfig } from './ConfigContext';
import { getPrimaryMetric } from '../utils/metricUtils';

const DashboardContext = createContext();

export const useDashboard = () => useContext(DashboardContext);

export const DashboardProvider = ({ children }) => {
    const { schemes, nodalOfficers, sheetUrls, schemeGroups } = useConfig();
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

    // Helper: District Average (Refactored to use shared logic)
    const getDistrictAverage = (schemeName) => {
        const schemeRows = data[schemeName];
        if (!schemeRows || schemeRows.length === 0) return { value: 0, isPercentage: false };

        const keys = Object.keys(schemeRows[0]);
        const blockKey = keys.find(k => k.toLowerCase().includes('block')) || 'Block';

        // Use Centralized Metric Logic
        const metric = getPrimaryMetric(keys);
        if (!metric) return { value: "N/A", isPercentage: false };

        // 1. Direct Metric (Percentage or Count)
        if (metric.type === 'DIRECT' || metric.type === 'COUNT') {
            // Try to find "Total" row first
            const totalRow = schemeRows.find(r => r[blockKey] && r[blockKey].trim().toLowerCase() === 'total');
            if (totalRow && !isNaN(parseFloat(totalRow[metric.key]))) {
                return {
                    value: Math.round(parseFloat(totalRow[metric.key])),
                    isPercentage: metric.isPercentage,
                    label: metric.label
                };
            }

            // Fallback: Average of rows
            const validRows = schemeRows.filter(r => {
                const isTotal = r[blockKey]?.toLowerCase() === 'total';
                return !isTotal && !isNaN(parseFloat(r[metric.key]));
            });

            if (validRows.length > 0) {
                // If it's a COUNT, we SUM it. If it's a PERCENTAGE, we AVERAGE it.
                if (metric.type === 'COUNT') {
                    const total = validRows.reduce((sum, row) => sum + parseFloat(row[metric.key]), 0);
                    return { value: Math.round(total), isPercentage: false, label: metric.label };
                } else {
                    const total = validRows.reduce((sum, row) => sum + parseFloat(row[metric.key]), 0);
                    return { value: Math.round(total / validRows.length), isPercentage: true };
                }
            }
        }

        // 2. Calculated Metric (Target vs Done)
        if (metric.type === 'CALCULATED') {
            let totalTarget = 0;
            let totalDone = 0;
            schemeRows.forEach(row => {
                if (row[blockKey] && row[blockKey].trim().toLowerCase() === 'total') return;
                totalTarget += parseFloat(row[metric.targetKey]) || 0;
                totalDone += parseFloat(row[metric.doneKey]) || 0;
            });

            if (totalTarget > 0) {
                return { value: Math.round((totalDone / totalTarget) * 100), isPercentage: true, label: metric.label };
            }
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
            setBriefingScheme,
            schemeGroups // Pass through from ConfigContext
        }}>
            {children}
        </DashboardContext.Provider>
    );
};
