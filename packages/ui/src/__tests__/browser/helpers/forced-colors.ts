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
