import { describe, expect, it } from 'vitest'
import { baseline, overlays } from '../a11y/cases'
import { renderUI } from '../helpers'
import { axeGeometry } from './helpers/axe-geometry'

/**
 * Geometry a11y gate (real browser). Runs the canonical corpus through real
 * Chromium with the production Tailwind CSS loaded, asserting `color-contrast`
 * and `target-size`, the two rules disabled in jsdom (no layout or colour).
 * Reusing the exact corpus keeps both gates in lockstep: a component is verified
 * for structure (jsdom) and geometry (here).
 */

// Kanban's read-only board marks every card `data-disabled` (→ opacity-50),
// dimming its near-black text to ~#828283. WCAG 1.4.3 exempts inactive/disabled
// components, but axe still flags the dimmed divs (they aren't native disabled
// controls); excluded here rather than darkened. Structure remains in the jsdom
// baseline.
const GEOMETRY_EXEMPT = new Set(['kanban'])

const geometryBaseline = baseline.filter(([name]) => !GEOMETRY_EXEMPT.has(name))

describe('a11y geometry (axe): baseline', () => {
	it.each(geometryBaseline)('%s meets contrast and target-size', async (_name, element) => {
		const { container } = renderUI(element)

		expect(await axeGeometry(container)).toHaveNoViolations()
	})
})

/**
 * Overlays portal to `document.body`, leaving the container empty; asserts
 * the whole document, matching the jsdom overlay gate.
 */
describe('a11y geometry (axe): overlays', () => {
	it.each(overlays)('%s meets contrast and target-size', async (_name, element) => {
		renderUI(element)

		expect(await axeGeometry(document.body)).toHaveNoViolations()
	})
})

// The `interactive` corpus (open select/combobox/listbox/date-picker popovers)
// is intentionally omitted. The Select trigger structurally exposes two
// `role="combobox"` nodes (the outer `select` wrapper and the inner
// `listbox-button`), making the corpus's shared `getByRole('combobox')` open
// step ambiguous against a real DOM. Driving those popovers open needs
// browser-specific helpers (see a11y-geometry-interactive.test.tsx). Closed
// triggers are covered by the baseline corpus.
