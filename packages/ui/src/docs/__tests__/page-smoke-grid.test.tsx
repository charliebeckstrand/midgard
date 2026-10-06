// @vitest-environment jsdom
// The helper that this file calls (`page-smoke.tsx`) renders each page.

import { describePageSmoke, smokeParts } from './page-smoke.tsx'

// The smoke test (`page-smoke.tsx`) for the grid page.

describePageSmoke(smokeParts['page-smoke-grid'] ?? [])
