import { describe, it } from 'vitest'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { axe, renderUI } from '../helpers'
import { baseline } from './cases'

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
