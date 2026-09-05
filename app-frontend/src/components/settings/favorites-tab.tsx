'use client'

import { useState } from 'react'
import { Plus, Trash2, WalletCards } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'

interface Template {
  id: string
  title: string
  category: string
  amount: string
  type: 'expense' | 'income'
}

const initialTemplates: Template[] = [
  { id: '1', title: 'Wöchentlicher Einkauf', category: 'Lebensmittel', amount: '85,00 €', type: 'expense' },
  { id: '2', title: 'Monatsmiete', category: 'Wohnen', amount: '1.200,00 €', type: 'expense' },
  { id: '3', title: 'Freelance Zahlung', category: 'Gehalt', amount: '800,00 €', type: 'income' },
]

export function FavoritesTab() {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const [templateTitle, setTemplateTitle] = useState('')
  const { toast } = useToast()

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
    toast({
      title: 'Vorlage gespeichert',
      description: 'Die neue Schnellvorlage wurde zu Ihren Favoriten hinzugefügt.',
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
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
    </div>
  )
}
