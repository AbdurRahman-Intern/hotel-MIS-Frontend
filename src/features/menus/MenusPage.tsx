import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Copy, Pencil, Plus, Trash2, UtensilsCrossed } from 'lucide-react'
import { menuService } from '@/services/menus.service'
import { AppError } from '@/lib/axios'
import { useBookings, useInvalidate, useItems, useMenus } from '@/hooks/queries'
import { useFormat } from '@/hooks/useFormat'
import { menuCost } from '@/lib/domain'
import { Button, Card, ConfirmDialog, EmptyState, IconButton, PageHeader, QueryBoundary, TableShell } from '@/components/ui'
import { MenuFormModal } from './MenuFormModal'
import type { Menu } from '@/types'

/**
 * MenusPage  -  the hotel owner creates and manages food menus here.
 * Each menu has a price per person and a recipe. Bookings pick a menu (see BookingForm).
 * Table columns: name, price, ingredient count, cost/person, margin, used-by, actions.
 */
export function MenusPage() {
  const { t } = useTranslation()
  const { money } = useFormat()
  const invalidate = useInvalidate()
  const menus = useMenus(); const items = useItems(); const bookings = useBookings()

  // The dialog: `nonce` changes every time it opens so the form starts fresh.
  const [dlg, setDlg] = useState<{ nonce: number; menu?: Menu; copyOf?: Menu } | null>(null)
  const [del, setDel] = useState<Menu | null>(null)
  const open = (extra: { menu?: Menu; copyOf?: Menu } = {}) => setDlg({ nonce: Date.now(), ...extra })

  const usedBy = (id: string) => (bookings.data ?? []).filter((b) => b.menuId === id).length

  const delM = useMutation({
    mutationFn: (id: string) => menuService.deleteMenu(id),
    onSuccess: async () => { await invalidate('menus'); toast.success(t('menus.deleted')); setDel(null) },
    onError: (e) => {
      setDel(null)
      toast.error(e instanceof AppError && e.message === 'menu_in_use' ? t('menus.inUse') : t('errors.generic'))
    },
  })

  const rows = menus.data ?? []
  return (
    <>
      <PageHeader title={t('menus.title')} subtitle={t('menus.subtitle')} actions={<Button onClick={() => open()}><Plus className="size-4" />{t('menus.add')}</Button>} />
      <QueryBoundary queries={[menus, items, bookings]}>
        <Card>
          {rows.length === 0 ? <EmptyState icon={UtensilsCrossed} title={t('menus.empty')} action={<Button onClick={() => open()}><Plus className="size-4" />{t('menus.add')}</Button>} /> : (
            <TableShell>
              <thead><tr><th className="th">{t('menus.name')}</th><th className="th">{t('menus.pricePerPerson')}</th><th className="th">{t('menus.ingredients')}</th><th className="th">{t('menus.costPerPerson')}</th><th className="th">{t('menus.margin')}</th><th className="th">{t('menus.usedBy')}</th><th className="th">{t('common.actions')}</th></tr></thead>
              <tbody>{rows.map((m) => {
                const cost = menuCost(m.ingredients, items.data ?? [])
                const margin = m.pricePerPerson - cost
                return (
                  <tr key={m.id} className="border-t border-line hover:bg-slate-50">
                    <td className="td font-medium">{m.name}</td>
                    <td className="td whitespace-nowrap">{money(m.pricePerPerson)}</td>
                    <td className="td">{m.ingredients.length}</td>
                    <td className="td whitespace-nowrap">{money(cost)}</td>
                    <td className={`td whitespace-nowrap ${margin < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{money(margin)}</td>
                    <td className="td">{usedBy(m.id)}</td>
                    <td className="td"><div className="flex gap-0.5">
                      <IconButton label={t('common.edit')} className="text-brand-600" onClick={() => open({ menu: m })}><Pencil className="size-4" /></IconButton>
                      <IconButton label={t('menus.duplicate')} className="text-slate-600" onClick={() => open({ copyOf: m })}><Copy className="size-4" /></IconButton>
                      <IconButton label={t('common.delete')} className="text-red-500" onClick={() => setDel(m)}><Trash2 className="size-4" /></IconButton>
                    </div></td>
                  </tr>)
              })}</tbody>
            </TableShell>)}
        </Card>
      </QueryBoundary>

      {dlg && <MenuFormModal key={dlg.nonce} open onClose={() => setDlg(null)} menu={dlg.menu} usedBy={dlg.menu ? usedBy(dlg.menu.id) : 0}
        prefill={dlg.copyOf ? { name: `${dlg.copyOf.name} (${t('menus.copy')})`, pricePerPerson: dlg.copyOf.pricePerPerson, ingredients: dlg.copyOf.ingredients } : undefined} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} loading={delM.isPending} title={t('menus.deleteTitle')} message={t('menus.deleteConfirm', { name: del?.name ?? '' })} confirmLabel={t('common.delete')} onConfirm={() => del && delM.mutate(del.id)} />
    </>
  )
}
