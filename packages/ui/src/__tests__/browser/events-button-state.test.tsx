import { describe } from 'vitest'
import { examineEventsButton } from './helpers/events-button'

/**
 * The header button of the events tells a capture and a report by more than a color.
 *
 * The name stayed "Events" in each state, and only a red icon showed a capture (WCAG 1.4.1).
 * The root attributes now show hidden text in the name, and a ring for the capture.
 *
 * Rides the real browser because CSS shows each state: jsdom loads no stylesheet, so it cannot
 * tell which text joins the name. The forced half is `forced/events-button-state.test.tsx`.
 */
describe('the header button of the events (real browser)', () => {
	examineEventsButton(false)
})
