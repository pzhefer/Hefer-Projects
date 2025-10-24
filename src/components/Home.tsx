import { Building2, Factory, Package, Users, LogOut, User as UserIcon, Lock, Shield, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { canAccessModule } from '../lib/permissions';

interface HomeProps {
  onSelectModule: (module: string) => void;
}

export default function Home({ onSelectModule }: HomeProps) {
  const { user, profile, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const modules = [
    {
      id: 'projects',
      name: 'Projects',
      description: 'Manage construction projects, timelines, and milestones',
      icon: Building2,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
    },
    {
      id: 'plant',
      name: 'Plant',
      description: 'Track machinery, equipment, and maintenance schedules',
      icon: Factory,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
    },
    {
      id: 'stock',
      name: 'Stock',
      description: 'Monitor inventory, materials, and supply chain',
      icon: Package,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
    },
    {
      id: 'employees',
      name: 'Employees',
      description: 'Manage team members, roles, and permissions',
      icon: Users,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
    },
    {
      id: 'settings',
      name: 'Settings',
      description: 'Configure system settings and preferences',
      icon: SettingsIcon,
      color: 'bg-gray-600',
      hoverColor: 'hover:bg-gray-700',
    },
  ];

  useEffect(() => {
    async function checkModuleAccess() {
      if (!user) return;

      const access: Record<string, boolean> = {};
      for (const module of modules) {
        access[module.id] = await canAccessModule(user.id, module.id);
      }
      setModuleAccess(access);
      setLoading(false);
    }

    checkModuleAccess();
  }, [user]);

  const handleModuleClick = (moduleId: string) => {
    if (moduleAccess[moduleId]) {
      onSelectModule(moduleId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading modules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src="/Logo & Letter head, Logo large (ID 240).jpg"
              alt="Hefer Projects Logo"
              className="h-10 w-auto object-contain"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
            >
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{profile?.full_name || 'User'}</p>
                <p className="text-xs text-gray-500">{profile?.job_title || profile?.role.replace('_', ' ') || 'Member'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                {profile?.full_name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </div>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Construction Management System
          </h1>
          <p className="text-lg text-gray-600">
            Select a module to get started
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {modules.map((module) => {
            const Icon = module.icon;
            const hasAccess = moduleAccess[module.id];
            return (
              <button
                key={module.id}
                onClick={() => handleModuleClick(module.id)}
                disabled={!hasAccess}
                className={`${
                  hasAccess
                    ? `${module.color} ${module.hoverColor} hover:shadow-xl hover:scale-105`
                    : 'bg-gray-400 cursor-not-allowed'
                } text-white rounded-2xl p-8 shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-50 relative`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="bg-white bg-opacity-20 rounded-full p-6 mb-4">
                    {hasAccess ? <Icon size={48} /> : <Lock size={48} />}
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{module.name}</h2>
                  <p className="text-white text-opacity-90">
                    {hasAccess ? module.description : 'Access restricted - contact administrator'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
