'use client'
import { cn } from '@/lib/utils/index'
import { ReactNode } from 'react'

interface Col { key: string; label: string; className?: string }

interface Props {
  columns: Col[]
  rows: Record<string, ReactNode>[]
  emptyMsg?: string
  emptyIcon?: string
  accentBg?: string
}

export default function DataTable({ columns, rows, emptyMsg = 'Sin registros', emptyIcon = '📋', accentBg = '#F8FAFC' }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b border-gray-100"
              style={{ backgroundColor: accentBg }}>
              {columns.map(c => (
                <th key={c.key} className={cn('px-4 py-3', c.className)}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={99} className="px-4 py-16 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">{emptyIcon}</span>
                    <p className="text-sm">{emptyMsg}</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-gray-50/50 group">
                  {columns.map(c => (
                    <td key={c.key} className={cn('px-4 py-3', c.className)}>{row[c.key]}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
