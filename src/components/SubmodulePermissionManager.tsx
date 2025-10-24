import { useState, useEffect } from 'react';
import { CheckSquare, Square, X } from 'lucide-react';
import {
  getAllSubmodules,
  getSubmodulePermissions,
  getRoleSubmodulePermissions,
  assignSubmodulePermissionToRole,
  removeSubmodulePermissionFromRole,
  type Submodule,
  type SubmodulePermission,
  type Role
} from '../lib/permissions';

interface SubmodulePermissionManagerProps {
  selectedRole: Role | null;
  onClose: () => void;
}

export default function SubmodulePermissionManager({ selectedRole, onClose }: SubmodulePermissionManagerProps) {
  const [submodules, setSubmodules] = useState<Submodule[]>([]);
  const [allPermissions, setAllPermissions] = useState<Map<string, SubmodulePermission[]>>(new Map());
  const [rolePermissions, setRolePermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (selectedRole) {
      loadData();
    }
  }, [selectedRole]);

  async function loadData() {
    setLoading(true);
    try {
      const submodulesData = await getAllSubmodules();
      setSubmodules(submodulesData);

      const permissionsMap = new Map<string, SubmodulePermission[]>();
      for (const submodule of submodulesData) {
        const permissions = await getSubmodulePermissions(submodule.id);
        permissionsMap.set(submodule.id, permissions);
      }
      setAllPermissions(permissionsMap);

      if (selectedRole) {
        const rolePerms = await getRoleSubmodulePermissions(selectedRole.id);
        setRolePermissions(new Set(rolePerms.map(p => p.id)));
      }
    } catch (error) {
      console.error('Error loading submodule permissions:', error);
      setMessage({ type: 'error', text: 'Failed to load permissions' });
    } finally {
      setLoading(false);
    }
  }

  async function togglePermission(permissionId: string) {
    if (!selectedRole) return;

    setSaving(true);
    const hasPermission = rolePermissions.has(permissionId);

    try {
      if (hasPermission) {
        const { error } = await removeSubmodulePermissionFromRole(selectedRole.id, permissionId);
        if (error) throw error;

        setRolePermissions(prev => {
          const newSet = new Set(prev);
          newSet.delete(permissionId);
          return newSet;
        });
        setMessage({ type: 'success', text: 'Permission removed' });
      } else {
        const { error } = await assignSubmodulePermissionToRole(selectedRole.id, permissionId);
        if (error) throw error;

        setRolePermissions(prev => new Set(prev).add(permissionId));
        setMessage({ type: 'success', text: 'Permission granted' });
      }
    } catch (error: any) {
      console.error('Error toggling permission:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update permission' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  function groupSubmodulesByParent() {
    const grouped = new Map<string, Submodule[]>();
    submodules.forEach(sub => {
      if (!grouped.has(sub.parent_module)) {
        grouped.set(sub.parent_module, []);
      }
      grouped.get(sub.parent_module)!.push(sub);
    });
    return grouped;
  }

  if (!selectedRole) return null;

  const groupedSubmodules = groupSubmodulesByParent();
  const actions = ['view', 'create', 'edit', 'delete'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sub-Module Permissions</h2>
            <p className="text-sm text-gray-600 mt-1">
              Managing permissions for: <span className="font-semibold text-gray-900">{selectedRole.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {message && (
          <div className={`mx-6 mt-4 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading permissions...</div>
            </div>
          ) : (
            <div className="space-y-8">
              {Array.from(groupedSubmodules.entries()).map(([parentModule, moduleSubmodules]) => (
                <div key={parentModule} className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                    {parentModule}
                  </h3>

                  <div className="space-y-4">
                    {moduleSubmodules.map(submodule => {
                      const permissions = allPermissions.get(submodule.id) || [];

                      return (
                        <div key={submodule.id} className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="mb-3">
                            <h4 className="font-semibold text-gray-900">{submodule.display_name}</h4>
                            <p className="text-sm text-gray-600">{submodule.description}</p>
                          </div>

                          <div className="grid grid-cols-4 gap-3">
                            {actions.map(action => {
                              const permission = permissions.find(p => p.action === action);
                              if (!permission) return null;

                              const isGranted = rolePermissions.has(permission.id);

                              return (
                                <button
                                  key={action}
                                  onClick={() => togglePermission(permission.id)}
                                  disabled={saving}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                                    isGranted
                                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                  } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  {isGranted ? (
                                    <CheckSquare className="w-5 h-5" />
                                  ) : (
                                    <Square className="w-5 h-5" />
                                  )}
                                  <span className="font-medium capitalize">{action}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
