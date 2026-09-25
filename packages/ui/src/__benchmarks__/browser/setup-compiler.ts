/**
 * The setup of the compiled browser benchmarks
 * (`vitest.bench.browser.compiler.config.ts`). A compiled component keeps its
 * memo cache in `$` and reads each slot as `$[n]`. If `GridHead` has no such
 * read, the compiler did not compile the `ui` source, and the run would time
 * the plain build under the name of the compiled one. The setup then stops the
 * run.
 */
import { GridHead } from '../../modules/grid/grid-head'

if (!/\$\[\d+\]/.test(GridHead.toString())) {
	throw new Error('bench:browser:compiler: the React Compiler did not compile the ui source')
}
