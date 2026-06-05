import { configureAxe } from 'jest-axe'

/**
 * axe-core runner for the jsdom test environment.
 *
 * jsdom has no layout or rendering engine, so any rule that depends on computed
 * geometry or color is unreliable here. `color-contrast` (WCAG 1.4.3 / 1.4.11)
 * and `target-size` (2.5.5) are therefore disabled — both are tracked in
 * ACCESSIBILITY-AUDIT.md and need real-browser verification. Everything axe can
 * evaluate statically (roles, names, ARIA validity, label association, list and
 * landmark structure) stays on.
 *
 * Pair with the `toHaveNoViolations` matcher (registered in setup/index.ts):
 *
 *     expect(await axe(container)).toHaveNoViolations()
 */
export const axe = configureAxe({
	rules: {
		'color-contrast': { enabled: false },
		'target-size': { enabled: false },
		// Page-level concern: isolated component renders are not inside a <main>
		// landmark, so this best-practice rule would fire on every case.
		region: { enabled: false },
	},
})
