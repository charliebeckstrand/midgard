import { describe, expect, it } from 'vitest'

/**
 * The selectors of the style rules in `rules`, where a rule nests another rule.
 * A grouping rule, such as `@media` or `@layer`, holds rules without a selector,
 * so the walk goes into it and does not report it.
 */
function nestedSelectors(rules: CSSRuleList, found: string[] = []): string[] {
	for (const rule of rules) {
		if (rule instanceof CSSStyleRule) {
			if (rule.cssRules.length > 0) found.push(rule.selectorText)
		} else if (rule instanceof CSSGroupingRule) {
			nestedSelectors(rule.cssRules, found)
		}
	}

	return found
}

/**
 * The browser suite reads the utility CSS that a build ships (see `servedTailwind`
 * in `vitest.browser.config.ts`). A build lowers the native nesting that Tailwind
 * generates, so the served CSS must hold no nested style rule. A nested
 * `**:` variant restyles each element with a `data-slot` attribute much more
 * slowly than its flat form, and a benchmark would time that cost.
 */
describe('the served utility CSS', () => {
	it('holds the utilities, and no nested style rule', () => {
		const sheets = [...document.styleSheets]

		const rules = sheets.reduce((count, sheet) => count + sheet.cssRules.length, 0)

		expect(rules).toBeGreaterThan(0)

		const nested = sheets.flatMap((sheet) => nestedSelectors(sheet.cssRules))

		expect(nested).toEqual([])
	})
})
