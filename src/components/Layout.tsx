import {
  Menu, X, Home, FolderKanban, Calendar, FileText, ClipboardCheck,
  AlertTriangle, Camera, Settings, Users, Shield, DollarSign,
  FileCheck, Package, Briefcase, Truck, Wrench, BookOpen, MessageSquare,
  BarChart3, LogOut, User as UserIcon, ChevronDown, CheckSquare, Factory
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import GlobalProjectFilter from './GlobalProjectFilter';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  currentModule: string;
  onNavigate: (page: string) => void;
  onBackToHome: () => void;
  onModuleChange?: (module: string) => void;
  selectedProjects?: string[];
  selectedStatuses?: string[];
  onGlobalFilterChange?: (projects: string[], statuses: string[]) => void;
}

export default function Layout({ children, currentPage, currentModule, onNavigate, onBackToHome, onModuleChange, onGlobalFilterChange }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showModuleSelector, setShowModuleSelector] = useState(false);

  const standaloneModules = ['user-management', 'settings', 'plant', 'stock', 'employees'];
  const isStandaloneModule = standaloneModules.includes(currentModule);

  const navigation = [
    { name: 'Dashboard', icon: Home, page: 'dashboard' },
    { name: 'Projects', icon: FolderKanban, page: 'projects' },
    { name: 'Tasks', icon: CheckSquare, page: 'tasks' },
    { name: 'Schedule', icon: Calendar, page: 'schedule' },
    { name: 'Drawings', icon: FileText, page: 'drawings' },
    { name: 'RFIs', icon: ClipboardCheck, page: 'rfis' },
    { name: 'Submittals', icon: FileCheck, page: 'submittals' },
    { name: 'Changes', icon: AlertTriangle, page: 'changes' },
    { name: 'Inspections', icon: ClipboardCheck, page: 'inspections' },
    { name: 'Snag Lists', icon: AlertTriangle, page: 'snags' },
    { name: 'Health & Safety', icon: Shield, page: 'safety' },
    { name: 'Daily Reports', icon: Briefcase, page: 'reports' },
    { name: 'Documents', icon: BookOpen, page: 'documents' },
    { name: 'Photos', icon: Camera, page: 'photos' },
    { name: 'Financials', icon: DollarSign, page: 'financials' },
    { name: 'Procurement', icon: Truck, page: 'procurement' },
    { name: 'Equipment', icon: Wrench, page: 'equipment' },
    { name: 'Team', icon: Users, page: 'team' },
    { name: 'Reports', icon: BarChart3, page: 'analytics' },
  ];

  const modulesList = [
    { name: 'Projects', icon: FolderKanban, module: 'projects' },
    { name: 'Plant', icon: Factory, module: 'plant' },
    { name: 'Stock', icon: Package, module: 'stock' },
    { name: 'Employees', icon: Users, module: 'employees' },
    { name: 'Settings', icon: Settings, module: 'settings' },
  ];

  const currentModuleInfo = modulesList.find(m => m.module === currentModule) || { name: 'Modules', icon: Home };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {!isStandaloneModule && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Only show for non-standalone modules */}
      {!isStandaloneModule && (
        <aside
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 ${
            sidebarExpanded || sidebarOpen ? 'w-64' : 'lg:w-20 w-64'
          } bg-slate-800 text-white transition-all duration-300 flex flex-col fixed lg:relative h-full z-30`}
        >
        {/* Logo and Toggle */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
          {(sidebarExpanded || sidebarOpen) && (
            <div className="flex items-center space-x-2">
              <img
                src="/Logo & Letter head, Logo large (ID 240).jpg"
                alt="Hefer Projects Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors lg:hidden"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.name}
                onClick={() => {
                  onNavigate(item.page);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-3 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                {(sidebarExpanded || sidebarOpen) && (
                  <span className="ml-3 font-medium">{item.name}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Settings at bottom */}
        <div className="px-3 py-4 border-t border-slate-700">
          <a
            href="#"
            className="flex items-center px-3 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <Settings size={20} className="flex-shrink-0" />
            {(sidebarExpanded || sidebarOpen) && (
              <span className="ml-3 font-medium">Settings</span>
            )}
          </a>
        </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full lg:w-auto">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center space-x-2 lg:space-x-4 min-w-0 flex-1">
            {/* Mobile Menu Button - Only show for non-standalone modules */}
            {!isStandaloneModule && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <Menu size={20} />
              </button>
            )}

            {/* Module Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowModuleSelector(!showModuleSelector)}
                className="flex items-center space-x-2 px-2 lg:px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                {(() => {
                  const Icon = currentModuleInfo.icon;
                  return <Icon size={20} />;
                })()}
                <span className="text-sm font-medium hidden sm:inline">{currentModuleInfo.name}</span>
                <ChevronDown size={16} className={`transition-transform ${showModuleSelector ? 'rotate-180' : ''}`} />
              </button>

              {showModuleSelector && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowModuleSelector(false)}
                  />
                  <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20 max-h-96 overflow-y-auto">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Switch Module</p>
                    </div>
                    <button
                      onClick={() => {
                        onBackToHome();
                        setShowModuleSelector(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Home size={18} />
                      <span>All Modules</span>
                    </button>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      {modulesList.map((module) => {
                        const Icon = module.icon;
                        const isActive = currentModule === module.module;
                        return (
                          <button
                            key={module.module}
                            onClick={() => {
                              if (onModuleChange) {
                                onModuleChange(module.module);
                              }
                              setShowModuleSelector(false);
                            }}
                            className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
                              isActive
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Icon size={18} />
                            <span>{module.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
            {!isStandaloneModule && (
              <>
                <span className="text-gray-300 hidden sm:inline">|</span>
                <h2 className="text-base lg:text-xl font-semibold text-gray-800 capitalize truncate">{currentModule} - {currentPage}</h2>
              </>
            )}
            {isStandaloneModule && (
              <>
                <span className="text-gray-300 hidden sm:inline">|</span>
                <h2 className="text-base lg:text-xl font-semibold text-gray-800 capitalize truncate">{currentModule.replace('-', ' ')}</h2>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2 lg:space-x-4 flex-shrink-0">
            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 lg:space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
              >
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium text-gray-700">{profile?.full_name || 'User'}</p>
                  <p className="text-xs text-gray-500">{profile?.job_title || profile?.role.replace('_', ' ') || 'Member'}</p>
                </div>
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                  {profile?.full_name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </div>
                <ChevronDown size={16} className={`text-gray-500 transition-transform hidden lg:block ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                      <p className="text-xs text-gray-500">{profile?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        onNavigate('profile');
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <UserIcon size={16} />
                      <span>Profile Settings</span>
                    </button>
                    <button
                      onClick={() => {
                        onNavigate('settings');
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <button
                        onClick={() => {
                          signOut();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Global Project Filter - Only show for non-standalone modules */}
        {!isStandaloneModule && onGlobalFilterChange && (
          <GlobalProjectFilter onFilterChange={onGlobalFilterChange} />
        )}

        {/* Page Content */}
        <main className={`flex-1 bg-gray-50 ${isStandaloneModule ? 'overflow-hidden' : 'overflow-y-auto p-4 lg:p-6'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
