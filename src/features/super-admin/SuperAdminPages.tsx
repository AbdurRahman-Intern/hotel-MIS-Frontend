import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  Eye,
  KeyRound,
  PauseCircle,
  Pencil,
  Plus,
  Power,
  Trash2,
  Users,
} from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  hotelService,
  type CreatedHotel,
  type NewHotelInput,
  type OwnerInput,
  type PlanInput,
} from "@/services/hotels.service";
import { AppError } from "@/lib/axios";
import { useFormat } from "@/hooks/useFormat";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  IconButton,
  Input,
  LinkButton,
  Modal,
  PageHeader,
  Pagination,
  QueryBoundary,
  SearchInput,
  SectionCard,
  Select,
  StatCard,
  StatusBadge,
  TableShell,
  Textarea,
  usePagination,
} from "@/components/ui";
import { formatMonth } from "@/lib/formatters";
import type {
  Hotel,
  HotelStatus,
  Plan,
  PlanId,
  PlatformSettings,
} from "@/types";

const PIE = ["#1f5bf0", "#0f9d8a", "#d4af37", "#8b5cf6"];

// ---------------- Dashboard ----------------
export function SuperAdminDashboard() {
  const { t } = useTranslation();
  const { lang, date, num } = useFormat();
  const q = useQuery({
    queryKey: ["platform-stats"],
    queryFn: hotelService.getPlatformStats,
  });
  const s = q.data;
  return (
    <>
      <PageHeader
        title={t("superAdmin.dashboardTitle")}
        subtitle={t("superAdmin.dashboardSubtitle")}
        actions={
          <LinkButton to="/super-admin/hotels/new">
            <Plus className="size-4" />
            {t("hotels.register")}
          </LinkButton>
        }
      />
      <QueryBoundary queries={[q]}>
        {s && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={Building2}
                tone="blue"
                label={t("superAdmin.totalHotels")}
                value={num(s.totalHotels)}
              />
              <StatCard
                icon={CheckCircle2}
                tone="green"
                label={t("superAdmin.activeHotels")}
                value={num(s.activeHotels)}
              />
              <StatCard
                icon={PauseCircle}
                tone="red"
                label={t("superAdmin.suspendedHotels")}
                value={num(s.suspendedHotels)}
              />
              <StatCard
                icon={Users}
                tone="purple"
                label={t("superAdmin.totalUsers")}
                value={num(s.totalUsers)}
              />
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              <SectionCard
                title={t("superAdmin.growth")}
                subtitle={t("superAdmin.growthHint")}
                className="lg:col-span-2"
              >
                <div dir="ltr" className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={s.growth.map((g) => ({
                        ...g,
                        label: formatMonth(g.month, lang).split(" ")[0],
                      }))}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e4e8f1"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="hotels"
                        stroke="#0f9d8a"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        name={t("superAdmin.totalHotels")}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
              <SectionCard title={t("superAdmin.planDistribution")}>
                <div dir="ltr" className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={s.planDistribution}
                        dataKey="count"
                        nameKey="plan"
                        innerRadius={42}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {s.planDistribution.map((_, i) => (
                          <Cell key={i} fill={PIE[i % PIE.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {s.planDistribution.map((p, i) => (
                    <li
                      key={p.plan}
                      className="flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ background: PIE[i % PIE.length] }}
                        />
                        {p.plan}
                      </span>
                      <span className="font-medium">{num(p.count)}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <SectionCard
                title={t("superAdmin.recentHotels")}
                action={
                  <Link
                    to="/super-admin/hotels"
                    className="text-sm text-brand-600"
                  >
                    {t("common.viewAll")}
                  </Link>
                }
              >
                <ul className="divide-y divide-line">
                  {s.recentHotels.map((h) => (
                    <li
                      key={h.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <Link
                          to={`/super-admin/hotels/${h.id}`}
                          className="font-medium hover:text-brand-600"
                        >
                          {h.name}
                        </Link>
                        <p className="text-xs text-muted">
                          {h.ownerName} · {date(h.registeredAt)}
                        </p>
                      </div>
                      <StatusBadge status={h.status} />
                    </li>
                  ))}
                </ul>
              </SectionCard>
              <SectionCard title={t("superAdmin.activity")}>
                <ul className="space-y-3">
                  {s.activity.map((a) => (
                    <li key={a.id} className="flex gap-3 text-sm">
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent-500" />
                      <div>
                        <p>{a.message}</p>
                        <p className="text-xs text-muted">
                          {date(a.date.slice(0, 10))}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </div>
          </div>
        )}
      </QueryBoundary>
    </>
  );
}

// ---------------- Hotels list ----------------
/**
 * The "delete hotel" pop-up. Deleting is permanent, so it is made hard to do by accident:
 *   1. the hotel must be SUSPENDED first (the server enforces this too),
 *   2. the user must type the hotel's exact name.
 *
 * @param hotel      the hotel to delete, or null when the pop-up is closed
 * @param onClose    called when the user cancels or after a successful delete
 * @param onDeleted  optional, called after a successful delete (the detail page uses it to leave the page)
 */
function DeleteHotelModal({
  hotel,
  onClose,
  onDeleted,
}: {
  hotel: Hotel | null;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [typed, setTyped] = useState("");

  const remove = useMutation({
    mutationFn: (id: string) => hotelService.deleteHotel(id),
    onSuccess: () => {
      // Every list that shows hotels, users or counts is now out of date.
      for (const key of ["hotels", "platform-stats", "platform-users"])
        void qc.invalidateQueries({ queryKey: [key] });
      toast.success(t("hotels.deleted"));
      setTyped("");
      onClose();
      onDeleted?.();
    },
    onError: (e) =>
      toast.error(
        e instanceof AppError && e.message === "hotel_not_suspended"
          ? t("hotels.suspendFirst")
          : t("errors.generic"),
      ),
  });

  const close = () => {
    setTyped("");
    onClose();
  };
  const stillActive = hotel?.status === "active";
  const nameMatches = typed.trim() === hotel?.name;

  return (
    <Modal
      open={!!hotel}
      onClose={close}
      title={t("hotels.deleteTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            disabled={stillActive || !nameMatches}
            onClick={() => hotel && remove.mutate(hotel.id)}
          >
            {t("common.delete")}
          </Button>
        </>
      }
    >
      {hotel && (
        <div className="space-y-3">
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {t("hotels.deleteWarning")}
          </p>
          {stillActive ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t("hotels.suspendFirst")}
            </p>
          ) : (
            <Field label={t("hotels.deleteType", { name: hotel.name })}>
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
              />
            </Field>
          )}
        </div>
      )}
    </Modal>
  );
}

export function HotelsPage() {
  const { t } = useTranslation();
  const { date } = useFormat();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const q = useQuery({ queryKey: ["hotels"], queryFn: hotelService.getHotels });
  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: hotelService.getPlans,
  });
  const rows = (q.data ?? []).filter(
    (h) =>
      (!status || h.status === status) &&
      h.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const p = usePagination(rows, 10, search + status);
  const planName = (id: PlanId) =>
    plans.data?.find((x) => x.id === id)?.name ?? id;

  // Row actions: suspend/activate asks for confirmation first; delete opens its own pop-up.
  const qc = useQueryClient();
  const [toToggle, setToToggle] = useState<Hotel | null>(null);
  const [toDelete, setToDelete] = useState<Hotel | null>(null);
  const toggleStatus = useMutation({
    mutationFn: (h: Hotel) =>
      hotelService.setStatus(
        h.id,
        h.status === "active" ? "suspended" : "active",
      ),
    onSuccess: () => {
      for (const key of ["hotels", "platform-stats"])
        void qc.invalidateQueries({ queryKey: [key] });
      toast.success(t("hotels.statusUpdated"));
      setToToggle(null);
    },
    onError: () => toast.error(t("errors.generic")),
  });

  return (
    <>
      <PageHeader
        title={t("hotels.title")}
        subtitle={t("hotels.subtitle")}
        actions={
          <LinkButton to="/super-admin/hotels/new">
            <Plus className="size-4" />
            {t("hotels.register")}
          </LinkButton>
        }
      />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t("hotels.search")}
            className="min-w-56 flex-1"
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-44"
            aria-label={t("common.status")}
          >
            <option value="">{t("common.allStatuses")}</option>
            <option value="active">{t("status.active")}</option>
            <option value="suspended">{t("status.suspended")}</option>
          </Select>
        </div>
        <QueryBoundary queries={[q]}>
          {rows.length === 0 ? (
            <EmptyState
              title={t("hotels.empty")}
              description={t("common.tryAdjusting")}
            />
          ) : (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <th className="th">{t("hotels.name")}</th>
                    <th className="th">{t("hotels.owner")}</th>
                    <th className="th">{t("common.phone")}</th>
                    <th className="th">{t("hotels.plan")}</th>
                    <th className="th">{t("hotels.joined")}</th>
                    <th className="th">{t("common.status")}</th>
                    <th className="th">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {p.slice.map((h) => (
                    <tr
                      key={h.id}
                      className="border-t border-line hover:bg-slate-50"
                    >
                      <td className="td">
                        <Link
                          to={`/super-admin/hotels/${h.id}`}
                          className="flex items-center gap-3 font-medium hover:text-brand-600"
                        >
                          <span className="grid size-9 place-items-center rounded-lg bg-navy-900 text-xs font-bold text-gold">
                            {h.name.slice(0, 1)}
                          </span>
                          <span>
                            {h.name}
                            <span className="block text-xs font-normal text-muted ltr-isolate">
                              {h.slug}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="td">
                        {h.ownerName}
                        <span className="block text-xs text-muted ltr-isolate">
                          {h.ownerEmail}
                        </span>
                      </td>
                      <td className="td">
                        <span className="ltr-isolate">{h.phone}</span>
                      </td>
                      <td className="td">
                        <Badge tone="purple">{planName(h.planId)}</Badge>
                      </td>
                      <td className="td">{date(h.registeredAt)}</td>
                      <td className="td">
                        <StatusBadge status={h.status} />
                      </td>
                      <td className="td">
                        <div className="flex gap-0.5">
                          <Link
                            to={`/super-admin/hotels/${h.id}`}
                            aria-label={t("common.view")}
                            title={t("common.view")}
                            className="rounded-md p-1.5 text-brand-600 hover:bg-slate-100"
                          >
                            <Eye className="size-4" />
                          </Link>
                          <Link
                            to={`/super-admin/hotels/${h.id}?edit=1`}
                            aria-label={t("common.edit")}
                            title={t("common.edit")}
                            className="rounded-md p-1.5 text-brand-600 hover:bg-slate-100"
                          >
                            <Pencil className="size-4" />
                          </Link>
                          <IconButton
                            label={
                              h.status === "active"
                                ? t("hotels.suspend")
                                : t("hotels.activate")
                            }
                            className={
                              h.status === "active"
                                ? "text-amber-600"
                                : "text-green-600"
                            }
                            onClick={() => setToToggle(h)}
                          >
                            <Power className="size-4" />
                          </IconButton>
                          <IconButton
                            label={t("hotels.delete")}
                            className="text-red-500"
                            onClick={() => setToDelete(h)}
                          >
                            <Trash2 className="size-4" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
              <Pagination p={p} />
            </>
          )}
        </QueryBoundary>
      </Card>

      <ConfirmDialog
        open={!!toToggle}
        onClose={() => setToToggle(null)}
        loading={toggleStatus.isPending}
        title={
          toToggle?.status === "active"
            ? t("hotels.suspend")
            : t("hotels.activate")
        }
        message={
          toToggle?.status === "active"
            ? t("hotels.suspendConfirm")
            : t("hotels.activateConfirm")
        }
        confirmLabel={t("common.confirm")}
        tone={toToggle?.status === "active" ? "danger" : "primary"}
        onConfirm={() => toToggle && toggleStatus.mutate(toToggle)}
      />
      <DeleteHotelModal
        key={toDelete?.id ?? "none"}
        hotel={toDelete}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}

// ---------------- Hotel form (create + edit) ----------------
const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const hotelSchema = z.object({
  name: z.string().min(2, "validation.required"),
  slug: z
    .string()
    .min(2, "validation.required")
    .regex(/^[a-z0-9-]+$/, "validation.slug"),
  ownerName: z.string().min(2, "validation.required"),
  ownerEmail: z
    .string()
    .min(1, "validation.required")
    .email("validation.email"),
  phone: z.string().min(5, "validation.required"),
  address: z.string().min(2, "validation.required"),
  planId: z.enum(["starter", "professional", "enterprise"]),
  currency: z.enum(["AFN", "USD"]),
});
type HotelValues = z.infer<typeof hotelSchema>;

/**
 * When Laravel generated the owner's password, show it ONCE. It can not be read again afterwards,
 * so the Super Admin must copy it now and give it to the hotel owner.
 */
function showTemporaryPassword(
  hotel: Hotel | CreatedHotel,
  t: (key: string, o?: Record<string, unknown>) => string,
) {
  const password = (hotel as CreatedHotel).temporaryPassword;
  if (password)
    toast.info(t("hotels.tempPassword", { password }), {
      duration: Infinity,
      closeButton: true,
    });
}

function HotelForm({
  initial,
  hotelId,
}: {
  initial?: Hotel;
  hotelId?: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: hotelService.getPlans,
  });
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, dirtyFields },
  } = useForm<HotelValues>({
    resolver: zodResolver(hotelSchema),
    defaultValues: initial
      ? {
          name: initial.name,
          slug: initial.slug,
          ownerName: initial.ownerName,
          ownerEmail: initial.ownerEmail,
          phone: initial.phone,
          address: initial.address,
          planId: initial.planId as "starter" | "professional" | "enterprise",
          currency: initial.currency as "AFN" | "USD",
        }
      : {
          name: "",
          slug: "",
          ownerName: "",
          ownerEmail: "",
          phone: "",
          address: "",
          planId: "starter",
          currency: "AFN",
        },
  });
  const m = useMutation({
    mutationFn: (v: HotelValues) =>
      hotelId
        ? hotelService.updateHotel(hotelId, v)
        : hotelService.createHotel(v as NewHotelInput),
    onSuccess: (h) => {
      void qc.invalidateQueries({ queryKey: ["hotels"] });
      void qc.invalidateQueries({ queryKey: ["platform-stats"] });
      void qc.invalidateQueries({ queryKey: ["hotel", h.id] });
      toast.success(t(hotelId ? "hotels.updated" : "hotels.created"));
      showTemporaryPassword(h, t);
      navigate(`/super-admin/hotels/${h.id}`);
    },
    onError: (e) => {
      if (e instanceof AppError && e.message === "slug_taken")
        setError("slug", { message: "validation.slugTaken" });
      else if (e instanceof AppError && e.message === "email_taken")
        setError("ownerEmail", { message: "validation.emailTaken" });
      else toast.error(t("errors.generic"));
    },
  });
  return (
    <form
      onSubmit={handleSubmit((v) => m.mutate(v))}
      className="card grid max-w-3xl gap-4 p-5 sm:grid-cols-2"
      noValidate
    >
      <Field label={t("hotels.name")} required error={errors.name?.message}>
        <Input
          {...register("name", {
            onChange: (e) => {
              if (!hotelId && !dirtyFields.slug)
                setValue("slug", slugify(e.target.value));
            },
          })}
        />
      </Field>
      <Field
        label={t("hotels.slug")}
        required
        error={errors.slug?.message}
        hint={t("hotels.slugHint")}
      >
        <Input dir="ltr" {...register("slug")} />
      </Field>
      <Field
        label={t("hotels.ownerName")}
        required
        error={errors.ownerName?.message}
      >
        <Input {...register("ownerName")} />
      </Field>
      <Field
        label={t("hotels.ownerEmail")}
        required
        error={errors.ownerEmail?.message}
      >
        <Input
          dir="ltr"
          type="email"
          {...register("ownerEmail")}
          disabled={!!hotelId}
        />
      </Field>
      <Field label={t("common.phone")} required error={errors.phone?.message}>
        <Input dir="ltr" {...register("phone")} />
      </Field>
      <Field label={t("hotels.plan")} required>
        <Select {...register("planId")}>
          {(plans.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("settings.currency")} required>
        <Select {...register("currency")}>
          <option value="AFN">AFN</option>
          <option value="USD">USD</option>
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field
          label={t("common.address")}
          required
          error={errors.address?.message}
        >
          <Textarea {...register("address")} />
        </Field>
      </div>
      {!hotelId && (
        <p className="sm:col-span-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {t("hotels.ownerAccountNote")}
        </p>
      )}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" loading={m.isPending}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}

export function NewHotelPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader
        title={t("hotels.register")}
        breadcrumbs={[
          { label: t("nav.hotels"), to: "/super-admin/hotels" },
          { label: t("hotels.register") },
        ]}
      />
      <HotelForm />
    </>
  );
}

// ---------------- Hotel detail ----------------
/** Validation of the "edit owner" form. */
const ownerSchema = z.object({
  ownerName: z.string().trim().min(2, "validation.required"),
  ownerEmail: z
    .string()
    .trim()
    .min(1, "validation.required")
    .email("validation.email"),
});

/**
 * The "edit owner account" pop-up: the owner's name and LOGIN e-mail.
 *
 * @param hotel    the hotel whose owner is edited
 * @param open     whether the pop-up is visible
 * @param onClose  called on cancel or after a successful save
 */
function OwnerFormModal({
  hotel,
  open,
  onClose,
}: {
  hotel: Hotel;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<OwnerInput>({
    resolver: zodResolver(ownerSchema),
    values: { ownerName: hotel.ownerName, ownerEmail: hotel.ownerEmail },
  });

  const save = useMutation({
    mutationFn: (v: OwnerInput) => hotelService.updateOwner(hotel.id, v),
    onSuccess: () => {
      for (const key of [["hotel", hotel.id], ["hotels"], ["platform-users"]])
        void qc.invalidateQueries({ queryKey: key });
      toast.success(t("hotels.ownerUpdated"));
      onClose();
    },
    onError: (e) => {
      if (e instanceof AppError && e.message === "email_taken")
        setError("ownerEmail", { message: "validation.emailTaken" });
      else toast.error(t("errors.generic"));
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("hotels.editOwner")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            loading={save.isPending}
            onClick={() => void handleSubmit((v) => save.mutate(v))()}
          >
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field
          label={t("hotels.ownerName")}
          required
          error={errors.ownerName?.message}
        >
          <Input {...register("ownerName")} />
        </Field>
        <Field
          label={t("hotels.ownerEmail")}
          required
          error={errors.ownerEmail?.message}
          hint={t("hotels.ownerLoginNote")}
        >
          <Input dir="ltr" type="email" {...register("ownerEmail")} />
        </Field>
      </div>
    </Modal>
  );
}

export function HotelDetailPage() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  const { date } = useFormat();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [editing, setEditing] = useState(params.get("edit") === "1"); // the list's pencil icon opens this page in edit mode
  const [confirm, setConfirm] = useState<HotelStatus | null>(null);
  const [deleting, setDeleting] = useState(false); // delete pop-up
  const [ownerEditing, setOwnerEditing] = useState(false); // edit-owner pop-up
  const [resetAsk, setResetAsk] = useState(false); // reset-password confirmation
  const q = useQuery({
    queryKey: ["hotel", id],
    queryFn: () => hotelService.getHotel(id),
  });
  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: hotelService.getPlans,
  });
  const h = q.data;
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["hotel", id] });
    void qc.invalidateQueries({ queryKey: ["hotels"] });
    void qc.invalidateQueries({ queryKey: ["platform-stats"] });
  };
  const statusM = useMutation({
    mutationFn: (s: HotelStatus) => hotelService.setStatus(id, s),
    onSuccess: () => {
      refresh();
      setConfirm(null);
      toast.success(t("hotels.statusUpdated"));
    },
  });
  // New temporary password for the owner. It is shown ONCE, so the toast stays until the admin closes it.
  const resetM = useMutation({
    mutationFn: () => hotelService.resetOwnerPassword(id),
    onSuccess: (password) => {
      setResetAsk(false);
      toast.info(t("hotels.passwordReset", { password }), {
        duration: Infinity,
        closeButton: true,
      });
    },
    onError: () => {
      setResetAsk(false);
      toast.error(t("errors.generic"));
    },
  });
  const planM = useMutation({
    mutationFn: (p: PlanId) => hotelService.updateHotel(id, { planId: p }),
    onSuccess: () => {
      refresh();
      toast.success(t("hotels.planUpdated"));
    },
  });
  return (
    <>
      <PageHeader
        title={h?.name ?? t("common.loading")}
        breadcrumbs={[
          { label: t("nav.hotels"), to: "/super-admin/hotels" },
          { label: h?.name ?? "…" },
        ]}
        actions={
          h && (
            <>
              <Button variant="secondary" onClick={() => setEditing((e) => !e)}>
                <Pencil className="size-4" />
                {t("common.edit")}
              </Button>
              <Button
                variant={h.status === "active" ? "danger" : "success"}
                onClick={() =>
                  setConfirm(h.status === "active" ? "suspended" : "active")
                }
              >
                <Power className="size-4" />
                {h.status === "active"
                  ? t("hotels.suspend")
                  : t("hotels.activate")}
              </Button>
              <Button
                variant="secondary"
                className="text-red-600"
                onClick={() => setDeleting(true)}
              >
                <Trash2 className="size-4" />
                {t("hotels.delete")}
              </Button>
            </>
          )
        }
      />
      <QueryBoundary queries={[q]}>
        {h &&
          (editing ? (
            <HotelForm initial={h} hotelId={h.id} />
          ) : (
            <div className="grid gap-5 lg:grid-cols-3">
              <SectionCard title={t("hotels.info")} className="lg:col-span-2">
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  {(
                    [
                      [
                        "hotels.slug",
                        <span className="ltr-isolate">{h.slug}</span>,
                      ],
                      ["common.status", <StatusBadge status={h.status} />],
                      [
                        "common.phone",
                        <span className="ltr-isolate">{h.phone}</span>,
                      ],
                      ["hotels.joined", date(h.registeredAt)],
                      ["common.address", h.address],
                      ["settings.currency", h.currency],
                    ] as [string, React.ReactNode][]
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs text-muted">{t(k)}</dt>
                      <dd className="mt-0.5 font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </SectionCard>
              <div className="space-y-5">
                <SectionCard title={t("hotels.ownerAccount")}>
                  <p className="font-medium">{h.ownerName}</p>
                  <p className="text-sm text-muted ltr-isolate">
                    {h.ownerEmail}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setOwnerEditing(true)}
                    >
                      <Pencil className="size-4" />
                      {t("hotels.editOwner")}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setResetAsk(true)}
                    >
                      <KeyRound className="size-4" />
                      {t("hotels.resetPassword")}
                    </Button>
                  </div>
                </SectionCard>
                <SectionCard
                  title={t("hotels.plan")}
                  subtitle={t("hotels.planHint")}
                >
                  <Select
                    value={h.planId}
                    onChange={(e) => planM.mutate(e.target.value as PlanId)}
                    aria-label={t("hotels.plan")}
                  >
                    {(plans.data ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </SectionCard>
              </div>
            </div>
          ))}
      </QueryBoundary>
      {h && (
        <OwnerFormModal
          hotel={h}
          open={ownerEditing}
          onClose={() => setOwnerEditing(false)}
        />
      )}
      <ConfirmDialog
        open={resetAsk}
        onClose={() => setResetAsk(false)}
        loading={resetM.isPending}
        title={t("hotels.resetPassword")}
        message={t("hotels.resetConfirm", { name: h?.ownerName ?? "" })}
        confirmLabel={t("common.confirm")}
        tone="primary"
        onConfirm={() => resetM.mutate()}
      />
      <DeleteHotelModal
        hotel={deleting ? (h ?? null) : null}
        onClose={() => setDeleting(false)}
        onDeleted={() => navigate("/super-admin/hotels")}
      />
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        loading={statusM.isPending}
        title={
          confirm === "suspended" ? t("hotels.suspend") : t("hotels.activate")
        }
        message={
          confirm === "suspended"
            ? t("hotels.suspendConfirm")
            : t("hotels.activateConfirm")
        }
        confirmLabel={t("common.confirm")}
        tone={confirm === "suspended" ? "danger" : "primary"}
        onConfirm={() => confirm && statusM.mutate(confirm)}
      />
    </>
  );
}

// ---------------- Users ----------------
export function UsersPage() {
  const { t } = useTranslation();
  const q = useQuery({
    queryKey: ["platform-users"],
    queryFn: hotelService.getUsers,
  });
  const hotels = useQuery({
    queryKey: ["hotels"],
    queryFn: hotelService.getHotels,
  });
  const [search, setSearch] = useState("");
  const rows = (q.data ?? []).filter((u) =>
    (u.name + u.email).toLowerCase().includes(search.toLowerCase()),
  );
  const p = usePagination(rows, 10, search);
  return (
    <>
      <PageHeader title={t("nav.users")} subtitle={t("users.subtitle")} />
      <Card>
        <div className="border-b border-line p-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t("common.search")}
            className="max-w-sm"
          />
        </div>
        <QueryBoundary queries={[q, hotels]}>
          {rows.length === 0 ? (
            <EmptyState title={t("common.noResults")} />
          ) : (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <th className="th">{t("common.name")}</th>
                    <th className="th">{t("auth.email")}</th>
                    <th className="th">{t("users.role")}</th>
                    <th className="th">{t("users.hotel")}</th>
                  </tr>
                </thead>
                <tbody>
                  {p.slice.map((u) => (
                    <tr key={u.id} className="border-t border-line">
                      <td className="td font-medium">{u.name}</td>
                      <td className="td">
                        <span className="ltr-isolate">{u.email}</span>
                      </td>
                      <td className="td">
                        <Badge
                          tone={u.role === "super_admin" ? "purple" : "blue"}
                        >
                          {t(`roles.${u.role}`)}
                        </Badge>
                      </td>
                      <td className="td">
                        {hotels.data?.find((h) => h.id === u.tenantId)?.name ??
                          "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
              <Pagination p={p} />
            </>
          )}
        </QueryBoundary>
      </Card>
    </>
  );
}

// ---------------- Plans ----------------
/** Validation of the plan form. Texts like 'validation.required' are translation keys. */
const planSchema = z.object({
  name: z.string().trim().min(2, "validation.required"),
  priceMonthly: z.number("validation.number").min(0, "validation.positive"),
  maxUsers: z
    .number("validation.number")
    .int("validation.number")
    .min(1, "validation.positive"),
});
type PlanValues = z.infer<typeof planSchema>;

/**
 * The "add plan" / "edit plan" pop-up.
 *
 * @param open     whether the pop-up is visible
 * @param plan     the plan being edited, or undefined to create a new one
 * @param onClose  called when the user cancels or after a successful save
 */
function PlanFormModal({
  open,
  plan,
  onClose,
}: {
  open: boolean;
  plan?: Plan;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PlanValues>({
    resolver: zodResolver(planSchema),
    values: plan
      ? {
          name: plan.name,
          priceMonthly: plan.priceMonthly,
          maxUsers: plan.maxUsers,
        }
      : { name: "", priceMonthly: 0, maxUsers: 1 },
  });

  // One mutation for both cases: edit when a plan was given, create otherwise.
  const save = useMutation({
    mutationFn: (v: PlanInput) =>
      plan ? hotelService.updatePlan(plan.id, v) : hotelService.createPlan(v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["plans"] }); // reload every list that shows plans
      toast.success(t(plan ? "plans.updated" : "plans.created"));
      reset();
      onClose();
    },
    onError: (e) => {
      if (e instanceof AppError && e.message === "plan_name_taken")
        setError("name", { message: "plans.nameTaken" });
      else toast.error(t("errors.generic"));
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(plan ? "plans.edit" : "plans.add")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            loading={save.isPending}
            onClick={() => void handleSubmit((v) => save.mutate(v))()}
          >
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field label={t("plans.name")} required error={errors.name?.message}>
          <Input {...register("name")} />
        </Field>
        <Field
          label={t("plans.price")}
          required
          error={errors.priceMonthly?.message}
        >
          <Input
            type="number"
            step="any"
            {...register("priceMonthly", { valueAsNumber: true })}
          />
        </Field>
        <Field
          label={t("plans.maxUsersLabel")}
          required
          error={errors.maxUsers?.message}
        >
          <Input
            type="number"
            {...register("maxUsers", { valueAsNumber: true })}
          />
        </Field>
      </div>
    </Modal>
  );
}

/** Super Admin > Plans: the plan cards, with add, edit and delete. */
export function PlansPage() {
  const { t } = useTranslation();
  const { money, num } = useFormat();
  const qc = useQueryClient();
  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: hotelService.getPlans,
  });
  const hotels = useQuery({
    queryKey: ["hotels"],
    queryFn: hotelService.getHotels,
  });

  // `editing`: the plan in the pop-up. null = closed, 'new' = creating, a Plan = editing it.
  const [editing, setEditing] = useState<Plan | "new" | null>(null);
  const [toDelete, setToDelete] = useState<Plan | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => hotelService.deletePlan(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["plans"] });
      toast.success(t("plans.deleted"));
      setToDelete(null);
    },
    onError: (e) => {
      toast.error(
        e instanceof AppError && e.message === "plan_in_use"
          ? t("plans.inUse")
          : t("errors.generic"),
      );
      setToDelete(null);
    },
  });

  return (
    <>
      <PageHeader
        title={t("nav.plans")}
        subtitle={t("plans.subtitle")}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" />
            {t("plans.add")}
          </Button>
        }
      />
      <QueryBoundary queries={[plans, hotels]}>
        <div className="grid gap-5 md:grid-cols-3">
          {(plans.data ?? []).map((p) => (
            <SectionCard
              key={p.id}
              title={p.name}
              action={
                <div className="flex gap-0.5">
                  <IconButton
                    label={t("common.edit")}
                    onClick={() => setEditing(p)}
                  >
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton
                    label={t("common.delete")}
                    className="text-red-500"
                    onClick={() => setToDelete(p)}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              }
            >
              <p className="text-3xl font-bold">
                {money(p.priceMonthly).replace(/^AFN\s|\sAFN$/, "")}
                <span className="text-sm font-normal text-muted">
                  {" "}
                  {t("plans.perMonth")}
                </span>
              </p>
              <p className="mt-3 text-sm text-muted">
                {t("plans.maxUsers", { count: p.maxUsers })}
              </p>
              <p className="mt-1 text-sm">
                {t("plans.hotelsOnPlan", {
                  count: num(
                    hotels.data?.filter((h) => h.planId === p.id).length ?? 0,
                  ),
                })}
              </p>
            </SectionCard>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">{t("plans.note")}</p>
      </QueryBoundary>

      {/* key = the plan id, so the form starts fresh each time it is opened for a different plan. */}
      <PlanFormModal
        key={editing && editing !== "new" ? editing.id : "new"}
        open={editing !== null}
        plan={editing && editing !== "new" ? editing : undefined}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        loading={remove.isPending}
        title={t("plans.deleteTitle")}
        message={t("plans.deleteConfirm", { name: toDelete?.name ?? "" })}
        confirmLabel={t("common.delete")}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </>
  );
}

// ---------------- Platform settings ----------------
/** Validation of the settings form. */
const settingsSchema = z.object({
  platformName: z.string().trim().min(2, "validation.required"),
  supportEmail: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\S+@\S+\.\S+$/.test(v), "validation.email"),
  supportPhone: z.string().trim(),
  defaultCurrency: z.enum(["AFN", "USD"]),
  defaultPlanId: z.string().min(1, "validation.required"),
  trialDays: z
    .number("validation.number")
    .int("validation.number")
    .min(0, "validation.positive")
    .max(365, "validation.number"),
});

/** Super Admin > Settings: platform name, support contacts and defaults, saved on the server. */
export function PlatformSettingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["platform-settings"],
    queryFn: hotelService.getPlatformSettings,
  });
  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: hotelService.getPlans,
  });

  // `values` fills the form as soon as the settings have loaded.
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<PlatformSettings>({
    resolver: zodResolver(settingsSchema),
    values: settings.data,
  });

  const save = useMutation({
    mutationFn: (v: PlatformSettings) => hotelService.updatePlatformSettings(v),
    onSuccess: (saved) => {
      qc.setQueryData(["platform-settings"], saved);
      toast.success(t("superAdmin.settingsSaved"));
    },
    onError: () => toast.error(t("errors.generic")),
  });

  return (
    <>
      <PageHeader
        title={t("nav.settings")}
        subtitle={t("superAdmin.settingsSubtitle")}
      />
      <QueryBoundary queries={[settings, plans]}>
        <form
          onSubmit={handleSubmit((v) => save.mutate(v))}
          noValidate
          className="mb-5"
        >
          <SectionCard title={t("superAdmin.settingsTitle")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("superAdmin.platformName")}
                required
                error={errors.platformName?.message}
              >
                <Input {...register("platformName")} />
              </Field>
              <Field
                label={t("superAdmin.supportEmail")}
                error={errors.supportEmail?.message}
              >
                <Input dir="ltr" type="email" {...register("supportEmail")} />
              </Field>
              <Field label={t("superAdmin.supportPhone")}>
                <Input dir="ltr" {...register("supportPhone")} />
              </Field>
              <Field
                label={t("superAdmin.trialDays")}
                hint={t("superAdmin.trialDaysHint")}
                error={errors.trialDays?.message}
              >
                <Input
                  type="number"
                  {...register("trialDays", { valueAsNumber: true })}
                />
              </Field>
              <Field label={t("superAdmin.defaultCurrency")}>
                <Select {...register("defaultCurrency")}>
                  <option value="AFN">AFN</option>
                  <option value="USD">USD</option>
                </Select>
              </Field>
              <Field label={t("superAdmin.defaultPlan")}>
                <Select {...register("defaultPlanId")}>
                  {(plans.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                type="submit"
                loading={save.isPending}
                disabled={!isDirty}
              >
                {t("common.save")}
              </Button>
            </div>
          </SectionCard>
        </form>
      </QueryBoundary>

      <SectionCard title={t("superAdmin.prototypeConfig")}>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">VITE_API_BASE_URL</dt>
            <dd className="mt-0.5 font-medium ltr-isolate">
              {import.meta.env.VITE_API_BASE_URL}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t("superAdmin.authMode")}</dt>
            <dd className="mt-0.5 font-medium">
              {t("superAdmin.authModeValue")}
            </dd>
          </div>
        </dl>
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {t("superAdmin.securityNote")}
        </p>
      </SectionCard>
    </>
  );
}
