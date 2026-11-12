/**
 * Browser bench setup: the production utility CSS, shared with the browser
 * test suite. The chart frame settles its measure → reflow → re-measure
 * chain against real computed style, without the stylesheet the figure's
 * `aspect-ratio` never applies and the chain has no fixed point to land on.
 * The script of `pnpm fonts` adds the latin face of the font, which the
 * stylesheet does not have.
 *
 * An editable grid renders from a chunk of its own. Until the chunk is loaded,
 * the grid shows the read-only grid, and then it mounts again as an editable
 * grid. The setup loads the chunk before each file, so an editable bench
 * measures the grid of a page that already loaded it, as the test setup does.
 *
 * Each file runs in a new tester frame, and each frame after the first loads
 * the module graph again. For each module of such a load, the renderer keeps
 * a shared memory descriptor of 2 MiB until the next garbage collection.
 * Without a collection, the renderer held more than 16,000 of these
 * descriptors partway through the suite. At that count, Chromium on the GitHub
 * runner failed all WebSockets of the page at the same time, and Vitest lost
 * its connection to the page. Thus the setup runs a full collection after each
 * file, and the renderer then holds fewer than 150 descriptors. The collection
 * runs after the last bench of the file, so no sample includes it.
 */
import '../../fonts/google-sans-flex-latin.js'
import '../../__tests__/browser/setup/tailwind.css'
import { afterAll } from 'vitest'
import { loadGridEditing } from '../../modules/grid/grid-data'

await loadGridEditing()

afterAll(() => {
	// `--js-flags=--expose-gc` in `vitest.bench.browser.config.ts` gives `gc`.
	if (typeof gc !== 'function') throw new Error('The bench browser has no `gc`.')

	gc()
})
