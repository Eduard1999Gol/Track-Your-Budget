import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import apiClient from '@/lib/apiClient'
import { OverviewCards } from '@/components/budget/overview-cards'
import { AddTransactionModal } from '@/components/budget/add-transaction-modal'
import { UserMenu } from '@/components/budget/user-menu'
import { TransactionList } from '@/components/budget/transaction-list'
import { ExpenseChart } from '@/components/budget/expense-chart'
import { CategoryBreakdown } from '@/components/budget/category-breakdown'
import type { Transaction, MonthlyData } from '@/lib/types'
import { LayoutDashboard } from 'lucide-react'


const MOCK_MONTHLY_DATA: MonthlyData[] = [
  { month: 'Jan', income: 3200, expense: 2100 },
  { month: 'Feb', income: 3500, expense: 2400 },
  { month: 'Mär', income: 3200, expense: 2000 },
  { month: 'Apr', income: 4100, expense: 2800 },
  { month: 'Mai', income: 4300, expense: 1829 },
]

// Simulated API call - replace with actual API endpoint
async function fetchTransactions(): Promise<Transaction[]> {
  const response = await apiClient.get<Transaction[]>('/transactions/')
  return response.data
}

async function fetchMonthlyData(): Promise<MonthlyData[]> {
  await new Promise((resolve) => setTimeout(resolve, 600))
  return MOCK_MONTHLY_DATA
}

export default function BudgetDashboard({ onLogout, userName }: { onLogout: () => void; userName?: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // useEffect(() => {
  //   fetch('/api/data/')
  //     .then((res) => res.json())
  //     .then((data) => setMessage(data.message))
  //     .catch((err) => console.error("Error fetching data:", err))
  // }, [])

  // Fetch data on mount - ready for API integration
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // Replace these with actual API calls
        const [transactionsData, monthlyDataResult] = await Promise.all([
          fetchTransactions(),
          fetchMonthlyData(),
        ])
        setTransactions(transactionsData)
        setMonthlyData(monthlyDataResult)
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate totals from transactions
  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === 'income') {
        acc.income += t.amount
      } else {
        acc.expenses += t.amount
      }
      return acc
    },
    { income: 0, expenses: 0 }
  )

  const balance = totals.income - totals.expenses

  const handleAddTransaction = useCallback(async (newTransaction: Omit<Transaction, 'id'>) => {
    try {
      const response = await apiClient.post<Transaction>('/transactions/', newTransaction)
      setTransactions((prev) => [response.data, ...prev])
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
  }, [toast])

  const handleDeleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Budget Dashboard</h1>
              <p className="text-sm text-muted-foreground">Verwalten Sie Ihre Finanzen</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AddTransactionModal onAddTransaction={handleAddTransaction} />
            <UserMenu onLogout={onLogout} userName={userName} />
          </div>
        </header>

        {/* Overview Cards */}
        <section className="mb-8">
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
          <div className="space-y-8">
            <ExpenseChart data={monthlyData} isLoading={isLoading} />
            <CategoryBreakdown transactions={transactions} isLoading={isLoading} />
          </div>

          {/* Right Column - Transaction List */}
          <div>
            <TransactionList
              transactions={sortedTransactions.slice(0, 10)}
              isLoading={isLoading}
              onDeleteTransaction={handleDeleteTransaction}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
