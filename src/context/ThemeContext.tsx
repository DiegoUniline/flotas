import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from './AuthContext'
import { fetchProfile, updateThemePreference, type ThemePreference } from '@/features/organizations/api/organizationsApi'

interface ThemeContextValue {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(preference: ThemePreference) {
  if (preference === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', preference)
  }
}

/** Montado arriba de `Routes` (ver App.tsx), fuera de cualquier ruta
 * protegida — así el botón también funciona en /login antes de iniciar
 * sesión, aunque sin sesión el cambio solo vive en memoria de React (regla
 * del proyecto: estado de UI efímero sí puede vivir ahí, nunca en
 * localStorage). Con sesión, se sincroniza con
 * `profiles.theme_preference` (misma llave de caché `['profile', userId]`
 * que ya usa `OrgContext`, así no duplica la consulta) — mismo criterio
 * que `active_organization_id`: la preferencia real vive en la fila del
 * usuario, no en el navegador. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [preference, setPreferenceState] = useState<ThemePreference>('system')
  const syncedUserIdRef = useRef<string | null>(null)

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  })

  useEffect(() => {
    if (!user) {
      syncedUserIdRef.current = null
      return
    }
    if (!profileQuery.data || syncedUserIdRef.current === user.id) return
    syncedUserIdRef.current = user.id
    setPreferenceState((profileQuery.data.theme_preference as ThemePreference) ?? 'system')
  }, [user, profileQuery.data])

  useEffect(() => {
    applyTheme(preference)
  }, [preference])

  function setPreference(next: ThemePreference) {
    setPreferenceState(next)
    if (user) void updateThemePreference(user.id, next)
  }

  return <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return context
}
