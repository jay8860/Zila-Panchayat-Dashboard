import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, ArrowUpDown, ArrowUp, ArrowDown, Download, FileSpreadsheet, FileText, Pin, PinOff } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const GPTable = ({ scheme, block, onBack, focusedMetric }) => {
    const { data } = useDashboard();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [pinnedColumns, setPinnedColumns] = useState([]);
    const tableContainerRef = React.useRef(null);

    const isDistrictTotal = block?.toLowerCase().includes('total');
    const displayBlockName = isDistrictTotal ? "District Report (All Blocks)" : `${block} Block`;

    // 1. Filter Data by Block
    const filteredData = useMemo(() => {
        const schemeData = data[scheme] || [];
        if (isDistrictTotal) {
            return schemeData; // Show ALL data
        }
        return schemeData.filter(row => row.Block === block);
    }, [data, scheme, block, isDistrictTotal]);

    // 2. Identify GP Key and Other Headers
    const { gpKey, displayHeaders } = useMemo(() => {
        if (filteredData.length === 0) return { gpKey: null, displayHeaders: [] };

        const allKeys = Object.keys(filteredData[0]);

        // Find the actual GP key in the data
        const foundGpKey = allKeys.find(k =>
            k.toLowerCase() === 'gram panchayat' ||
            k.toLowerCase() === 'gp name' ||
            k.toLowerCase() === 'gp'
        );

        // Filter out keys we don't want to show dynamically or are special
        // If District Total, we DO want to show 'Block' (we'll handle it manually in render order though)
        const ignoredKeys = ['block', 's no', 's.no', 'sno', 's. no.', foundGpKey?.toLowerCase()].filter(Boolean);

        const otherKeys = allKeys.filter(k => !ignoredKeys.includes(k.toLowerCase()));

        return {
            gpKey: foundGpKey,
            displayHeaders: otherKeys
        };
        return {
            gpKey: foundGpKey,
            displayHeaders: otherKeys
        };
    }, [filteredData]);

    const togglePin = (col) => {
        if (pinnedColumns.includes(col)) {
            setPinnedColumns(prev => prev.filter(c => c !== col));
        } else {
            setPinnedColumns(prev => [...prev, col]);
        }
    };

    const orderedHeaders = useMemo(() => {
        const unpinned = displayHeaders.filter(h => !pinnedColumns.includes(h));
        return [...pinnedColumns, ...unpinned];
    }, [displayHeaders, pinnedColumns]);

    // Auto-scroll logic
    React.useEffect(() => {
        if (focusedMetric && tableContainerRef.current) {
            // Wait for render
            setTimeout(() => {
                // Remove special chars from metric to make valid ID
                const safeId = focusedMetric.replace(/[^a-zA-Z0-9]/g, '');
                const headerId = `header-${safeId}`;
                const element = document.getElementById(headerId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }, 300);
        }
    }, [focusedMetric, filteredData]);

    // 3. Search & Sort Logic
    const processedData = useMemo(() => {
        let result = [...filteredData];

        // Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(row =>
                Object.values(row).some(val =>
                    String(val).toLowerCase().includes(lowerTerm)
                )
            );
        }

        // Sort
        if (sortConfig) {
            result.sort((a, b) => {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];

                // Check if numeric
                const numA = parseFloat(valA);
                const numB = parseFloat(valB);

                if (!isNaN(numA) && !isNaN(numB)) {
                    valA = numA;
                    valB = numB;
                } else {
                    // String comparison fallback
                    valA = String(valA).toLowerCase();
                    valB = String(valB).toLowerCase();
                }

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [filteredData, searchTerm, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-2 text-muted-foreground/50" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="ml-2 text-primary" />
            : <ArrowDown size={14} className="ml-2 text-primary" />;
    };

    // Helper for Cell Styling
    const getCellStyle = (key, value) => {
        const lowerKey = key.toLowerCase();
        // Color columns with these keywords
        const keywords = ['%', 'percentage', 'progress', 'achievement', 'completion', 'rate'];

        // Base Style
        let style = '';

        // Is this the focused column?
        if (focusedMetric === key) {
            style += ' ring-2 ring-primary/20 bg-primary/5 '; // Highlight border/bg
        }

        const isPercentage = keywords.some(k => lowerKey.includes(k));
        if (!keywords.some(k => lowerKey.includes(k))) return "";

        const num = parseFloat(value);
        if (isNaN(num)) return "";

        if (num >= 75) return "bg-emerald-500/20 text-emerald-400 font-medium";
        if (num < 40) return "bg-red-500/20 text-red-400 font-medium";
        if (num >= 40) return "bg-amber-500/20 text-amber-400 font-medium";

        return "";
    };

    // --- Export Logic ---
    const getExportData = () => {
        // Use pinned columns if any, otherwise all columns
        const headersToExport = pinnedColumns.length > 0 ? pinnedColumns : displayHeaders;

        return processedData.map((row, idx) => {
            const exportRow = {
                'S No': idx + 1,
            };

            if (isDistrictTotal) {
                exportRow['Block'] = row.Block || row.block || '-';
            }

            exportRow['Gram Panchayat'] = gpKey ? row[gpKey] : 'N/A';

            headersToExport.forEach(h => {
                exportRow[h] = row[h];
            });
            return exportRow;
        });
    };

    const handleExportExcel = () => {
        try {
            const dataToExport = getExportData();
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Data");
            XLSX.writeFile(wb, `${scheme}_${block}_Report.xlsx`);
            setShowExportMenu(false);
        } catch (error) {
            console.error("Excel Export Error:", error);
            alert("Export Failed: " + error.message);
        }
    };

    const handleExportPDF = () => {
        try {
            const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

            // Title
            doc.setFontSize(14);
            doc.text(`${scheme} - ${displayBlockName}`, 14, 15);

            // Columns
            const dataToExport = getExportData();
            if (dataToExport.length === 0) {
                alert("No data to export");
                return;
            }

            const columns = Object.keys(dataToExport[0]).map(key => ({ header: key, dataKey: key }));
            const rows = dataToExport;

            autoTable(doc, {
                columns: columns,
                body: rows,
                startY: 20,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 128, 185] }
            });

            doc.save(`${scheme}_${block}_Report.pdf`);
            setShowExportMenu(false);
        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("Export Failed: " + error.message);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center">
                    <button
                        onClick={onBack}
                        className="mr-4 p-2 rounded-full hover:bg-muted transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-2xl font-bold">{displayBlockName}</h2>
                            <span className="text-muted-foreground text-sm">/ {scheme}</span>
                        </div>
                        <p className="text-muted-foreground text-xs mt-1">Detailed GP Report</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Export Button */}
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                        >
                            <Download size={16} />
                            <span>Export</span>
                        </button>

                        {showExportMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                                <button
                                    onClick={handleExportExcel}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-muted/50 transition-colors"
                                >
                                    <FileSpreadsheet size={16} className="text-emerald-500" />
                                    <span>Export as Excel</span>
                                </button>
                                <button
                                    onClick={handleExportPDF}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-muted/50 transition-colors border-t border-border"
                                >
                                    <FileText size={16} className="text-red-500" />
                                    <span>Export as PDF</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input
                            type="text"
                            placeholder="Search GP or data..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                </div>
            </div>

            <div
                ref={tableContainerRef}
                className="flex-1 overflow-auto rounded-xl border border-border bg-card shadow-sm"
            >
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 uppercase text-xs font-semibold text-muted-foreground sticky top-0 backdrop-blur-sm z-10">
                        <tr>
                            {/* Static S No Header */}
                            <th className="px-6 py-4 whitespace-nowrap">S No</th>

                            {/* Block Column (Only if District Total view) */}
                            {isDistrictTotal && (
                                <th
                                    className="px-6 py-4 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                                    onClick={() => requestSort('Block')}
                                >
                                    <div className="flex items-center">
                                        Block
                                        {getSortIcon('Block')}
                                    </div>
                                </th>
                            )}

                            {/* Unified GP Header (Sticky) */}
                            <th
                                className="px-6 py-4 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap sticky left-0 z-30 bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] border-r border-border"
                                style={{ minWidth: '220px', width: '220px' }}
                                onClick={() => gpKey && requestSort(gpKey)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        Gram Panchayat
                                        {gpKey && getSortIcon(gpKey)}
                                    </div>
                                </div>
                            </th>

                            {/* Dynamic Headers */}
                            {orderedHeaders.map((header, idx) => {
                                const isPinned = pinnedColumns.includes(header);
                                const pinnedIndex = pinnedColumns.indexOf(header);
                                // GP Width (220) + (Index * 150)
                                const stickyLeft = isPinned ? 220 + (pinnedIndex * 160) : undefined;

                                return (
                                    <th
                                        key={header}
                                        id={`header-${header.replace(/[^a-zA-Z0-9]/g, '')}`}
                                        className={clsx(
                                            "px-6 py-4 transition-colors whitespace-nowrap group bg-card",
                                            focusedMetric === header && !isPinned && "bg-primary/10 text-primary border-b-2 border-primary",
                                            isPinned ? "sticky z-20 border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]" : "hover:text-foreground"
                                        )}
                                        style={isPinned ? { left: `${stickyLeft}px`, minWidth: '160px', width: '160px' } : {}}
                                        onClick={() => requestSort(header)}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center cursor-pointer">
                                                {header}
                                                {getSortIcon(header)}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    togglePin(header);
                                                }}
                                                className={clsx(
                                                    "opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted",
                                                    isPinned && "opacity-100 text-primary"
                                                )}
                                            >
                                                {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                                            </button>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {processedData.length > 0 ? (
                            processedData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                    {/* Static S No Value */}
                                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                                        {idx + 1}
                                    </td>

                                    {/* Block Value (Only if District Total view) */}
                                    {isDistrictTotal && (
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                                            {row.Block || row.block || '-'}
                                        </td>
                                    )}

                                    {/* Unified GP Value (Sticky) */}
                                    <td
                                        className="px-6 py-4 whitespace-nowrap font-medium text-foreground sticky left-0 z-30 bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] border-r border-border"
                                        style={{ minWidth: '220px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                    >
                                        <div className="truncate" title={gpKey ? row[gpKey] : 'N/A'}>
                                            {gpKey ? row[gpKey] : 'N/A'}
                                        </div>
                                    </td>

                                    {/* Dynamic Keys */}
                                    {orderedHeaders.map(header => {
                                        const isPinned = pinnedColumns.includes(header);
                                        const pinnedIndex = pinnedColumns.indexOf(header);
                                        const stickyLeft = isPinned ? 220 + (pinnedIndex * 160) : undefined;

                                        return (
                                            <td
                                                key={`${idx}-${header}`}
                                                className={clsx(
                                                    "px-6 py-4 whitespace-nowrap bg-card",
                                                    getCellStyle(header, row[header]),
                                                    isPinned && "sticky z-20 border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]"
                                                )}
                                                style={isPinned ? { left: `${stickyLeft}px`, minWidth: '160px', width: '160px' } : {}}
                                            >
                                                {row[header]}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={displayHeaders.length + (isDistrictTotal ? 3 : 2)} className="px-6 py-10 text-center text-muted-foreground">
                                    No data found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GPTable;
