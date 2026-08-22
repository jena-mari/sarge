# Frontend

The deployed frontend currently lives in the repository root:

- `app/` contains the application shell, routes, and styles.
- `src/data/` contains isolated mock data and calculation helpers.
- `public/` contains static assets.
- `vite.config.js` and `next.config.js` configure the Sites-compatible build.

Keeping these files at root preserves the existing deployment contract. If the repository later becomes a formal workspace or monorepo, this boundary can be moved into `frontend/` together with an explicit hosting configuration update.
