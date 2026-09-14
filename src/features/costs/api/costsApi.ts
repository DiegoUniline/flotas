import { supabase } from '@/lib/supabase'
import type { DateRangeValue } from '@/lib/dateRanges'

interface FuelRow {
  vehicle_id: string
  total_cost: number
  liters: number
  vehicles: { economic_number: string; plate: string | null } | null
}

interface ExpenseRow {
  vehicle_id: string | null
  amount: number
  category: string
  status: string
  vehicles: { economic_number: string; plate: string | null } | null
}

export interface VehicleCostRow {
  vehicleId: string
  label: string
  fuelCost: number
  fuelLiters: number
  expensesCost: number
  total: number
}

export interface CategoryCostRow {
  category: string
  total: number
}

export interface CostsSummary {
  totalFuelCost: number
  totalFuelLiters: number
  totalApprovedExpenses: number
  totalPendingExpenses: number
  pendingExpensesCount: number
  totalCost: number
  byVehicle: VehicleCostRow[]
  byCategory: CategoryCostRow[]
}

function vehicleLabel(vehicle: { economic_number: string; plate: string | null } | null): string {
  if (!vehicle) return 'Sin vehículo'
  return vehicle.plate ? `${vehicle.economic_number} · ${vehicle.plate}` : vehicle.economic_number
}

/** Reporte agregado (Costos). Trae las filas del periodo y agrega en el
 * cliente — mismo criterio aceptado ya en "Agrupar por" del patrón Odoo:
 * correcto para el volumen típico de una PyME dentro de un rango de fechas
 * acotado, con un tope de seguridad (`ROW_LIMIT`) para no traer un periodo
 * sin fin. Si el volumen crece, mover a una vista/RPC con `sum()` real. */
const ROW_LIMIT = 3000

export async function fetchCostsSummary(organizationId: string, dateRange: DateRangeValue): Promise<CostsSummary> {
  let fuelQuery = supabase
    .from('fuel_logs')
    .select('vehicle_id, total_cost, liters, vehicles(economic_number, plate)')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .limit(ROW_LIMIT)
  if (dateRange.from) fuelQuery = fuelQuery.gte('logged_at', dateRange.from)
  if (dateRange.to) fuelQuery = fuelQuery.lte('logged_at', `${dateRange.to}T23:59:59`)

  let expenseQuery = supabase
    .from('expenses')
    .select('vehicle_id, amount, category, status, vehicles(economic_number, plate)')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .limit(ROW_LIMIT)
  if (dateRange.from) expenseQuery = expenseQuery.gte('expense_date', dateRange.from)
  if (dateRange.to) expenseQuery = expenseQuery.lte('expense_date', dateRange.to)

  const [fuelResult, expenseResult] = await Promise.all([fuelQuery, expenseQuery])
  if (fuelResult.error) throw fuelResult.error
  if (expenseResult.error) throw expenseResult.error

  const fuelRows = (fuelResult.data ?? []) as unknown as FuelRow[]
  const expenseRows = (expenseResult.data ?? []) as unknown as ExpenseRow[]

  const byVehicle = new Map<string, VehicleCostRow>()
  const byCategory = new Map<string, number>()

  let totalFuelCost = 0
  let totalFuelLiters = 0
  let totalApprovedExpenses = 0
  let totalPendingExpenses = 0
  let pendingExpensesCount = 0

  function vehicleBucket(vehicleId: string | null, vehicle: FuelRow['vehicles']): VehicleCostRow {
    const key = vehicleId ?? 'none'
    const existing = byVehicle.get(key)
    if (existing) return existing
    const created: VehicleCostRow = { vehicleId: key, label: vehicleLabel(vehicle), fuelCost: 0, fuelLiters: 0, expensesCost: 0, total: 0 }
    byVehicle.set(key, created)
    return created
  }

  for (const row of fuelRows) {
    totalFuelCost += Number(row.total_cost)
    totalFuelLiters += Number(row.liters)
    const bucket = vehicleBucket(row.vehicle_id, row.vehicles)
    bucket.fuelCost += Number(row.total_cost)
    bucket.fuelLiters += Number(row.liters)
    bucket.total += Number(row.total_cost)
  }

  for (const row of expenseRows) {
    if (row.status === 'approved') {
      totalApprovedExpenses += Number(row.amount)
      const bucket = vehicleBucket(row.vehicle_id, row.vehicles)
      bucket.expensesCost += Number(row.amount)
      bucket.total += Number(row.amount)
      byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + Number(row.amount))
    } else if (row.status === 'pending') {
      totalPendingExpenses += Number(row.amount)
      pendingExpensesCount += 1
    }
  }

  return {
    totalFuelCost,
    totalFuelLiters,
    totalApprovedExpenses,
    totalPendingExpenses,
    pendingExpensesCount,
    totalCost: totalFuelCost + totalApprovedExpenses,
    byVehicle: Array.from(byVehicle.values()).sort((a, b) => b.total - a.total),
    byCategory: Array.from(byCategory.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total),
  }
}
