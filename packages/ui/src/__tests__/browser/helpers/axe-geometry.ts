import { configureAxe } from 'jest-axe'

/**
 * Real-browser axe runner scoped to the two geometry-dependent rules the jsdom
 * runner (helpers/axe.ts) has to disable: `color-contrast` (WCAG 1.4.3 / 1.4.11)
 * and `target-size` (WCAG 2.5.8). With a real layout engine and the compiled
 * Tailwind utilities loaded, axe can finally compute foreground/background
 * colour and hit-target geometry. `runOnly` restricts the pass to exactly these
 * rules so the browser suite verifies what jsdom couldn't, without re-checking
 * the role/name/ARIA structure the jsdom baseline already gates.
 */
const run = configureAxe()

export function axeGeometry(node: Element | Document): ReturnType<typeof run> {
	return run(node as Element, {
		runOnly: { type: 'rule', values: ['color-contrast', 'target-size'] },
	})
}
