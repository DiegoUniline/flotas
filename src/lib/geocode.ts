export interface AddressResult {
  label: string
  lat: number
  lng: number
}

/** Busca una dirección/estado/municipio con Nominatim (geocodificador
 * gratuito de OpenStreetMap, sin API key — mismo criterio que los tiles del
 * mapa). Uso ligero; si el volumen crece revisar la política de uso de
 * Nominatim (~1 req/seg) o migrar a un proveedor con cuota. Compartido por
 * `GpsCaptureField` y `GeofenceMapField` — antes estaba duplicado. */
export async function searchAddress(query: string): Promise<AddressResult[]> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    q: query,
    countrycodes: 'mx',
    limit: '6',
    addressdetails: '0',
  })
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: 'application/json', 'Accept-Language': 'es' },
  })
  if (!response.ok) throw new Error(`Nominatim respondió ${response.status} ${response.statusText}`)
  const data = (await response.json()) as { display_name: string; lat: string; lon: string }[]
  return data.map((r) => ({ label: r.display_name, lat: Number(r.lat), lng: Number(r.lon) }))
}
