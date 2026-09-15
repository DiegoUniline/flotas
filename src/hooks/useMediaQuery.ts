import { useEffect, useState } from 'react'

/** Lee un media query real del navegador (p. ej. el breakpoint `lg` de
 * Tailwind, `(min-width: 1024px)`) — usado para decidir en JS si el botón
 * de hamburguesa del header debe abrir el sidebar como overlay de
 * celular o alternar el modo "solo íconos" de escritorio, algo que CSS
 * solo (clases `lg:`) no puede decidir por sí mismo. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handleChange = () => setMatches(mql.matches)
    handleChange()
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [query])

  return matches
}
