import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

/**
 * Sortable table header cell.
 * Props: label, sortKey, currentSort ({ key, direction }), onSort
 */
export default function SortableHeader({ label, sortKey, currentSort, onSort }) {
  const isActive = currentSort.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  const handleClick = () => {
    if (!isActive) {
      onSort({ key: sortKey, direction: 'desc' });
    } else if (direction === 'desc') {
      onSort({ key: sortKey, direction: 'asc' });
    } else {
      onSort({ key: null, direction: null }); // reset
    }
  };

  return (
    <th
      className="pb-3 px-4 font-medium cursor-pointer select-none hover:text-slate-200 transition-colors group"
      onClick={handleClick}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className="opacity-40 group-hover:opacity-100 transition-opacity">
          {isActive && direction === 'asc' ? (
            <ArrowUp size={12} className="text-neonGreen" />
          ) : isActive && direction === 'desc' ? (
            <ArrowDown size={12} className="text-neonGreen" />
          ) : (
            <ArrowUpDown size={12} />
          )}
        </span>
      </span>
    </th>
  );
}

/**
 * Hook for managing sort state + paginated data.
 * Returns: { sortedData, paginatedData, sort, setSort, page, setPage, pageSize, setPageSize, totalPages }
 */
export function useTableControls(data, defaultPageSize = 25) {
  const [sort, setSort] = React.useState({ key: null, direction: null });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(defaultPageSize);

  // Reset to page 1 when data or pageSize changes
  React.useEffect(() => {
    setPage(1);
  }, [data.length, pageSize]);

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sort.key) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string') {
        return sort.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [data, sort]);

  // Paginate
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice((page - 1) * pageSize, page * pageSize);

  return {
    sortedData,
    paginatedData,
    sort,
    setSort,
    page,
    setPage,
    pageSize,
    setPageSize: (size) => { setPageSize(size); setPage(1); },
    totalPages,
    totalItems: data.length
  };
}
