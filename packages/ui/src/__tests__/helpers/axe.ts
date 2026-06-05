import { configureAxe } from 'jest-axe'

/**
 * axe-core runner for the jsdom test environment.
 *
 * jsdom has no layout or rendering engine, so any rule that depends on computed
 * geometry or color is unreliable here. `color-contrast` (WCAG 1.4.3 / 1.4.11)
 * and `target-size` (2.5.5) are therefore disabled — they need real-browser
 * verification instead. Everything axe can evaluate statically (roles, names,
 * ARIA validity, label association, list and landmark structure) stays on.
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
		// landmark, so this best-practice rule would fire on every case. The
		// page-scoped `axePage` runner below re-enables it.
		region: { enabled: false },
	},
})

/**
 * Page/layout-scoped runner. `region` and the landmark rules (`landmark-one-main`,
 * `landmark-unique`, …) only make sense against a full document with landmarks —
 * meaningless on an isolated component, but exactly what we want when asserting a
 * whole layout composes a correct landmark structure. They're structural, so
 * jsdom evaluates them fine; run this against `document.body`, not a container.
 * Contrast and target-size still need a real browser, so they stay disabled.
 */
export const axePage = configureAxe({
	rules: {
		'color-contrast': { enabled: false },
		'target-size': { enabled: false },
	},
})
