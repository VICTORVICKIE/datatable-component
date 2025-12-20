'use client';

import { useMemo, useState, useEffect } from 'react';
import { useLocalStorage } from 'primereact/hooks';
import DataTableComponent from '@/components/DataTable';
import DataTableControls from '@/components/DataTableControls';
import data from '@/resource/data';
import { uniq, flatMap, keys, isEmpty } from 'lodash';

// Custom hook for localStorage with proper JSON serialization for booleans
function useLocalStorageBoolean(key, defaultValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      if (item === null || item === undefined) return defaultValue;
      const parsed = JSON.parse(item);
      return typeof parsed === 'boolean' ? parsed : defaultValue;
    } catch (error) {
      try {
        window.localStorage.removeItem(key);
      } catch {}
      return defaultValue;
    }
  });

  // Sync with localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null && item !== undefined) {
        const parsed = JSON.parse(item);
        if (typeof parsed === 'boolean') {
          setValue(parsed);
        }
      }
    } catch (error) {
      // Ignore errors during sync
    }
  }, [key]);

  const setStoredValue = (newValue) => {
    try {
      if (typeof newValue === 'boolean') {
        const serialized = JSON.stringify(newValue);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, serialized);
        }
        setValue(newValue);
      } else {
        console.warn(`Attempted to set non-boolean value for "${key}":`, newValue);
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [value, setStoredValue];
}

// Custom hook for localStorage with proper JSON serialization for arrays
function useLocalStorageArray(key, defaultValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      if (item === null || item === undefined) return defaultValue;
      const parsed = JSON.parse(item);
      return Array.isArray(parsed) ? parsed : defaultValue;
    } catch (error) {
      // If parsing fails, try to clean up invalid data
      try {
        window.localStorage.removeItem(key);
      } catch {}
      return defaultValue;
    }
  });

  // Sync with localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null && item !== undefined) {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed)) {
          setValue(parsed);
        }
      }
    } catch (error) {
      // Ignore errors during sync
    }
  }, [key]);

  const setStoredValue = (newValue) => {
    try {
      if (Array.isArray(newValue)) {
        const serialized = JSON.stringify(newValue);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, serialized);
        }
        setValue(newValue);
      } else {
        console.warn(`Attempted to set non-array value for "${key}":`, newValue);
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [value, setStoredValue];
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [enableSort, setEnableSort] = useLocalStorageBoolean('datatable-enableSort', true); 
  const [enableFilter, setEnableFilter] = useLocalStorageBoolean('datatable-enableFilter', true);                                                                                        
  const [enableSummation, setEnableSummation] = useLocalStorageBoolean('datatable-enableSummation', true);                                                                               
  const [rowsPerPageOptionsRaw, setRowsPerPageOptionsRaw] = useLocalStorageArray('datatable-rowsPerPageOptions', [5, 10, 25, 50, 100, 200]);                                             
  const [textFilterColumnsRaw, setTextFilterColumnsRaw] = useLocalStorageArray('datatable-textFilterColumns', []);                                                                                   
  const [redFieldsRaw, setRedFieldsRaw] = useLocalStorageArray('datatable-redFields', []);  
  const [greenFieldsRaw, setGreenFieldsRaw] = useLocalStorageArray('datatable-greenFields', []);                                                                                         

  // Mark as loaded after first render to allow localStorage values to initialize
  useEffect(() => {
    // Check if we're in the browser and localStorage is available
    if (typeof window !== 'undefined' && window.localStorage) {
      // Clean up any corrupted data
      try {
        // Clean up boolean values that might be stored incorrectly
        const booleanKeys = ['datatable-enableSort', 'datatable-enableFilter', 'datatable-enableSummation'];                                                                             
        booleanKeys.forEach(key => {
          try {
            const item = window.localStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              // If it's not a boolean, remove it
              if (typeof parsed !== 'boolean') {
                window.localStorage.removeItem(key);
              }
            }
          } catch (error) {
            // If parsing fails, remove the corrupted item
            window.localStorage.removeItem(key);
          }
        });

        const arrayKeys = {
          'datatable-rowsPerPageOptions': { defaultValue: [5, 10, 25, 50, 100, 200], isColumnList: false },                                                                              
          'datatable-textFilterColumns': { defaultValue: [], isColumnList: true },
          'datatable-redFields': { defaultValue: [], isColumnList: true },
          'datatable-greenFields': { defaultValue: [], isColumnList: true }
        };
        
        // Check each key and validate its content
        Object.entries(arrayKeys).forEach(([key, config]) => {
          try {
            const item = window.localStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);

              // If it's not an array, remove it
              if (!Array.isArray(parsed)) {
                window.localStorage.removeItem(key);
                return;
              }

              // If rowsPerPageOptions contains non-numbers or column-like strings, reset it
              if (key === 'datatable-rowsPerPageOptions') {
                const hasInvalidValues = parsed.some(v => 
                  typeof v !== 'number' || 
                  (typeof v === 'string' && v.includes('__'))
                );
                if (hasInvalidValues) {
                  window.localStorage.removeItem(key);
                }
              }

              // If column lists contain numbers, reset them
              if (config.isColumnList) {
                const hasNumbers = parsed.some(v => typeof v === 'number');
                if (hasNumbers) {
                  window.localStorage.removeItem(key);
                }
              }
            }
          } catch (error) {
            // If parsing fails, remove the corrupted item
            window.localStorage.removeItem(key);
          }
        });
      } catch (error) {
        // Ignore cleanup errors
        console.warn('Error during localStorage cleanup:', error);
      }
      
      // Use requestAnimationFrame to ensure localStorage values are read after render      
      requestAnimationFrame(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  // Ensure rowsPerPageOptions is always an array
  const rowsPerPageOptions = useMemo(() => {
    if (!Array.isArray(rowsPerPageOptionsRaw)) {
      return [5, 10, 25, 50, 100, 200];
    }
    return rowsPerPageOptionsRaw;
  }, [rowsPerPageOptionsRaw]);

  // Ensure textFilterColumns is always an array
  const textFilterColumns = useMemo(() => {
    if (!Array.isArray(textFilterColumnsRaw)) {
      return [];
    }
    return textFilterColumnsRaw;
  }, [textFilterColumnsRaw]);

  // Ensure redFields is always an array
  const redFields = useMemo(() => {
    if (!Array.isArray(redFieldsRaw)) {
      return [];
    }
    return redFieldsRaw;
  }, [redFieldsRaw]);

  // Ensure greenFields is always an array
  const greenFields = useMemo(() => {
    if (!Array.isArray(greenFieldsRaw)) {
      return [];
    }
    return greenFieldsRaw;
  }, [greenFieldsRaw]);

  const setRowsPerPageOptions = (value) => {
    if (Array.isArray(value)) {
      setRowsPerPageOptionsRaw(value);
    }
  };

  const setTextFilterColumns = (value) => {
    if (Array.isArray(value)) {
      setTextFilterColumnsRaw(value);
    }
  };

  const setRedFields = (value) => {
    if (Array.isArray(value)) {
      setRedFieldsRaw(value);
    }
  };

  const setGreenFields = (value) => {
    if (Array.isArray(value)) {
      setGreenFieldsRaw(value);
    }
  };

  // Extract column names from data
  const columns = useMemo(() => {
    if (!Array.isArray(data) || isEmpty(data)) return [];
    return uniq(flatMap(data, (item) => 
      item && typeof item === 'object' ? keys(item) : []
    ));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Data Table Component</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Primereact Datatable Component Playground</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mb-4"></div>                                                   
              <p className="text-sm text-gray-600">Loading your preferences...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">                                                                                       
            <div className="mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">Data Table</h2>                                                                              
              <p className="text-xs sm:text-sm text-gray-600">
                View, filter, sort, and analyze your data with advanced table controls      
              </p>
            </div>

            <DataTableControls
              enableSort={enableSort}
              enableFilter={enableFilter}
              enableSummation={enableSummation}
              rowsPerPageOptions={rowsPerPageOptions}
              columns={columns}
              textFilterColumns={textFilterColumns}
              redFields={redFields}
              greenFields={greenFields}
              onSortChange={setEnableSort}
              onFilterChange={setEnableFilter}
              onSummationChange={setEnableSummation}
              onRowsPerPageOptionsChange={setRowsPerPageOptions}
              onTextFilterColumnsChange={setTextFilterColumns}
              onRedFieldsChange={setRedFields}
              onGreenFieldsChange={setGreenFields}
            />

            <DataTableComponent
              data={data}
              rowsPerPageOptions={rowsPerPageOptions}
              defaultRows={rowsPerPageOptions[0] || 5}
              scrollable={true}
              enableSort={enableSort}
              enableFilter={enableFilter}
              enableSummation={enableSummation}
              textFilterColumns={textFilterColumns}
              redFields={redFields}
              greenFields={greenFields}
            />
          </div>
        )}
      </main>
    </div>
  );
}
