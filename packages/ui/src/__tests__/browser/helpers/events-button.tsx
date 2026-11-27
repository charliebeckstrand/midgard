import { afterEach, expect, it } from 'vitest'
import { EventsButton } from '../../../modules/events/events-button'
import { present, renderUI, screen } from '../../helpers'

// The cases of `events-button-state.test.tsx` and of its forced half,
// `forced/events-button-state.test.tsx`.

const ATTRIBUTES = ['data-events', 'data-events-capture', 'data-events-reports']

/**
 * Turns the events setting on, and writes the root attributes of the store. The
 * button writes `data-events` again from the setting when it mounts. No store
 * runs, so the attributes of the store stay as the test writes them.
 */
function setRoot(...attributes: string[]) {
	localStorage.setItem('events:on', '1')

	for (const attribute of ['data-events', ...attributes]) {
		document.documentElement.setAttribute(attribute, '')
	}
}

const CASES = [
	{ state: 'idle', attributes: [], name: 'Events', ring: false },
	{
		state: 'a capture',
		attributes: ['data-events-capture'],
		name: 'Events, capture running',
		ring: true,
	},
	{
		state: 'a report',
		attributes: ['data-events-reports'],
		name: 'Events, bug reports held',
		ring: false,
	},
	{
		state: 'a capture and a report',
		attributes: ['data-events-capture', 'data-events-reports'],
		name: 'Events, capture running, bug reports held',
		ring: true,
	},
]

/**
 * The cases of the header button in each state. With `forced`, each case also
 * reads the border that keeps the ring under forced colors.
 */
export function examineEventsButton(forced: boolean): void {
	afterEach(() => {
		localStorage.removeItem('events:on')

		for (const attribute of ATTRIBUTES) document.documentElement.removeAttribute(attribute)
	})

	for (const { state, attributes, name, ring } of CASES) {
		it(`names ${state}, and ${ring ? 'shows' : 'hides'} the ring`, () => {
			setRoot(...attributes)

			renderUI(<EventsButton />)

			const button = screen.getByRole('button', { name })

			// The ring is the last hidden mark of the button, after the icon and the dot.
			const marks = button.querySelectorAll<HTMLElement>(':scope > span[aria-hidden]')

			const style = getComputedStyle(present(marks[marks.length - 1], 'ring'))

			expect(style.display === 'block').toBe(ring)

			// Forced colors keep a border, so the ring stays visible there.
			if (ring && forced) expect(style.borderTopStyle).toBe('solid')

			if (ring) expect(Number.parseFloat(style.borderTopWidth)).toBeGreaterThan(0)
		})
	}
}
