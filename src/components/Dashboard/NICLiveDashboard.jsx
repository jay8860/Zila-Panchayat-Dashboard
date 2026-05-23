import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Search, ArrowUpDown, ArrowUp, ArrowDown, Download, 
    FileSpreadsheet, FileText, Pin, PinOff, Globe, 
    RefreshCw, CheckCircle, AlertCircle, Database, 
    Terminal, Award, Activity, Play 
} from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_URL = import.meta.env.PROD ? "/api" : "http://localhost:8000/api";

const PORTAL_URLS = {
    "MGNREGA": "https://nrega.nic.in",
    "SBM-G": "https://sbm.gov.in/sbmgdashboard/statesdashboard.aspx",
    "NRLM": "https://nrlm.gov.in/outerReportAction.do?methodName=showReportMaster",
    "PMAY-G": "https://pmayg.nic.in",
    "PMAY-U": "https://pmaymis.gov.in"
};

const SCHEMES = ["MGNREGA", "SBM-G", "NRLM", "PMAY-G", "PMAY-U"];

const BLOCKS = ["Dantewada", "Geedam", "Kuakonda", "Katekalyan"];

const NICLiveDashboard = () => {
    // State management
    const [activeScheme, setActiveScheme] = useState("MGNREGA");
    const [selectedBlock, setSelectedBlock] = useState("ALL");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState(null);
    const [pinnedColumns, setPinnedColumns] = useState([]);
    const [showExportMenu, setShowExportMenu] = useState(false);
    
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    
    const [portals, setPortals] = useState([]);
    const [rankings, setRankings] = useState({});
    const [data, setData] = useState({ MGNREGA: [], "SBM-G": [], NRLM: [], "PMAY-G": [], "PMAY-U": [] });
    const [lastSynced, setLastSynced] = useState(null);
    const [terminalLogs, setTerminalLogs] = useState([
        "Terminal session initialized.",
        "Ready for synchronization. Press 'Run Sync Engine' to connect to NIC systems."
    ]);

    const terminalEndRef = useRef(null);

    // Fetch initial data
    const fetchStatusAndData = async () => {
        try {
            setLoading(true);
            
            // Fetch live status
            const statusRes = await fetch(`${API_URL}/nic/status`);
            if (statusRes.ok) {
                const statusData = await statusRes.json();
                setPortals(statusData);
            }
            
            // Fetch database data
            const dataRes = await fetch(`${API_URL}/nic/data`);
            if (dataRes.ok) {
                const rawData = await dataRes.json();
                setData(rawData);
                setRankings(rawData.rankings || {});
                if (rawData.lastSynced) {
                    setLastSynced(new Date(rawData.lastSynced));
                    setTerminalLogs(prev => [
                        ...prev,
                        `[INFO] Cached database loaded. Last synced on ${new Date(rawData.lastSynced).toLocaleString()}`
                    ]);
                }
            }
        } catch (error) {
            console.error("Failed to load initial sync data:", error);
            setTerminalLogs(prev => [...prev, `[ERROR] Failed to load data from server: ${error.message}`]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatusAndData();
    }, []);

    // Scroll terminal to bottom
    useEffect(() => {
        if (terminalEndRef.current) {
            terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [terminalLogs]);

    // Handle Manual Sync
    const handleSync = async () => {
        if (syncing) return;
        setSyncing(true);
        setTerminalLogs([
            `[${new Date().toLocaleTimeString()}] Handshake started...`,
            `[${new Date().toLocaleTimeString()}] Connecting to Central server...`
        ]);

        try {
            const res = await fetch(`${API_URL}/nic/sync`, { method: "POST" });
            if (res.ok) {
                const result = await res.json();
                
                // Animate logs on screen with slight delay
                let logIndex = 0;
                const interval = setInterval(() => {
                    if (logIndex < result.logs.length) {
                        setTerminalLogs(prev => [...prev, result.logs[logIndex]]);
                        logIndex++;
                    } else {
                        clearInterval(interval);
                        setSyncing(false);
                    }
                }, 200);

                // Update metrics
                setData(prev => ({
                    ...prev,
                    MGNREGA: result.logs ? data.MGNREGA : prev.MGNREGA, // We fetch data below to refresh
                }));
                setPortals(Object.values(result.portals));
                setRankings(result.rankings);
                setLastSynced(new Date(result.timestamp));
                
                // Re-fetch clean datasets from backend
                const dataRes = await fetch(`${API_URL}/nic/data`);
                if (dataRes.ok) {
                    const rawData = await dataRes.json();
                    setData(rawData);
                }
            } else {
                const err = await res.text();
                setTerminalLogs(prev => [...prev, `[ERROR] Sync failed: ${err}`]);
                setSyncing(false);
            }
        } catch (error) {
            console.error("Sync failed:", error);
            setTerminalLogs(prev => [...prev, `[ERROR] Network error during sync: ${error.message}`]);
            setSyncing(false);
        }
    };

    // Filter data by block and search term
    const filteredRows = useMemo(() => {
        const rawRows = data[activeScheme] || [];
        
        let rows = [...rawRows];
        
        // Filter by block
        if (selectedBlock !== "ALL") {
            const blockKey = activeScheme === "PMAY-U" ? null : "Block";
            if (blockKey) {
                rows = rows.filter(r => r[blockKey] === selectedBlock);
            }
        }
        
        // Filter by search term
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            rows = rows.filter(row =>
                Object.values(row).some(val =>
                    String(val).toLowerCase().includes(lowerTerm)
                )
            );
        }
        
        // Sorting logic
        if (sortConfig) {
            rows.sort((a, b) => {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];

                const numA = parseFloat(valA);
                const numB = parseFloat(valB);

                if (!isNaN(numA) && !isNaN(numB)) {
                    valA = numA;
                    valB = numB;
                } else {
                    valA = String(valA).toLowerCase();
                    valB = String(valB).toLowerCase();
                }

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        return rows;
    }, [data, activeScheme, selectedBlock, searchTerm, sortConfig]);

    // Table headers resolution
    const tableHeaders = useMemo(() => {
        if (filteredRows.length === 0) return [];
        const allKeys = Object.keys(filteredRows[0]);
        
        // Determine leading entity columns (e.g. Block, Gram Panchayat, ULB Name)
        const primaryKeys = ["Block", "Gram Panchayat", "ULB Name"];
        const ignoredKeys = ["s no", "s.no", "sno"];
        
        const otherHeaders = allKeys.filter(k => 
            !primaryKeys.includes(k) && !ignoredKeys.includes(k.toLowerCase())
        );
        
        // Arrange with pinned first
        const unpinned = otherHeaders.filter(h => !pinnedColumns.includes(h));
        return [...pinnedColumns, ...unpinned];
    }, [filteredRows, pinnedColumns]);

    const primaryColumns = useMemo(() => {
        if (filteredRows.length === 0) return [];
        const allKeys = Object.keys(filteredRows[0]);
        return ["Block", "Gram Panchayat", "ULB Name"].filter(k => allKeys.includes(k));
    }, [filteredRows]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-2 text-muted-foreground/30" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="ml-2 text-primary" />
            : <ArrowDown size={14} className="ml-2 text-primary" />;
    };

    const togglePin = (col) => {
        if (pinnedColumns.includes(col)) {
            setPinnedColumns(prev => prev.filter(c => c !== col));
        } else {
            setPinnedColumns(prev => [...prev, col]);
        }
    };

    // Style helper for percentage levels
    const getCellStyle = (key, value) => {
        const lowerKey = key.toLowerCase();
        const keywords = ['%', 'percentage', 'progress', 'achievement', 'completion', 'rate'];
        const isPercentage = keywords.some(k => lowerKey.includes(k));
        
        if (!isPercentage) return "";
        const num = parseFloat(value);
        if (isNaN(num)) return "";

        if (num >= 85.0) return "bg-emerald-500/10 text-emerald-400 font-medium";
        if (num < 50.0) return "bg-red-500/10 text-red-400 font-medium";
        return "bg-amber-500/10 text-amber-400 font-medium";
    };

    // Calculate aggregated column totals
    const columnTotals = useMemo(() => {
        if (filteredRows.length === 0) return {};
        const totals = {};
        
        tableHeaders.forEach(header => {
            let sum = 0;
            let count = 0;
            
            filteredRows.forEach(row => {
                const val = parseFloat(row[header]);
                if (!isNaN(val)) {
                    sum += val;
                    count++;
                }
            });
            
            // Check if column is a percentage/rate (average instead of sum)
            const lowerHeader = header.toLowerCase();
            const isAvg = lowerHeader.includes('%') || lowerHeader.includes('rate') || lowerHeader.includes('wage');
            
            if (count > 0) {
                if (isAvg) {
                    totals[header] = `${roundTo(sum / count, 1)}${lowerHeader.includes('%') ? '%' : ''}`;
                } else {
                    totals[header] = Math.round(sum).toLocaleString();
                }
            } else {
                totals[header] = "-";
            }
        });
        
        return totals;
    }, [filteredRows, tableHeaders]);

    const roundTo = (num, decimals) => {
        return Number(Math.round(num + 'e' + decimals) + 'e-' + decimals);
    };

    // Export Helpers
    const getExportData = () => {
        return filteredRows.map((row, idx) => {
            const exportRow = { "S No": idx + 1 };
            primaryColumns.forEach(col => {
                exportRow[col] = row[col] || "-";
            });
            tableHeaders.forEach(header => {
                exportRow[header] = row[header];
            });
            return exportRow;
        });
    };

    const handleExportExcel = () => {
        try {
            const dataToExport = getExportData();
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "NIC Live Data");
            XLSX.writeFile(wb, `${activeScheme}_Dantewada_Live_Report.xlsx`);
            setShowExportMenu(false);
        } catch (error) {
            console.error("Excel Export Error:", error);
            alert("Export Failed: " + error.message);
        }
    };

    const handleExportPDF = () => {
        try {
            const doc = new jsPDF('l', 'mm', 'a4');
            doc.setFontSize(14);
            doc.text(`${activeScheme} - Dantewada Live Portal Synchronized Data`, 14, 15);
            doc.setFontSize(10);
            doc.text(`Synced on: ${lastSynced ? lastSynced.toLocaleString() : 'Never'} | Block Filter: ${selectedBlock}`, 14, 21);

            const dataToExport = getExportData();
            if (dataToExport.length === 0) {
                alert("No data to export");
                return;
            }

            const columns = Object.keys(dataToExport[0]).map(key => ({ header: key, dataKey: key }));
            
            autoTable(doc, {
                columns: columns,
                body: dataToExport,
                startY: 26,
                styles: { fontSize: 7, cellPadding: 1.5 },
                headStyles: { fillColor: [16, 185, 129] }
            });

            doc.save(`${activeScheme}_Dantewada_Live_Report.pdf`);
            setShowExportMenu(false);
        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("Export Failed: " + error.message);
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        NIC Live Portal Sync
                    </h2>
                    <p className="text-muted-foreground mt-2">
                        Monitor live connection status, sync datasets directly from official MIS reports, and view GP-wise saturation tables.
                    </p>
                </div>
                {lastSynced && (
                    <div className="text-sm bg-card border border-border px-4 py-2 rounded-xl text-muted-foreground">
                        Last Active Sync: <span className="text-foreground font-medium">{lastSynced.toLocaleString()}</span>
                    </div>
                )}
            </header>

            {/* Rankings Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {SCHEMES.map(scheme => {
                    const rankInfo = rankings[scheme] || { rank: "-", total: "-", metric: "N/A" };
                    return (
                        <div key={scheme} className="bg-card border border-border/60 hover:border-emerald-500/40 rounded-2xl p-5 transition-all duration-300 relative overflow-hidden group shadow-lg">
                            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-50" />
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold text-muted-foreground uppercase">{scheme}</span>
                                <Award className="text-emerald-400 group-hover:scale-110 transition-transform" size={18} />
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-extrabold text-foreground">Rank #{rankInfo.rank}</span>
                                <span className="text-xs text-muted-foreground">/{rankInfo.total}</span>
                            </div>
                            <p className="text-xs text-emerald-400 mt-2 font-medium bg-emerald-500/5 py-1 px-2.5 rounded-lg inline-block">
                                {rankInfo.metric}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Status & Sync Terminal Box */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Latency Pinger Dashboard (5 columns) */}
                <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Activity className="text-emerald-500" size={18} />
                            <h3 className="font-semibold text-lg">NIC Gateways</h3>
                        </div>
                        <div className="space-y-4">
                            {SCHEMES.map(scheme => {
                                const portal = portals.find(p => p.name === scheme) || { status: "CHECKING", latency: 0 };
                                const isOnline = portal.status === "ONLINE";
                                const isChecking = portal.status === "CHECKING";
                                
                                return (
                                    <div key={scheme} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
                                        <div className="flex flex-col">
                                            <a 
                                                href={PORTAL_URLS[scheme]} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="text-sm font-medium hover:underline hover:text-emerald-400 flex items-center gap-1.5"
                                            >
                                                {scheme} Gateway
                                                <Globe size={12} className="text-muted-foreground" />
                                            </a>
                                            <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                                {PORTAL_URLS[scheme]}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {isChecking ? (
                                                <span className="flex h-2.5 w-2.5 relative">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                                                </span>
                                            ) : (
                                                <span className={clsx(
                                                    "h-2.5 w-2.5 rounded-full",
                                                    isOnline ? "bg-emerald-500" : "bg-red-500"
                                                )} />
                                            )}
                                            <span className={clsx(
                                                "text-xs font-semibold px-2 py-0.5 rounded-lg",
                                                isOnline ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                                            )}>
                                                {isChecking ? "Pinging" : portal.status}
                                            </span>
                                            {!isChecking && isOnline && (
                                                <span className="text-xs text-muted-foreground">
                                                    {portal.latency}ms
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-border/40">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            * Gateways indicate connection state between Zila Panchayat core server and individual National Informatics Centre databases.
                        </p>
                    </div>
                </div>

                {/* Console Log Terminal (7 columns) */}
                <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Terminal className="text-emerald-400" size={18} />
                                <h3 className="font-semibold text-lg">Sync Shell Console</h3>
                            </div>
                            <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                                bash (sync_worker.py)
                            </span>
                        </div>

                        {/* Terminal Box */}
                        <div className="w-full bg-[#0d0e12] border border-[#1b1c23] rounded-xl p-4 h-56 overflow-y-auto font-mono text-xs text-emerald-400/90 leading-relaxed shadow-inner">
                            {terminalLogs.map((log, idx) => (
                                <div key={idx} className={clsx(
                                    "mb-1",
                                    log.includes("[ERROR]") && "text-red-400",
                                    log.includes("[WARNING]") && "text-amber-400",
                                    log.includes("[INFO]") && "text-blue-400"
                                )}>
                                    <span className="text-muted-foreground mr-1.5">$</span>
                                    {log}
                                </div>
                            ))}
                            {syncing && (
                                <div className="flex items-center gap-1.5 mt-1 text-emerald-400/50">
                                    <span className="text-muted-foreground mr-1.5">$</span>
                                    <span>Downloading packets...</span>
                                    <span className="inline-block w-1.5 h-3 bg-emerald-400 animate-pulse" />
                                </div>
                            )}
                            <div ref={terminalEndRef} />
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4">
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <RefreshCw size={12} className={clsx(syncing && "animate-spin")} />
                            <span>Auto-scheduled cron: 10:30 AM Daily</span>
                        </div>
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/40 text-black font-semibold text-sm px-6 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-emerald-500/10"
                        >
                            {syncing ? (
                                <>
                                    <RefreshCw className="animate-spin" size={16} />
                                    <span>Syncing Live Portals...</span>
                                </>
                            ) : (
                                <>
                                    <Play size={14} className="fill-current" />
                                    <span>Run Sync Engine</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>

            {/* Scheme Data Explorer Section */}
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10">
                    <div className="flex items-center gap-3">
                        <Database className="text-emerald-500" size={20} />
                        <div>
                            <h3 className="font-bold text-lg">Interactive Data Explorer</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Filter, search, pin columns and export live NIC data at Block and GP level.</p>
                        </div>
                    </div>
                    
                    {/* Controls Bar */}
                    <div className="flex flex-wrap items-center gap-3">
                        
                        {/* Block Filter */}
                        {activeScheme !== "PMAY-U" && (
                            <select
                                value={selectedBlock}
                                onChange={(e) => setSelectedBlock(e.target.value)}
                                className="bg-card border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                                <option value="ALL">All Blocks</option>
                                {BLOCKS.map(b => (
                                    <option key={b} value={b}>{b} Block</option>
                                ))}
                            </select>
                        )}

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={14} />
                            <input
                                type="text"
                                placeholder="Search GP/values..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-48"
                            />
                        </div>

                        {/* Export Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="flex items-center gap-1.5 border border-border bg-card px-3 py-2 rounded-xl text-xs font-semibold hover:bg-muted/50 transition-colors"
                            >
                                <Download size={14} />
                                <span>Export</span>
                            </button>
                            {showExportMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                                    <button
                                        onClick={handleExportExcel}
                                        className="flex items-center gap-2.5 w-full px-4 py-3 text-xs text-left hover:bg-muted/50 transition-colors"
                                    >
                                        <FileSpreadsheet size={14} className="text-emerald-500" />
                                        <span>Export as Excel</span>
                                    </button>
                                    <button
                                        onClick={handleExportPDF}
                                        className="flex items-center gap-2.5 w-full px-4 py-3 text-xs text-left hover:bg-muted/50 transition-colors border-t border-border"
                                    >
                                        <FileText size={14} className="text-red-500" />
                                        <span>Export as PDF</span>
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* Scheme Select Tabs */}
                <div className="flex border-b border-border bg-card px-6 overflow-x-auto">
                    {SCHEMES.map(scheme => (
                        <button
                            key={scheme}
                            onClick={() => {
                                setActiveScheme(scheme);
                                setSelectedBlock("ALL");
                                setPinnedColumns([]);
                            }}
                            className={clsx(
                                "px-5 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap",
                                activeScheme === scheme
                                    ? "border-emerald-500 text-emerald-400"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {scheme === "MGNREGA" ? "MGNREGA" : scheme === "SBM-G" ? "SBM-Grameen" : scheme === "NRLM" ? "DAY-NRLM" : scheme === "PMAY-G" ? "PMAY-Gramin" : "PMAY-Urban"}
                        </button>
                    ))}
                </div>

                {/* Data Grid Table */}
                <div className="overflow-x-auto w-full max-h-[500px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
                            <span className="text-xs text-muted-foreground">Reading sync database...</span>
                        </div>
                    ) : filteredRows.length > 0 ? (
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-muted/20 uppercase font-semibold text-muted-foreground sticky top-0 backdrop-blur-sm z-10 border-b border-border">
                                <tr>
                                    <th className="px-5 py-3.5 whitespace-nowrap">S No</th>
                                    
                                    {/* Primary entities columns (Block, GP, ULB) */}
                                    {primaryColumns.map(col => (
                                        <th
                                            key={col}
                                            onClick={() => requestSort(col)}
                                            className="px-5 py-3.5 cursor-pointer hover:text-foreground whitespace-nowrap sticky left-0 bg-[#14151b] border-r border-border"
                                            style={{ zIndex: 12, minWidth: '130px' }}
                                        >
                                            <div className="flex items-center">
                                                {col}
                                                {getSortIcon(col)}
                                            </div>
                                        </th>
                                    ))}

                                    {/* Dynamic columns */}
                                    {tableHeaders.map((header) => {
                                        const isPinned = pinnedColumns.includes(header);
                                        const pinIdx = pinnedColumns.indexOf(header);
                                        const stickyLeft = isPinned ? 130 + (pinIdx * 150) : undefined;
                                        
                                        return (
                                            <th
                                                key={header}
                                                className={clsx(
                                                    "px-5 py-3.5 transition-colors whitespace-nowrap group bg-card",
                                                    isPinned ? "sticky z-20 border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.4)]" : "hover:text-foreground"
                                                )}
                                                style={isPinned ? { left: `${stickyLeft}px`, minWidth: '150px', width: '150px' } : {}}
                                            >
                                                <div className="flex items-center justify-between gap-1.5">
                                                    <div 
                                                        className="flex items-center cursor-pointer"
                                                        onClick={() => requestSort(header)}
                                                    >
                                                        {header}
                                                        {getSortIcon(header)}
                                                    </div>
                                                    <button
                                                        onClick={() => togglePin(header)}
                                                        className={clsx(
                                                            "opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted text-muted-foreground",
                                                            isPinned && "opacity-100 text-emerald-400"
                                                        )}
                                                    >
                                                        {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                                                    </button>
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {filteredRows.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-muted/10 transition-colors">
                                        <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                                            {idx + 1}
                                        </td>
                                        
                                        {/* Primary values */}
                                        {primaryColumns.map(col => (
                                            <td 
                                                key={`${idx}-${col}`}
                                                className="px-5 py-3.5 font-semibold text-foreground whitespace-nowrap sticky left-0 bg-[#14151b] border-r border-border"
                                                style={{ zIndex: 11 }}
                                            >
                                                {row[col]}
                                            </td>
                                        ))}

                                        {/* Dynamic values */}
                                        {tableHeaders.map((header) => {
                                            const isPinned = pinnedColumns.includes(header);
                                            const pinIdx = pinnedColumns.indexOf(header);
                                            const stickyLeft = isPinned ? 130 + (pinIdx * 150) : undefined;
                                            
                                            // Handle number formatting
                                            let cellValue = row[header];
                                            if (typeof cellValue === 'number' && !header.includes('%') && !header.includes('Rate')) {
                                                cellValue = cellValue.toLocaleString();
                                            }

                                            return (
                                                <td
                                                    key={`${idx}-${header}`}
                                                    className={clsx(
                                                        "px-5 py-3.5 whitespace-nowrap bg-card",
                                                        getCellStyle(header, row[header]),
                                                        isPinned && "sticky z-10 border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.4)]"
                                                    )}
                                                    style={isPinned ? { left: `${stickyLeft}px` } : {}}
                                                >
                                                    {cellValue}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                                
                                {/* Aggregated Total Row */}
                                <tr className="bg-muted/40 font-bold border-t-2 border-border/80 sticky bottom-0 z-10 shadow-[0_-2px_5px_-2px_rgba(0,0,0,0.3)]">
                                    <td className="px-5 py-4 whitespace-nowrap text-foreground uppercase">
                                        Total
                                    </td>
                                    {primaryColumns.map((col, cIdx) => (
                                        <td 
                                            key={`total-${col}`}
                                            className="px-5 py-4 whitespace-nowrap text-foreground bg-[#1c1d25] border-r border-border sticky left-0"
                                            style={{ zIndex: 11 }}
                                        >
                                            {cIdx === 0 ? "District Summary" : "-"}
                                        </td>
                                    ))}
                                    {tableHeaders.map((header) => {
                                        const isPinned = pinnedColumns.includes(header);
                                        const pinIdx = pinnedColumns.indexOf(header);
                                        const stickyLeft = isPinned ? 130 + (pinIdx * 150) : undefined;
                                        
                                        return (
                                            <td
                                                key={`total-${header}`}
                                                className={clsx(
                                                    "px-5 py-4 whitespace-nowrap bg-[#1c1d25] text-emerald-400 font-semibold",
                                                    isPinned && "sticky z-10 border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.4)]"
                                                )}
                                                style={isPinned ? { left: `${stickyLeft}px` } : {}}
                                            >
                                                {columnTotals[header] || "-"}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-1.5">
                            <AlertCircle size={22} className="text-muted-foreground/60" />
                            <span>No synced records found matching filters.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NICLiveDashboard;
