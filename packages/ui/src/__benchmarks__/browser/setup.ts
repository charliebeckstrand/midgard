/**
 * Browser bench setup: the production utility CSS, shared with the browser
 * test suite. The chart frame settles its measure → reflow → re-measure
 * chain against real computed style — without the stylesheet the figure's
 * `aspect-ratio` never applies and the chain has no fixed point to land on.
 */
import '../../__tests__/browser/setup/tailwind.css'
