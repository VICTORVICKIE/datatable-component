'use client';

import { useState } from 'react';
import DataTableComponent from '@/components/DataTable';
import DataTableControls from '@/components/DataTableControls';
import data from '@/resource/data';

export default function Home() {
  const [enableSort, setEnableSort] = useState(true);
  const [enableFilter, setEnableFilter] = useState(true);
  const [enableSummation, setEnableSummation] = useState(true);
  const [rowsPerPageOptions, setRowsPerPageOptions] = useState([5, 10, 25, 50, 100, 200]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Data Table Component</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">Data Table</h2>
            <p className="text-xs sm:text-sm text-gray-600">
              View, filter, sort, and analyze your data with advanced table controls
            </p>
            <p className="text-xs sm:text-sm text-red-400">
              Not mobile screen optimized
            </p>
          </div>

          <DataTableControls
            enableSort={enableSort}
            enableFilter={enableFilter}
            enableSummation={enableSummation}
            rowsPerPageOptions={rowsPerPageOptions}
            onSortChange={setEnableSort}
            onFilterChange={setEnableFilter}
            onSummationChange={setEnableSummation}
            onRowsPerPageOptionsChange={setRowsPerPageOptions}
          />

          <DataTableComponent
            data={data}
            rowsPerPageOptions={rowsPerPageOptions}
            defaultRows={rowsPerPageOptions[0] || 5}
            scrollable={true}
            enableSort={enableSort}
            enableFilter={enableFilter}
            enableSummation={enableSummation}
          />
        </div>
      </main>
    </div>
  );
}
