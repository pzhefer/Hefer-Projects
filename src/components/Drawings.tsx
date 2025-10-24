import { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Filter, FileText, Download, Eye, Trash2, Upload, Calendar,
  CheckCircle, AlertCircle, Clock, XCircle, Package, Folder, FolderOpen,
  Tag, GitBranch, MessageSquare, Edit, RefreshCw, Grid, List, Image as ImageIcon, ChevronDown, X
} from 'lucide-react';
import { supabase, type DrawingSheet, type DrawingVersion, type DrawingSet, type DrawingTag, type DrawingIssue, type Project } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import EnhancedDrawingViewer from './EnhancedDrawingViewer';
import DrawingSheetUploadModal from './DrawingSheetUploadModal';
import DrawingSetManager from './DrawingSetManager';
import DrawingEditModal from './DrawingEditModal';
import DeleteConfirmModal from './DeleteConfirmModal';

interface DrawingsProps {
  globalSelectedProjects?: string[];
  globalSelectedStatuses?: string[];
}

export default function Drawings({ globalSelectedProjects = [], globalSelectedStatuses = [] }: DrawingsProps = {}) {
  const { user } = useAuth();
  const [sheets, setSheets] = useState<(DrawingSheet & { version?: DrawingVersion; tags?: DrawingTag[]; issues?: DrawingIssue[] })[]>([]);
  const [sets, setSets] = useState<DrawingSet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<DrawingTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDiscipline, setFilterDiscipline] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSet, setFilterSet] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [selectedSheet, setSelectedSheet] = useState<DrawingSheet | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSetManager, setShowSetManager] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSheet, setEditingSheet] = useState<DrawingSheet | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [showGroupByDropdown, setShowGroupByDropdown] = useState(false);
  const groupByRef = useRef<HTMLDivElement>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchSets();
    fetchSheets();
    fetchTags();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (groupByRef.current && !groupByRef.current.contains(event.target as Node)) {
        setShowGroupByDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleGroupBy = (value: string) => {
    setGroupBy(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

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

  const fetchSets = async () => {
    try {
      const { data, error } = await supabase
        .from('drawing_sets')
        .select('*')
        .order('project_id, level, display_order, name');

      if (error) throw error;
      setSets(data || []);
    } catch (error) {
      console.error('Error fetching drawing sets:', error);
    }
  };

  const fetchSheets = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel using Promise.all
      const [sheetsResult, versionsResult, issuesResult, sheetTagsResult, allTagsResult] = await Promise.all([
        supabase
          .from('drawing_sheets')
          .select('*')
          .order('display_order, sheet_number'),
        supabase
          .from('drawing_versions')
          .select('*'),
        supabase
          .from('drawing_issues')
          .select('*')
          .eq('status', 'open'),
        supabase
          .from('drawing_sheet_tags')
          .select('*'),
        supabase
          .from('drawing_tags')
          .select('*')
      ]);

      if (sheetsResult.error) throw sheetsResult.error;

      const sheetsData = sheetsResult.data || [];
      const versionsMap = new Map((versionsResult.data || []).map(v => [v.id, v]));
      const issuesMap = new Map<string, any[]>();
      (issuesResult.data || []).forEach(issue => {
        if (!issuesMap.has(issue.sheet_id)) {
          issuesMap.set(issue.sheet_id, []);
        }
        issuesMap.get(issue.sheet_id)!.push(issue);
      });
      const sheetTagsMap = new Map<string, string[]>();
      (sheetTagsResult.data || []).forEach(st => {
        if (!sheetTagsMap.has(st.sheet_id)) {
          sheetTagsMap.set(st.sheet_id, []);
        }
        sheetTagsMap.get(st.sheet_id)!.push(st.tag_id);
      });
      const tagsMap = new Map((allTagsResult.data || []).map(t => [t.id, t]));

      // Combine data using lookups instead of queries
      const sheetsWithDetails = sheetsData.map((sheet: DrawingSheet) => {
        const version = sheet.current_version_id ? versionsMap.get(sheet.current_version_id) : null;
        const issues = issuesMap.get(sheet.id) || [];
        const tagIds = sheetTagsMap.get(sheet.id) || [];
        const sheetTagObjects = tagIds.map(id => tagsMap.get(id)).filter(Boolean) as DrawingTag[];

        return {
          ...sheet,
          version,
          issues,
          tags: sheetTagObjects
        };
      });

      setSheets(sheetsWithDetails);
    } catch (error) {
      console.error('Error fetching drawing sheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('drawing_tags')
        .select('*')
        .order('name');

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleDeleteSheet = async () => {
    if (!deleteConfirm) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('drawing_sheets')
        .delete()
        .eq('id', deleteConfirm.id);

      if (error) throw error;
      setSheets(sheets.filter(s => s.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting sheet:', error);
      alert('Failed to delete drawing sheet');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSetExpanded = (setId: string) => {
    const newExpanded = new Set(expandedSets);
    if (newExpanded.has(setId)) {
      newExpanded.delete(setId);
    } else {
      newExpanded.add(setId);
    }
    setExpandedSets(newExpanded);
  };

  const filteredSheets = sheets.filter(sheet => {
    const matchesSearch =
      sheet.sheet_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.sheet_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.discipline.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGlobalProject = globalSelectedProjects.length === 0 || globalSelectedProjects.includes(sheet.project_id);
    const project = projects.find(p => p.id === sheet.project_id);
    const matchesGlobalStatus = globalSelectedStatuses.length === 0 || (project && globalSelectedStatuses.includes(project.status));

    const matchesDiscipline = filterDiscipline === 'all' || sheet.discipline === filterDiscipline;
    const matchesStatus = filterStatus === 'all' || sheet.status === filterStatus;
    const matchesSet = filterSet === 'all' || sheet.set_id === filterSet;
    const matchesTag = filterTag === 'all' || sheet.tags?.some(t => t.id === filterTag);
    return matchesSearch && matchesGlobalProject && matchesGlobalStatus && matchesDiscipline && matchesStatus && matchesSet && matchesTag;
  });

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const getSetName = (setId: string | null) => {
    if (!setId) return 'Unorganized';
    const set = sets.find(s => s.id === setId);
    return set?.name || 'Unknown Set';
  };

  const getStatusConfig = (status: DrawingSheet['status']) => {
    const configs = {
      draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Clock },
      for_review: { label: 'For Review', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
      approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      superseded: { label: 'Superseded', color: 'bg-red-100 text-red-700', icon: XCircle },
      as_built: { label: 'As-Built', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
    };
    return configs[status];
  };

  const groupedSheets = () => {
    if (groupBy.length === 0) {
      return { 'All Drawings': filteredSheets };
    }

    const groups: { [key: string]: typeof filteredSheets } = {};

    filteredSheets.forEach(sheet => {
      const keys: string[] = [];

      groupBy.forEach(groupType => {
        if (groupType === 'project') {
          keys.push(getProjectName(sheet.project_id));
        } else if (groupType === 'set') {
          keys.push(getSetName(sheet.set_id));
        } else if (groupType === 'status') {
          keys.push(getStatusConfig(sheet.status).label);
        } else if (groupType === 'discipline') {
          keys.push(sheet.discipline || 'No Discipline');
        } else if (groupType === 'tag') {
          if (sheet.tags && sheet.tags.length > 0) {
            sheet.tags.forEach(tag => {
              const groupKey = [...keys, tag.name].join(' > ');
              if (!groups[groupKey]) groups[groupKey] = [];
              groups[groupKey].push(sheet);
            });
            return;
          } else {
            keys.push('No Tags');
          }
        }
      });

      const groupKey = keys.join(' > ');
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(sheet);
    });

    return groups;
  };

  const sheetsToDisplay = groupedSheets();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const disciplines = [...new Set(sheets.map(s => s.discipline))];

  const stats = {
    total: sheets.length,
    draft: sheets.filter(s => s.status === 'draft').length,
    forReview: sheets.filter(s => s.status === 'for_review').length,
    approved: sheets.filter(s => s.status === 'approved').length,
    asBuilt: sheets.filter(s => s.status === 'as_built').length,
    openIssues: sheets.reduce((sum, s) => sum + (s.issues?.length || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading drawings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-end gap-4">
        <div className="flex items-center space-x-2 lg:space-x-3">
          <button
            onClick={() => {
              if (projects.length > 0) {
                setSelectedProject(projects[0]);
                setShowSetManager(true);
              } else {
                alert('Please create a project first');
              }
            }}
            className="flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 px-3 lg:px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <Folder size={18} />
            <span>Manage Sets</span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-3 lg:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus size={18} />
            <span>Upload</span>
          </button>
        </div>
      </div>

      <div className="flex gap-2 lg:gap-3 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`flex-shrink-0 rounded-lg border p-2 lg:p-3 transition-all ${
            filterStatus === 'all'
              ? 'bg-gray-900 border-gray-900 text-white shadow-lg'
              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <Package className={filterStatus === 'all' ? 'text-white' : 'text-gray-400'} size={18} />
            <div className="text-left">
              <p className={`text-xs whitespace-nowrap ${filterStatus === 'all' ? 'text-gray-300' : 'text-gray-600'}`}>Total</p>
              <p className={`text-lg lg:text-xl font-bold ${filterStatus === 'all' ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => setFilterStatus(filterStatus === 'draft' ? 'all' : 'draft')}
          className={`flex-shrink-0 rounded-lg border p-2 lg:p-3 transition-all ${
            filterStatus === 'draft'
              ? 'bg-gray-600 border-gray-600 text-white shadow-lg'
              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <Clock className={filterStatus === 'draft' ? 'text-white' : 'text-gray-400'} size={18} />
            <div className="text-left">
              <p className={`text-xs whitespace-nowrap ${filterStatus === 'draft' ? 'text-gray-200' : 'text-gray-600'}`}>Draft</p>
              <p className={`text-lg lg:text-xl font-bold ${filterStatus === 'draft' ? 'text-white' : 'text-gray-600'}`}>{stats.draft}</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => setFilterStatus(filterStatus === 'for_review' ? 'all' : 'for_review')}
          className={`flex-shrink-0 rounded-lg border p-2 lg:p-3 transition-all ${
            filterStatus === 'for_review'
              ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <AlertCircle className={filterStatus === 'for_review' ? 'text-white' : 'text-blue-400'} size={18} />
            <div className="text-left">
              <p className={`text-xs whitespace-nowrap ${filterStatus === 'for_review' ? 'text-blue-100' : 'text-gray-600'}`}>For Review</p>
              <p className={`text-lg lg:text-xl font-bold ${filterStatus === 'for_review' ? 'text-white' : 'text-blue-600'}`}>{stats.forReview}</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => setFilterStatus(filterStatus === 'approved' ? 'all' : 'approved')}
          className={`flex-shrink-0 rounded-lg border p-2 lg:p-3 transition-all ${
            filterStatus === 'approved'
              ? 'bg-green-600 border-green-600 text-white shadow-lg'
              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <CheckCircle className={filterStatus === 'approved' ? 'text-white' : 'text-green-400'} size={18} />
            <div className="text-left">
              <p className={`text-xs whitespace-nowrap ${filterStatus === 'approved' ? 'text-green-100' : 'text-gray-600'}`}>Approved</p>
              <p className={`text-lg lg:text-xl font-bold ${filterStatus === 'approved' ? 'text-white' : 'text-green-600'}`}>{stats.approved}</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => setFilterStatus(filterStatus === 'as_built' ? 'all' : 'as_built')}
          className={`flex-shrink-0 rounded-lg border p-2 lg:p-3 transition-all ${
            filterStatus === 'as_built'
              ? 'bg-purple-600 border-purple-600 text-white shadow-lg'
              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <Edit className={filterStatus === 'as_built' ? 'text-white' : 'text-purple-400'} size={18} />
            <div className="text-left">
              <p className={`text-xs whitespace-nowrap ${filterStatus === 'as_built' ? 'text-purple-100' : 'text-gray-600'}`}>As-Built</p>
              <p className={`text-lg lg:text-xl font-bold ${filterStatus === 'as_built' ? 'text-white' : 'text-purple-600'}`}>{stats.asBuilt}</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => {
            // Toggle filter for sheets with open issues
            // This would need additional logic to filter by issue count
          }}
          className="flex-shrink-0 bg-white rounded-lg border border-gray-200 p-2 lg:p-3 hover:border-gray-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <MessageSquare className="text-red-400" size={18} />
            <div className="text-left">
              <p className="text-xs text-gray-600 whitespace-nowrap">Open Issues</p>
              <p className="text-lg lg:text-xl font-bold text-red-600">{stats.openIssues}</p>
            </div>
          </div>
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3 lg:p-4">
        <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 gap-3 lg:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search drawings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:gap-3">
            <select
              value={filterSet}
              onChange={(e) => setFilterSet(e.target.value)}
              className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Sets</option>
              {sets.map(set => (
                <option key={set.id} value={set.id}>{set.name}</option>
              ))}
            </select>
            <select
              value={filterDiscipline}
              onChange={(e) => setFilterDiscipline(e.target.value)}
              className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Disciplines</option>
              {disciplines.map(discipline => (
                <option key={discipline} value={discipline}>{discipline}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="for_review">For Review</option>
              <option value="approved">Approved</option>
              <option value="superseded">Superseded</option>
              <option value="as_built">As-Built</option>
            </select>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Tags</option>
              {tags.map(tag => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>

            <div ref={groupByRef} className="relative">
              <button
                onClick={() => setShowGroupByDropdown(!showGroupByDropdown)}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm whitespace-nowrap"
              >
                <Filter size={16} />
                <span>Group by</span>
                {groupBy.length > 0 && (
                  <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                    {groupBy.length}
                  </span>
                )}
                <ChevronDown size={16} className={`transition-transform ${showGroupByDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showGroupByDropdown && (
                <div className="absolute left-0 right-0 sm:left-auto sm:right-0 mt-2 sm:w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-2">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                      <span className="text-sm font-semibold text-gray-700">Group By</span>
                      {groupBy.length > 0 && (
                        <button
                          onClick={() => setGroupBy([])}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="py-1">
                      {[
                        { value: 'project', label: 'Project' },
                        { value: 'set', label: 'Drawing Set' },
                        { value: 'status', label: 'Status' },
                        { value: 'discipline', label: 'Discipline' },
                        { value: 'tag', label: 'Tag' }
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => toggleGroupBy(option.value)}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 text-sm text-left"
                        >
                          <span className="text-gray-700">{option.label}</span>
                          {groupBy.includes(option.value) && (
                            <CheckCircle size={16} className="text-blue-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                title="Grid View"
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                title="List View"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {filteredSheets.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Package className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No drawing sheets found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterProject !== 'all' || filterDiscipline !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by uploading your first drawing sheet'}
          </p>
          {!searchTerm && filterProject === 'all' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              <span>Upload Drawing</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(sheetsToDisplay).map(([groupName, groupSheets]) => (
            <div key={groupName}>
              {groupBy.length > 0 && (
                <div className="flex items-center space-x-2 mb-3">
                  <Folder className="text-gray-500" size={20} />
                  <h3 className="text-lg font-semibold text-gray-900">{groupName}</h3>
                  <span className="text-sm text-gray-500">({groupSheets.length})</span>
                </div>
              )}
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3' : 'space-y-2'}>
                {groupSheets.map((sheet) => {
            const statusConfig = getStatusConfig(sheet.status);
            const StatusIcon = statusConfig.icon;
            const hasIssues = (sheet.issues?.length || 0) > 0;
            const isExpanded = expandedCard === sheet.id;

            return (
              <div
                key={sheet.id}
                className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all overflow-hidden"
              >
                <div className="p-3">
                  <div
                    onClick={() => setExpandedCard(isExpanded ? null : sheet.id)}
                    className="cursor-pointer hover:bg-gray-50 -m-3 p-3 rounded-t-lg"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <FileText className="text-blue-600 flex-shrink-0" size={16} />
                        <span className="text-xs font-mono font-semibold text-gray-900 truncate">
                          {sheet.sheet_number}
                        </span>
                        {sheet.version && (
                          <span className="text-xs text-gray-500 flex-shrink-0">Rev {sheet.version.version_number}</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <StatusIcon className={statusConfig.color.includes('green') ? 'text-green-600' : statusConfig.color.includes('yellow') ? 'text-yellow-600' : statusConfig.color.includes('red') ? 'text-red-600' : 'text-gray-600'} size={14} />
                        <span className={`text-xs font-medium ${statusConfig.color.includes('green') ? 'text-green-600' : statusConfig.color.includes('yellow') ? 'text-yellow-600' : statusConfig.color.includes('red') ? 'text-red-600' : 'text-gray-600'}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{sheet.sheet_name}</h3>
                    <p className="text-xs text-gray-500 truncate">{getProjectName(sheet.project_id)}</p>
                  </div>

                  <div className="flex items-center space-x-1 mt-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSheet(sheet);
                      }}
                      className="flex items-center justify-center p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                      title="View & Markup"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSheet(sheet);
                        setShowEditModal(true);
                      }}
                      className="flex items-center justify-center p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      title="Edit"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      title="New Version"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({ id: sheet.id, name: `${sheet.sheet_number} - ${sheet.sheet_name}` });
                      }}
                      className="flex items-center justify-center p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors ml-auto"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-200 p-3 space-y-3 bg-gray-50">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        <StatusIcon size={12} />
                        <span>{statusConfig.label}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {sheet.discipline}
                      </span>
                      {sheet.set_id && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 flex items-center">
                          <Folder size={10} className="mr-1" />
                          {getSetName(sheet.set_id)}
                        </span>
                      )}
                      {hasIssues && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 flex items-center">
                          <MessageSquare size={10} className="mr-1" />
                          {sheet.issues?.length}
                        </span>
                      )}
                    </div>

                    {sheet.tags && sheet.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {sheet.tags.map(tag => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs"
                            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                          >
                            <Tag size={10} />
                            <span>{tag.name}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {sheet.version && (
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <p className="truncate">
                          <span className="font-medium">File:</span> {sheet.version.file_name}
                        </p>
                        <p>
                          <span className="font-medium">Size:</span> {formatFileSize(sheet.version.file_size)} • <span className="font-medium">Updated:</span> {formatDate(sheet.version.created_at)}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center space-x-1.5 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSheet(sheet);
                        }}
                        className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs"
                      >
                        <Eye size={14} />
                        <span className="hidden sm:inline">View</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSheet(sheet);
                          setShowEditModal(true);
                        }}
                        className="flex items-center justify-center px-2 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center px-2 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        title="New Version"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ id: sheet.id, name: `${sheet.sheet_number} - ${sheet.sheet_name}` });
                        }}
                        className="flex items-center justify-center px-2 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSheet && selectedSheet.version && (
        <EnhancedDrawingViewer
          sheet={selectedSheet}
          version={selectedSheet.version}
          onClose={() => setSelectedSheet(null)}
          onUpdate={fetchSheets}
        />
      )}

      {showUploadModal && (
        <DrawingSheetUploadModal
          projects={projects}
          sets={sets}
          onClose={() => setShowUploadModal(false)}
          onDrawingUploaded={() => {
            fetchSheets();
            setShowUploadModal(false);
          }}
        />
      )}

      {showSetManager && selectedProject && (
        <DrawingSetManager
          project={selectedProject}
          onClose={() => setShowSetManager(false)}
          onSetCreated={() => {
            fetchSets();
          }}
        />
      )}

      {showEditModal && editingSheet && (
        <DrawingEditModal
          sheet={editingSheet}
          sets={sets}
          onClose={() => {
            setShowEditModal(false);
            setEditingSheet(null);
          }}
          onUpdated={() => {
            fetchSheets();
            setShowEditModal(false);
            setEditingSheet(null);
          }}
        />
      )}

      {deleteConfirm && (
        <DeleteConfirmModal
          title="Delete Drawing Sheet?"
          message={`Are you sure you want to delete "${deleteConfirm.name}"? This will delete all versions and markups.`}
          onConfirm={handleDeleteSheet}
          onCancel={() => setDeleteConfirm(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
