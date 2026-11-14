# Hotel MIS React frontend

React, TypeScript, Vite, Tailwind CSS, Axios, and TanStack Query. The app uses Laravel by default. It has separate Super Admin and Hotel Owner workspaces and supports English and Dari.

## Connect to Laravel locally on Windows

Use both projects from the integration ZIP together. If Laravel already runs on your computer, copy the changed backend files into your existing project and keep its current `.env` and database. See `START-HERE.md` for the file list and backend commands.

In PowerShell, open the frontend directory and run:

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

Open http://localhost:5173/login. The default API is http://127.0.0.1:8000/api. If you edit `.env`, restart Vite. Laravel's `FRONTEND_URL` must match the browser origin exactly.

| Role | Seeded email |
| --- | --- |
| Super Admin | admin@hotelsaas.demo |
| Hotel Owner, Royal Wedding Hall | owner@royal.demo |
| Hotel Owner, Kabul Grand Hotel | owner@kabulgrand.demo |

The Laravel seeder defaults to `Demo@123456`. Use your current password if you changed it in Tinker or set a different `DEMO_PASSWORD` before seeding. The Palace account is seeded as suspended.

## How React fetches the data

1. `src/services/auth.service.ts` calls `POST /auth/login` and saves the Sanctum token. On reload, it calls `GET /auth/me` to restore the session. Logout calls `POST /auth/logout`.
2. `src/lib/axios.ts` provides a shared Axios client. Its request interceptor adds `Accept: application/json` and the Bearer token to authenticated requests.
3. The page hooks in `src/hooks/queries.ts` use TanStack Query to call the service functions, cache results by hotel, and refresh affected data after a successful write. Laravel checks the account's role and scopes hotel data to the authenticated owner.
4. The API uses camelCase fields and unwrapped resource objects or arrays. Axios's `response.data` contains the JSON body directly.

| Screen | Service file | Example routes relative to `/api` |
| --- | --- | --- |
| Login, restore, logout | `auth.service.ts` | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` |
| Super Admin dashboard and hotel management | `hotels.service.ts` | `GET /platform/stats`, `/hotels`, `/users`, `/plans` |
| Owner dashboard and settings | `dashboard.service.ts`, `hotels.service.ts` | `GET /dashboard?year=2026`, `GET/PATCH /my-hotel` |
| Bookings and calendar | `bookings.service.ts` | `/bookings`, `/halls`, `/menus`, `POST /bookings/{id}/payments` |
| Inventory and hawala | `inventory.service.ts` | `/inventory-items`, `/stock-movements`, `POST /stock-movements/in`, `/out`, `/spoilage` |
| Staff and finance | `resources.service.ts` | `/employees`, `/salary-payments`, `/partners`, `/loans`, `/expenses`, `/external-income` |
| Reports | Existing query hooks | Calculates reports in React from the live lists. Laravel's separate profit/loss endpoint is a stub. |

For example, the inventory screen calls `useItems()`, which uses `inventoryService.getItems` to send `GET /api/inventory-items`. Adding warehouse stock sends the form's lines in one request. Laravel applies the whole batch in a database transaction.

For the browser-only demo, set `VITE_DEMO_MODE=true` and restart Vite. Demo data comes from the bundled `db.json` and is stored in the browser.

Use `npm run typecheck` for TypeScript checks and `npm run build` for the production build.
