/**
 * Browser bench setup: the production utility CSS, shared with the browser
 * test suite. The chart frame settles its measure → reflow → re-measure
 * chain against real computed style — without the stylesheet the figure's
 * `aspect-ratio` never applies and the chain has no fixed point to land on.
 * The script of `pnpm fonts` adds the latin face of the font, which the
 * stylesheet does not have.
 */
import '../../fonts/google-sans-flex-latin.js'
import '../../__tests__/browser/setup/tailwind.css'
