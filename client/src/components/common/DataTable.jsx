import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Download, Filter } from 'lucide-react';

export default function DataTable({ title, columns, data, searchPlaceholder = "Search records...", onExport }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 5;

    const filteredData = data.filter(row =>
        Object.values(row).some(val =>
            String(val).toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
    const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="adyen-card rounded-3xl overflow-hidden border border-border bg-surface shadow-sm space-y-4 p-6">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {title && <h3 className="text-lg font-bold text-fg">{title}</h3>}

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3.5 top-3 text-muted" size={16} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            placeholder={searchPlaceholder}
                            className="w-full bg-bg border border-border rounded-full pl-10 pr-4 py-2 text-xs text-fg outline-none focus:border-success"
                        />
                    </div>

                    {onExport && (
                        <button
                            onClick={onExport}
                            className="btn-adyen-outline text-xs px-4 py-2 font-bold flex items-center gap-1.5 shrink-0"
                        >
                            <Download size={14} />
                            <span>Export CSV</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-border rounded-2xl">
                <table className="w-full text-left border-collapse text-xs font-semibold">
                    <thead>
                        <tr className="bg-surface-2 text-muted font-mono text-[10px] uppercase border-b border-border">
                            {columns.map((col, idx) => (
                                <th key={idx} className="p-3.5">{col.header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="text-center py-8 text-muted font-normal">
                                    No records found matching query.
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-surface-2 transition-colors">
                                    {columns.map((col, cIdx) => (
                                        <td key={cIdx} className="p-3.5">
                                            {col.cell ? col.cell(row) : row[col.accessor]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-2 text-xs font-semibold text-muted font-mono">
                <span>Page {currentPage} of {totalPages} ({filteredData.length} records)</span>
                <div className="flex items-center gap-2">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="p-1.5 rounded-lg border border-border disabled:opacity-30 hover:bg-surface-2"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className="p-1.5 rounded-lg border border-border disabled:opacity-30 hover:bg-surface-2"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
