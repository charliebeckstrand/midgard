/**
 * Browser bench setup: the production utility CSS, shared with the browser
 * test suite. The chart frame settles its measure → reflow → re-measure
 * chain against real computed style — without the stylesheet the figure's
 * `aspect-ratio` never applies and the chain has no fixed point to land on.
 * The competitors read no utility classes, so the shared stylesheet costs
 * them nothing.
 */
import '../../__tests__/browser/setup/tailwind.css'
