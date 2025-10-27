import { useState, useEffect } from 'react';
import { CheckSquare, Square, ChevronDown, ChevronRight } from 'lucide-react';
import {
  getAllSubmodules,
  getSubmodulePermissions,
  getRoleSubmodulePermissions,
  assignSubmodulePermissionToRole,
  removeSubmodulePermissionFromRole,
  getRolePermissions,
  type Submodule,
  type SubmodulePermission,
  type Role,
  type Permission
} from '../lib/permissions';
import { supabase } from '../lib/supabase';

interface UnifiedPermissionManagerProps {
  selectedRole: Role;
  allPermissions: Permission[];
}

interface ModuleData {
  module: string;
  displayName: string;
  permissions: Permission[];
  submodules: {
    submodule: Submodule;
    permissions: SubmodulePermission[];
  }[];
  isExpanded: boolean;
}

export default function UnifiedPermissionManager({ selectedRole, allPermissions }: UnifiedPermissionManagerProps) {
  const [moduleData, setModuleData] = useState<ModuleData[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Set<string>>(new Set());
  const [roleSubmodulePermissions, setRoleSubmodulePermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedRole]);

  async function loadData() {
    setLoading(true);
    try {
      const submodulesData = await getAllSubmodules();

      const rolePerms = await getRolePermissions(selectedRole.id);
      setRolePermissions(new Set(rolePerms.map(p => p.id)));

      const roleSubPerms = await getRoleSubmodulePermissions(selectedRole.id);
      setRoleSubmodulePermissions(new Set(roleSubPerms.map(p => p.id)));

      const permissionsMap = new Map<string, SubmodulePermission[]>();
      for (const submodule of submodulesData) {
        const permissions = await getSubmodulePermissions(submodule.id);
        permissionsMap.set(submodule.id, permissions);
      }

      const modules = groupPermissionsByModule(allPermissions, submodulesData, permissionsMap);
      setModuleData(modules);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setMessage({ type: 'error', text: 'Failed to load permissions' });
    } finally {
      setLoading(false);
    }
  }

  function groupPermissionsByModule(
    permissions: Permission[],
    submodules: Submodule[],
    submodulePermsMap: Map<string, SubmodulePermission[]>
  ): ModuleData[] {
    const moduleMap = new Map<string, ModuleData>();

    permissions.forEach(perm => {
      if (perm.module === 'all') return;

      if (!moduleMap.has(perm.module)) {
        moduleMap.set(perm.module, {
          module: perm.module,
          displayName: perm.module.charAt(0).toUpperCase() + perm.module.slice(1),
          permissions: [],
          submodules: [],
          isExpanded: true
        });
      }
      moduleMap.get(perm.module)!.permissions.push(perm);
    });

    submodules.forEach(sub => {
      if (moduleMap.has(sub.parent_module)) {
        moduleMap.get(sub.parent_module)!.submodules.push({
          submodule: sub,
          permissions: submodulePermsMap.get(sub.id) || []
        });
      }
    });

    moduleMap.forEach(mod => {
      mod.permissions.sort((a, b) => {
        const order = ['view', 'create', 'edit', 'delete', 'manage'];
        return order.indexOf(a.action) - order.indexOf(b.action);
      });
    });

    return Array.from(moduleMap.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  async function toggleModulePermission(permissionId: string) {
    setSaving(true);
    const hasPermission = rolePermissions.has(permissionId);

    try {
      if (hasPermission) {
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', selectedRole.id)
          .eq('permission_id', permissionId);

        if (error) throw error;

        setRolePermissions(prev => {
          const newSet = new Set(prev);
          newSet.delete(permissionId);
          return newSet;
        });
      } else {
        const { error } = await supabase
          .from('role_permissions')
          .insert({
            role_id: selectedRole.id,
            permission_id: permissionId
          });

        if (error) throw error;

        setRolePermissions(prev => new Set(prev).add(permissionId));
      }
    } catch (error: any) {
      console.error('Error toggling module permission:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update permission' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function toggleSubmodulePermission(permissionId: string) {
    setSaving(true);
    const hasPermission = roleSubmodulePermissions.has(permissionId);

    try {
      if (hasPermission) {
        const { error } = await removeSubmodulePermissionFromRole(selectedRole.id, permissionId);
        if (error) throw error;

        setRoleSubmodulePermissions(prev => {
          const newSet = new Set(prev);
          newSet.delete(permissionId);
          return newSet;
        });
      } else {
        const { error } = await assignSubmodulePermissionToRole(selectedRole.id, permissionId);
        if (error) throw error;

        setRoleSubmodulePermissions(prev => new Set(prev).add(permissionId));
      }
    } catch (error: any) {
      console.error('Error toggling submodule permission:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update permission' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  function toggleModuleExpanded(moduleName: string) {
    setModuleData(prev =>
      prev.map(mod =>
        mod.module === moduleName ? { ...mod, isExpanded: !mod.isExpanded } : mod
      )
    );
  }

  const actions = ['view', 'create', 'edit', 'delete'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading permissions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-3">
        {moduleData.map(module => {
          const hasViewPermission = module.permissions.some(
            p => p.action === 'view' && rolePermissions.has(p.id)
          );

          return (
            <div key={module.module} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <button
                onClick={() => toggleModuleExpanded(module.module)}
                className="w-full bg-gray-50 px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {module.isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  )}
                  <h4 className="font-semibold text-gray-900">{module.displayName}</h4>
                  {hasViewPermission && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                      Accessible
                    </span>
                  )}
                </div>
              </button>

            {module.isExpanded && (
              <div className="p-4 space-y-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">Module Access</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {module.permissions.map(permission => {
                      const isGranted = rolePermissions.has(permission.id);
                      return (
                        <button
                          key={permission.id}
                          onClick={() => toggleModulePermission(permission.id)}
                          disabled={saving}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm ${
                            isGranted
                              ? 'border-blue-500 bg-blue-100 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {isGranted ? (
                            <CheckSquare className="w-4 h-4 flex-shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 flex-shrink-0" />
                          )}
                          <span className="font-medium capitalize truncate">{permission.action}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {module.submodules.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-semibold text-gray-700">Sub-Modules</h5>
                    {module.submodules.map(({ submodule, permissions }) => (
                      <div key={submodule.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="mb-2">
                          <h6 className="font-medium text-gray-900">{submodule.display_name}</h6>
                          <p className="text-xs text-gray-600">{submodule.description}</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {actions.map(action => {
                            const permission = permissions.find(p => p.action === action);
                            if (!permission) return null;

                            const isGranted = roleSubmodulePermissions.has(permission.id);

                            return (
                              <button
                                key={action}
                                onClick={() => toggleSubmodulePermission(permission.id)}
                                disabled={saving}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm ${
                                  isGranted
                                    ? 'border-green-500 bg-green-100 text-green-700'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                {isGranted ? (
                                  <CheckSquare className="w-4 h-4 flex-shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 flex-shrink-0" />
                                )}
                                <span className="font-medium capitalize truncate">{action}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
