# Backend source

Place production server code here once the backend runtime and persistence approach are selected. Keep transport, domain, service, and persistence concerns separate.

## What's here so far

- `nash_welfare_service/` — a narrow, self-contained Python service for
  one specific capability (multi-source Nash-welfare allocation) that
  doesn't fit in dependency-free JS. See its own README for why. This is
  not the backend runtime decision — see the note in `../README.md`.
- `clients/` — JS clients for calling backend/adjacent services from the
  rest of the app. Currently just `nashWelfareMultiSourceClient.js`,
  which calls `nash_welfare_service/` over HTTP.
