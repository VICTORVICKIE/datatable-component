'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { DataTable, DataTableFilterMeta, SortOrder } from 'primereact/datatable';
import { Column, ColumnFilterElementTemplateOptions } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Paginator } from 'primereact/paginator';

interface CustomTriStateProps {
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}

function CustomTriStateCheckbox({ value, onChange }: CustomTriStateProps) {
  const handleClick = () => {
    if (value === null) {
      onChange(true);
    } else if (value === true) {
      onChange(false);
    } else {
      onChange(null);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="w-5 h-5 border-2 rounded cursor-pointer flex items-center justify-center transition-colors"
      style={{
        borderColor: value === null ? '#9ca3af' : value ? '#22c55e' : '#ef4444',
        backgroundColor: value === null ? 'transparent' : value ? '#22c55e' : '#ef4444',
      }}
      title={value === null ? 'All' : value ? 'Yes only' : 'No only'}
    >
      {value === true && (
        <i className="pi pi-check text-white text-xs" />
      )}
      {value === false && (
        <i className="pi pi-times text-white text-xs" />
      )}
      {value === null && (
        <i className="pi pi-minus text-gray-400 text-xs" />
      )}
    </div>
  );
}

interface DataTableComponentProps {
  data: Record<string, any>[];
  rowsPerPageOptions?: number[];
  defaultRows?: number;
  scrollable?: boolean;
  scrollHeight?: string;
  enableSort?: boolean;
  enableFilter?: boolean;
  enableSummation?: boolean;
}

export default function DataTableComponent({
  data,
  rowsPerPageOptions = [10, 25, 50, 100],
  defaultRows = 10,
  scrollable = true,
  scrollHeight,
  enableSort = true,
  enableFilter = true,
  enableSummation = true,
}: DataTableComponentProps) {
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(defaultRows);
  const [filters, setFilters] = useState<DataTableFilterMeta>({});
  const [scrollHeightValue, setScrollHeightValue] = useState<string>('600px');
  const [multiSortMeta, setMultiSortMeta] = useState<{ field: string; order: SortOrder }[]>([]);

  useEffect(() => {
    setRows(defaultRows);
    setFirst(0);
  }, [defaultRows]);

  useEffect(() => {
    const updateScrollHeight = () => {
      if (scrollHeight) {
        setScrollHeightValue(scrollHeight);
        return;
      }
      const width = window.innerWidth;
      if (width < 640) {
        setScrollHeightValue('400px');
      } else if (width < 1024) {
        setScrollHeightValue('500px');
      } else {
        setScrollHeightValue('600px');
      }
    };

    updateScrollHeight();
    window.addEventListener('resize', updateScrollHeight);
    return () => window.removeEventListener('resize', updateScrollHeight);
  }, [scrollHeight]);

  const safeData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data;
  }, [data]);

  const columns = useMemo(() => {
    if (!safeData || safeData.length === 0) return [];
    const allKeys = new Set<string>();
    safeData.forEach((item) => {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach((key) => allKeys.add(key));
      }
    });
    return Array.from(allKeys);
  }, [safeData]);

  const frozenCols = useMemo(
    () => columns.length > 0 ? [columns[0]] : [],
    [columns]
  );
  const regularCols = useMemo(
    () => columns.slice(1),
    [columns]
  );

  const isNumeric = useCallback((value: any): boolean => {
    if (value === null || value === undefined) return false;
    return typeof value === 'number' || (!isNaN(parseFloat(value)) && isFinite(value));
  }, []);

  const formatHeaderName = useCallback((key: string): string => {
    return key
      .split('__')
      .join(' ')
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, []);

  const formatCellValue = useCallback((value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
      return value % 1 === 0
        ? value.toLocaleString('en-US')
        : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(value);
  }, []);

  const columnTypes = useMemo(() => {
    const types: Record<string, { isBoolean: boolean; isNumeric: boolean; isDate: boolean }> = {};
    if (!safeData || safeData.length === 0) return types;

    const sampleSize = Math.min(100, safeData.length);
    const sampleData = safeData.slice(0, sampleSize);

    columns.forEach((col) => {
      let numericCount = 0;
      let dateCount = 0;
      let booleanCount = 0;
      let nonNullCount = 0;

      sampleData.forEach((row) => {
        const value = row?.[col];
        if (value !== null && value !== undefined) {
          nonNullCount++;

          if (isNumeric(value)) numericCount++;
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) dateCount++;
          if (value === true || value === false) {
            booleanCount++;
          }
        }
      });

      const isNumericColumn = nonNullCount > 0 && numericCount > nonNullCount * 0.8;
      const isDateColumn = nonNullCount > 0 && dateCount > nonNullCount * 0.5;
      const isBooleanColumn = nonNullCount > 0 && booleanCount > nonNullCount * 0.7;

      types[col] = { isBoolean: isBooleanColumn, isNumeric: isNumericColumn && !isBooleanColumn, isDate: isDateColumn };
    });

    return types;
  }, [safeData, columns, isNumeric]);

  useEffect(() => {
    if (enableFilter && columns.length > 0) {
      const initialFilters: DataTableFilterMeta = {};

      columns.forEach((col) => {
        const colType = columnTypes[col];
        if (colType?.isBoolean) {
          initialFilters[col] = { value: null, matchMode: 'equals' };
        } else {
          initialFilters[col] = { value: null, matchMode: 'contains' };
        }
      });

      setFilters(initialFilters);
    }
  }, [columns, enableFilter, columnTypes]);

  const calculateColumnWidths = useMemo(() => {
    const widths: Record<string, number> = {};
    if (!safeData || safeData.length === 0) return widths;

    const sampleSize = Math.min(100, safeData.length);
    const sampleData = safeData.slice(0, sampleSize);

    columns.forEach((col) => {
      const headerLength = formatHeaderName(col).length;
      const cellLengths: number[] = [];

      sampleData.forEach((row) => {
        const value = row?.[col];
        if (value !== null && value !== undefined) {
          const formatted = formatCellValue(value);
          cellLengths.push(formatted.length);
        }
      });

      const { isBoolean: isBooleanColumn, isNumeric: isNumericColumn, isDate: isDateColumn } = columnTypes[col] || { isBoolean: false, isNumeric: false, isDate: false };

      let contentWidth = 0;

      if (cellLengths.length === 0) {
        contentWidth = headerLength;
      } else {
        const sortedLengths = [...cellLengths].sort((a, b) => a - b);
        const medianLength = sortedLengths[Math.floor(sortedLengths.length / 2)];
        const percentile75 = sortedLengths[Math.floor(sortedLengths.length * 0.75)];
        const percentile95 = sortedLengths[Math.floor(sortedLengths.length * 0.95)];
        contentWidth = Math.min(Math.max(medianLength, percentile75), percentile95);
      }

      const headerWidth = headerLength * 9;
      let baseWidth: number;

      if (isBooleanColumn) {
        const contentMin = 50;
        baseWidth = Math.max(headerWidth, contentMin);
      } else if (isDateColumn) {
        const contentMin = 100;
        baseWidth = Math.max(headerWidth, contentMin);
      } else if (isNumericColumn) {
        const contentMin = 70;
        baseWidth = Math.max(headerWidth, contentMin);
      } else {
        baseWidth = Math.max(contentWidth * 9, headerWidth);
      }

      const sortPadding = enableSort ? 30 : 0;
      let finalWidth = baseWidth + sortPadding;

      const minWidth = isBooleanColumn ? 100 : isDateColumn ? 150 : isNumericColumn ? 130 : 140;
      const maxWidth = isBooleanColumn ? 180 : isDateColumn ? 250 : isNumericColumn ? 250 : 400;

      widths[col] = Math.max(minWidth, Math.min(finalWidth, maxWidth));
    });

    return widths;
  }, [safeData, columns, enableSort, formatHeaderName, formatCellValue, columnTypes]);

  const filteredData = useMemo(() => {
    if (!safeData || safeData.length === 0) return [];

    return safeData.filter((row) => {
      if (!row || typeof row !== 'object') return false;

      return columns.every((col) => {
        const filter = filters[col] as { value: any; matchMode: string } | undefined;
        if (!filter || filter.value === null || filter.value === '') return true;

        const cellValue = row[col];
        const filterValue = filter.value;
        const colType = columnTypes[col];

        if (colType?.isBoolean) {
          return cellValue === filterValue;
        }

        const strCell = String(cellValue ?? '').toLowerCase();
        const strFilter = String(filterValue).toLowerCase();
        return strCell.includes(strFilter);
      });
    });
  }, [safeData, filters, columns, columnTypes]);

  const sortedData = useMemo(() => {
    if (!filteredData || filteredData.length === 0 || multiSortMeta.length === 0) {
      return filteredData;
    }

    return [...filteredData].sort((a, b) => {
      for (const sortInfo of multiSortMeta) {
        const { field, order } = sortInfo;
        if (!order) continue;

        const valA = a[field];
        const valB = b[field];

        if (valA === null || valA === undefined) return order === 1 ? 1 : -1;
        if (valB === null || valB === undefined) return order === 1 ? -1 : 1;

        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else {
          comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        }

        if (comparison !== 0) {
          return order === 1 ? comparison : -comparison;
        }
      }
      return 0;
    });
  }, [filteredData, multiSortMeta]);

  const calculateSums = useMemo(() => {
    const sums: Record<string, number> = {};
    if (filteredData.length === 0) return sums;

    columns.forEach((col) => {
      const values = filteredData.map((row) => row?.[col]).filter((val) => val !== null && val !== undefined);
      if (values.length > 0 && isNumeric(values[0])) {
        sums[col] = values.reduce((sum, val) => {
          const numVal = typeof val === 'number' ? val : parseFloat(val);
          return sum + (isNaN(numVal) ? 0 : numVal);
        }, 0);
      }
    });
    return sums;
  }, [filteredData, columns, isNumeric]);

  const paginatedData = useMemo(() => {
    return sortedData.slice(first, first + rows);
  }, [sortedData, first, rows]);

  const footerTemplate = (column: string) => {
    if (!enableSummation) return null;
    if (columnTypes[column]?.isBoolean) return null;
    const sum = calculateSums[column];
    if (sum === undefined) return null;
    const formattedSum = sum % 1 === 0
      ? sum.toLocaleString('en-US')
      : sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (
      <div className="text-right">
        <strong>{formattedSum}</strong>
      </div>
    );
  };

  const booleanBodyTemplate = useCallback((rowData: Record<string, any>, column: string) => {
    const value = rowData[column];

    return (
      <div className="flex items-center justify-center">
        {value === true ? (
          <i className="pi pi-check-circle text-green-600 text-lg" title="Yes" />
        ) : (
          <i className="pi pi-times-circle text-red-500 text-lg" title="No" />
        )}
      </div>
    );
  }, []);

  const updateFilter = useCallback((col: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [col]: { ...(prev[col] as any), value }
    }));
    setFirst(0);
  }, []);

  const textFilterElement = useCallback((col: string) => (options: ColumnFilterElementTemplateOptions) => {
    const filterState = filters[col] as { value: any; matchMode: string } | undefined;
    const value = filterState?.value === null || filterState?.value === undefined ? '' : filterState.value;
    return (
      <InputText
        value={value}
        onChange={(e) => updateFilter(col, e.target.value || null)}
        placeholder={`Search...`}
        className="p-column-filter"
        style={{ width: '100%' }}
      />
    );
  }, [filters, updateFilter]);

  const booleanFilterElement = useCallback((col: string) => () => {
    const filterState = filters[col] as { value: any; matchMode: string } | undefined;
    const value = filterState?.value === undefined ? null : filterState.value;
    return (
      <div className="flex items-center justify-center">
        <CustomTriStateCheckbox
          value={value}
          onChange={(newValue) => updateFilter(col, newValue)}
        />
      </div>
    );
  }, [filters, updateFilter]);

  const getFilterElement = useCallback((col: string) => {
    const colType = columnTypes[col];
    if (colType?.isBoolean) {
      return booleanFilterElement(col);
    } else {
      return textFilterElement(col);
    }
  }, [columnTypes, booleanFilterElement, textFilterElement]);

  const onPageChange = (event: any) => {
    setFirst(event.first);
    setRows(event.rows);
  };

  if (!safeData || safeData.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <i className="pi pi-inbox text-4xl text-gray-400 mb-4"></i>
        <p className="text-gray-600 font-medium">No data available</p>
        <p className="text-sm text-gray-500 mt-1">Please check your data source</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {(!enableSort || !enableFilter || !enableSummation) && (
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          {!enableSort && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
              <i className="pi pi-info-circle mr-1"></i>
              Sorting disabled
            </span>
          )}
          {!enableFilter && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
              <i className="pi pi-info-circle mr-1"></i>
              Filtering disabled
            </span>
          )}
          {!enableSummation && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
              <i className="pi pi-info-circle mr-1"></i>
              Summation disabled
            </span>
          )}
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden w-full overflow-x-auto responsive-table-container">
        <DataTable
          value={paginatedData}
          scrollable={scrollable}
          scrollHeight={scrollHeightValue}
          sortMode={enableSort ? "multiple" : undefined}
          removableSort={enableSort}
          multiSortMeta={multiSortMeta}
          onSort={(e) => {
            setMultiSortMeta(e.multiSortMeta || []);
            setFirst(0);
          }}
          showGridlines
          stripedRows
          className="p-datatable-sm w-full"
          style={{ minWidth: '100%' }}
          filterDisplay={enableFilter ? "row" : undefined}
        >
          {frozenCols.map((col) => {
            const colType = columnTypes[col];
            const isBoolean = colType?.isBoolean || false;
            const isNumeric = colType?.isNumeric || false;
            return (
              <Column
                key={`frozen-${col}`}
                field={col}
                header={formatHeaderName(col)}
                sortable={enableSort}
                frozen
                style={{
                  minWidth: `${calculateColumnWidths[col] || 120}px`,
                  width: `${calculateColumnWidths[col] || 120}px`,
                  maxWidth: `${calculateColumnWidths[col] || 200}px`
                }}
                filter={enableFilter}
                filterElement={enableFilter ? getFilterElement(col) : undefined}
                showFilterMenu={false}
                showClearButton={false}
                footer={footerTemplate(col)}
                body={isBoolean
                  ? (rowData) => booleanBodyTemplate(rowData, col)
                  : (rowData) => (
                    <div
                      className={`text-xs sm:text-sm truncate ${isNumeric ? 'text-right' : 'text-left'}`}
                      title={formatCellValue(rowData[col])}
                    >
                      {formatCellValue(rowData[col])}
                    </div>
                  )
                }
              />
            );
          })}

          {regularCols.map((col) => {
            const colType = columnTypes[col];
            const isBoolean = colType?.isBoolean || false;
            const isNumeric = colType?.isNumeric || false;
            return (
              <Column
                key={col}
                field={col}
                header={formatHeaderName(col)}
                sortable={enableSort}
                style={{
                  minWidth: `${calculateColumnWidths[col] || 120}px`,
                  width: `${calculateColumnWidths[col] || 120}px`,
                  maxWidth: `${calculateColumnWidths[col] || 400}px`
                }}
                filter={enableFilter}
                filterElement={enableFilter ? getFilterElement(col) : undefined}
                showFilterMenu={false}
                showClearButton={false}
                footer={footerTemplate(col)}
                body={isBoolean
                  ? (rowData) => booleanBodyTemplate(rowData, col)
                  : (rowData) => (
                    <div
                      className={`text-xs sm:text-sm truncate ${isNumeric ? 'text-right' : 'text-left'}`}
                      title={formatCellValue(rowData[col])}
                    >
                      {formatCellValue(rowData[col])}
                    </div>
                  )
                }
              />
            );
          })}
        </DataTable>
      </div>

      <div className="mt-4">
        <Paginator
          first={first}
          rows={rows}
          totalRecords={sortedData.length}
          rowsPerPageOptions={rowsPerPageOptions}
          onPageChange={onPageChange}
          template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        />
      </div>
    </div>
  );
}
