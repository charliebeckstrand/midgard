import { configureAxe, toHaveNoViolations } from 'jest-axe'
import { expect } from 'vitest'

// Register `toHaveNoViolations` here rather than in setup/index.ts so axe-core
// loads only for the two a11y suites that import `axe`/`axePage` from this
// module — not across the whole jsdom setup path (one import per test file).
expect.extend(toHaveNoViolations)

/**
 * axe-core runner for the jsdom test environment.
 *
 * jsdom has no layout or rendering engine. `color-contrast` (WCAG 1.4.3 /
 * 1.4.11) and `target-size` (2.5.5) require real-browser geometry and are
 * disabled here. Structural rules (roles, names, ARIA validity, label
 * association, list and landmark structure) remain enabled.
 *
 * Pair with the `toHaveNoViolations` matcher (registered above):
 *
 *     expect(await axe(container)).toHaveNoViolations()
 */
export const axe = configureAxe({
	rules: {
		'color-contrast': { enabled: false },
		'target-size': { enabled: false },
		// `region` fires on every isolated component render (no enclosing landmark).
		// Re-enabled in the page-scoped `axePage` runner below.
		region: { enabled: false },
	},
})

/**
 * Page/layout-scoped runner. Enables `region` and the landmark rules
 * (`landmark-one-main`, `landmark-unique`, …) for asserting that a full layout
 * composes a correct landmark structure. Run against `document.body`, not an
 * isolated container. Contrast and target-size remain disabled (require a real
 * browser).
 */
export const axePage = configureAxe({
	rules: {
		'color-contrast': { enabled: false },
		'target-size': { enabled: false },
	},
})
