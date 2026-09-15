/** Carga única del script de Google Maps JavaScript API (patrón singleton:
 * varios componentes de mapa pueden montarse a la vez — Centro de control,
 * captura de GPS, geocercas — pero el script solo debe inyectarse una sola
 * vez). Requiere `VITE_GOOGLE_MAPS_API_KEY` en `.env` (y en las variables de
 * entorno de Vercel para producción) — decisión explícita del usuario de
 * reemplazar Leaflet/OpenStreetMap por el mapa real de Google. A diferencia
 * de Nominatim/OSM, esta API sí requiere facturación activada en Google
 * Cloud (con capa gratuita mensual) — el buscador de direcciones se dejó en
 * Nominatim (`lib/geocode.ts`), esto solo reemplaza el mapa visual. */
let loadPromise: Promise<typeof google> | null = null

export function loadGoogleMaps(): Promise<typeof google> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
    if (!apiKey) {
      reject(new Error('Falta configurar VITE_GOOGLE_MAPS_API_KEY.'))
      return
    }
    if (window.google?.maps) {
      resolve(window.google)
      return
    }

    const callbackName = '__flotaaInitGoogleMaps'
    ;(window as unknown as Record<string, () => void>)[callbackName] = () => resolve(window.google)

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${callbackName}&v=weekly&language=es&region=MX`
    script.async = true
    script.onerror = () => reject(new Error('No se pudo cargar Google Maps. Revisa tu conexión.'))
    document.head.appendChild(script)
  })

  return loadPromise
}
