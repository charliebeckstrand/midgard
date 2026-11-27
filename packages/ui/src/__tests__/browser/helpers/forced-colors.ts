import { beforeEach, describe } from 'vitest'

// The reads of the forced-colors cases. The `forced-light` and the `forced-dark`
// instances of `vitest.browser.config.ts` give each page forced colors as an
// option of the browser context, so no case turns them on or off.

/**
 * The color that the system gives to a system color keyword now, such as `Canvas` or `Highlight`.
 *
 * @remarks
 * A probe with `forced-color-adjust: none` reads the color. The probe goes before the function
 * returns, so no node stays on the page.
 *
 * @param keyword - The system color keyword.
 * @returns The computed color.
 */
export function systemColor(keyword: string): string {
	const probe = document.createElement('div')

	probe.style.cssText = `forced-color-adjust: none; background-color: ${keyword}`

	document.body.append(probe)

	const color = getComputedStyle(probe).backgroundColor

	probe.remove()

	return color
}

/**
 * Whether a computed color paints a mark that the eye can find on the page under forced colors.
 *
 * @remarks
 * A color paints when it is not transparent and it is not `Canvas`. A check for `Canvas` alone
 * accepts a transparent background, which paints nothing.
 *
 * @param color - A computed color, such as `getComputedStyle(el).backgroundColor`.
 * @returns `true` when the color paints a mark.
 */
export function showsOnCanvas(color: string): boolean {
	if (color === 'transparent' || /^rgba\(.*,\s*0(?:\.0+)?\)$/.test(color)) return false

	return color !== systemColor('Canvas')
}

/**
 * Runs the cases of `cases` two times: with the light author scheme, and with the `dark` class on
 * the root.
 *
 * @remarks
 * The forced palette comes from the instance, and the author scheme comes from the page. A reader
 * with a dark contrast theme and an app that follows the system scheme gets the dark forced
 * palette and the dark author scheme. A part that keeps its author colors, such as an SVG mark or
 * a subtree with `forced-color-adjust: none`, paints a different color in each author scheme, so
 * each forced case reads the two. The class goes off after each case, also after a case that fails.
 *
 * @param cases - The function that registers the cases, as the body of a `describe` block.
 */
export function eachAuthorScheme(cases: () => void): void {
	describe.each(['light', 'dark'] as const)('with the %s author scheme', (scheme) => {
		if (scheme === 'dark') {
			beforeEach(() => {
				const root = document.documentElement

				root.classList.add('dark')

				return () => {
					root.classList.remove('dark')
				}
			})
		}

		cases()
	})
}
