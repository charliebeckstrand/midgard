import { afterAll, beforeAll } from 'vitest'
import { cdp } from 'vitest/browser'

/**
 * Emulates forced colors for each case of the enclosing `describe` block.
 *
 * @remarks
 * The instance shares one page across its files, and the emulation is page state. Thus the
 * `afterAll` gives each feature back to the browser.
 *
 * @param scheme - The color scheme of the forced palette. With no scheme, the browser keeps its
 * own.
 */
export function emulateForcedColors(scheme?: 'light' | 'dark'): void {
	const features = (forced: string, preferred: string) => [
		{ name: 'forced-colors', value: forced },
		...(scheme ? [{ name: 'prefers-color-scheme', value: preferred }] : []),
	]

	beforeAll(() =>
		cdp().send('Emulation.setEmulatedMedia', { features: features('active', scheme ?? '') }),
	)

	afterAll(() => cdp().send('Emulation.setEmulatedMedia', { features: features('', '') }))
}

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
