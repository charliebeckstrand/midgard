// @vitest-environment jsdom
// The helpers that this file calls (`../helpers/demo-smoke.tsx` and
// `../helpers/demo-snippets.tsx`) render each page.

import { modulePages } from '../helpers/demo-pages'
import { describeDemoSmoke } from '../helpers/demo-smoke'
import { describeDemoSnippets } from '../helpers/demo-snippets'

// The smoke test (demo-smoke.tsx) and the snippet gate (demo-snippets.tsx) of
// the docs site, for the pages of `modules/`. The two gates share one walk of each
// page, so they must run in the same file. `demo-pages.tsx` tells how the two
// files divide the pages.

describeDemoSmoke(modulePages)

describeDemoSnippets(modulePages)
