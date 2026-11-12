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
 */
import '../../fonts/google-sans-flex-latin.js'
import '../../__tests__/browser/setup/tailwind.css'
import { commands } from 'vitest/browser'
import { loadGridEditing } from '../../modules/grid/grid-data'

declare module 'vitest/browser' {
	interface BrowserCommands {
		diagWatch: () => Promise<void>
	}
}

if (import.meta.env.VITE_BENCH_DIAG) await commands.diagWatch()

await loadGridEditing()
