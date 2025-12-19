'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Paginator } from 'primereact/paginator';
import {
  isNil,
  isNumber,
  isFinite as _isFinite,
  isEmpty,
  keys,
  uniq,
  flatMap,
  startCase,
  take,
  sumBy,
  orderBy,
  filter,
  get,
  clamp,
  debounce,
  every,
  toLower,
  includes,
  isBoolean,
  isString,
  head,
  tail,
  toNumber,
  isNaN as _isNaN,
  trim,
} from 'lodash';

/**
 * Parse numeric filter expression
 * Supports: <10, >10, <=10, >=10, =10, 10 <> 20 (range)
 * Also handles spaces: < 10, > 10, <= 10, >= 10, = 10, 10 <> 20
 * Supports +/- signs: < -10, < - 10, < +10, < + 10
 */
function parseNumericFilter(filterValue) {
  if (isNil(filterValue) || filterValue === '') return null;
  
  const str = trim(String(filterValue));
  
  // Number pattern that allows optional +/- with space: -10, - 10, +10, + 10, 10
  const numPattern = '([+-]?\\s*\\d+\\.?\\d*)';
  
  // Helper to parse number with potential space after +/-
  const parseNum = (numStr) => {
    const cleaned = numStr.replace(/\s+/g, '');
    return toNumber(cleaned);
  };
  
  // Range: "10 <> 20" or "10<>20" or "-10 <> 20" or "- 10 <> - 20"
  const rangeRegex = new RegExp(`^${numPattern}\\s*<>\\s*${numPattern}$`);
  const rangeMatch = str.match(rangeRegex);
  if (rangeMatch) {
    const min = parseNum(rangeMatch[1]);
    const max = parseNum(rangeMatch[2]);
    if (!_isNaN(min) && !_isNaN(max)) {
      return { type: 'range', min: Math.min(min, max), max: Math.max(min, max) };
    }
  }
  
  // Less than or equal: "<=10" or "<= 10" or "<= -10" or "<= - 10"
  const lteRegex = new RegExp(`^<=\\s*${numPattern}$`);
  const lteMatch = str.match(lteRegex);
  if (lteMatch) {
    const num = parseNum(lteMatch[1]);
    if (!_isNaN(num)) return { type: 'lte', value: num };
  }
  
  // Greater than or equal: ">=10" or ">= 10" or ">= -10"
  const gteRegex = new RegExp(`^>=\\s*${numPattern}$`);
  const gteMatch = str.match(gteRegex);
  if (gteMatch) {
    const num = parseNum(gteMatch[1]);
    if (!_isNaN(num)) return { type: 'gte', value: num };
  }
  
  // Less than: "<10" or "< 10" or "< -10" or "< - 10"
  const ltRegex = new RegExp(`^<\\s*${numPattern}$`);
  const ltMatch = str.match(ltRegex);
  if (ltMatch) {
    const num = parseNum(ltMatch[1]);
    if (!_isNaN(num)) return { type: 'lt', value: num };
  }
  
  // Greater than: ">10" or "> 10" or "> -10"
  const gtRegex = new RegExp(`^>\\s*${numPattern}$`);
  const gtMatch = str.match(gtRegex);
  if (gtMatch) {
    const num = parseNum(gtMatch[1]);
    if (!_isNaN(num)) return { type: 'gt', value: num };
  }
  
  // Equals: "=10" or "= 10" or "= -10" or "= - 10"
  const eqRegex = new RegExp(`^=\\s*${numPattern}$`);
  const eqMatch = str.match(eqRegex);
  if (eqMatch) {
    const num = parseNum(eqMatch[1]);
    if (!_isNaN(num)) return { type: 'eq', value: num };
  }
  
  // Plain number (treat as contains/text search for partial match)
  const plainNumRegex = new RegExp(`^${numPattern}$`);
  const plainMatch = str.match(plainNumRegex);
  if (plainMatch) {
    const num = parseNum(plainMatch[1]);
    if (!_isNaN(num)) {
      return { type: 'contains', value: str.replace(/\s+/g, '') };
    }
  }
  
  // Not a valid numeric filter, treat as text
  return { type: 'text', value: str };
}

/**
 * Apply numeric filter to a cell value
 */
function applyNumericFilter(cellValue, parsedFilter) {
  if (!parsedFilter) return true;
  
  const numCell = isNumber(cellValue) ? cellValue : toNumber(cellValue);
  
  switch (parsedFilter.type) {
    case 'lt':
      return !_isNaN(numCell) && numCell < parsedFilter.value;
    case 'gt':
      return !_isNaN(numCell) && numCell > parsedFilter.value;
    case 'lte':
      return !_isNaN(numCell) && numCell <= parsedFilter.value;
    case 'gte':
      return !_isNaN(numCell) && numCell >= parsedFilter.value;
    case 'eq':
      return !_isNaN(numCell) && numCell === parsedFilter.value;
    case 'range':
      return !_isNaN(numCell) && numCell >= parsedFilter.min && numCell <= parsedFilter.max;
    case 'contains':
      // For plain numbers, do a string contains search
      return includes(String(cellValue ?? ''), parsedFilter.value);
    case 'text':
    default:
      // Fallback to text search
      return includes(toLower(String(cellValue ?? '')), toLower(parsedFilter.value));
  }
}

function CustomTriStateCheckbox({ value, onChange }) {
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

export default function DataTableComponent({
  data,
  rowsPerPageOptions = [10, 25, 50, 100],
  defaultRows = 10,
  scrollable = true,
  scrollHeight,
  enableSort = true,
  enableFilter = true,
  enableSummation = true,
}) {
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(defaultRows);
  const [filters, setFilters] = useState({});
  const [scrollHeightValue, setScrollHeightValue] = useState('600px');
  const [multiSortMeta, setMultiSortMeta] = useState([]);

  useEffect(() => {
    setRows(defaultRows);
    setFirst(0);
  }, [defaultRows]);

  useEffect(() => {
    const updateScrollHeight = debounce(() => {
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
    }, 100);

    updateScrollHeight();
    window.addEventListener('resize', updateScrollHeight);
    return () => {
      updateScrollHeight.cancel();
      window.removeEventListener('resize', updateScrollHeight);
    };
  }, [scrollHeight]);

  const safeData = useMemo(() => {
    if (!Array.isArray(data) || isEmpty(data)) return [];
    return data;
  }, [data]);

  const columns = useMemo(() => {
    if (isEmpty(safeData)) return [];
    const allKeys = uniq(flatMap(safeData, (item) => 
      item && typeof item === 'object' ? keys(item) : []
    ));
    return allKeys;
  }, [safeData]);

  const frozenCols = useMemo(
    () => isEmpty(columns) ? [] : [head(columns)],
    [columns]
  );
  
  const regularCols = useMemo(
    () => tail(columns),
    [columns]
  );

  const isNumericValue = useCallback((value) => {
    if (isNil(value)) return false;
    return isNumber(value) || (!_isNaN(parseFloat(value)) && _isFinite(value));
  }, []);

  const formatHeaderName = useCallback((key) => {
    return startCase(key.split('__').join(' ').split('_').join(' '));
  }, []);

  const formatCellValue = useCallback((value) => {
    if (isNil(value)) return '';
    if (isNumber(value)) {
      return value % 1 === 0
        ? value.toLocaleString('en-US')
        : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(value);
  }, []);

  const columnTypes = useMemo(() => {
    const types = {};
    if (isEmpty(safeData)) return types;

    const sampleData = take(safeData, 100);

    columns.forEach((col) => {
      let numericCount = 0;
      let dateCount = 0;
      let booleanCount = 0;
      let binaryCount = 0; // Count of 0/1 values
      let nonNullCount = 0;

      sampleData.forEach((row) => {
        const value = get(row, col);
        if (!isNil(value)) {
          nonNullCount++;
          if (isNumericValue(value)) numericCount++;
          if (isString(value) && /^\d{4}-\d{2}-\d{2}/.test(value)) dateCount++;
          if (isBoolean(value)) booleanCount++;
          // Check for binary 0/1 values (number or string)
          if (value === 0 || value === 1 || value === '0' || value === '1') {
            binaryCount++;
          }
        }
      });

      const isNumericColumn = nonNullCount > 0 && numericCount > nonNullCount * 0.8;
      const isDateColumn = nonNullCount > 0 && dateCount > nonNullCount * 0.5;
      const isTrueBooleanColumn = nonNullCount > 0 && booleanCount > nonNullCount * 0.7;
      // Infer boolean from 0/1 if all non-null values are binary
      const isBinaryBooleanColumn = nonNullCount > 0 && binaryCount === nonNullCount && binaryCount >= 1;
      const isBooleanColumn = isTrueBooleanColumn || isBinaryBooleanColumn;

      types[col] = { 
        isBoolean: isBooleanColumn,
        isBinaryBoolean: isBinaryBooleanColumn, // Track if it's 0/1 based
        isNumeric: isNumericColumn && !isBooleanColumn, 
        isDate: isDateColumn 
      };
    });

    return types;
  }, [safeData, columns, isNumericValue]);

  useEffect(() => {
    if (enableFilter && !isEmpty(columns)) {
      const initialFilters = {};

      columns.forEach((col) => {
        const colType = get(columnTypes, col);
        initialFilters[col] = { 
          value: null, 
          matchMode: get(colType, 'isBoolean') ? 'equals' : 'contains' 
        };
      });

      setFilters(initialFilters);
    }
  }, [columns, enableFilter, columnTypes]);

  const calculateColumnWidths = useMemo(() => {
    const widths = {};
    if (isEmpty(safeData)) return widths;

    const sampleData = take(safeData, 100);

    columns.forEach((col) => {
      const headerLength = formatHeaderName(col).length;
      const cellLengths = [];

      sampleData.forEach((row) => {
        const value = get(row, col);
        if (!isNil(value)) {
          cellLengths.push(formatCellValue(value).length);
        }
      });

      const colType = get(columnTypes, col, { isBoolean: false, isNumeric: false, isDate: false });
      const { isBoolean: isBooleanColumn, isNumeric: isNumericColumn, isDate: isDateColumn } = colType;

      let contentWidth = headerLength;

      if (!isEmpty(cellLengths)) {
        const sortedLengths = orderBy(cellLengths);
        const medianLength = sortedLengths[Math.floor(sortedLengths.length / 2)];
        const percentile75 = sortedLengths[Math.floor(sortedLengths.length * 0.75)];
        const percentile95 = sortedLengths[Math.floor(sortedLengths.length * 0.95)];
        contentWidth = Math.min(Math.max(medianLength, percentile75), percentile95);
      }

      const headerWidth = headerLength * 9;
      let baseWidth;

      if (isBooleanColumn) {
        baseWidth = Math.max(headerWidth, 50);
      } else if (isDateColumn) {
        baseWidth = Math.max(headerWidth, 100);
      } else if (isNumericColumn) {
        baseWidth = Math.max(headerWidth, 70);
      } else {
        baseWidth = Math.max(contentWidth * 9, headerWidth);
      }

      const sortPadding = enableSort ? 30 : 0;
      const finalWidth = baseWidth + sortPadding;

      const minWidth = isBooleanColumn ? 100 : isDateColumn ? 150 : isNumericColumn ? 130 : 140;
      const maxWidth = isBooleanColumn ? 180 : isDateColumn ? 250 : isNumericColumn ? 250 : 400;

      widths[col] = clamp(finalWidth, minWidth, maxWidth);
    });

    return widths;
  }, [safeData, columns, enableSort, formatHeaderName, formatCellValue, columnTypes]);

  const filteredData = useMemo(() => {
    if (isEmpty(safeData)) return [];

    return filter(safeData, (row) => {
      if (!row || typeof row !== 'object') return false;

      return every(columns, (col) => {
        const filterObj = get(filters, col);
        if (!filterObj || isNil(filterObj.value) || filterObj.value === '') return true;

        const cellValue = get(row, col);
        const filterValue = filterObj.value;
        const colType = get(columnTypes, col);

        // Boolean filter (handles true/false and 1/0)
        if (get(colType, 'isBoolean')) {
          const cellIsTruthy = cellValue === true || cellValue === 1 || cellValue === '1';
          const cellIsFalsy = cellValue === false || cellValue === 0 || cellValue === '0';
          
          if (filterValue === true) {
            return cellIsTruthy;
          } else if (filterValue === false) {
            return cellIsFalsy;
          }
          return true;
        }

        // Numeric filter with operators
        if (get(colType, 'isNumeric')) {
          const parsedFilter = parseNumericFilter(filterValue);
          return applyNumericFilter(cellValue, parsedFilter);
        }

        // Text filter (default)
        const strCell = toLower(String(cellValue ?? ''));
        const strFilter = toLower(String(filterValue));
        return includes(strCell, strFilter);
      });
    });
  }, [safeData, filters, columns, columnTypes]);

  const sortedData = useMemo(() => {
    if (isEmpty(filteredData) || isEmpty(multiSortMeta)) {
      return filteredData;
    }

    const fields = multiSortMeta.map(s => s.field);
    const orders = multiSortMeta.map(s => s.order === 1 ? 'asc' : 'desc');
    
    return orderBy(filteredData, fields, orders);
  }, [filteredData, multiSortMeta]);

  const calculateSums = useMemo(() => {
    const sums = {};
    if (isEmpty(filteredData)) return sums;

    columns.forEach((col) => {
      const values = filter(
        filteredData.map((row) => get(row, col)),
        (val) => !isNil(val)
      );
      
      if (!isEmpty(values) && isNumericValue(head(values))) {
        sums[col] = sumBy(values, (val) => {
          const numVal = isNumber(val) ? val : toNumber(val);
          return _isNaN(numVal) ? 0 : numVal;
        });
      }
    });
    return sums;
  }, [filteredData, columns, isNumericValue]);

  const paginatedData = useMemo(() => {
    return sortedData.slice(first, first + rows);
  }, [sortedData, first, rows]);

  const footerTemplate = (column, isFirstColumn = false) => {
    if (!enableSummation) return null;
    
    const sum = get(calculateSums, column);
    const hasSum = !isNil(sum) && !get(columnTypes, [column, 'isBoolean']);
    
    if (isFirstColumn) {
      if (hasSum) {
        const formattedSum = sum % 1 === 0
          ? sum.toLocaleString('en-US')
          : sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return (
          <div className="text-left">
            <strong>Total: {formattedSum}</strong>
          </div>
        );
      }
      return (
        <div className="text-left">
          <strong>Total</strong>
        </div>
      );
    }
    
    if (get(columnTypes, [column, 'isBoolean'])) return null;
    if (isNil(sum)) return null;
    
    const formattedSum = sum % 1 === 0
      ? sum.toLocaleString('en-US')
      : sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (
      <div className="text-right">
        <strong>{formattedSum}</strong>
      </div>
    );
  };

  // Helper to normalize boolean values (handles true/false and 1/0)
  const isTruthyBoolean = useCallback((value) => {
    return value === true || value === 1 || value === '1';
  }, []);

  const booleanBodyTemplate = useCallback((rowData, column) => {
    const value = get(rowData, column);
    const isTruthy = isTruthyBoolean(value);

    return (
      <div className="flex items-center justify-center">
        {isTruthy ? (
          <i className="pi pi-check-circle text-green-600 text-lg" title="Yes" />
        ) : (
          <i className="pi pi-times-circle text-red-500 text-lg" title="No" />
        )}
      </div>
    );
  }, [isTruthyBoolean]);

  const updateFilter = useCallback((col, value) => {
    setFilters(prev => ({
      ...prev,
      [col]: { ...get(prev, col), value }
    }));
    setFirst(0);
  }, []);

  const textFilterElement = useCallback((col) => (options) => {
    const filterState = get(filters, col);
    const value = isNil(get(filterState, 'value')) ? '' : filterState.value;
    return (
      <InputText
        value={value}
        onChange={(e) => updateFilter(col, e.target.value || null)}
        placeholder="Search..."
        className="p-column-filter"
        style={{ width: '100%' }}
      />
    );
  }, [filters, updateFilter]);

  const numericFilterElement = useCallback((col) => (options) => {
    const filterState = get(filters, col);
    const value = isNil(get(filterState, 'value')) ? '' : filterState.value;
    return (
      <InputText
        value={value}
        onChange={(e) => updateFilter(col, e.target.value || null)}
        placeholder="<, >, <=, >=, =, <>"
        className="p-column-filter"
        style={{ width: '100%' }}
        title="Numeric filters: <10, >10, <=10, >=10, =10, 10<>20 (range)"
      />
    );
  }, [filters, updateFilter]);

  const booleanFilterElement = useCallback((col) => () => {
    const filterState = get(filters, col);
    const value = get(filterState, 'value', null);
    return (
      <div className="flex items-center justify-center">
        <CustomTriStateCheckbox
          value={value}
          onChange={(newValue) => updateFilter(col, newValue)}
        />
      </div>
    );
  }, [filters, updateFilter]);

  const getFilterElement = useCallback((col) => {
    const colType = get(columnTypes, col);
    if (get(colType, 'isBoolean')) {
      return booleanFilterElement(col);
    }
    if (get(colType, 'isNumeric')) {
      return numericFilterElement(col);
    }
    return textFilterElement(col);
  }, [columnTypes, booleanFilterElement, numericFilterElement, textFilterElement]);

  const onPageChange = (event) => {
    setFirst(event.first);
    setRows(event.rows);
  };

  if (isEmpty(safeData)) {
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
          {frozenCols.map((col, index) => {
            const colType = get(columnTypes, col);
            const isBooleanCol = get(colType, 'isBoolean', false);
            const isNumericCol = get(colType, 'isNumeric', false);
            const isFirstColumn = index === 0;
            return (
              <Column
                key={`frozen-${col}`}
                field={col}
                header={formatHeaderName(col)}
                sortable={enableSort}
                frozen
                style={{
                  minWidth: `${get(calculateColumnWidths, col, 120)}px`,
                  width: `${get(calculateColumnWidths, col, 120)}px`,
                  maxWidth: `${get(calculateColumnWidths, col, 200)}px`
                }}
                filter={enableFilter}
                filterElement={enableFilter ? getFilterElement(col) : undefined}
                showFilterMenu={false}
                showClearButton={false}
                footer={footerTemplate(col, isFirstColumn)}
                body={isBooleanCol
                  ? (rowData) => booleanBodyTemplate(rowData, col)
                  : (rowData) => (
                    <div
                      className={`text-xs sm:text-sm truncate ${isNumericCol ? 'text-right' : 'text-left'}`}
                      title={formatCellValue(get(rowData, col))}
                    >
                      {formatCellValue(get(rowData, col))}
                    </div>
                  )
                }
              />
            );
          })}

          {regularCols.map((col) => {
            const colType = get(columnTypes, col);
            const isBooleanCol = get(colType, 'isBoolean', false);
            const isNumericCol = get(colType, 'isNumeric', false);
            return (
              <Column
                key={col}
                field={col}
                header={formatHeaderName(col)}
                sortable={enableSort}
                style={{
                  minWidth: `${get(calculateColumnWidths, col, 120)}px`,
                  width: `${get(calculateColumnWidths, col, 120)}px`,
                  maxWidth: `${get(calculateColumnWidths, col, 400)}px`
                }}
                filter={enableFilter}
                filterElement={enableFilter ? getFilterElement(col) : undefined}
                showFilterMenu={false}
                showClearButton={false}
                footer={footerTemplate(col)}
                body={isBooleanCol
                  ? (rowData) => booleanBodyTemplate(rowData, col)
                  : (rowData) => (
                    <div
                      className={`text-xs sm:text-sm truncate ${isNumericCol ? 'text-right' : 'text-left'}`}
                      title={formatCellValue(get(rowData, col))}
                    >
                      {formatCellValue(get(rowData, col))}
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
