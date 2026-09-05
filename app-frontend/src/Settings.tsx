import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  BellRing,
  CalendarClock,
  Check,
  ChevronRight,
  Heart,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  WalletCards,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

const initialTemplates = [
  { id: '1', title: 'Wöchentlicher Einkauf', category: 'Lebensmittel', amount: '85,00 €', type: 'expense' },
  { id: '2', title: 'Monatsmiete', category: 'Wohnen', amount: '1.200,00 €', type: 'expense' },
  { id: '3', title: 'Freelance Zahlung', category: 'Gehalt', amount: '800,00 €', type: 'income' },
]

const initialThresholds = [
  { id: '1', category: 'Lebensmittel', limit: '450', spent: '312,40', color: 'bg-primary' },
  { id: '2', category: 'Unterhaltung', limit: '150', spent: '118,90', color: 'bg-chart-2' },
  { id: '3', category: 'Transport', limit: '220', spent: '89,00', color: 'bg-chart-3' },
  { id: '4', category: 'Wohnen', limit: '1.300', spent: '1.200,00', color: 'bg-chart-4' },
]

const initialScheduled = [
  { id: '1', title: 'Miete', category: 'Wohnen', amount: '1.200,00 €', cadence: 'Monatlich', next: '01.06.2026', active: true },
  { id: '2', title: 'Netflix', category: 'Unterhaltung', amount: '17,99 €', cadence: 'Monatlich', next: '08.06.2026', active: true },
  { id: '3', title: 'Versicherung', category: 'Versicherung', amount: '320,00 €', cadence: 'Vierteljährlich', next: '15.07.2026', active: false },
]

export default function Settings() {
  const [templates, setTemplates] = useState(initialTemplates)
  const [thresholds, setThresholds] = useState(initialThresholds)
  const [scheduled, setScheduled] = useState(initialScheduled)
  const [templateTitle, setTemplateTitle] = useState('')
  const { toast } = useToast()

  const notify = (title: string, description: string) =>
    toast({ title, description })

  const addTemplate = () => {
    if (!templateTitle.trim()) return
    setTemplates((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        title: templateTitle.trim(),
        category: 'Sonstiges',
        amount: '0,00 €',
        type: 'expense',
      },
    ])
    setTemplateTitle('')
    notify(
      'Vorlage gespeichert',
      'Die neue Schnellvorlage wurde zu Ihren Favoriten hinzugefügt.',
    )
  }

  const updateThreshold = (id: string, limit: string) => {
    setThresholds((current) =>
      current.map((item) => (item.id === id ? { ...item, limit } : item)),
    )
  }

  const saveThresholds = () =>
    notify('Limits gespeichert', 'Ihre Kategorie-Limits wurden aktualisiert.')

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon" aria-label="Zurück zum Dashboard">
              <Link to="/">
                <ArrowLeft />
              </Link>
            </Button>
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                <SlidersHorizontal className="size-4" /> Kontoeinstellungen
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Einstellungen
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Automatisieren Sie Ihr Budget und behalten Sie Ihre Regeln im Blick.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="w-fit gap-2 px-3 py-1.5">
            <Check className="size-3.5" /> Änderungen werden lokal gespeichert
          </Badge>
        </header>

        <Tabs defaultValue="favorites" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-3 bg-card p-1 lg:w-fit">
            <TabsTrigger value="favorites" className="gap-2 px-5 py-2.5">
              <Heart className="size-4" /> Favoriten
            </TabsTrigger>
            <TabsTrigger value="thresholds" className="gap-2 px-5 py-2.5">
              <BellRing className="size-4" /> Schwellenwerte
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="gap-2 px-5 py-2.5">
              <CalendarClock className="size-4" /> Geplant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="favorites" className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Schnellvorlagen</CardTitle>
                <CardDescription>
                  Häufige Transaktionen mit einem Klick vorausfüllen.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between rounded-xl border bg-muted/20 p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <WalletCards className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{template.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {template.category} · {template.amount}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${template.title} löschen`}
                      onClick={() =>
                        setTemplates((current) =>
                          current.filter((item) => item.id !== template.id),
                        )
                      }
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Favorit hinzufügen</CardTitle>
                <CardDescription>
                  Erstellen Sie eine neue Vorlage für Ihre Transaktionen.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="template-title">Name der Vorlage</Label>
                  <Input
                    id="template-title"
                    placeholder="z. B. Coffee to go"
                    value={templateTitle}
                    onChange={(event) => setTemplateTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') addTemplate()
                    }}
                  />
                </div>
                <Button onClick={addTemplate}>
                  <Plus /> Vorlage erstellen
                </Button>
                <Separator />
                <div className="rounded-lg bg-primary/5 p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Tipp</p>
                  <p className="mt-1">
                    Sie können Schnellvorlagen später direkt im Transaktionsformular verwenden.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="thresholds" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Kategorie-Limits</CardTitle>
                  <CardDescription>
                    Definieren Sie monatliche Budgets und erhalten Sie eine Warnung vor dem Limit.
                  </CardDescription>
                </div>
                <Button onClick={saveThresholds}>
                  <Save /> Limits speichern
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {thresholds.map((threshold) => {
                  const progress = Math.min(
                    (Number(threshold.spent.replace('.', '').replace(',', '.')) /
                      Number(threshold.limit.replace('.', '').replace(',', '.'))) *
                      100,
                    100,
                  )
                  return (
                    <div
                      key={threshold.id}
                      className="flex flex-col gap-3 rounded-xl border p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{threshold.category}</p>
                          <p className="text-sm text-muted-foreground">
                            {threshold.spent} € von {threshold.limit} € verwendet
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`limit-${threshold.id}`} className="sr-only">
                            Limit für {threshold.category}
                          </Label>
                          <Input
                            id={`limit-${threshold.id}`}
                            className="w-28 text-right"
                            value={threshold.limit}
                            onChange={(event) =>
                              updateThreshold(threshold.id, event.target.value)
                            }
                          />
                          <span className="text-sm text-muted-foreground">€ / Monat</span>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${threshold.color}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-start gap-3 p-5">
                <BellRing className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">Benachrichtigungen aktiv</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Du erhältst eine Warnung, sobald 80 % eines Kategorie-Limits erreicht sind.
                  </p>
                </div>
                <Switch
                  defaultChecked
                  className="ml-auto"
                  aria-label="Schwellenwert-Benachrichtigungen"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduled" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Geplante Transaktionen</CardTitle>
                <CardDescription>
                  Wiederkehrende Einnahmen und Ausgaben für eine bessere Planung.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {scheduled.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                        <CalendarClock className="size-4 text-secondary-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.category} · {item.cadence} · Nächster Termin {item.next}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <p className="font-semibold">{item.amount}</p>
                      <Switch
                        checked={item.active}
                        onCheckedChange={(active) =>
                          setScheduled((current) =>
                            current.map((entry) =>
                              entry.id === item.id ? { ...entry, active } : entry,
                            ),
                          )
                        }
                        aria-label={`${item.title} aktivieren`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${item.title} löschen`}
                        onClick={() =>
                          setScheduled((current) =>
                            current.filter((entry) => entry.id !== item.id),
                          )
                        }
                      >
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Button
              variant="outline"
              onClick={() =>
                notify(
                  'Neue geplante Transaktion',
                  'Das Formular für geplante Transaktionen ist vorbereitet.',
                )
              }
            >
              <Plus /> Geplante Transaktion hinzufügen <ChevronRight />
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
