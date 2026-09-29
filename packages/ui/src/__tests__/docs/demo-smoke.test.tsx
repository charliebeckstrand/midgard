// @vitest-environment jsdom
// The helper that this file calls (`../helpers/demo-smoke.tsx`) renders each page.

import { otherPages } from '../helpers/demo-pages'
import { describeDemoSmoke } from '../helpers/demo-smoke'

// The smoke test of the docs site (demo-smoke.tsx), for the pages that are not in `modules/`.

describeDemoSmoke(otherPages)
