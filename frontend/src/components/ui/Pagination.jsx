import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Reusable pagination component.
 * Props: currentPage, totalPages, onPageChange, pageSize, onPageSizeChange, totalItems
 */
export default function Pagination({ currentPage, totalPages, onPageChange, pageSize, onPageSizeChange, totalItems }) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="flex items-center justify-between pt-4 border-t border-slate-700 flex-wrap gap-3">
      {/* Item info */}
      <div className="text-xs text-slate-500">
        Showing <span className="text-slate-300 font-medium">{startItem}–{endItem}</span> of{' '}
        <span className="text-slate-300 font-medium">{totalItems}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Page size selector */}
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-darkBg border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-neonGreen"
          >
            {[10, 25, 50, 100].map(s => (
              <option key={s} value={s}>{s} / page</option>
            ))}
          </select>
        )}

        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="First page"
          >
            <ChevronsLeft size={14} />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft size={14} />
          </button>

          {getPageNumbers().map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${
                page === currentPage
                  ? 'bg-neonGreen text-darkBg'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight size={14} />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Last page"
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
