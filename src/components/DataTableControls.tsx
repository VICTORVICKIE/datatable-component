'use client';

import React from 'react';

interface DataTableControlsProps {
  enableSort: boolean;
  enableFilter: boolean;
  enableSummation: boolean;
  rowsPerPageOptions: number[];
  onSortChange: (enabled: boolean) => void;
  onFilterChange: (enabled: boolean) => void;
  onSummationChange: (enabled: boolean) => void;
  onRowsPerPageOptionsChange: (options: number[]) => void;
}

export default function DataTableControls({
  enableSort,
  enableFilter,
  enableSummation,
  rowsPerPageOptions,
  onSortChange,
  onFilterChange,
  onSummationChange,
  onRowsPerPageOptionsChange,
}: DataTableControlsProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [customOptions, setCustomOptions] = React.useState(rowsPerPageOptions.join(', '));

  React.useEffect(() => {
    setCustomOptions(rowsPerPageOptions.join(', '));
  }, [rowsPerPageOptions]);

  const handleOptionsChange = (value: string) => {
    setCustomOptions(value);
    const options = value
      .split(',')
      .map((v) => parseInt(v.trim()))
      .filter((v) => !isNaN(v) && v > 0)
      .sort((a, b) => a - b);
    if (options.length > 0) {
      onRowsPerPageOptionsChange(options);
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Table Controls</h3>
          <p className="text-xs text-gray-600 mt-0.5">Configure table features and settings</p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 rounded-md hover:bg-gray-200 transition-colors"
          aria-label={isExpanded ? 'Collapse controls' : 'Expand controls'}
        >
          <i className={`pi ${isExpanded ? 'pi-chevron-up' : 'pi-chevron-down'} text-gray-600`}></i>
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-3">Features</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${enableSort
                ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
                : 'bg-white border-gray-200 hover:border-gray-300'
                }`}>
                <div className="flex items-center gap-2">
                  <i className={`pi pi-sort ${enableSort ? 'text-blue-600' : 'text-gray-600'}`}></i>
                  <span className={`text-sm font-medium ${enableSort ? 'text-blue-900' : 'text-gray-700'}`}>
                    Sorting
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={enableSort}
                    onChange={(e) => onSortChange(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-11 h-6 rounded-full transition-colors duration-200 ${enableSort ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${enableSort ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      style={{ marginTop: '2px' }}
                    ></div>
                  </div>
                </div>
              </label>

              <label className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${enableFilter
                ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
                : 'bg-white border-gray-200 hover:border-gray-300'
                }`}>
                <div className="flex items-center gap-2">
                  <i className={`pi pi-filter ${enableFilter ? 'text-blue-600' : 'text-gray-600'}`}></i>
                  <span className={`text-sm font-medium ${enableFilter ? 'text-blue-900' : 'text-gray-700'}`}>
                    Filtering
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={enableFilter}
                    onChange={(e) => onFilterChange(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-11 h-6 rounded-full transition-colors duration-200 ${enableFilter ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${enableFilter ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      style={{ marginTop: '2px' }}
                    ></div>
                  </div>
                </div>
              </label>

              <label className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${enableSummation
                ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
                : 'bg-white border-gray-200 hover:border-gray-300'
                }`}>
                <div className="flex items-center gap-2">
                  <i className={`pi pi-calculator ${enableSummation ? 'text-blue-600' : 'text-gray-600'}`}></i>
                  <span className={`text-sm font-medium ${enableSummation ? 'text-blue-900' : 'text-gray-700'}`}>
                    Summation
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={enableSummation}
                    onChange={(e) => onSummationChange(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-11 h-6 rounded-full transition-colors duration-200 ${enableSummation ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${enableSummation ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      style={{ marginTop: '2px' }}
                    ></div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-3">Pagination</h4>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Available Options (comma-separated)
              </label>
              <input
                type="text"
                value={customOptions}
                onChange={(e) => handleOptionsChange(e.target.value)}
                placeholder="5, 10, 25, 50, 100"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter numbers separated by commas. These options will be available in the paginator dropdown.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

