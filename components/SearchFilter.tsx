'use client'

import { useState } from 'react'

interface SearchFilterProps {
  onSearch: (query: string) => void
  onFilterType: (type: string) => void
  onSort: (sort: string) => void
  projectTypes: string[]
}

export default function SearchFilter({
  onSearch,
  onFilterType,
  onSort,
  projectTypes
}: SearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedSort, setSelectedSort] = useState('newest')
  const [isOpen, setIsOpen] = useState(false)

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onSearch(value)
  }

  const handleTypeFilter = (type: string) => {
    setSelectedType(type)
    onFilterType(type)
  }

  const handleSort = (sort: string) => {
    setSelectedSort(sort)
    onSort(sort)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedType('all')
    setSelectedSort('newest')
    onSearch('')
    onFilterType('all')
    onSort('newest')
  }

  const activeFiltersCount = 
    (searchQuery ? 1 : 0) + 
    (selectedType !== 'all' ? 1 : 0) + 
    (selectedSort !== 'newest' ? 1 : 0)

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-2xl">🔍</span>
        </div>
        <input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-14 pr-12 py-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none text-lg transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => handleSearch('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
          >
            <span className="text-2xl">✕</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Filter Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            activeFiltersCount > 0
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          <span>⚙️</span>
          <span>Filters</span>
          {activeFiltersCount > 0 && (
            <span className="bg-white text-purple-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Quick Type Filters */}
        {['all', ...projectTypes].map((type) => (
          <button
            key={type}
            onClick={() => handleTypeFilter(type)}
            className={`px-4 py-2 rounded-xl font-medium transition-all capitalize ${
              selectedType === type
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {type === 'all' ? 'All' : type}
          </button>
        ))}

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 rounded-xl font-medium bg-red-100 hover:bg-red-200 text-red-600 transition-all"
          >
            Clear All
          </button>
        )}

        {/* Results Count */}
        <div className="ml-auto text-sm text-gray-600 font-medium">
          {activeFiltersCount > 0 ? 'Filtered' : 'All'} Projects
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {isOpen && (
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-6">
          {/* Sort Options */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Sort By
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: 'newest', label: 'Newest First', icon: '🆕' },
                { value: 'oldest', label: 'Oldest First', icon: '📅' },
                { value: 'name-asc', label: 'Name (A-Z)', icon: '🔤' },
                { value: 'name-desc', label: 'Name (Z-A)', icon: '🔡' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSort(option.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedSort === option.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Project Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => handleTypeFilter('all')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedType === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                All Types
              </button>
              {projectTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeFilter(type)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                    selectedType === type
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}