import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSaveGift } from '@/hooks/useGifts'
import type { GiftRecord } from '@/types'

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function GiftForm({ record }: { record: GiftRecord }) {
  const save = useSaveGift(record.birthdayId, record.year)
  const [description, setDescription] = useState(record.description)
  const [notes, setNotes] = useState(record.notes)
  const [budget, setBudget] = useState(record.budget?.toString() ?? '')
  const [actualCost, setActualCost] = useState(record.actualCost?.toString() ?? '')

  // Re-seed the form when switching years or people.
  useEffect(() => {
    setDescription(record.description)
    setNotes(record.notes)
    setBudget(record.budget?.toString() ?? '')
    setActualCost(record.actualCost?.toString() ?? '')
  }, [record.birthdayId, record.year, record.description, record.notes, record.budget, record.actualCost])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    save.mutate({
      description,
      notes,
      budget: toNumberOrNull(budget),
      actualCost: toNumberOrNull(actualCost),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-primary)]"
            checked={record.purchased}
            onChange={(event) => save.mutate({ purchased: event.target.checked, ...(event.target.checked ? {} : { delivered: false }) })}
          />
          Gift purchased
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-primary)]"
            checked={record.delivered}
            onChange={(event) => save.mutate({ delivered: event.target.checked })}
          />
          Gift delivered
        </label>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Gift</Label>
        <Input
          id="description"
          value={description}
          placeholder="LEGO set"
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="budget">Budget</Label>
          <Input
            id="budget"
            inputMode="decimal"
            value={budget}
            placeholder="25000"
            onChange={(event) => setBudget(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="actualCost">Actual cost</Label>
          <Input
            id="actualCost"
            inputMode="decimal"
            value={actualCost}
            placeholder="22000"
            onChange={(event) => setActualCost(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          placeholder="Already wrapped"
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save gift details'}
        </Button>
        {save.isSuccess && !save.isPending && (
          <span className="text-sm text-muted-foreground">Saved locally.</span>
        )}
      </div>
    </form>
  )
}
