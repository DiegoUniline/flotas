import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import {
  assignVehicleToDriver,
  fetchVehicleAssignmentHistory,
  unassignVehicle,
} from '@/features/drivers/api/driverAssignmentsApi'
import {
  createVehicleDocument,
  deleteVehicleDocument,
  fetchVehicleDocuments,
  updateVehicleDocument,
  type VehicleDocumentInsert,
  type VehicleDocumentUpdate,
} from '@/features/vehicles/api/vehicleDocumentsApi'

export function useVehicleAssignmentHistory(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['vehicle-assignment-history', vehicleId],
    queryFn: () => fetchVehicleAssignmentHistory(vehicleId!),
    enabled: !!vehicleId,
  })
}

export function useAssignDriverToVehicle(vehicleId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (driverId: string) => assignVehicleToDriver(vehicleId, driverId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
      void queryClient.invalidateQueries({ queryKey: ['vehicle-assignment-history', vehicleId] })
      showToast('Operador asignado', 'success')
    },
    onError: () => showToast('No se pudo asignar el operador', 'error'),
  })
}

export function useUnassignDriverFromVehicle(vehicleId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: () => unassignVehicle(vehicleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
      void queryClient.invalidateQueries({ queryKey: ['vehicle-assignment-history', vehicleId] })
      showToast('Asignación terminada', 'success')
    },
    onError: () => showToast('No se pudo quitar la asignación', 'error'),
  })
}

export function useVehicleDocuments(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['vehicle-documents', vehicleId],
    queryFn: () => fetchVehicleDocuments(vehicleId!),
    enabled: !!vehicleId,
  })
}

export function useCreateVehicleDocument(vehicleId: string) {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (input: VehicleDocumentInsert) => createVehicleDocument(activeOrg!.id, vehicleId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicle-documents', vehicleId] })
      showToast('Documento agregado', 'success')
    },
    onError: () => showToast('No se pudo agregar el documento', 'error'),
  })
}

export function useUpdateVehicleDocument(vehicleId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: VehicleDocumentUpdate }) => updateVehicleDocument(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicle-documents', vehicleId] })
      showToast('Documento actualizado', 'success')
    },
    onError: () => showToast('No se pudo actualizar el documento', 'error'),
  })
}

export function useDeleteVehicleDocument(vehicleId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (id: string) => deleteVehicleDocument(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicle-documents', vehicleId] })
      showToast('Documento eliminado', 'success')
    },
    onError: () => showToast('No se pudo eliminar el documento', 'error'),
  })
}
