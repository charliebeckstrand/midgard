// @vitest-environment node
import { expect, it } from 'vitest'
import { GridHead } from '../../modules/grid/grid-head'

// A compiled component keeps its memo cache in `$` and reads each slot as `$[n]`.
// The compiler gate (`vitest.compiler.config.ts`) sets `REACT_COMPILER`, and every
// other run leaves it unset. This case therefore fails in two ways. The gate can
// stop compiling, and then it passes the grid without a test of the compiled
// build. Or a compiled module can reach the plain run through the module cache.
it('compiles the grid only under the compiler gate', () => {
	expect(/\$\[\d+\]/.test(GridHead.toString())).toBe(process.env.REACT_COMPILER === '1')
})
