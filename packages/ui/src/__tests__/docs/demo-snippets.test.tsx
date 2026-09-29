// @vitest-environment jsdom
// The helper that this file calls (`../helpers/demo-snippets.tsx`) renders each page.

import { otherPages } from '../helpers/demo-pages'
import { describeDemoSnippets } from '../helpers/demo-snippets'

// The snippet gate of the docs site (demo-snippets.tsx), for the pages that are not in `modules/`.

describeDemoSnippets(otherPages)
