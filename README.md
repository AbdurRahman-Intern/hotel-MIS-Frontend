# Hotel & Wedding Hall Management SaaS: Frontend Prototype

Multi-tenant prototype with two workspaces (Super Admin and Hotel Owner), English + Dari (RTL), JSON Server mock API.
Stack: React 19, TypeScript (strict), Vite, Tailwind CSS v4, React Router, TanStack Query, Axios, React Hook Form + Zod, Zustand, Recharts, Lucide, Sonner, date-fns, i18next.

## Run

```bash
npm install
npm run dev:all      # web on http://localhost:5173 + JSON Server on http://localhost:3001
# or separately: npm run dev  /  npm run api
npm run typecheck    # tsc
npm run build        # production build
npm run seed         # regenerate db.json (resets all demo data)
```

Copy `.env.example` to `.env` (`VITE_API_BASE_URL=http://localhost:3001`).

## Demo accounts (local prototype only, NOT production authentication)

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@hotelsaas.demo | Demo@123456 |
| Owner, Royal Wedding Hall (AFN) | owner@royal.demo | Demo@123456 |
| Owner, Kabul Grand Hotel (USD) | owner@kabulgrand.demo | Demo@123456 |
| Owner, Example Palace | owner@palace.demo | hotel is suspended, so login is refused |

## Screens (per client screenshots and `User_expectation.docx`)

Hotel Owner: dashboard (daily net profit, monthly/yearly income and expenses, loans given/borrowed, stock value, employees, weddings per month/year), bookings (list, details, create/edit with live estimate, calendar, hall-clash check, payments, cancel), **hawala / warehouse requisition** (generated from menu recipe x guests, extra guests, meat/vegetable groups, explicit "Send to warehouse"), warehouse (items, stock-in, stock-out, spoilage, editable daily prices), employees (service-charge eligible or not), salaries, loans/deals, partners (contribution / profit share / withdrawal), external income, office expenses, reports, settings, website (placeholder, no spec yet).

Super Admin: dashboard, hotels (register, edit, suspend/activate, plan), users, plans, settings.

## Business rules implemented

- Creating or cancelling a booking never touches stock. Stock only moves via stock-in, stock-out (hawala) or spoilage.
- Stock can never go negative: a stock-out with any line above availability is rejected whole.
- Booked revenue (contract value) is kept separate from cash received, outstanding balance and operating expenses. The only "net" figure is the dashboard's daily net (today's cash income minus today's expenses).
- Partner withdrawals and loan repayments are not office expenses.
- All formulas live in `src/lib/domain.ts`.

## Tenancy and security (read this)

- Every hotel-owned record has `tenantId`. `src/services/tenant-resource.ts` takes the tenant from the authenticated session (`requireTenantId`), never from a form or URL, filters lists, assigns it on create, and refuses foreign records on read/update/delete. Query keys include the tenant id.
- Only the user id is persisted in localStorage. Role and tenant are re-read from the API at boot, so editing storage does not change the workspace.
- **This is not a security boundary.** JSON Server enforces nothing and a browser user can tamper with anything. Route guards are UX only. Laravel must authenticate every request and enforce roles and tenant isolation server-side.

## Languages / RTL

`en` and `fa-AF` (دری) live in `src/i18n/locales`. Switching is instant, persisted in localStorage, and independent of role. `document.documentElement.lang/dir` is set once in `src/i18n/index.ts`. Layout uses Tailwind logical utilities (`ms/me/ps/pe/start/end`); only direction icons are mirrored (`DirIcon`). The calendar is Gregorian in both languages (deliberate). Numerals are Latin so phone numbers, IDs and amounts stay unambiguous. Dates and numbers are stored as ISO strings and plain numbers. User-entered data (item names, hall names, menus) is not translated.

## Connecting Laravel later

Change `VITE_API_BASE_URL` and replace the bodies of `src/services/*` (components never call Axios). `TODO(laravel)` comments mark what moves server-side. Expected REST contract (JSON, Sanctum bearer token, all hotel-owned routes scoped by the token's tenant):

| Endpoint | Notes |
|---|---|
| `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | returns `{ user: {id,name,email,role,tenantId}, token }` |
| `GET/POST /hotels`, `GET/PATCH /hotels/{id}` | super_admin only; an owner may `GET/PATCH` their own hotel |
| `GET /users`, `GET /plans`, `GET /platform/stats` | super_admin only |
| `GET/POST /bookings`, `GET/PATCH/DELETE /bookings/{id}`, `POST /bookings/{id}/payments`, `GET /halls`, `GET /menus` | reference generated in a transaction; hall clash returns 422 |
| `GET /bookings/{id}/requisition`, `POST /bookings/{id}/requisition/issue` | recipe x guests; issue = transactional stock-out |
| `GET/POST/PATCH/DELETE /inventory-items`, `POST /stock-in`, `POST /stock-out`, `POST /inventory-items/{id}/spoilage`, `GET /stock-movements` | movement + quantity in one DB transaction; 422 if it would go negative |
| `/employees`, `/salary-payments`, `/partners` (+ `/transactions`), `/loans` (+ `/repayments`), `/expenses`, `/external-income` | standard CRUD |
| `GET /dashboard?year=`, `GET /reports/summary?year=` | aggregate in SQL |

Foreign-tenant records must return 404 (or 403), never the data.

## Known limitations

The website module is a placeholder. Logo upload, invitation emails, file attachments and real billing are out of scope. Dashboard and report aggregation runs in the browser. Booking reference numbering is not concurrency-safe until Laravel does it in a transaction. Hall and menu management screens are not built (they are seeded).
