import { useEffect, useState } from 'react'

/** `navigator.onLine` real, actualizado con los eventos `online`/`offline`
 * del navegador — usado para mostrar el aviso de "sin conexión" y para
 * deshabilitar acciones que de todas formas no pueden completarse sin red
 * (p. ej. buscar un cliente nuevo en `RelationSelect`, que sí necesita
 * consultar la base en vivo). No sustituye el manejo de errores normal:
 * una conexión inestable puede reportar `online: true` y aun así fallar
 * una petición puntual. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    function handleOnline() {
      setOnline(true)
    }
    function handleOffline() {
      setOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return online
}
