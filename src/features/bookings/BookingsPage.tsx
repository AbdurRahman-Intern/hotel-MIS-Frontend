/**
 * BookingsPage.tsx  -  the "All bookings" screen  (URL: /hotel/bookings)
 *
 * WHAT THE USER SEES
 *   1. Four summary cards (bookings this month, this year, booked revenue, pending payments)
 *   2. A filter bar (search, status, event type, from/to dates)
 *   3. A table of bookings, 10 per page
 *   4. Click a row  ->  the booking details slide in from the right (a "drawer")
 *   5. Click the red X on a row  ->  a confirmation dialog, then the booking is cancelled
 *
 * HOW THIS FILE IS ORGANISED (read it top to bottom)
 *   A. Imports
 *   B. Constants and the filter function
 *   C. Small components:  SummaryCards, FilterBar, BookingsTable, DetailsDrawer
 *   D. BookingsPage       -  the main component. It owns the state and puts the pieces together.
 *
 * WHERE THE DATA COMES FROM
 *   useBookings()      -> loads bookings from the API (src/services/bookings.service.ts)
 *   calcBookingTotals  -> money maths: total, received, remaining (src/lib/domain.ts)
 *   The server never sends totals; every screen calculates them with the SAME function.
 *
 * TODO ideas for beginners: add a "Hall" filter, add a CSV export button, close the drawer with the Escape key.
 */

// ---------------------------------------------------------------------------------------------
// A. IMPORTS
// ---------------------------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarCheck,
  CalendarDays,
  CalendarHeart,
  Clock,
  Eye,
  FileText,
  Pencil,
  Plus,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

import { useBookings, useInvalidate } from "@/hooks/queries";
import { useFormat } from "@/hooks/useFormat";
import { bookingService } from "@/services/bookings.service";
import { calcBookingTotals, isRevenueBooking, sum } from "@/lib/domain";
import {
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Input,
  LinkButton,
  PageHeader,
  Pagination,
  QueryBoundary,
  SearchInput,
  Select,
  StatCard,
  StatusBadge,
  TableShell,
  usePagination,
} from "@/components/ui";
import { BookingDetailPanel } from "./BookingDetailPanel";
import type { Booking } from "@/types";

// ---------------------------------------------------------------------------------------------
// B. CONSTANTS AND THE FILTER FUNCTION
// ---------------------------------------------------------------------------------------------

/** Values of the "status" dropdown. The visible names come from the translation files (status.draft ...). */
const STATUSES = ["draft", "pending", "confirmed", "completed", "cancelled"];

/** Values of the "event type" dropdown (eventTypes.Wedding ...). */
const EVENT_TYPES = [
  "Wedding",
  "Engagement",
  "Reception",
  "Birthday",
  "Corporate",
  "Other",
];

/** Everything the user can type or choose in the filter bar. An empty string means "no filter". */
type Filters = {
  search: string;
  status: string;
  type: string;
  from: string; // 'YYYY-MM-DD'
  to: string; // 'YYYY-MM-DD'
};

/**
 * Applies the filter bar to the list of bookings and sorts the result, newest event first.
 * A booking stays in the list only if it passes EVERY active filter.
 *
 * @param bookings  all bookings of this hotel
 * @param filters   the current filter bar values
 */
function filterBookings(bookings: Booking[], filters: Filters): Booking[] {
  const text = filters.search.trim().toLowerCase();

  return bookings
    .filter((b) => {
      // The search box looks in the client name, phone and booking reference.
      const matchesSearch =
        !text ||
        `${b.clientName} ${b.clientPhone} ${b.reference}`
          .toLowerCase()
          .includes(text);
      const matchesStatus = !filters.status || b.status === filters.status;
      const matchesType = !filters.type || b.eventType === filters.type;
      // Dates are 'YYYY-MM-DD' text, so comparing them as text also compares them as dates.
      const matchesFrom = !filters.from || b.eventDate >= filters.from;
      const matchesTo = !filters.to || b.eventDate <= filters.to;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesFrom &&
        matchesTo
      );
    })
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
}

// ---------------------------------------------------------------------------------------------
// C. SMALL COMPONENTS
// ---------------------------------------------------------------------------------------------

/**
 * The four statistic cards at the top.
 * "live" = bookings that count as revenue (not cancelled drafts). See isRevenueBooking in src/lib/domain.ts.
 */
function SummaryCards({ bookings }: { bookings: Booking[] }) {
  const { t } = useTranslation();
  const { money, num } = useFormat();

  const thisMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const live = bookings.filter(isRevenueBooking);
  const liveThisMonth = live.filter((b) => b.eventDate.startsWith(thisMonth));

  // Revenue the hotel has BOOKED this month (contract value, not cash received).
  const monthRevenue = sum(
    liveThisMonth.map((b) => calcBookingTotals(b).estimatedTotal),
  );

  // Bookings where the client still owes money.
  const withBalance = live.filter((b) => calcBookingTotals(b).remaining > 0);
  const pendingMoney = sum(
    withBalance.map((b) => calcBookingTotals(b).remaining),
  );

  return (
    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={CalendarCheck}
        tone="blue"
        label={t("bookings.statMonth")}
        value={num(liveThisMonth.length)}
      />
      <StatCard
        icon={CalendarHeart}
        tone="pink"
        label={t("bookings.statYear")}
        value={num(live.length)}
      />
      <StatCard
        icon={Wallet}
        tone="green"
        label={t("bookings.statRevenue")}
        value={money(monthRevenue)}
        hint={t("bookings.bookedNote")}
      />
      <StatCard
        icon={Clock}
        tone="amber"
        label={t("bookings.statPending")}
        value={money(pendingMoney)}
        hint={t("bookings.pendingCount", { count: withBalance.length })}
      />
    </div>
  );
}

/**
 * The row of filters above the table.
 * It does not keep its own state: the parent passes the values in and gets changes back through `onChange`.
 * (This pattern is called a "controlled component".)
 *
 * @param filters   current values
 * @param onChange  called with ONLY the field that changed, e.g. onChange({ status: 'pending' })
 */
function FilterBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (change: Partial<Filters>) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
      <SearchInput
        value={filters.search}
        onChange={(value) => onChange({ search: value })}
        placeholder={t("bookings.searchPlaceholder")}
        className="min-w-52 flex-1"
      />

      <Select
        value={filters.status}
        onChange={(e) => onChange({ status: e.target.value })}
        className="w-36"
        aria-label={t("common.status")}
      >
        <option value="">{t("common.allStatuses")}</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`status.${s}`)}
          </option>
        ))}
      </Select>

      <Select
        value={filters.type}
        onChange={(e) => onChange({ type: e.target.value })}
        className="w-36"
        aria-label={t("bookings.eventType")}
      >
        <option value="">{t("bookings.allTypes")}</option>
        {EVENT_TYPES.map((s) => (
          <option key={s} value={s}>
            {t(`eventTypes.${s}`)}
          </option>
        ))}
      </Select>

      <Input
        type="date"
        value={filters.from}
        onChange={(e) => onChange({ from: e.target.value })}
        className="w-40"
        aria-label={t("common.from")}
      />
      <Input
        type="date"
        value={filters.to}
        onChange={(e) => onChange({ to: e.target.value })}
        className="w-40"
        aria-label={t("common.to")}
      />
    </div>
  );
}

/** Props of the table. `rows` is only the current page (10 bookings), not the whole list. */
type BookingsTableProps = {
  rows: Booking[];
  selectedId: string | null; // the row whose details are open (highlighted)
  onSelect: (id: string) => void; // a row was clicked
  onCancel: (booking: Booking) => void; // the red X was clicked
};

/**
 * The bookings table: one row per booking.
 * Columns: date, client, event, guests, total, advance (received), remaining, status, actions.
 */
function BookingsTable({
  rows,
  selectedId,
  onSelect,
  onCancel,
}: BookingsTableProps) {
  const { t } = useTranslation();
  const { money, num, date } = useFormat();

  return (
    <TableShell>
      <thead>
        <tr>
          <th className="th">{t("bookings.eventDate")}</th>
          <th className="th">{t("bookings.client")}</th>
          <th className="th">{t("bookings.eventType")}</th>
          <th className="th">{t("bookings.guests")}</th>
          <th className="th">{t("bookings.total")}</th>
          <th className="th">{t("bookings.advance")}</th>
          <th className="th">{t("bookings.remaining")}</th>
          <th className="th">{t("common.status")}</th>
          <th className="th">{t("common.actions")}</th>
        </tr>
      </thead>

      <tbody>
        {rows.map((b) => {
          const totals = calcBookingTotals(b); // { estimatedTotal, received, remaining }
          const isSelected = selectedId === b.id;
          // Money still owed is shown in red, except for cancelled bookings.
          const owesMoney = totals.remaining > 0 && b.status !== "cancelled";

          return (
            <tr
              key={b.id}
              onClick={() => onSelect(b.id)}
              className={`cursor-pointer border-t border-line hover:bg-slate-50 ${isSelected ? "bg-brand-50/60" : ""}`}
            >
              <td className="td whitespace-nowrap">
                {date(b.eventDate)}
                <span className="block text-xs text-muted">
                  {t(`shift.${b.shift}`)}
                </span>
              </td>

              <td className="td font-medium">
                {b.clientName}
                <span className="block text-xs font-normal text-muted ltr-isolate">
                  {b.clientPhone} · {b.reference}
                </span>
              </td>

              <td className="td">
                {t(`eventTypes.${b.eventType}`)}
                <span className="block text-xs text-muted">{b.hallName}</span>
              </td>

              <td className="td">{num(b.guestCount)}</td>
              <td className="td whitespace-nowrap">
                {money(totals.estimatedTotal)}
              </td>
              <td className="td whitespace-nowrap">{money(totals.received)}</td>
              <td
                className={`td whitespace-nowrap ${owesMoney ? "text-red-600" : ""}`}
              >
                {money(totals.remaining)}
              </td>
              <td className="td">
                <StatusBadge status={b.status} />
              </td>

              <td className="td">
                {/* stopPropagation: clicking a button must NOT also open the row's details drawer. */}
                <div
                  className="flex gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* View: always available */}
                  <Link
                    to={`/hotel/bookings/${b.id}`}
                    aria-label={t("common.view")}
                    title={t("common.view")}
                    className="rounded-md p-1.5 text-brand-600 hover:bg-slate-100"
                  >
                    <Eye className="size-4" />
                  </Link>

                  {/* Edit: not for cancelled bookings */}
                  {b.status !== "cancelled" && (
                    <Link
                      to={`/hotel/bookings/${b.id}/edit`}
                      aria-label={t("common.edit")}
                      title={t("common.edit")}
                      className="rounded-md p-1.5 text-brand-600 hover:bg-slate-100"
                    >
                      <Pencil className="size-4" />
                    </Link>
                  )}

                  {/* Cancel: only while the event is still open (not cancelled, not completed) */}
                  {b.status !== "cancelled" && b.status !== "completed" && (
                    <IconButton
                      label={t("bookings.cancel")}
                      className="text-red-500"
                      onClick={() => onCancel(b)}
                    >
                      <XCircle className="size-4" />
                    </IconButton>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </TableShell>
  );
}

/**
 * The slide-in panel with the full details of one booking (client, event, menu, payments ...).
 * The dark area behind it closes it when clicked. The details themselves are in BookingDetailPanel.tsx.
 *
 * @param booking  the booking to show
 * @param onClose  called when the user clicks the X or the dark background
 */
function DetailsDrawer({
  booking,
  onClose,
}: {
  booking: Booking;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-40"
      role="dialog"
      aria-modal="true"
      aria-label={t("bookings.details")}
    >
      {/* Dark background */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* The panel itself. `end-0` puts it on the right in English and on the left in Dari (RTL). */}
      <aside className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-base font-semibold">{t("bookings.details")}</h2>
          <IconButton label={t("common.close")} onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="p-4">
          <BookingDetailPanel booking={booking} />
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// D. THE PAGE
// ---------------------------------------------------------------------------------------------

export function BookingsPage() {
  const { t } = useTranslation();

  // ---- 1. State: values that, when changed, redraw the page -------------------------------------
  const [searchParams] = useSearchParams();
  // The top search bar can open this page with "?q=ahmad", so start the search box with that text.
  const [filters, setFilters] = useState<Filters>({
    search: searchParams.get("q") ?? "",
    status: "",
    type: "",
    from: "",
    to: "",
  });
  const [selectedId, setSelectedId] = useState<string | null>(null); // booking whose drawer is open
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null); // booking waiting for confirmation

  /** Updates only the filter fields that changed and keeps the others. */
  const changeFilters = (change: Partial<Filters>) =>
    setFilters((old) => ({ ...old, ...change }));

  // ---- 2. Data from the API --------------------------------------------------------------------
  const bookingsQuery = useBookings(); // { data, isLoading, error ... } from TanStack Query
  const refreshData = useInvalidate(); // tells TanStack Query "this data is old, load it again"
  const allBookings = bookingsQuery.data ?? [];

  // ---- 3. Cancel action ------------------------------------------------------------------------
  // useMutation = "an action that changes data on the server" (here: cancel a booking).
  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingService.cancelBooking(id),
    onSuccess: async () => {
      await refreshData("bookings"); // reload the list so the status shows "cancelled"
      toast.success(t("bookings.cancelled")); // small success message
      setBookingToCancel(null); // close the confirmation dialog
    },
  });

  // ---- 4. Work out what to display -------------------------------------------------------------
  // useMemo = only filter again when the list or a filter really changed (saves work on every redraw).
  const filteredBookings = useMemo(
    () => filterBookings(allBookings, filters),
    [allBookings, filters],
  );

  // Pagination: 10 per page. The last argument resets to page 1 whenever a filter changes.
  const pagination = usePagination(
    filteredBookings,
    10,
    Object.values(filters).join("|"),
  );

  // The drawer opens only after a row was clicked.
  const selectedBooking = allBookings.find((b) => b.id === selectedId);

  // ---- 5. Draw the page ------------------------------------------------------------------------
  return (
    <>
      <PageHeader
        title={t("bookings.title")}
        subtitle={t("bookings.subtitle")}
        actions={
          <>
            <LinkButton to="/hotel/bookings/calendar" variant="secondary">
              <CalendarDays className="size-4" />
              {t("nav.calendar")}
            </LinkButton>
            <LinkButton to="/hotel/bookings/hawala" variant="secondary">
              <FileText className="size-4" />
              {t("nav.hawala")}
            </LinkButton>
            <LinkButton to="/hotel/bookings/new">
              <Plus className="size-4" />
              {t("bookings.add")}
            </LinkButton>
          </>
        }
      />

      {/* QueryBoundary shows a loading spinner or an error message until the bookings have loaded. */}
      <QueryBoundary queries={[bookingsQuery]}>
        <SummaryCards bookings={allBookings} />

        <Card>
          <FilterBar filters={filters} onChange={changeFilters} />

          {filteredBookings.length === 0 ? (
            <EmptyState
              title={t("bookings.empty")}
              description={t("common.tryAdjusting")}
              action={
                <LinkButton to="/hotel/bookings/new">
                  <Plus className="size-4" />
                  {t("bookings.add")}
                </LinkButton>
              }
            />
          ) : (
            <>
              <BookingsTable
                rows={pagination.slice}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCancel={setBookingToCancel}
              />
              <Pagination p={pagination} />
            </>
          )}
        </Card>
      </QueryBoundary>

      {/* Details drawer: opens when a row is clicked, so the table can use the full page width. */}
      {selectedBooking && (
        <DetailsDrawer
          booking={selectedBooking}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* "Are you sure?" dialog for cancelling. It is open while bookingToCancel holds a booking. */}
      <ConfirmDialog
        open={!!bookingToCancel}
        onClose={() => setBookingToCancel(null)}
        loading={cancelMutation.isPending}
        title={t("bookings.cancel")}
        message={t("bookings.cancelConfirm", {
          name: bookingToCancel?.clientName ?? "",
        })}
        confirmLabel={t("bookings.cancelYes")}
        onConfirm={() =>
          bookingToCancel && cancelMutation.mutate(bookingToCancel.id)
        }
      />
    </>
  );
}
