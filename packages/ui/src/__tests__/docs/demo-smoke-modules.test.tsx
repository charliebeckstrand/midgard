// @vitest-environment jsdom
// The helper that this file calls (`../helpers/demo-smoke.tsx`) renders each page.

import { modulePages } from '../helpers/demo-pages'
import { describeDemoSmoke } from '../helpers/demo-smoke'

// The smoke test of the docs site (demo-smoke.tsx), for the pages of `modules/`.

describeDemoSmoke(modulePages)
