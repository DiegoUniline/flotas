import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrg } from '@/context/OrgContext'
import { useToast } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import type { Driver } from '@/features/drivers/api/driversApi'
import { fetchVehicleOptions } from '@/features/vehicles/api/vehiclesApi'
import {
  createDriverLicense,
  deleteDriverLicense,
  fetchDriverLicenses,
  updateDriverLicense,
  type DriverLicenseInsert,
  type DriverLicenseUpdate,
} from '@/features/drivers/api/driverLicensesApi'
import {
  createDriverCertification,
  deleteDriverCertification,
  fetchDriverCertifications,
  updateDriverCertification,
  type DriverCertificationInsert,
  type DriverCertificationUpdate,
} from '@/features/drivers/api/driverCertificationsApi'
import {
  assignVehicleToDriver,
  fetchAssignedVehicle,
  fetchAssignmentHistory,
  unassignVehicle,
} from '@/features/drivers/api/driverAssignmentsApi'

export async function fetchDriverById(id: string): Promise<Driver> {
  const { data, error } = await supabase.from('drivers').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export function useDriver(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver', driverId],
    queryFn: () => fetchDriverById(driverId!),
    enabled: !!driverId,
  })
}

// Licenses

export function useDriverLicenses(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver-licenses', driverId],
    queryFn: () => fetchDriverLicenses(driverId!),
    enabled: !!driverId,
  })
}

export function useCreateDriverLicense(driverId: string) {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (input: DriverLicenseInsert) => createDriverLicense(activeOrg!.id, driverId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['driver-licenses', driverId] })
      showToast('Licencia agregada', 'success')
    },
    onError: () => showToast('No se pudo agregar la licencia', 'error'),
  })
}

export function useUpdateDriverLicense(driverId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DriverLicenseUpdate }) => updateDriverLicense(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['driver-licenses', driverId] })
      showToast('Licencia actualizada', 'success')
    },
    onError: () => showToast('No se pudo actualizar la licencia', 'error'),
  })
}

export function useDeleteDriverLicense(driverId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (id: string) => deleteDriverLicense(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['driver-licenses', driverId] })
      showToast('Licencia eliminada', 'success')
    },
    onError: () => showToast('No se pudo eliminar la licencia', 'error'),
  })
}

// Certifications

export function useDriverCertifications(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver-certifications', driverId],
    queryFn: () => fetchDriverCertifications(driverId!),
    enabled: !!driverId,
  })
}

export function useCreateDriverCertification(driverId: string) {
  const { activeOrg } = useOrg()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (input: DriverCertificationInsert) => createDriverCertification(activeOrg!.id, driverId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['driver-certifications', driverId] })
      showToast('Certificación agregada', 'success')
    },
    onError: () => showToast('No se pudo agregar la certificación', 'error'),
  })
}

export function useUpdateDriverCertification(driverId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DriverCertificationUpdate }) =>
      updateDriverCertification(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['driver-certifications', driverId] })
      showToast('Certificación actualizada', 'success')
    },
    onError: () => showToast('No se pudo actualizar la certificación', 'error'),
  })
}

export function useDeleteDriverCertification(driverId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (id: string) => deleteDriverCertification(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['driver-certifications', driverId] })
      showToast('Certificación eliminada', 'success')
    },
    onError: () => showToast('No se pudo eliminar la certificación', 'error'),
  })
}

// Vehicle assignment

export function useAssignedVehicle(driverId: string | undefined) {
  return useQuery({
    queryKey: ['assigned-vehicle', driverId],
    queryFn: () => fetchAssignedVehicle(driverId!),
    enabled: !!driverId,
  })
}

export function useVehicleOptionsForAssignment() {
  const { activeOrg } = useOrg()
  return useQuery({
    queryKey: ['vehicle-options', activeOrg?.id],
    queryFn: () => fetchVehicleOptions(activeOrg!.id),
    enabled: !!activeOrg,
  })
}

export function useAssignmentHistory(driverId: string | undefined) {
  return useQuery({
    queryKey: ['assignment-history', driverId],
    queryFn: () => fetchAssignmentHistory(driverId!),
    enabled: !!driverId,
  })
}

export function useAssignVehicle(driverId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: ({ vehicleId, notes }: { vehicleId: string; notes?: string }) =>
      assignVehicleToDriver(vehicleId, driverId, notes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['assigned-vehicle', driverId] })
      void queryClient.invalidateQueries({ queryKey: ['assignment-history', driverId] })
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      showToast('Vehículo asignado', 'success')
    },
    onError: () => showToast('No se pudo asignar el vehículo', 'error'),
  })
}

export function useUnassignVehicle(driverId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (vehicleId: string) => unassignVehicle(vehicleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['assigned-vehicle', driverId] })
      void queryClient.invalidateQueries({ queryKey: ['assignment-history', driverId] })
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      showToast('Asignación terminada', 'success')
    },
    onError: () => showToast('No se pudo quitar la asignación', 'error'),
  })
}
