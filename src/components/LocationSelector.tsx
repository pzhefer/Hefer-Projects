import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Country {
  id: string;
  code: string;
  name: string;
}

interface State {
  id: string;
  country_id: string;
  code: string;
  name: string;
}

interface City {
  id: string;
  state_id: string;
  country_id: string;
  name: string;
}

interface LocationSelectorProps {
  countryValue?: string;
  stateValue?: string;
  cityValue?: string;
  onCountryChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onCityChange: (value: string) => void;
  required?: boolean;
  showLabels?: boolean;
}

export default function LocationSelector({
  countryValue = '',
  stateValue = '',
  cityValue = '',
  onCountryChange,
  onStateChange,
  onCityChange,
  required = false,
  showLabels = true
}: LocationSelectorProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [countrySearch, setCountrySearch] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const countryRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (countryValue) {
      fetchStates(countryValue);
      const country = countries.find(c => c.id === countryValue);
      setCountrySearch(country?.name || '');
    } else {
      setStates([]);
      setStateSearch('');
      onStateChange('');
    }
  }, [countryValue, countries]);

  useEffect(() => {
    if (stateValue) {
      fetchCities(stateValue);
      const state = states.find(s => s.id === stateValue);
      setStateSearch(state?.name || '');
    } else {
      setCities([]);
      setCitySearch('');
      onCityChange('');
    }
  }, [stateValue, states]);

  useEffect(() => {
    if (cityValue) {
      const city = cities.find(c => c.id === cityValue);
      setCitySearch(city?.name || '');
    }
  }, [cityValue, cities]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
      if (stateRef.current && !stateRef.current.contains(event.target as Node)) {
        setShowStateDropdown(false);
      }
      if (cityRef.current && !cityRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCountries = async () => {
    const { data, error } = await supabase
      .from('global_countries')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setCountries(data);
    }
  };

  const fetchStates = async (countryId: string) => {
    const { data, error } = await supabase
      .from('global_states')
      .select('*')
      .eq('country_id', countryId)
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setStates(data);
    }
  };

  const fetchCities = async (stateId: string) => {
    const { data, error } = await supabase
      .from('global_cities')
      .select('*')
      .eq('state_id', stateId)
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setCities(data);
    }
  };

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const filteredStates = states.filter(s =>
    s.name.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const filteredCities = cities.filter(c =>
    c.name.toLowerCase().includes(citySearch.toLowerCase())
  );

  const selectCountry = (country: Country) => {
    onCountryChange(country.id);
    setCountrySearch(country.name);
    setShowCountryDropdown(false);
    onStateChange('');
    onCityChange('');
    setStateSearch('');
    setCitySearch('');
  };

  const selectState = (state: State) => {
    onStateChange(state.id);
    setStateSearch(state.name);
    setShowStateDropdown(false);
    onCityChange('');
    setCitySearch('');
  };

  const selectCity = (city: City) => {
    onCityChange(city.id);
    setCitySearch(city.name);
    setShowCityDropdown(false);
  };

  const clearCountry = () => {
    onCountryChange('');
    setCountrySearch('');
    onStateChange('');
    onCityChange('');
    setStateSearch('');
    setCitySearch('');
  };

  const clearState = () => {
    onStateChange('');
    setStateSearch('');
    onCityChange('');
    setCitySearch('');
  };

  const clearCity = () => {
    onCityChange('');
    setCitySearch('');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div ref={countryRef} className="relative">
        {showLabels && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={countrySearch}
            onChange={(e) => {
              setCountrySearch(e.target.value);
              setShowCountryDropdown(true);
            }}
            onFocus={() => setShowCountryDropdown(true)}
            placeholder="Search country..."
            className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={required}
          />
          {countryValue && (
            <button
              type="button"
              onClick={clearCountry}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X size={16} className="text-gray-400 hover:text-gray-600" />
            </button>
          )}
          {!countryValue && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ChevronDown size={16} className="text-gray-400" />
            </div>
          )}
        </div>
        {showCountryDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <button
                  key={country.id}
                  type="button"
                  onClick={() => selectCountry(country)}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                >
                  <div className="flex items-center justify-between">
                    <span>{country.name}</span>
                    <span className="text-xs text-gray-500">{country.code}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">No countries found</div>
            )}
          </div>
        )}
      </div>

      <div ref={stateRef} className="relative">
        {showLabels && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State/Province
          </label>
        )}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={stateSearch}
            onChange={(e) => {
              setStateSearch(e.target.value);
              setShowStateDropdown(true);
            }}
            onFocus={() => setShowStateDropdown(true)}
            placeholder="Search state..."
            disabled={!countryValue}
            className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {stateValue && (
            <button
              type="button"
              onClick={clearState}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X size={16} className="text-gray-400 hover:text-gray-600" />
            </button>
          )}
          {!stateValue && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ChevronDown size={16} className="text-gray-400" />
            </div>
          )}
        </div>
        {showStateDropdown && countryValue && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredStates.length > 0 ? (
              filteredStates.map((state) => (
                <button
                  key={state.id}
                  type="button"
                  onClick={() => selectState(state)}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                >
                  {state.name}
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">No states found</div>
            )}
          </div>
        )}
      </div>

      <div ref={cityRef} className="relative">
        {showLabels && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City
          </label>
        )}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={citySearch}
            onChange={(e) => {
              setCitySearch(e.target.value);
              setShowCityDropdown(true);
            }}
            onFocus={() => setShowCityDropdown(true)}
            placeholder="Search city..."
            disabled={!stateValue}
            className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {cityValue && (
            <button
              type="button"
              onClick={clearCity}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X size={16} className="text-gray-400 hover:text-gray-600" />
            </button>
          )}
          {!cityValue && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ChevronDown size={16} className="text-gray-400" />
            </div>
          )}
        </div>
        {showCityDropdown && stateValue && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredCities.length > 0 ? (
              filteredCities.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => selectCity(city)}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                >
                  {city.name}
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">No cities found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
