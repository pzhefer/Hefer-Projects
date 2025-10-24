import { useState } from 'react';
import {
  Users,
  Shield,
  Building2,
  FolderKanban,
  Settings as SettingsIcon,
  List,
  FileText,
  ChevronRight,
  MapPin,
  Ruler
} from 'lucide-react';
import UserManagement from './UserManagement';
import ProjectSettings from './ProjectSettings';
import LocationMasterData from './LocationMasterData';
import UnitOfMeasureManager from './UnitOfMeasureManager';

type SettingsSubmodule =
  | 'users'
  | 'roles_permissions'
  | 'company_settings'
  | 'project_settings'
  | 'system_preferences'
  | 'departments'
  | 'locations'
  | 'units_of_measure'
  | 'audit_logs';

export default function Settings() {
  const [activeSubmodule, setActiveSubmodule] = useState<SettingsSubmodule>('users');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const submodules = [
    {
      id: 'users' as SettingsSubmodule,
      name: 'User Management',
      icon: Users,
      description: 'Manage users and their access'
    },
    {
      id: 'roles_permissions' as SettingsSubmodule,
      name: 'Roles & Permissions',
      icon: Shield,
      description: 'Configure roles and their permissions'
    },
    {
      id: 'company_settings' as SettingsSubmodule,
      name: 'Company Settings',
      icon: Building2,
      description: 'Company information and branding'
    },
    {
      id: 'project_settings' as SettingsSubmodule,
      name: 'Project Settings',
      icon: FolderKanban,
      description: 'Configure project defaults and templates'
    },
    {
      id: 'system_preferences' as SettingsSubmodule,
      name: 'System Preferences',
      icon: SettingsIcon,
      description: 'System-wide preferences and formats'
    },
    {
      id: 'departments' as SettingsSubmodule,
      name: 'Departments',
      icon: List,
      description: 'Manage organizational departments'
    },
    {
      id: 'locations' as SettingsSubmodule,
      name: 'Locations',
      icon: MapPin,
      description: 'Manage countries, states, and cities'
    },
    {
      id: 'units_of_measure' as SettingsSubmodule,
      name: 'Units of Measure',
      icon: Ruler,
      description: 'Manage measurement units'
    },
    {
      id: 'audit_logs' as SettingsSubmodule,
      name: 'Audit Logs',
      icon: FileText,
      description: 'View system activity and changes'
    }
  ];

  const renderSubmoduleContent = () => {
    switch (activeSubmodule) {
      case 'users':
        return <UserManagement />;
      case 'roles_permissions':
        return <PlaceholderContent title="Roles & Permissions" />;
      case 'company_settings':
        return <PlaceholderContent title="Company Settings" />;
      case 'project_settings':
        return <ProjectSettings />;
      case 'system_preferences':
        return <PlaceholderContent title="System Preferences" />;
      case 'departments':
        return <PlaceholderContent title="Departments" />;
      case 'locations':
        return <LocationMasterData />;
      case 'units_of_measure':
        return <UnitOfMeasureManager />;
      case 'audit_logs':
        return <PlaceholderContent title="Audit Logs" />;
      default:
        return <PlaceholderContent title="Settings" />;
    }
  };

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const navigation = submodules.map(sub => ({
    id: sub.id,
    name: sub.name,
    icon: sub.icon
  }));

  return (
    <div className="flex h-full -m-4 lg:-m-6">
      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Side Panel */}
      <aside
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        className={`${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${
          sidebarExpanded ? 'w-64' : 'lg:w-20 w-64'
        } bg-gray-900 text-white flex flex-col transition-all duration-300 flex-shrink-0 fixed lg:relative h-full z-50`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-center px-4 border-b border-gray-800">
          {sidebarExpanded ? (
            <div className="flex items-center space-x-2">
              <SettingsIcon size={20} className="text-gray-400 flex-shrink-0" />
              <div>
                <h2 className="text-base font-semibold text-white">Settings</h2>
                <p className="text-xs text-gray-400">System Configuration</p>
              </div>
            </div>
          ) : (
            <SettingsIcon size={20} className="text-gray-400" />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-1">
          {submodules.map((submodule) => {
            const Icon = submodule.icon;
            const isActive = activeSubmodule === submodule.id;
            return (
              <button
                key={submodule.id}
                onClick={() => {
                  setActiveSubmodule(submodule.id);
                  if (window.innerWidth < 1024) setMobileSidebarOpen(false);
                }}
                className={`w-full group flex items-center px-4 py-3 transition-colors ${
                  isActive
                    ? 'bg-gray-800 text-white border-l-4 border-gray-500'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarExpanded && (
                  <div className="ml-3 flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium whitespace-nowrap">{submodule.name}</p>
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <SettingsIcon size={20} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {submodules.find(s => s.id === activeSubmodule)?.name || 'Settings'}
          </h1>
          <div className="w-10"></div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {renderSubmoduleContent()}
        </div>
      </div>
    </div>
  );
}

function PlaceholderContent({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <SettingsIcon size={32} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">This feature is coming soon.</p>
      </div>
    </div>
  );
}
