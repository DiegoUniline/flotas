import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type Organization = Pick<Tables<'organizations'>, 'id' | 'name' | 'slug' | 'status'>
export type Profile = Tables<'profiles'>

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export async function fetchMyOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, status')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function setActiveOrganization(userId: string, organizationId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ active_organization_id: organizationId })
    .eq('id', userId)
  if (error) throw error
}

export type ThemePreference = 'system' | 'light' | 'dark'

export async function updateThemePreference(userId: string, themePreference: ThemePreference) {
  const { error } = await supabase.from('profiles').update({ theme_preference: themePreference }).eq('id', userId)
  if (error) throw error
}

export async function createOrganization(input: {
  name: string
  slug: string
  timezone: string
  currency: string
  country: string
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_organization', {
    p_name: input.name,
    p_slug: input.slug,
    p_timezone: input.timezone,
    p_currency: input.currency,
    p_country: input.country,
  })
  if (error) throw error
  return data
}
