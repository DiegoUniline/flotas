import type { ReactNode } from 'react'

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-gray-900">FLOTAA</h1>
          <p className="mt-1 text-sm text-gray-500">{title}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">{children}</div>
      </div>
    </div>
  )
}
