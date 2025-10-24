import { supabase } from './supabase';

export interface Role {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Permission {
  id: string;
  module: 'projects' | 'plant' | 'stock' | 'employees' | 'settings' | 'all';
  action: 'view' | 'create' | 'edit' | 'delete' | 'manage';
  description: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by: string | null;
  role?: Role;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
  permission?: Permission;
}

export interface Submodule {
  id: string;
  name: string;
  display_name: string;
  parent_module: string;
  description: string;
  created_at: string;
}

export interface SubmodulePermission {
  id: string;
  submodule_id: string;
  action: 'view' | 'create' | 'edit' | 'delete';
  description: string;
  created_at: string;
  submodule?: Submodule;
}

export interface RoleSubmodulePermission {
  id: string;
  role_id: string;
  submodule_permission_id: string;
  created_at: string;
  permission?: SubmodulePermission;
}

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select(`
      *,
      role:roles(*)
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user roles:', error);
    return [];
  }

  return data || [];
}

export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const { data, error } = await supabase.rpc('get_user_permissions', {
    user_id: userId
  });

  if (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }

  return data || [];
}

export async function hasPermission(
  userId: string,
  module: string,
  action: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);

  return permissions.some(
    p =>
      (p.module === module && p.action === action) ||
      (p.module === module && p.action === 'manage') ||
      (p.module === 'all' && p.action === 'manage')
  );
}

export async function canAccessModule(
  userId: string,
  module: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('user_can_access_module', {
    user_id: userId,
    module_name: module
  });

  if (error) {
    console.error('Error checking module access:', error);
    return false;
  }

  return data || false;
}

export async function isAdministrator(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('user_is_administrator', {
    user_id: userId
  });

  if (error) {
    console.error('Error checking administrator status:', error);
    return false;
  }

  return data || false;
}

export async function getAllRoles(): Promise<Role[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching roles:', error);
    return [];
  }

  return data || [];
}

export async function assignRoleToUser(
  userId: string,
  roleId: string,
  assignedBy: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role_id: roleId,
      assigned_by: assignedBy,
    });

  if (error) {
    console.error('Error assigning role:', {
      error,
      userId,
      roleId,
      assignedBy,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
  }

  return { error };
}

export async function removeRoleFromUser(
  userId: string,
  roleId: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId);

  return { error };
}

export async function getAllPermissions(): Promise<Permission[]> {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .order('module, action');

  if (error) {
    console.error('Error fetching permissions:', error);
    return [];
  }

  return data || [];
}

export async function getRolePermissions(roleId: string): Promise<Permission[]> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select(`
      permission:permissions(*)
    `)
    .eq('role_id', roleId);

  if (error) {
    console.error('Error fetching role permissions:', error);
    return [];
  }

  return data?.map((rp: any) => rp.permission).filter(Boolean) || [];
}

export async function getAllSubmodules(): Promise<Submodule[]> {
  const { data, error } = await supabase
    .from('submodules')
    .select('*')
    .order('parent_module, display_name');

  if (error) {
    console.error('Error fetching submodules:', error);
    return [];
  }

  return data || [];
}

export async function getSubmodulePermissions(submoduleId: string): Promise<SubmodulePermission[]> {
  const { data, error } = await supabase
    .from('submodule_permissions')
    .select(`
      *,
      submodule:submodules(*)
    `)
    .eq('submodule_id', submoduleId)
    .order('action');

  if (error) {
    console.error('Error fetching submodule permissions:', error);
    return [];
  }

  return data || [];
}

export async function getRoleSubmodulePermissions(roleId: string): Promise<SubmodulePermission[]> {
  const { data, error } = await supabase
    .from('role_submodule_permissions')
    .select(`
      permission:submodule_permissions(
        *,
        submodule:submodules(*)
      )
    `)
    .eq('role_id', roleId);

  if (error) {
    console.error('Error fetching role submodule permissions:', error);
    return [];
  }

  return data?.map((rsp: any) => rsp.permission).filter(Boolean) || [];
}

export async function hasSubmodulePermission(
  userId: string,
  submoduleName: string,
  action: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('user_has_submodule_permission', {
    check_user_id: userId,
    submodule_name: submoduleName,
    required_action: action
  });

  if (error) {
    console.error('Error checking submodule permission:', error);
    return false;
  }

  return data || false;
}

export async function assignSubmodulePermissionToRole(
  roleId: string,
  submodulePermissionId: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('role_submodule_permissions')
    .insert({
      role_id: roleId,
      submodule_permission_id: submodulePermissionId,
    });

  if (error) {
    console.error('Error assigning submodule permission:', error);
  }

  return { error };
}

export async function removeSubmodulePermissionFromRole(
  roleId: string,
  submodulePermissionId: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('role_submodule_permissions')
    .delete()
    .eq('role_id', roleId)
    .eq('submodule_permission_id', submodulePermissionId);

  return { error };
}
