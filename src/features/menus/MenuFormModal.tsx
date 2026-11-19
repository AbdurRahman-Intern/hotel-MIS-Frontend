import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { menuService, type MenuInput } from '@/services/menus.service'
import { AppError } from '@/lib/axios'
import { useInvalidate, useItems } from '@/hooks/queries'
import { useFormat } from '@/hooks/useFormat'
import { menuCost } from '@/lib/domain'
import { Button, Field, IconButton, Input, Modal, Select } from '@/components/ui'
import type { Menu } from '@/types'

/**
 * MenuFormModal  -  one dialog for three jobs:
 *   1. NEW menu            -> no props except open/onClose
 *   2. EDIT menu           -> pass `menu`
 *   3. COPY / CUSTOMIZE    -> pass `prefill` (name + price + recipe of another menu, already changed by the caller)
 *
 * Used on the Menus page and inside the booking form ("Customize for this customer").
 * The parent should give it a changing `key` so the form starts fresh every time it opens.
 */
interface Props {
  open: boolean
  onClose: () => void
  menu?: Menu
  prefill?: MenuInput
  /** How many bookings already use this menu (edit mode only) - shows a warning. */
  usedBy?: number
  /** Called with the saved menu, e.g. so a booking can select it. */
  onSaved?: (m: Menu) => void
}

const schema = z.object({
  name: z.string().trim().min(2, 'validation.required'),
  pricePerPerson: z.number('validation.number').min(0, 'validation.nonNegative'),
  ingredients: z.array(z.object({
    inventoryItemId: z.string().min(1, 'validation.required'),
    perPerson: z.number('validation.number').gt(0, 'menus.qtyPositive'),
  })).min(1, 'menus.needIngredient')
    .refine((rows) => new Set(rows.map((r) => r.inventoryItemId)).size === rows.length, 'menus.duplicateItem'),
})
type Values = z.infer<typeof schema>

export function MenuFormModal({ open, onClose, menu, prefill, usedBy = 0, onSaved }: Props) {
  const { t } = useTranslation()
  const { money } = useFormat()
  const invalidate = useInvalidate()
  const items = useItems()
  const start: MenuInput = menu ?? prefill ?? { name: '', pricePerPerson: 0, ingredients: [{ inventoryItemId: '', perPerson: 0 }] }

  const { register, handleSubmit, control, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: start.name, pricePerPerson: start.pricePerPerson, ingredients: start.ingredients.map((g) => ({ ...g })) },
  })
  const rows = useFieldArray({ control, name: 'ingredients' })
  const w = useWatch({ control })

  const list = items.data ?? []
  const cost = menuCost((w.ingredients ?? []).map((g) => ({ inventoryItemId: g?.inventoryItemId ?? '', perPerson: g?.perPerson ?? 0 })), list)
  const price = typeof w.pricePerPerson === 'number' && Number.isFinite(w.pricePerPerson) ? w.pricePerPerson : 0
  const margin = price - cost

  const save = useMutation({
    mutationFn: (v: Values) => (menu ? menuService.updateMenu(menu.id, v) : menuService.createMenu(v)),
    onSuccess: async (saved) => {
      await invalidate('menus', 'bookings')
      toast.success(t(menu ? 'menus.updated' : 'menus.created'))
      onSaved?.(saved)
      onClose()
    },
    onError: (e) => {
      if (e instanceof AppError && e.message === 'menu_name_taken') setError('name', { message: 'menus.nameTaken' })
      else toast.error(t('errors.generic'))
    },
  })

  const ingredientsError = errors.ingredients?.message ?? errors.ingredients?.root?.message
  const title = menu ? t('menus.edit') : t('menus.add')

  return (
    <Modal open={open} onClose={onClose} title={title} wide
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button loading={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>{t('common.save')}</Button></>}>
      <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-4">
        {menu && usedBy > 0 && (
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /><span>{t('menus.usedWarning', { count: usedBy })}</span>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('menus.name')} required error={errors.name?.message}><Input autoFocus placeholder={t('menus.namePlaceholder')} {...register('name')} /></Field>
          <Field label={t('menus.pricePerPerson')} required error={errors.pricePerPerson?.message}><Input type="number" min={0} step="any" {...register('pricePerPerson', { valueAsNumber: true })} /></Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">{t('menus.ingredients')}</p>
            <Button variant="secondary" onClick={() => rows.append({ inventoryItemId: '', perPerson: 0 })}><Plus className="size-4" />{t('menus.addIngredient')}</Button>
          </div>
          {list.length === 0 && <p className="mb-2 text-sm text-amber-700">{t('menus.noItems')}</p>}
          <div className="space-y-2">
            {rows.fields.map((f, i) => {
              const item = list.find((x) => x.id === w.ingredients?.[i]?.inventoryItemId)
              const qty = w.ingredients?.[i]?.perPerson
              const line = item && typeof qty === 'number' && Number.isFinite(qty) ? item.unitCost * qty : 0
              return (
                <div key={f.id} className="grid grid-cols-[1fr_7rem_auto] items-start gap-2 sm:grid-cols-[1fr_8rem_6rem_auto]">
                  <Field label="" error={errors.ingredients?.[i]?.inventoryItemId?.message} className="min-w-0">
                    <Select aria-label={t('menus.ingredients')} {...register(`ingredients.${i}.inventoryItemId`)}>
                      <option value="">{t('common.select')}</option>{list.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.unit})</option>)}
                    </Select>
                  </Field>
                  <Field label="" error={errors.ingredients?.[i]?.perPerson?.message}>
                    <div className="flex items-center gap-1">
                      <Input type="number" min={0} step="any" aria-label={t('menus.perPerson')} placeholder={t('menus.perPerson')} {...register(`ingredients.${i}.perPerson`, { valueAsNumber: true })} />
                      <span className="w-8 text-xs text-muted">{item?.unit}</span>
                    </div>
                  </Field>
                  <p className="hidden pt-2 text-end text-sm text-muted sm:block">{money(line)}</p>
                  <IconButton label={t('common.delete')} className="mt-1 text-red-500" onClick={() => rows.remove(i)}><Trash2 className="size-4" /></IconButton>
                </div>
              )
            })}
          </div>
          {ingredientsError && <p className="mt-1 text-xs text-red-600">{t(ingredientsError)}</p>}
        </div>

        <dl className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
          <div><dt className="text-muted">{t('menus.costPerPerson')}</dt><dd className="font-semibold">{money(cost)}</dd></div>
          <div><dt className="text-muted">{t('menus.margin')}</dt><dd className={margin < 0 ? 'font-semibold text-red-600' : 'font-semibold text-emerald-600'}>{money(margin)}</dd></div>
        </dl>
      </form>
    </Modal>
  )
}
