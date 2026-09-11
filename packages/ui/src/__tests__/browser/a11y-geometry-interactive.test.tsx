import { describe, expect, it } from 'vitest'
import { interactive, roved } from '../a11y/cases'
import { present, renderUI, userEvent } from '../helpers'
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

const interactiveGeometry = interactive.filter(([name]) => !GEOMETRY_DEFERRED.has(name))

describe('a11y geometry (axe): interactive', () => {
	it.each(
		interactiveGeometry,
	)('%s meets contrast and target-size when open', async (_name, element, open) => {
		const user = userEvent.setup()

		renderUI(element)

		await open(user)

		expect(await axeGeometry(document.body)).toHaveNoViolations()
	})
})

/**
 * Scoped to the description slot rather than the document: a palette item's
 * *label* also misses AA on this wash, but by a different mechanism — it carries
 * no ink of its own and inherits `panel.layout.body`'s `text.muted` through
 * `DialogBody`. That is a separate defect in a shared panel slot, out of #592's
 * scope, and asserting the whole document here would couple this regression case
 * to it.
 */
describe('a11y geometry (axe): roved item descriptions', () => {
	it.each(roved)('%s description meets contrast while roved', async (_name, element, slot) => {
		renderUI(element)

		const item = present(document.querySelector('[role="option"], [role="menuitem"]'), 'an item')

		item.setAttribute('data-active', 'true')

		const description = present(
			item.querySelector(`[data-slot="${slot}"]`),
			"the item's description",
		)

		expect(await axeGeometry(description)).toHaveNoViolations()
	})
})
