import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { userEvent as browserUser } from 'vitest/browser'
import { interactive, roved, rows } from '../../a11y/cases'
import { present, renderUI } from '../../helpers'
import { axeGeometry } from './helpers/axe-geometry'

/**
 * Open-state geometry gate (real browser). Drives each `interactive` corpus
 * case open and runs `color-contrast` / `target-size` against the live surface.
 *
 * Select and Listbox are deferred (`GEOMETRY_DEFERRED`): their shared open step
 * resolves the trigger via `getByRole('combobox')`, which is ambiguous against a
 * real DOM (the Select trigger structurally exposes two `role="combobox"` nodes).
 * Driving those popovers open needs a browser-specific helper.
 */
const GEOMETRY_DEFERRED = new Set(['select', 'listbox'])

const interactiveGeometry = interactive.filter(({ name }) => !GEOMETRY_DEFERRED.has(name))

describe('a11y geometry (axe): interactive', () => {
	it.each(rows(interactiveGeometry))(
		'%s meets contrast and target-size when open',
		async (_name, { element, open }) => {
			const user = userEvent.setup()

			renderUI(element)

			// A real key press first. The tooltip case opens on a keyboard focus,
			// and the script focus of a simulated Tab matches `:focus-visible` only
			// when the last real input of the page was not a pointer. An earlier
			// file can leave a pointer input.
			await browserUser.keyboard('{Shift}')

			await open(user)

			expect(await axeGeometry(document.body)).toHaveNoViolations()
		},
	)
})

/**
 * Scoped to the description slot rather than the document: a palette item's
 * *label* also misses AA on this wash, but by a different mechanism; it carries
 * no ink of its own and inherits the `text.muted` of the `body` slot of the panel group through
 * `DialogBody`. That is a separate defect in a shared panel slot, out of #592's
 * scope, and asserting the whole document here would couple this regression case
 * to it.
 */
describe('a11y geometry (axe): roved item descriptions', () => {
	it.each(rows(roved))(
		'%s description meets contrast while roved',
		async (_name, { element, descriptionSlot: slot }) => {
			renderUI(element)

			const item = present(document.querySelector('[role="option"], [role="menuitem"]'), 'an item')

			item.setAttribute('data-active', 'true')

			const description = present(
				item.querySelector(`[data-slot="${slot}"]`),
				"the item's description",
			)

			expect(await axeGeometry(description)).toHaveNoViolations()
		},
	)
})
