import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import apiClient from '@/lib/apiClient'
import { OverviewCards } from '@/components/budget/overview-cards'
import { AddTransactionModal } from '@/components/budget/add-transaction-modal'
import { TransactionList } from '@/components/budget/transaction-list'
import { TransactionDetailsModal } from '@/components/budget/transaction-details-modal'
import { ExpenseChart } from '@/components/budget/expense-chart'
import { CategoryBreakdown } from '@/components/budget/category-breakdown'
import type { MonthlyData, PaginatedResponse, Transaction } from '@/lib/types'
import { monthBounds } from '@/lib/utils'

// Rows shown in the "Letzte Transaktionen" card.
const RECENT_COUNT = 8

//  API calls
// Totals and the category breakdown are scoped to the current month, so ask
// the server for exactly that slice instead of the full history.
async function fetchCurrentMonthTransactions(month: Date): Promise<Transaction[]> {
  const { from, to } = monthBounds(month)
  const response = await apiClient.get<Transaction[]>('/transactions/', {
    params: { date_from: from, date_to: to },
  })
  return response.data
}

// The recent list is deliberately *not* month-scoped: on the 1st of a month
// it should still show last month's activity rather than an empty card.
async function fetchRecentTransactions(): Promise<Transaction[]> {
  const response = await apiClient.get<PaginatedResponse<Transaction>>('/transactions/', {
    params: { limit: RECENT_COUNT },
  })
  return response.data.results
}

// Whether an API date ("YYYY-MM-DD") falls into the month the dashboard shows.
function isInCurrentMonth(date: string): boolean {
  const { from, to } = monthBounds(new Date())
  return date >= from && date <= to
}

async function fetchMonthlyData(): Promise<MonthlyData[]> {
  const response = await apiClient.get<MonthlyData[]>('/monthly-summary/')
  return response.data
}

export default function BudgetDashboard() {
  // Current-month rows: drive the overview cards and the category breakdown.
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([])
  // Newest RECENT_COUNT rows across all months: drive the list card.
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const { toast } = useToast()

  const now = new Date()

  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [monthData, recentData, monthlyDataResult] = await Promise.all([
          fetchCurrentMonthTransactions(new Date()),
          fetchRecentTransactions(),
          fetchMonthlyData(),
        ])
        setMonthTransactions(monthData)
        setRecentTransactions(recentData)
        setMonthlyData(monthlyDataResult)
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // After a successful write, re-read the recent list from the server: that
  // keeps it at exactly RECENT_COUNT rows and in server order without
  // re-implementing the "which row moved in from position 9" logic here.
  const reloadRecent = useCallback(async () => {
    try {
      setRecentTransactions(await fetchRecentTransactions())
    } catch (error) {
      console.error('Failed to refresh recent transactions:', error)
    }
  }, [])

  // Everything in monthTransactions is the current month (see the fetch above).
  const totals = monthTransactions.reduce(
    (acc, t) => {
      const amount = Number(t.amount)
      if (t.type === 'income') {
        acc.income += amount
      } else {
        acc.expenses += amount
      }
      return acc
    },
    { income: 0, expenses: 0 }
  )

  const balance = totals.income - totals.expenses

  const handleAddTransaction = useCallback(async (newTransaction: Omit<Transaction, 'id'>) => {
    try {
      const response = await apiClient.post<Transaction>('/transactions/', newTransaction)
      // A transaction dated outside this month is saved but does not belong
      // in the dashboard's state, which only mirrors the current month.
      const saved = response.data
      if (isInCurrentMonth(saved.date)) {
        setMonthTransactions((prev) => [saved, ...prev])
      }
      void reloadRecent()
      toast({
        title: 'Erfolg',
        description: 'Transaktion wurde erfolgreich hinzugefügt.',
      })
    } catch (error) {
      console.error('Error creating transaction:', error)
      toast({
        title: 'Fehler',
        description: 'Transaktion konnte nicht gespeichert werden.',
        variant: 'destructive',
      })
    }
  }, [toast, reloadRecent])

  const handleDeleteTransaction = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/transactions/${id}/`)
      setMonthTransactions((prev) => prev.filter((t) => t.id !== id))
      // Drop it immediately, then let the refetch pull the next row up.
      setRecentTransactions((prev) => prev.filter((t) => t.id !== id))
      void reloadRecent()
      toast({
        title: 'Erfolg',
        description: 'Transaktion wurde gelöscht.',
      })
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast({
        title: 'Fehler',
        description: 'Transaktion konnte nicht gelöscht werden.',
        variant: 'destructive',
      })
    }
  }, [toast, reloadRecent])

  const handleUpdateTransaction = useCallback(async (updated: Transaction) => {
    try {
      const response = await apiClient.put<Transaction>(`/transactions/${updated.id}/`, updated)
      const saved = response.data
      // Moving a transaction's date out of the current month removes it
      // from the dashboard, the same way the server-side filter would.
      const staysInMonth = isInCurrentMonth(saved.date)
      setMonthTransactions((prev) => {
        const known = prev.some((t) => t.id === saved.id)
        if (!staysInMonth) return prev.filter((t) => t.id !== saved.id)
        return known ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev]
      })
      setRecentTransactions((prev) => prev.map((t) => (t.id === saved.id ? saved : t)))
      void reloadRecent()
      setSelectedTransaction(saved)
      toast({
        title: 'Erfolg',
        description: 'Transaktion wurde aktualisiert.',
      })
    } catch (error) {
      console.error('Error updating transaction:', error)
      toast({
        title: 'Fehler',
        description: 'Transaktion konnte nicht aktualisiert werden.',
        variant: 'destructive',
      })
    }
  }, [toast, reloadRecent])

  const handleSelectTransaction = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsDetailsOpen(true)
  }, [])

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Overview Cards */}
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
              <span className=" font-semibold text-primary capitalize">
                {now.toLocaleString('de-DE', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <AddTransactionModal onAddTransaction={handleAddTransaction} />
          </div>
          <OverviewCards
            balance={balance}
            income={totals.income}
            expenses={totals.expenses}
            isLoading={isLoading}
          />
        </section>

        {/* Charts and Transaction List */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Charts */}
          <div>
            <TransactionList
              transactions={recentTransactions}
              isLoading={isLoading}
              onSelectTransaction={handleSelectTransaction}
              headerAction={
                <Button asChild variant="secondary" size="sm" className="px-0">
                  <Link to="/transactions">
                    Alle anzeigen <ArrowRight />
                  </Link>
                </Button>
              }
            />
          </div>
           {/* Right Column - Charts */}
          <div className="space-y-8">
            <ExpenseChart data={monthlyData} isLoading={isLoading} />
            <CategoryBreakdown transactions={monthTransactions} isLoading={isLoading} />
          </div>
        </div>
      </div>
      <TransactionDetailsModal
        transaction={selectedTransaction}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpdateTransaction={handleUpdateTransaction}
        onDeleteTransaction={handleDeleteTransaction}
      />
    </div>
  )
}
