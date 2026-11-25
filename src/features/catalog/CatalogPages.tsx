
import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Pencil, Plus, Trash2, Building2, UtensilsCrossed
} from 'lucide-react'
import {
  catalogService,
  type HallInput,
  type MenuInput
} from '@/services/catalog.service'
import {
  useHalls, useMenus, useItems, useInvalidate
} from '@/hooks/queries'
import { useFormat } from '@/hooks/useFormat'
import { AppError } from '@/lib/axios'
import {
  Button, Card, ConfirmDialog, EmptyState,
  Field, Input, PageHeader, QueryBoundary,
  SectionCard, Select, TableShell
} from '@/components/ui'
import type { Hall, Menu, MenuIngredient } from '@/types'

function errorText(error: unknown): string {
  if (error instanceof AppError) {
    const first = Object.values(error.fields ?? {}).flat()[0]
    return first ?? error.message
  }
  return error instanceof Error
    ? error.message
    : 'Request failed'
}

const blankHall: HallInput = {
  name: '',
  capacity: 100
}

const blankMenu: MenuInput = {
  name: '',
  pricePerPerson: 0,
  ingredients: []
}

// ==========================================
// HALL MANAGEMENT
// ==========================================

export function HallsPage() {
  const { t } = useTranslation()
  const halls = useHalls()
  const invalidate = useInvalidate()

  const [editing, setEditing] = useState<Hall | null>(null)
  const [form, setForm] = useState<HallInput>(blankHall)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<Hall | null>(null)
  const [error, setError] = useState('')

  const save = useMutation({
    mutationFn: () =>
      editing
        ? catalogService.updateHall(editing.id, form)
        : catalogService.createHall(form),

    onSuccess: async () => {
      await invalidate('halls', 'bookings')
      setShowForm(false)
      setEditing(null)
      setError('')
      toast.success(t('catalog.saved'))
    },

    onError: (e) => setError(errorText(e)),
  })

  const remove = useMutation({
    mutationFn: (id: string) =>
      catalogService.deleteHall(id),

    onSuccess: async () => {
      await invalidate('halls', 'bookings')
      setDeleting(null)
      toast.success(t('catalog.deleted'))
    },

    onError: (e) => {
      setDeleting(null)
      toast.error(errorText(e))
    },
  })

  function open(hall?: Hall) {
    setEditing(hall ?? null)
    setForm(
      hall
        ? { name: hall.name, capacity: hall.capacity }
        : { ...blankHall }
    )
    setShowForm(true)
    setError('')
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (
      !form.name.trim() ||
      !Number.isInteger(form.capacity) ||
      form.capacity < 1
    ) {
      setError(t('catalog.invalidHall'))
      return
    }

    setError('')
    save.mutate()
  }

  return (
    <>
      <PageHeader
        title={t('catalog.halls')}
        subtitle={t('catalog.hallsSubtitle')}
        actions={
          <Button onClick={() => open()}>
            <Plus className="size-4" />
            {t('catalog.addHall')}
          </Button>
        }
      />

      {showForm && (
        <SectionCard
          title={
            editing
              ? t('catalog.editHall')
              : t('catalog.addHall')
          }
          className="mb-5"
        >
          <form
            onSubmit={submit}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Field label={t('catalog.hallName')} required>
              <Input
                value={form.name}
                maxLength={255}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value
                  })
                }
                required
              />
            </Field>

            <Field label={t('catalog.capacity')} required>
              <Input
                type="number"
                min={1}
                step={1}
                value={form.capacity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    capacity: Number(e.target.value)
                  })
                }
                required
              />
            </Field>

            {error && (
              <p
                role="alert"
                className="text-sm text-red-600 sm:col-span-2"
              >
                {error}
              </p>
            )}

            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" loading={save.isPending}>
                {t('common.save')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowForm(false)}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </SectionCard>
      )}

      <QueryBoundary queries={[halls]}>
        <Card>
          {(halls.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Building2}
              title={t('catalog.noHalls')}
              action={
                <Button onClick={() => open()}>
                  <Plus className="size-4" />
                  {t('catalog.addHall')}
                </Button>
              }
            />
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <th className="th">{t('catalog.hallName')}</th>
                  <th className="th">{t('catalog.capacity')}</th>
                  <th className="th">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {halls.data?.map((hall) => (
                  <tr
                    key={hall.id}
                    className="border-t border-line hover:bg-slate-50"
                  >
                    <td className="td font-medium">
                      {hall.name}
                    </td>
                    <td className="td">{hall.capacity}</td>
                    <td className="td">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => open(hall)}
                          aria-label={t('common.edit')}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => setDeleting(hall)}
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </Card>
      </QueryBoundary>

      <ConfirmDialog
        open={!!deleting}
        title={t('common.delete')}
        message={t('catalog.deleteHallConfirm')}
        confirmLabel={t('common.delete')}
        loading={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting && remove.mutate(deleting.id)
        }
      />
    </>
  )
}

// ==========================================
// MENU MANAGEMENT
// ==========================================

export function MenusPage() {
  const { t } = useTranslation()
  const { money } = useFormat()

  const menus = useMenus()
  const items = useItems()
  const invalidate = useInvalidate()

  const [editing, setEditing] = useState<Menu | null>(null)
  const [form, setForm] = useState<MenuInput>(blankMenu)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<Menu | null>(null)
  const [error, setError] = useState('')

  const itemMap = new Map(
    (items.data ?? []).map((i) => [i.id, i])
  )

  const save = useMutation({
    mutationFn: () =>
      editing
        ? catalogService.updateMenu(editing.id, form)
        : catalogService.createMenu(form),

    onSuccess: async () => {
      await invalidate('menus', 'bookings')
      setShowForm(false)
      setEditing(null)
      setError('')
      toast.success(t('catalog.saved'))
    },

    onError: (e) => setError(errorText(e)),
  })

  const remove = useMutation({
    mutationFn: (id: string) =>
      catalogService.deleteMenu(id),

    onSuccess: async () => {
      await invalidate('menus', 'bookings')
      setDeleting(null)
      toast.success(t('catalog.deleted'))
    },

    onError: (e) => {
      setDeleting(null)
      toast.error(errorText(e))
    },
  })

  function open(menu?: Menu) {
    setEditing(menu ?? null)

    setForm(
      menu
        ? {
            name: menu.name,
            pricePerPerson: menu.pricePerPerson,
            ingredients: menu.ingredients.map(
              (i) => ({ ...i })
            ),
          }
        : {
            name: '',
            pricePerPerson: 0,
            ingredients: [],
          }
    )

    setError('')
    setShowForm(true)
  }

  function changeIngredient(
    index: number,
    patch: Partial<MenuIngredient>
  ) {
    setForm((previous) => ({
      ...previous,
      ingredients: previous.ingredients.map(
        (line, i) =>
          i === index ? { ...line, ...patch } : line
      ),
    }))
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (
      !form.name.trim() ||
      !Number.isFinite(form.pricePerPerson) ||
      form.pricePerPerson < 0
    ) {
      setError(t('catalog.invalidMenu'))
      return
    }

    if (
      form.ingredients.some(
        (line) =>
          !line.inventoryItemId ||
          !Number.isFinite(line.perPerson) ||
          line.perPerson <= 0
      )
    ) {
      setError(t('catalog.invalidIngredient'))
      return
    }

    if (
      new Set(
        form.ingredients.map((i) => i.inventoryItemId)
      ).size !== form.ingredients.length
    ) {
      setError(t('catalog.duplicateIngredient'))
      return
    }

    setError('')
    save.mutate()
  }

  return (
    <>
      <PageHeader
        title={t('catalog.menus')}
        subtitle={t('catalog.menusSubtitle')}
        actions={
          <Button onClick={() => open()}>
            <Plus className="size-4" />
            {t('catalog.addMenu')}
          </Button>
        }
      />

      {showForm && (
        <SectionCard
          title={
            editing
              ? t('catalog.editMenu')
              : t('catalog.addMenu')
          }
          className="mb-5"
        >
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('catalog.menuName')} required>
                <Input
                  value={form.name}
                  maxLength={255}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value
                    })
                  }
                  required
                />
              </Field>

              <Field
                label={t('catalog.pricePerPerson')}
                required
              >
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={form.pricePerPerson}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pricePerPerson: Number(e.target.value)
                    })
                  }
                  required
                />
              </Field>
            </div>

            <div className="border-t border-line pt-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">
                    {t('catalog.recipe')}
                  </h3>
                  <p className="text-xs text-muted">
                    {t('catalog.recipeHint')}
                  </p>
                </div>

                <Button
                  variant="secondary"
                  disabled={!items.data?.length}
                  onClick={() =>
                    setForm({
                      ...form,
                      ingredients: [
                        ...form.ingredients,
                        {
                          inventoryItemId: '',
                          perPerson: 0
                        }
                      ]
                    })
                  }
                >
                  <Plus className="size-4" />
                  {t('catalog.addIngredient')}
                </Button>
              </div>

              <QueryBoundary queries={[items]}>
                {form.ingredients.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-muted">
                    {t('catalog.noIngredients')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {form.ingredients.map((line, index) => (
                      <div
                        key={index}
                        className="grid items-end gap-3 rounded-lg border border-line p-3 sm:grid-cols-[1fr_170px_auto]"
                      >
                        <Field
                          label={t('catalog.stockItem')}
                          required
                        >
                          <Select
                            value={line.inventoryItemId}
                            onChange={(e) =>
                              changeIngredient(index, {
                                inventoryItemId: e.target.value
                              })
                            }
                            required
                          >
                            <option value="">
                              {t('common.select')}
                            </option>
                            {items.data?.map((item) => (
                              <option
                                key={item.id}
                                value={item.id}
                              >
                                {item.name} ({item.unit})
                              </option>
                            ))}
                          </Select>
                        </Field>

                        <Field
                          label={t('catalog.perGuest')}
                          required
                        >
                          <Input
                            type="number"
                            min="0.000001"
                            step="any"
                            value={line.perPerson}
                            onChange={(e) =>
                              changeIngredient(index, {
                                perPerson: Number(
                                  e.target.value
                                )
                              })
                            }
                            required
                          />
                        </Field>

                        <Button
                          variant="danger"
                          onClick={() =>
                            setForm({
                              ...form,
                              ingredients:
                                form.ingredients.filter(
                                  (_, i) => i !== index
                                )
                            })
                          }
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </QueryBoundary>
            </div>

            {error && (
              <p
                role="alert"
                className="text-sm text-red-600"
              >
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button type="submit" loading={save.isPending}>
                {t('common.save')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowForm(false)}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </SectionCard>
      )}

      <QueryBoundary queries={[menus]}>
        <Card>
          {(menus.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title={t('catalog.noMenus')}
              action={
                <Button onClick={() => open()}>
                  <Plus className="size-4" />
                  {t('catalog.addMenu')}
                </Button>
              }
            />
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <th className="th">
                    {t('catalog.menuName')}
                  </th>
                  <th className="th">
                    {t('catalog.pricePerPerson')}
                  </th>
                  <th className="th">
                    {t('catalog.recipe')}
                  </th>
                  <th className="th">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {menus.data?.map((menu) => (
                  <tr
                    key={menu.id}
                    className="border-t border-line hover:bg-slate-50"
                  >
                    <td className="td font-medium">
                      {menu.name}
                    </td>
                    <td className="td">
                      {money(menu.pricePerPerson)}
                    </td>
                    <td className="td">
                      <div className="max-w-sm text-xs text-muted">
                        {menu.ingredients.length
                          ? menu.ingredients
                              .map(
                                (line) =>
                                  `${
                                    itemMap.get(
                                      line.inventoryItemId
                                    )?.name ??
                                    line.inventoryItemId
                                  }: ${line.perPerson} ${
                                    itemMap.get(
                                      line.inventoryItemId
                                    )?.unit ?? ''
                                  }`
                              )
                              .join(' · ')
                          : t('catalog.noIngredients')}
                      </div>
                    </td>
                    <td className="td">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => open(menu)}
                          aria-label={t('common.edit')}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => setDeleting(menu)}
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </Card>
      </QueryBoundary>

      <ConfirmDialog
        open={!!deleting}
        title={t('common.delete')}
        message={t('catalog.deleteMenuConfirm')}
        confirmLabel={t('common.delete')}
        loading={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting && remove.mutate(deleting.id)
        }
      />
    </>
  )
}
