# Error Solutions

Indexed by error message or symptom for quick lookup.

## ERR_WORKER_OUT_OF_MEMORY — Worker terminated due to reaching memory limit

- **Cause:** The ui package's `tsup --watch` runs DTS generation (TypeScript declaration files) in a worker thread. With 30+ entry points, the worker needs to type-check the entire project on every rebuild, exhausting the default heap limit.
- **Fix:** Use `--no-dts` for dev mode (`tsup --watch --no-dts`). DTS is only needed for production builds. The `ui` package.json `dev` script includes this flag.
- **Date:** 2026-03-15
