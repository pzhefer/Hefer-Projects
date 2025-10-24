import { useState, useEffect } from 'react';
import { Plus, Search, Filter, FolderKanban, Calendar, DollarSign, TrendingUp, AlertCircle, Clock, CheckCircle, XCircle, Pause, Edit, Trash2, MapPin } from 'lucide-react';
import { supabase, type Project } from '../lib/supabase';
import NewProjectModal from './NewProjectModal';
import EditProjectModal from './EditProjectModal';
import ProjectLocationManager from './ProjectLocationManager';
import DeleteConfirmModal from './DeleteConfirmModal';
import { StatCard, Button, SearchInput, LoadingSpinner } from './shared/UIComponents';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterHealth, setFilterHealth] = useState<string>('all');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showLocationManager, setShowLocationManager] = useState(false);
  const [selectedProjectForLocations, setSelectedProjectForLocations] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteConfirm) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', deleteConfirm.id);

      if (error) throw error;
      setProjects(projects.filter(p => p.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
    const matchesHealth = filterHealth === 'all' || project.health === filterHealth;
    return matchesSearch && matchesStatus && matchesHealth;
  });

  const getStatusConfig = (status: Project['status']) => {
    const configs = {
      planning: { label: 'Planning', color: 'bg-gray-100 text-gray-700', icon: Clock },
      active: { label: 'Active', color: 'bg-blue-100 text-blue-700', icon: TrendingUp },
      on_hold: { label: 'On Hold', color: 'bg-yellow-100 text-yellow-700', icon: Pause },
      completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
    };
    return configs[status];
  };

  const getHealthConfig = (health: Project['health']) => {
    const configs = {
      good: { label: 'On Track', color: 'text-green-600', bgColor: 'bg-green-50', border: 'border-green-200' },
      at_risk: { label: 'At Risk', color: 'text-yellow-600', bgColor: 'bg-yellow-50', border: 'border-yellow-200' },
      poor: { label: 'Delayed', color: 'text-red-600', bgColor: 'bg-red-50', border: 'border-red-200' },
    };
    return configs[health];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    planning: projects.filter(p => p.status === 'planning').length,
    atRisk: projects.filter(p => p.health === 'at_risk' || p.health === 'poor').length,
    totalBudget: projects.reduce((sum, p) => sum + Number(p.budget), 0),
  };

  if (loading) {
    return <LoadingSpinner message="Loading projects..." />;
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="hidden lg:block">
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Projects</h2>
          <p className="text-sm lg:text-base text-gray-600 mt-1">Manage and track your construction projects</p>
        </div>
        <Button
          onClick={() => setShowNewProjectModal(true)}
          icon={Plus}
          variant="primary"
          className="ml-auto"
        >
          <span className="hidden sm:inline">New Project</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 lg:gap-4">
        <StatCard label="Total Projects" value={stats.total} icon={FolderKanban} />
        <StatCard
          label="Active"
          value={stats.active}
          icon={TrendingUp}
          iconColor="text-blue-400"
          valueColor="text-blue-600"
        />
        <StatCard label="Planning" value={stats.planning} icon={Clock} />
        <StatCard
          label="At Risk"
          value={stats.atRisk}
          icon={AlertCircle}
          iconColor="text-red-400"
          valueColor="text-red-600"
        />
        <StatCard
          label="Total Budget"
          value={formatCurrency(stats.totalBudget)}
          icon={DollarSign}
          iconColor="text-green-400"
          valueColor="text-green-600"
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 lg:p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 gap-3 lg:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filterHealth}
              onChange={(e) => setFilterHealth(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Health</option>
              <option value="good">On Track</option>
              <option value="at_risk">At Risk</option>
              <option value="poor">Delayed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid/List */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FolderKanban className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterStatus !== 'all' || filterHealth !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first project'}
          </p>
          {!searchTerm && filterStatus === 'all' && filterHealth === 'all' && (
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              <span>Create Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3' : 'space-y-2'}>
          {filteredProjects.map((project) => {
            const statusConfig = getStatusConfig(project.status);
            const healthConfig = getHealthConfig(project.health);
            const StatusIcon = statusConfig.icon;
            const budgetUsed = (Number(project.spent) / Number(project.budget)) * 100;
            const isExpanded = expandedCard === project.id;

            return (
              <div
                key={project.id}
                className={`bg-white rounded-lg border ${healthConfig.border} hover:shadow-md transition-all overflow-hidden`}
              >
                <div className="p-3">
                  <div
                    onClick={() => setExpandedCard(isExpanded ? null : project.id)}
                    className="cursor-pointer hover:bg-gray-50 -m-3 p-3 rounded-t-lg"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <FolderKanban className="text-blue-600 flex-shrink-0" size={16} />
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{project.name}</h3>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${healthConfig.color} ${healthConfig.bgColor} flex-shrink-0 ml-2`}>
                        {healthConfig.label === 'On Track' ? '✓' : healthConfig.label === 'At Risk' ? '!' : '×'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-1">{project.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center">
                        <Calendar size={10} className="mr-1" />
                        {formatDate(project.start_date)}
                      </span>
                      <span>{project.progress}%</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 mt-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProject(project);
                        setShowEditModal(true);
                      }}
                      className="flex items-center justify-center p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      title="Edit"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProjectForLocations(project);
                        setShowLocationManager(true);
                      }}
                      className="flex items-center justify-center p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                      title="Manage Locations"
                    >
                      <MapPin size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({ id: project.id, name: project.name });
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
                    <div className="flex items-center space-x-1.5">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        <StatusIcon size={12} />
                        <span>{statusConfig.label}</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${healthConfig.color} ${healthConfig.bgColor}`}>
                        {healthConfig.label}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Progress</span>
                        <span className="text-xs font-semibold text-gray-900">{project.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-600">Budget</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(Number(project.budget))}</p>
                        <p className="text-xs text-gray-500">{budgetUsed.toFixed(1)}% used</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Team Size</p>
                        <p className="font-semibold text-gray-900">
                          {project.team_size} {project.team_size === 1 ? 'member' : 'members'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Manager</p>
                        <p className="font-semibold text-gray-900 truncate">{project.project_manager || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Location</p>
                        <p className="font-semibold text-gray-900 truncate">{project.location || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onProjectCreated={() => {
            fetchProjects();
            setShowNewProjectModal(false);
          }}
        />
      )}

      {/* Edit Project Modal */}
      {showEditModal && editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => {
            setShowEditModal(false);
            setEditingProject(null);
          }}
          onProjectUpdated={() => {
            fetchProjects();
            setShowEditModal(false);
            setEditingProject(null);
          }}
        />
      )}

      {/* Project Location Manager */}
      {showLocationManager && selectedProjectForLocations && (
        <ProjectLocationManager
          projectId={selectedProjectForLocations.id}
          projectName={selectedProjectForLocations.name}
          onClose={() => {
            setShowLocationManager(false);
            setSelectedProjectForLocations(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <DeleteConfirmModal
          title="Delete Project?"
          message={`Are you sure you want to delete "${deleteConfirm.name}"? This will delete all associated drawings, photos, and data.`}
          onConfirm={handleDeleteProject}
          onCancel={() => setDeleteConfirm(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
