import { Link } from 'react-router-dom'
import { ArrowLeft, ListOrdered } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function TransactionsHeader() {
  return (
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
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Transaktionen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Durchsuchen und filtern Sie alle Ihre Einnahmen und Ausgaben.
        </p>
      </div>
    </header>
  )
}
