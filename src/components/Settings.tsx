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

  return (
    <div className="flex h-full -m-4 lg:-m-6">
      {/* Side Panel */}
      <aside
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        className={`${
          sidebarExpanded ? 'w-64' : 'w-20'
        } bg-gray-800 text-white flex flex-col transition-all duration-300`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-center px-4 border-b border-gray-700">
          {sidebarExpanded ? (
            <div className="flex items-center space-x-2">
              <SettingsIcon size={24} className="text-gray-400 flex-shrink-0" />
              <div>
                <h2 className="text-base font-semibold text-white">Settings</h2>
                <p className="text-xs text-gray-400">System Configuration</p>
              </div>
            </div>
          ) : (
            <SettingsIcon size={24} className="text-gray-400" />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {submodules.map((submodule) => {
            const Icon = submodule.icon;
            const isActive = activeSubmodule === submodule.id;
            return (
              <button
                key={submodule.id}
                onClick={() => setActiveSubmodule(submodule.id)}
                className={`w-full group flex items-center px-3 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarExpanded && (
                  <>
                    <div className="ml-3 flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium">{submodule.name}</p>
                      <p className={`text-xs mt-0.5 ${
                        isActive ? 'text-gray-300' : 'text-gray-500 group-hover:text-gray-400'
                      }`}>
                        {submodule.description}
                      </p>
                    </div>
                    <ChevronRight
                      size={16}
                      className={`flex-shrink-0 ml-2 transition-opacity ${
                        isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                      }`}
                    />
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Info */}
        {sidebarExpanded && (
          <div className="p-4 border-t border-gray-700">
            <div className="text-xs text-gray-500">
              <p className="font-medium text-gray-400 mb-1">Active Submodules</p>
              <p>{submodules.length} available</p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-4 lg:p-6">
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
