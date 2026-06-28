import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";

export async function getUserRoles(email: string): Promise<string[]> {
  const svc = getServerSupabase();
  const { data } = await svc
    .from<any, any>("user_roles")
    .select("role_key")
    .eq("user_email", email.toLowerCase());

  return ((data as any[]) || []).map((row) => row.role_key);
}

export async function getPermissions(email: string): Promise<Set<string>> {
  const roles = await getUserRoles(email);
  if (roles.length === 0) return new Set();

  const svc = getServerSupabase();
  const { data } = await svc
    .from<any, any>("role_permissions")
    .select("permission_key")
    .in("role_key", roles);

  const permissions = new Set<string>();
  for (const row of (data as any[]) || []) {
    permissions.add(row.permission_key);
  }
  return permissions;
}

export async function hasPermission(email: string, permission: string): Promise<boolean> {
  const permissions = await getPermissions(email);
  return permissions.has(permission);
}
