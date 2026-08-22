# Council frontend

The council operations interface is a separate frontend surface exposed at `/council` by the shared deployment shell.

It provides mock operational views for incoming and outgoing energy, automated request oversight, pool capacity and forecasts, owner-credit calculations, and local hub/grid telemetry. Production integrations should be supplied by the backend through versioned contracts; the council UI must not calculate authoritative allocations or credits in the browser.
