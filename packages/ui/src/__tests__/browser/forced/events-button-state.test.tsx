import { describe } from 'vitest'
import { examineEventsButton } from '../helpers/events-button'

/**
 * The header button of the events under forced colors. Forced colors remove a
 * box-shadow, so the ring of a capture keeps a solid border. The fine half is
 * `../events-button-state.test.tsx`.
 */
describe('the header button of the events under forced colors (real browser)', () => {
	examineEventsButton(true)
})
