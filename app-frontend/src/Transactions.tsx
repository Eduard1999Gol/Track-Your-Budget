import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ListOrdered, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { TransactionList } from '@/components/budget/transaction-list'
import { TransactionDetailsModal } from '@/components/budget/transaction-details-modal'
import { useToast } from '@/hooks/use-toast'
import apiClient from '@/lib/apiClient'
import { CATEGORIES, type PaginatedResponse, type Transaction } from '@/lib/types'
import { parseLocalDate } from '@/lib/utils'

// How many rows one request returns; the first render and every
// "Weitere laden" click fetch exactly this many.
const PAGE_SIZE = 10

// Radix Select cannot represent "no value" with an empty string, so the
// "all" option of every dropdown uses this sentinel instead.
const ALL = 'all'

type TypeFilter = typeof ALL | Transaction['type']
type PeriodFilter = typeof ALL | 'current-month' | 'last-2-months'

interface Filters {
  search: string
  category: string
  type: TypeFilter
  period: PeriodFilter
}

const DEFAULT_FILTERS: Filters = {
  search: '',
  category: ALL,
  type: ALL,
  period: ALL,
}

// Format a local Date as the "YYYY-MM-DD" the API expects, without going
// through toISOString(), which would shift the day in timezones west of UTC.
function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// "Aktueller Monat" starts on the 1st of this month; "Letzte 2 Monate" on the
// 1st of the previous month. Neither needs an upper bound.
function periodStart(period: PeriodFilter): string | null {
  if (period === ALL) return null
  const now = new Date()
  const monthsBack = period === 'current-month' ? 0 : 1
  return toIsoDate(new Date(now.getFullYear(), now.getMonth() - monthsBack, 1))
}

function buildQuery(filters: Filters, offset: number): Record<string, string> {
  const params: Record<string, string> = {
    limit: String(PAGE_SIZE),
    offset: String(offset),
  }
  const search = filters.search.trim()
  if (search) params.search = search
  if (filters.category !== ALL) params.category = filters.category
  if (filters.type !== ALL) params.type = filters.type
  const dateFrom = periodStart(filters.period)
  if (dateFrom) params.date_from = dateFrom
  return params
}

async function fetchTransactionPage(
  filters: Filters,
  offset: number,
): Promise<PaginatedResponse<Transaction>> {
  const response = await apiClient.get<PaginatedResponse<Transaction>>('/transactions/', {
    params: buildQuery(filters, offset),
  })
  return response.data
}

// Keep the list in the server's order after a local edit changed a date.
function sortNewestFirst(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    const byDate = parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
    return byDate !== 0 ? byDate : Number(b.id) - Number(a.id)
  })
}

export default function Transactions() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  // The search box updates immediately; the request only fires once typing
  // pauses, so every keystroke does not hit the API.
  const [searchInput, setSearchInput] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilters((prev) =>
        prev.search === searchInput ? prev : { ...prev, search: searchInput },
      )
    }, 300)
    return () => window.clearTimeout(handle)
  }, [searchInput])

  // First page: re-run whenever a filter changes and drop what was loaded
  // before, because the offsets of the old list no longer mean anything.
  useEffect(() => {
    let cancelled = false
    const loadFirstPage = async () => {
      setIsLoading(true)
      try {
        const page = await fetchTransactionPage(filters, 0)
        if (cancelled) return
        setTransactions(page.results)
        setTotalCount(page.count)
        setHasMore(page.next !== null)
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load transactions:', error)
        toast({
          title: 'Fehler',
          description: 'Transaktionen konnten nicht geladen werden.',
          variant: 'destructive',
        })
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadFirstPage()
    return () => {
      cancelled = true
    }
  }, [filters, toast])

  const handleLoadMore = useCallback(async () => {
    setIsLoadingMore(true)
    try {
      // Offset by what is on screen rather than by page number, so a row
      // deleted in between does not make the next page skip one.
      const page = await fetchTransactionPage(filters, transactions.length)
      setTransactions((prev) => {
        const known = new Set(prev.map((t) => t.id))
        return [...prev, ...page.results.filter((t) => !known.has(t.id))]
      })
      setTotalCount(page.count)
      setHasMore(page.next !== null)
    } catch (error) {
      console.error('Failed to load more transactions:', error)
      toast({
        title: 'Fehler',
        description: 'Weitere Transaktionen konnten nicht geladen werden.',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingMore(false)
    }
  }, [filters, transactions.length, toast])

  const handleDeleteTransaction = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/transactions/${id}/`)
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      setTotalCount((count) => Math.max(0, count - 1))
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
  }, [toast])

  const handleUpdateTransaction = useCallback(async (updated: Transaction) => {
    try {
      const response = await apiClient.put<Transaction>(`/transactions/${updated.id}/`, updated)
      setTransactions((prev) =>
        sortNewestFirst(prev.map((t) => (t.id === updated.id ? response.data : t))),
      )
      setSelectedTransaction(response.data)
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
  }, [toast])

  const handleSelectTransaction = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsDetailsOpen(true)
  }, [])

  const updateFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setSearchInput('')
    setFilters(DEFAULT_FILTERS)
  }, [])

  const hasActiveFilters = useMemo(
    () =>
      searchInput.trim() !== '' ||
      filters.category !== ALL ||
      filters.type !== ALL ||
      filters.period !== ALL,
    [searchInput, filters],
  )

  const listTitle = isLoading
    ? 'Transaktionen'
    : `Transaktionen (${transactions.length} von ${totalCount})`

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-center gap-4">
          <Button asChild variant="outline" size="icon" aria-label="Zurück zum Dashboard">
            <Link to="/">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
              <ListOrdered className="size-4" /> Übersicht
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Transaktionen
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Durchsuchen und filtern Sie alle Ihre Einnahmen und Ausgaben.
            </p>
          </div>
        </header>

        <section className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Titel oder Notizen durchsuchen…"
              aria-label="Transaktionen durchsuchen"
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex">
            <Select
              value={filters.category}
              onValueChange={(value) => updateFilter('category', value)}
            >
              <SelectTrigger className="w-full lg:w-44" aria-label="Kategorie">
                <SelectValue placeholder="Kategorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Alle Kategorien</SelectItem>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.type}
              onValueChange={(value) => updateFilter('type', value as TypeFilter)}
            >
              <SelectTrigger className="w-full lg:w-40" aria-label="Art">
                <SelectValue placeholder="Art" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Einnahmen & Ausgaben</SelectItem>
                <SelectItem value="income">Nur Einnahmen</SelectItem>
                <SelectItem value="expense">Nur Ausgaben</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.period}
              onValueChange={(value) => updateFilter('period', value as PeriodFilter)}
            >
              <SelectTrigger className="w-full lg:w-44" aria-label="Zeitraum">
                <SelectValue placeholder="Zeitraum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Gesamter Zeitraum</SelectItem>
                <SelectItem value="current-month">Aktueller Monat</SelectItem>
                <SelectItem value="last-2-months">Letzte 2 Monate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="w-fit">
              <X /> Filter zurücksetzen
            </Button>
          )}
        </section>

        <TransactionList
          title={listTitle}
          transactions={transactions}
          isLoading={isLoading}
          groupByMonth
          onSelectTransaction={handleSelectTransaction}
          emptyMessage={
            hasActiveFilters
              ? 'Keine Transaktionen für die gewählten Filter gefunden'
              : 'Noch keine Transaktionen vorhanden'
          }
          footer={
            hasMore ? (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? <Spinner /> : <ChevronDown />}
                  {`${PAGE_SIZE} weitere laden`}
                </Button>
              </div>
            ) : null
          }
        />
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
