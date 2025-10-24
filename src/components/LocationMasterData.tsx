import { useState, useEffect } from 'react';
import { MapPin, Plus, Edit2, Trash2, X, Save, Globe, Map } from 'lucide-react';
import { supabase } from '../lib/supabase';

type LocationType = 'countries' | 'states' | 'cities';

interface Country {
  id: string;
  name: string;
  code: string;
  created_at?: string;
}

interface State {
  id: string;
  name: string;
  code: string;
  country_id: string;
  country_name?: string;
  created_at?: string;
}

interface City {
  id: string;
  name: string;
  state_id: string;
  state_name?: string;
  country_name?: string;
  created_at?: string;
}

export default function LocationMasterData() {
  const [activeTab, setActiveTab] = useState<LocationType>('countries');
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>('');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (activeTab === 'states') {
      fetchStates();
    } else if (activeTab === 'cities') {
      fetchCities();
    }
  }, [activeTab]);

  const fetchCountries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('global_countries')
      .select('*')
      .order('name');

    if (!error && data) {
      setCountries(data);
    }
    setLoading(false);
  };

  const fetchStates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('global_states')
      .select(`
        *,
        country:global_countries(name)
      `)
      .order('name');

    if (!error && data) {
      setStates(data.map(s => ({
        ...s,
        country_name: s.country?.name
      })));
    }
    setLoading(false);
  };

  const fetchCities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('global_cities')
      .select(`
        *,
        state:global_states(
          name,
          country:global_countries(name)
        )
      `)
      .order('name');

    if (!error && data) {
      setCities(data.map(c => ({
        ...c,
        state_name: c.state?.name,
        country_name: c.state?.country?.name
      })));
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, type: LocationType) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    const tableName = type === 'countries' ? 'global_countries'
      : type === 'states' ? 'global_states'
      : 'global_cities';

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (!error) {
      if (type === 'countries') fetchCountries();
      else if (type === 'states') fetchStates();
      else fetchCities();
    } else {
      alert('Failed to delete: ' + error.message);
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const filteredStates = selectedCountryFilter
    ? states.filter(s => s.country_id === selectedCountryFilter)
    : states;

  const filteredCities = selectedStateFilter
    ? cities.filter(c => c.state_id === selectedStateFilter)
    : selectedCountryFilter
    ? cities.filter(c => states.find(s => s.id === c.state_id && s.country_id === selectedCountryFilter))
    : cities;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Globe className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Location Master Data</h2>
                <p className="text-sm text-gray-600">Manage countries, states, and cities</p>
              </div>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              <span>Add {activeTab === 'countries' ? 'Country' : activeTab === 'states' ? 'State' : 'City'}</span>
            </button>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('countries')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'countries'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Globe size={16} />
                <span>Countries ({countries.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('states')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'states'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Map size={16} />
                <span>States/Provinces ({states.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('cities')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'cities'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <MapPin size={16} />
                <span>Cities ({cities.length})</span>
              </div>
            </button>
          </nav>
        </div>

        {activeTab === 'states' && (
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Country
            </label>
            <select
              value={selectedCountryFilter}
              onChange={(e) => setSelectedCountryFilter(e.target.value)}
              className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Countries</option>
              {countries.map(country => (
                <option key={country.id} value={country.id}>{country.name}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'cities' && (
          <div className="p-6 bg-gray-50 border-b border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Country
              </label>
              <select
                value={selectedCountryFilter}
                onChange={(e) => {
                  setSelectedCountryFilter(e.target.value);
                  setSelectedStateFilter('');
                }}
                className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Countries</option>
                {countries.map(country => (
                  <option key={country.id} value={country.id}>{country.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by State/Province
              </label>
              <select
                value={selectedStateFilter}
                onChange={(e) => setSelectedStateFilter(e.target.value)}
                className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All States/Provinces</option>
                {filteredStates.map(state => (
                  <option key={state.id} value={state.id}>{state.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    {activeTab === 'states' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Country
                      </th>
                    )}
                    {activeTab === 'cities' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          State/Province
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Country
                        </th>
                      </>
                    )}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeTab === 'countries' && countries.map(country => (
                    <tr key={country.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {country.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {country.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(country)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(country.id, 'countries')}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'states' && filteredStates.map(state => (
                    <tr key={state.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {state.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {state.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {state.country_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(state)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(state.id, 'states')}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'cities' && filteredCities.map(city => (
                    <tr key={city.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {city.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {city.state_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {city.country_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(city)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(city.id, 'cities')}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {((activeTab === 'countries' && countries.length === 0) ||
                (activeTab === 'states' && filteredStates.length === 0) ||
                (activeTab === 'cities' && filteredCities.length === 0)) && (
                <div className="text-center py-12 text-gray-500">
                  No {activeTab} found. Click "Add" to create one.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <AddLocationModal
          type={activeTab}
          countries={countries}
          states={states}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            if (activeTab === 'countries') fetchCountries();
            else if (activeTab === 'states') fetchStates();
            else fetchCities();
          }}
        />
      )}

      {isEditModalOpen && editingItem && (
        <EditLocationModal
          type={activeTab}
          item={editingItem}
          countries={countries}
          states={states}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingItem(null);
          }}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setEditingItem(null);
            if (activeTab === 'countries') fetchCountries();
            else if (activeTab === 'states') fetchStates();
            else fetchCities();
          }}
        />
      )}
    </div>
  );
}

function AddLocationModal({
  type,
  countries,
  states,
  onClose,
  onSuccess
}: {
  type: LocationType;
  countries: Country[];
  states: State[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [countryId, setCountryId] = useState('');
  const [stateId, setStateId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    let table = '';
    let data: any = { name };

    if (type === 'countries') {
      table = 'global_countries';
      data.code = code;
    } else if (type === 'states') {
      table = 'global_states';
      data.code = code;
      data.country_id = countryId;
    } else {
      table = 'global_cities';
      data.state_id = stateId;
      data.country_id = countryId;
    }

    const { error } = await supabase
      .from(table)
      .insert([data]);

    setSaving(false);

    if (error) {
      alert('Failed to add: ' + error.message);
    } else {
      onSuccess();
    }
  };

  const filteredStates = countryId ? states.filter(s => s.country_id === countryId) : states;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Add {type === 'countries' ? 'Country' : type === 'states' ? 'State/Province' : 'City'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Enter ${type === 'countries' ? 'country' : type === 'states' ? 'state/province' : 'city'} name`}
            />
          </div>

          {type !== 'cities' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={type === 'countries' ? 2 : 10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={type === 'countries' ? 'e.g., US, CA' : 'e.g., CA, TX'}
              />
            </div>
          )}

          {type === 'states' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country *
              </label>
              <select
                required
                value={countryId}
                onChange={(e) => setCountryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a country</option>
                {countries.map(country => (
                  <option key={country.id} value={country.id}>{country.name}</option>
                ))}
              </select>
            </div>
          )}

          {type === 'cities' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country *
                </label>
                <select
                  required
                  value={countryId}
                  onChange={(e) => {
                    setCountryId(e.target.value);
                    setStateId('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a country</option>
                  {countries.map(country => (
                    <option key={country.id} value={country.id}>{country.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province *
                </label>
                <select
                  required
                  value={stateId}
                  onChange={(e) => setStateId(e.target.value)}
                  disabled={!countryId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select a state/province</option>
                  {filteredStates.map(state => (
                    <option key={state.id} value={state.id}>{state.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditLocationModal({
  type,
  item,
  countries,
  states,
  onClose,
  onSuccess
}: {
  type: LocationType;
  item: any;
  countries: Country[];
  states: State[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [code, setCode] = useState(item.code || '');
  const [countryId, setCountryId] = useState(item.country_id || '');
  const [stateId, setStateId] = useState(item.state_id || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    let table = '';
    let data: any = { name };

    if (type === 'countries') {
      table = 'global_countries';
      data.code = code;
    } else if (type === 'states') {
      table = 'global_states';
      data.code = code;
      data.country_id = countryId;
    } else {
      table = 'global_cities';
      data.state_id = stateId;
      data.country_id = countryId;
    }

    const { error } = await supabase
      .from(table)
      .update(data)
      .eq('id', item.id);

    setSaving(false);

    if (error) {
      alert('Failed to update: ' + error.message);
    } else {
      onSuccess();
    }
  };

  const filteredStates = countryId ? states.filter(s => s.country_id === countryId) : states;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Edit {type === 'countries' ? 'Country' : type === 'states' ? 'State/Province' : 'City'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {type !== 'cities' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={type === 'countries' ? 2 : 10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {type === 'states' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country *
              </label>
              <select
                required
                value={countryId}
                onChange={(e) => setCountryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a country</option>
                {countries.map(country => (
                  <option key={country.id} value={country.id}>{country.name}</option>
                ))}
              </select>
            </div>
          )}

          {type === 'cities' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country *
                </label>
                <select
                  required
                  value={countryId}
                  onChange={(e) => {
                    setCountryId(e.target.value);
                    setStateId('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a country</option>
                  {countries.map(country => (
                    <option key={country.id} value={country.id}>{country.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province *
                </label>
                <select
                  required
                  value={stateId}
                  onChange={(e) => setStateId(e.target.value)}
                  disabled={!countryId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select a state/province</option>
                  {filteredStates.map(state => (
                    <option key={state.id} value={state.id}>{state.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={16} />
              <span>{saving ? 'Updating...' : 'Update'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
