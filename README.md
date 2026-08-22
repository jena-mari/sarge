# Sarge

Sarge is a Wollongong community renewable-energy platform prototype. It helps solar contributors understand their energy journey, choose how much verified spare energy to share, receive Sarge Credits, and see their community impact.

## Repository layout

```text
app/                  Frontend routes and application UI
src/                  Frontend data and reusable client modules
public/               Frontend static assets
backend/              Reserved server-side application boundary
algorithms/           Reserved energy allocation and fairness boundary
contracts/            Shared API and event payload schemas
```

The frontend remains at the repository root because the current Sites deployment expects the application entry points, build configuration, and hosting metadata there.

## Frontend

The working prototype uses React, JavaScript, Tailwind CSS, React Router, Recharts, and Lucide icons. It currently uses mock data and browser storage; no production backend is connected.

```bash
npm install
npm run dev
npm run build
```

## Future implementation boundaries

- `backend/` will own authenticated APIs, energy-data ingestion, verification records, persistence, contribution processing, reward ledgers, reporting, and audit trails.
- `algorithms/` will own independently testable allocation and fairness logic. It must not contain HTTP, database, or UI concerns.
- `contracts/` defines the payloads passed between the frontend, backend, and algorithm layer.

The key product invariants are:

```text
generated energy = property consumption + verified spare energy
recognised contribution = min(user pledge, verified spare energy)
1 verified contributed kWh = 1 Sarge Credit (MVP)
```

Rewards in the prototype are proposed concepts and are not current Wollongong City Council programs.
