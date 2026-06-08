import { configureAxe } from 'jest-axe'

/**
 * Real-browser axe runner scoped to the two geometry-dependent rules disabled
 * in the jsdom runner (helpers/axe.ts): `color-contrast` (WCAG 1.4.3 / 1.4.11)
 * and `target-size` (WCAG 2.5.8). With a real layout engine and the compiled
 * Tailwind utilities loaded, axe computes foreground/background colour and
 * hit-target geometry. `runOnly` restricts the pass to these two rules.
 */
const run = configureAxe()

export function axeGeometry(node: Element | Document): ReturnType<typeof run> {
	return run(node as Element, {
		runOnly: { type: 'rule', values: ['color-contrast', 'target-size'] },
	})
}
