import { describe, expect, it } from 'vitest'
import { interactive } from '../a11y/cases'
import { renderUI, userEvent } from '../helpers'
import { axeGeometry } from './helpers/axe-geometry'

/**
 * Open-state geometry gate (real browser). The geometry baseline
 * (a11y-geometry.test.tsx) checks contrast and target-size over the closed
 * `baseline` + `overlays` corpora; the `interactive` corpus — overlays that only
 * mount on a real interaction — was left as a follow-up, so every open popover
 * surface (filtered combobox options, the calendar day grid, the tooltip panel)
 * went geometry-unverified. This suite drives each open and runs the same
 * `color-contrast` / `target-size` pass against the live surface.
 *
 * Select and Listbox are still deferred: their shared open step resolves the
 * trigger via `getByRole('combobox')`, which is ambiguous against a real DOM
 * (the Select trigger structurally exposes two `role="combobox"` nodes). Driving
 * those popovers open needs a browser-specific helper — the remaining follow-up.
 */
const DEFERRED_OPEN = new Set(['select', 'listbox'])

const interactiveGeometry = interactive.filter(([name]) => !DEFERRED_OPEN.has(name))

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
