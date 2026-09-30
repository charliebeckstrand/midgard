import { expect } from 'vitest'
import { geometryMatchers } from '../helpers/geometry/matchers'

// The box and distance matchers of `helpers/geometry/matchers.ts`. Each project
// that runs the `ui` tests loads this file, so a matcher that type-checks in a
// file also exists when the file runs: the jsdom setup and the browser setup
// import it, and the `pure` and `geometry` projects list it.
expect.extend(geometryMatchers)
