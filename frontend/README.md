# Frontend

The frontend source lives in this directory:

- `app/SargeApp.jsx` contains the application shell and routes.
- `app/styles.css` contains the complete responsive visual system.
- `src/data/` contains isolated mock data and calculation helpers.
- `public/` contains static assets.
- Root entry files adapt this source to the current Sites-compatible build.

The root `app/page.jsx` and `app/globals.css` files are intentionally thin deployment adapters. Product UI changes should be made here in `frontend/`.
