import { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { supabase, type Project } from '../lib/supabase';

interface GlobalProjectFilterProps {
  onFilterChange: (selectedProjects: string[], selectedStatuses: string[]) => void;
}

export default function GlobalProjectFilter({ onFilterChange }: GlobalProjectFilterProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['active']);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Refresh project list when dropdown is opened
  useEffect(() => {
    if (showProjectDropdown) {
      fetchProjects();
    }
  }, [showProjectDropdown]);

  useEffect(() => {
    onFilterChange(selectedProjects, selectedStatuses);
  }, [selectedProjects, selectedStatuses]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const statusOptions = [
    { value: 'planning', label: 'Planning' },
    { value: 'active', label: 'Active' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const getProjectLabel = () => {
    if (selectedProjects.length === 0) return 'All Projects';
    if (selectedProjects.length === 1) {
      const project = projects.find(p => p.id === selectedProjects[0]);
      return project?.name || 'All Projects';
    }
    return `${selectedProjects.length} Projects`;
  };

  const getStatusLabel = () => {
    if (selectedStatuses.length === 0) return 'All Statuses';
    if (selectedStatuses.length === 1) {
      const status = statusOptions.find(s => s.value === selectedStatuses[0]);
      return status?.label || 'All Statuses';
    }
    return `${selectedStatuses.length} Statuses`;
  };

  const clearProjects = () => {
    setSelectedProjects([]);
  };

  const clearStatuses = () => {
    setSelectedStatuses([]);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-3 lg:px-6 py-2 lg:py-3">
      <div className="flex items-center space-x-2 lg:space-x-3">
        <span className="text-xs lg:text-sm font-medium text-gray-700 flex-shrink-0">Filters:</span>

        {/* Project Multi-Select */}
        <div className="relative" ref={projectDropdownRef} style={{ zIndex: 100 }}>
          <button
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            className="flex items-center space-x-1 lg:space-x-2 px-2 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors bg-white min-w-[120px] lg:min-w-[200px] justify-between"
          >
            <span className="text-xs lg:text-sm text-gray-700 truncate">{getProjectLabel()}</span>
            <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />
          </button>

          {showProjectDropdown && (
            <div
              className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-hidden flex flex-col"
              style={{ zIndex: 9999 }}
            >
              <div className="p-3 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                <div className="p-2">
                  <button
                    onClick={clearProjects}
                    className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    Clear Selection (Show All)
                  </button>
                </div>

                {filteredProjects.map(project => (
                  <label
                    key={project.id}
                    className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.id)}
                      onChange={() => toggleProject(project.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 flex-1">{project.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      project.status === 'active' ? 'bg-green-100 text-green-700' :
                      project.status === 'planning' ? 'bg-blue-100 text-blue-700' :
                      project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-700' :
                      project.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {project.status}
                    </span>
                  </label>
                ))}

                {filteredProjects.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    No projects found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status Multi-Select */}
        <div className="relative" ref={statusDropdownRef} style={{ zIndex: 100 }}>
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="flex items-center space-x-1 lg:space-x-2 px-2 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors bg-white min-w-[100px] lg:min-w-[160px] justify-between"
          >
            <span className="text-xs lg:text-sm text-gray-700 truncate">{getStatusLabel()}</span>
            <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />
          </button>

          {showStatusDropdown && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200" style={{ zIndex: 9999 }}>
              <div className="p-2">
                <button
                  onClick={clearStatuses}
                  className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  Clear Selection (Show All)
                </button>
              </div>

              {statusOptions.map(status => (
                <label
                  key={status.value}
                  className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(status.value)}
                    onChange={() => toggleStatus(status.value)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{status.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Active Filters Display */}
        {(selectedProjects.length > 0 || selectedStatuses.length > 0) && (
          <div className="flex items-center space-x-1 lg:space-x-2 ml-2 lg:ml-4">
            {selectedProjects.length > 0 && (
              <button
                onClick={clearProjects}
                className="flex items-center space-x-1 px-1.5 lg:px-2 py-0.5 lg:py-1 bg-blue-50 text-blue-700 rounded text-[10px] lg:text-xs hover:bg-blue-100 transition-colors flex-shrink-0"
              >
                <span className="hidden sm:inline">{selectedProjects.length} Project{selectedProjects.length > 1 ? 's' : ''}</span>
                <span className="sm:hidden">{selectedProjects.length}</span>
                <X size={10} />
              </button>
            )}
            {selectedStatuses.length > 0 && (
              <button
                onClick={clearStatuses}
                className="flex items-center space-x-1 px-1.5 lg:px-2 py-0.5 lg:py-1 bg-green-50 text-green-700 rounded text-[10px] lg:text-xs hover:bg-green-100 transition-colors flex-shrink-0"
              >
                <span className="hidden sm:inline">{selectedStatuses.length} Status{selectedStatuses.length > 1 ? 'es' : ''}</span>
                <span className="sm:hidden">{selectedStatuses.length}</span>
                <X size={10} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
