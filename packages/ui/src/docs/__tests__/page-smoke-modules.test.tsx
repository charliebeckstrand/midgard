// @vitest-environment jsdom
// The helper that this file calls (`page-smoke.tsx`) renders each page.

import { describePageSmoke, modulePages } from './page-smoke.tsx'

// The smoke test (`page-smoke.tsx`) for the pages of `modules/`.

describePageSmoke(modulePages)
