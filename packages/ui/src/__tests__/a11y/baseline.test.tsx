import { describe, it } from 'vitest'
import { Button } from '../../components/button'
import { Dialog, DialogBody } from '../../components/dialog'
import { Icon } from '../../components/icon'
import { axe, renderUI, userEvent } from '../helpers'
import { baseline, interactive, overlays } from './cases'

/**
 * Component a11y compliance gate (axe-core): every component, rendered in its
 * canonical correctly-wired form (`cases.tsx`), must be axe-clean. Catches static
 * role/name/ARIA/label/structure defects; does not cover keyboard behavior,
 * focus management, live regions, contrast, or touch-target geometry. Rules
 * unevaluable in jsdom (color-contrast, target-size, region) are disabled in
 * helpers/axe.ts.
 */

describe('a11y baseline (axe)', () => {
	it.each(baseline)('%s has no axe violations', async (_name, element) => {
		const { container } = renderUI(element)

		expect(await axe(container)).toHaveNoViolations()
	})
})

/**
 * Overlay gate: these components portal their content to `document.body`; the
 * container-scoped check inspects an empty node. Renders each in its canonical
 * open state (`cases.ts` → `overlays`) and asserts the whole document is clean.
 * Cleanup resets `document.body` between cases.
 */
describe('a11y baseline (axe) — overlays', () => {
	it.each(overlays)('%s has no axe violations', async (_name, element) => {
		renderUI(element)

		expect(await axe(document.body)).toHaveNoViolations()
	})
})

/**
 * Interactive gate: overlays with no controlled-open prop (tooltip, the
 * select/combobox/date-picker popovers). Each case carries an `open` step that
 * drives the real interaction before the document is checked. Same body scope
 * and cleanup as the overlays gate.
 */
describe('a11y baseline (axe) — interactive', () => {
	it.each(interactive)('%s has no axe violations', async (_name, element, open) => {
		const user = userEvent.setup()

		renderUI(element)

		await open(user)

		expect(await axe(document.body)).toHaveNoViolations()
	})
})

// Teeth check: a known defect (icon-only button with no accessible name,
// WCAG 4.1.2) must surface — confirming the matcher is wired, not just passing.
describe('a11y baseline (axe) — teeth check', () => {
	it('detects an icon-only button with no accessible name', async () => {
		const { container } = renderUI(
			<Button>
				<Icon icon={<svg />} />
			</Button>,
		)

		const { violations } = await axe(container)

		expect(violations.map((violation) => violation.id)).toContain('button-name')
	})
})

// Overlay teeth check: an open dialog with no accessible name (no title or
// aria-label, WCAG 4.1.2) must surface against `document.body`.
describe('a11y baseline (axe) — overlays teeth check', () => {
	it('detects an open dialog with no accessible name', async () => {
		renderUI(
			<Dialog open onOpenChange={() => {}}>
				<DialogBody>No title, so no accessible name.</DialogBody>
			</Dialog>,
		)

		const { violations } = await axe(document.body)

		expect(violations.length).toBeGreaterThan(0)
	})
})
