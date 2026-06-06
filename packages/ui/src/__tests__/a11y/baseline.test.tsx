import { describe, it } from 'vitest'
import { Button } from '../../components/button'
import { Dialog, DialogBody } from '../../components/dialog'
import { Icon } from '../../components/icon'
import { axe, renderUI, userEvent } from '../helpers'
import { baseline, interactive, overlays } from './cases'

/**
 * Component a11y compliance gate (axe-core): every component, rendered in its
 * canonical correctly-wired form (`cases.tsx`), must be axe-clean. This is a
 * regression guard, not a substitute for a manual sweep — axe catches static
 * role/name/ARIA/label/structure defects but cannot see keyboard behavior,
 * focus management, live regions, contrast, or touch-target geometry. Rules it
 * can't evaluate in jsdom (color-contrast, target-size, region) are disabled in
 * helpers/axe.ts.
 */

describe('a11y baseline (axe)', () => {
	it.each(baseline)('%s has no axe violations', async (_name, element) => {
		const { container } = renderUI(element)

		expect(await axe(container)).toHaveNoViolations()
	})
})

/**
 * Overlay gate: these components portal their content to `document.body`, so the
 * container-scoped check above would inspect an empty node and pass vacuously.
 * Render each in its canonical open state (`cases.ts` → `overlays`) and assert
 * the whole document is clean. Cleanup resets `document.body` between cases.
 */
describe('a11y baseline (axe) — overlays', () => {
	it.each(overlays)('%s has no axe violations', async (_name, element) => {
		renderUI(element)

		expect(await axe(document.body)).toHaveNoViolations()
	})
})

/**
 * Interactive gate: overlays with no controlled-open prop (tooltip, the
 * select/combobox/date-picker popovers) can't be authored open, so each case
 * carries an `open` step that drives the real interaction before the document
 * is checked. Same body scope and cleanup as the overlays gate.
 */
describe('a11y baseline (axe) — interactive', () => {
	it.each(interactive)('%s has no axe violations', async (_name, element, open) => {
		const user = userEvent.setup()

		renderUI(element)

		await open(user)

		expect(await axe(document.body)).toHaveNoViolations()
	})
})

// Proves the gate has teeth: axe must actually surface a real defect, so a
// passing baseline above means "clean", not "matcher misconfigured". This case
// is a known finding from the audit (icon-only controls need an accessible
// name, WCAG 4.1.2) — the Button below intentionally omits aria-label.
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

// Proves the body-scoped overlay runner has teeth too: an open dialog with no
// title (and no aria-label) has no accessible name, which axe must surface
// against document.body (WCAG 4.1.2). Mirrors the container-scoped teeth check.
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
