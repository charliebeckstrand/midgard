import { describe, expect, it } from 'vitest'
import { interactive } from '../a11y/cases'
import { renderUI, userEvent } from '../helpers'
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

describe('a11y geometry (axe) — interactive', () => {
	it.each(
		interactiveGeometry,
	)('%s meets contrast and target-size when open', async (_name, element, open) => {
		const user = userEvent.setup()

		renderUI(element)

		await open(user)

		expect(await axeGeometry(document.body)).toHaveNoViolations()
	})
})
