import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type JobPackage = Tables<'job_packages'>
export type JobPackageInsert = Omit<TablesInsert<'job_packages'>, 'organization_id' | 'job_id'>
export type JobPackageUpdate = TablesUpdate<'job_packages'>

export async function fetchJobPackages(jobId: string): Promise<JobPackage[]> {
  const { data, error } = await supabase.from('job_packages').select('*').eq('job_id', jobId).order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createJobPackage(organizationId: string, jobId: string, input: JobPackageInsert): Promise<JobPackage> {
  const { data, error } = await supabase
    .from('job_packages')
    .insert({ ...input, organization_id: organizationId, job_id: jobId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateJobPackage(id: string, input: JobPackageUpdate): Promise<JobPackage> {
  const { data, error } = await supabase.from('job_packages').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteJobPackage(id: string): Promise<void> {
  const { error } = await supabase.from('job_packages').delete().eq('id', id)
  if (error) throw error
}

/** Fórmula estándar de peso volumétrico usada por paqueterías (L×A×H en cm / 5000). Solo para mostrar en UI, no se persiste. */
export function volumetricWeightKg(pkg: Pick<JobPackage, 'length_cm' | 'width_cm' | 'height_cm'>): number | null {
  if (pkg.length_cm == null || pkg.width_cm == null || pkg.height_cm == null) return null
  return (pkg.length_cm * pkg.width_cm * pkg.height_cm) / 5000
}
