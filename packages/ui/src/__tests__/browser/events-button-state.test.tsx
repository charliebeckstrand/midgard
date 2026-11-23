import { afterEach, describe, expect, it } from 'vitest'
import { EventsButton } from '../../modules/events/events-button'
import { present, renderUI, screen } from '../helpers'
import { emulateForcedColors } from './helpers/forced-colors'

/**
 * The header button of the events tells a capture and a report by more than a color.
 *
 * The name stayed "Events" in each state, and only a red icon showed a capture (WCAG 1.4.1).
 * The root attributes now show hidden text in the name, and a ring for the capture.
 *
 * Rides the real browser because CSS shows each state: jsdom loads no stylesheet, so it cannot
 * tell which text joins the name.
 */

const ATTRIBUTES = ['data-events', 'data-events-capture', 'data-events-reports']

/** Writes the root attributes that the events setting writes. */
function setRoot(...attributes: string[]) {
	for (const attribute of ['data-events', ...attributes]) {
		document.documentElement.setAttribute(attribute, '')
	}
}

afterEach(() => {
	for (const attribute of ATTRIBUTES) document.documentElement.removeAttribute(attribute)
})

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

function examine(forced: boolean) {
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

describe('the header button of the events (real browser)', () => {
	examine(false)
})

describe('the header button of the events under forced colors (real browser)', () => {
	emulateForcedColors()

	examine(true)
})
