import { useState, useEffect } from 'react';
import { X, Search, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DrawingSymbol {
  id: string;
  name: string;
  category: string;
  svg_path: string;
  view_box: string;
  is_custom: boolean;
}

interface DrawingSymbolsPaletteProps {
  onSelectSymbol: (symbol: DrawingSymbol) => void;
  onClose: () => void;
}

const CATEGORIES = [
  { value: 'all', label: 'All', icon: '🏗️' },
  { value: 'electrical', label: 'Electrical', icon: '⚡' },
  { value: 'plumbing', label: 'Plumbing', icon: '🚰' },
  { value: 'hvac', label: 'HVAC', icon: '❄️' },
  { value: 'fire_safety', label: 'Fire Safety', icon: '🔥' },
  { value: 'structural', label: 'Structural', icon: '🏛️' },
  { value: 'general', label: 'General', icon: '📐' },
];

export default function DrawingSymbolsPalette({ onSelectSymbol, onClose }: DrawingSymbolsPaletteProps) {
  const [symbols, setSymbols] = useState<DrawingSymbol[]>([]);
  const [filteredSymbols, setFilteredSymbols] = useState<DrawingSymbol[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSymbols();
  }, []);

  useEffect(() => {
    filterSymbols();
  }, [symbols, selectedCategory, searchQuery]);

  const fetchSymbols = async () => {
    try {
      const { data, error } = await supabase
        .from('drawing_symbols')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('name');

      if (error) throw error;
      setSymbols(data || []);
    } catch (error) {
      console.error('Error fetching symbols:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSymbols = () => {
    let filtered = symbols;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(s => s.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query)
      );
    }

    setFilteredSymbols(filtered);
  };

  const handleSelectSymbol = (symbol: DrawingSymbol) => {
    onSelectSymbol(symbol);
    onClose();
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Symbol Library</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search symbols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50">
        {CATEGORIES.map(category => (
          <button
            key={category.value}
            onClick={() => setSelectedCategory(category.value)}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === category.value
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <span>{category.icon}</span>
            <span>{category.label}</span>
          </button>
        ))}
      </div>

      {/* Symbols Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredSymbols.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">📐</div>
            <p className="text-gray-500 text-sm">No symbols found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filteredSymbols.map(symbol => (
              <button
                key={symbol.id}
                onClick={() => handleSelectSymbol(symbol)}
                className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                title={symbol.name}
              >
                <div className="w-12 h-12 flex items-center justify-center mb-2">
                  <svg
                    viewBox={symbol.view_box}
                    className="w-full h-full text-gray-700 group-hover:text-blue-600 transition-colors"
                    fill="currentColor"
                  >
                    <path d={symbol.svg_path} />
                  </svg>
                </div>
                <span className="text-xs text-gray-700 text-center line-clamp-2 group-hover:text-blue-900">
                  {symbol.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          {filteredSymbols.length} symbol{filteredSymbols.length !== 1 ? 's' : ''} available
        </p>
      </div>
    </div>
  );
}
