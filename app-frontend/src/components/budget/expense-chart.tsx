'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { MonthlyData } from '@/lib/types'

interface ExpenseChartProps {
  data: MonthlyData[]
  isLoading?: boolean
}

export function ExpenseChart({ data, isLoading }: ExpenseChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Monatliche Übersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Monatliche Übersicht</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 240)" />
              <XAxis
                dataKey="month"
                stroke="oklch(0.6 0 0)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="oklch(0.6 0 0)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCurrency}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'oklch(0.18 0.01 240)',
                  border: '1px solid oklch(0.25 0.01 240)',
                  borderRadius: '8px',
                  color: 'oklch(0.95 0 0)',
                }}
                formatter={(value: any) => [formatCurrency(value as number)]}
                labelStyle={{ color: 'oklch(0.95 0 0)' }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => (
                  <span style={{ color: 'oklch(0.95 0 0)' }}>
                    {value === 'income' ? 'Einnahmen' : 'Ausgaben'}
                  </span>
                )}
              />
              <Bar
                dataKey="income"
                name="income"
                fill="oklch(0.65 0.18 160)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expense"
                name="expense"
                fill="oklch(0.55 0.22 25)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
