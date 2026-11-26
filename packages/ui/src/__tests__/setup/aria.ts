import { expect } from 'vitest'
import { ariaMatchers } from '../helpers/aria-references'
import { ariaStateMatchers } from '../helpers/aria-state'

// The ARIA matchers of `helpers/aria-references.ts` and `helpers/aria-state.ts`.
// Each project that runs the `ui` tests loads this file, as it loads
// `setup/geometry.ts`, so a matcher that type-checks in a file also exists when
// the file runs.
expect.extend({ ...ariaMatchers, ...ariaStateMatchers })
