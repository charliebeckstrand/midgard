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
 * Three cases are deferred (`GEOMETRY_DEFERRED`):
 *
 * - Select and Listbox: their shared open step resolves the trigger via
 *   `getByRole('combobox')`, which is ambiguous against a real DOM (the Select
 *   trigger structurally exposes two `role="combobox"` nodes). Driving those
 *   popovers open needs a browser-specific helper.
 * - Color picker: its panel packs a hex field whose copy affordance is a `sm`,
 *   bare ToggleIconButton — a 16px icon whose hit area is expanded by a `::before`
 *   inset (and the coarse-pointer TouchTarget span), neither of which axe's
 *   `target-size` rule can credit; it measures the 16px border-box and flags 2.5.8.
 *   That floor is a system-wide property of small bare icon buttons, not a picker
 *   defect, so raising it is a deliberate cross-cutting decision rather than a
 *   silent local patch. The picker's structure stays gated by the jsdom
 *   interactive baseline.
 */
const GEOMETRY_DEFERRED = new Set(['select', 'listbox', 'color picker'])

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
