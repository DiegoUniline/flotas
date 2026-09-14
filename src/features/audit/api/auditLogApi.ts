import { supabase } from '@/lib/supabase'

export interface AuditLogEntry {
  id: number
  action: string
  created_at: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  profiles: { first_name: string | null; last_name: string | null } | null
}

export async function fetchEntityHistory(organizationId: string, entityType: string, entityId: string): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, created_at, old_values, new_values, profiles(first_name, last_name)')
    .eq('organization_id', organizationId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as unknown as AuditLogEntry[]
}
