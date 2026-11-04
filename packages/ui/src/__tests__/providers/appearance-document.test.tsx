import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppearanceProvider, useAppearance } from '../../providers/appearance'

function ThemeProbe() {
	return <span data-testid="theme">{useAppearance().theme}</span>
}

/**
 * Parses server markup of a whole document. The parsed nodes are in another
 * realm, so the checks read plain attributes and not the DOM matchers.
 */
function parse(html: string) {
	return new DOMParser().parseFromString(html, 'text/html')
}

describe('AppearanceProvider in the server document', () => {
	it('puts the font script before the text of the body, and its preload in the head', () => {
		const doc = parse(
			renderToString(
				<html lang="en">
					<head />
					<body>
						<AppearanceProvider>
							<ThemeProbe />
						</AppearanceProvider>
					</body>
				</html>,
			),
		)

		expect(doc.body.querySelector('[data-testid="theme"]')?.textContent).toBe('system')

		const script = doc.body.firstElementChild

		expect(script?.tagName).toBe('SCRIPT')

		// The browser requests the font script from the head, before the modules of the page.
		const preload = doc.head.querySelector('link[rel="preload"][as="script"]')

		expect(preload?.getAttribute('href')).toBe(script?.getAttribute('src'))

		expect(preload?.getAttribute('fetchpriority')).toBe('high')

		const inline = Array.from(doc.querySelectorAll('script')).filter((node) => !node.src)

		expect(inline).toEqual([])
	})
})
