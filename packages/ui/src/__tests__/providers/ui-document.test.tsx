import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { useAppearance } from '../../providers/appearance'
import { UIDocument } from '../../providers/ui'

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

describe('UIDocument', () => {
	it('renders the document attributes and the classes of html and body', () => {
		const doc = parse(
			renderToString(
				<UIDocument lang="fr" className="h-full" bodyClassName="bg-white">
					<main />
				</UIDocument>,
			),
		)

		expect(doc.documentElement.getAttribute('lang')).toBe('fr')

		expect(doc.documentElement.className).toBe('h-full')

		expect(doc.body.className).toBe('bg-white')

		expect(doc.body.querySelector('main')).not.toBeNull()
	})

	it('puts the head content before the appearance script', () => {
		const doc = parse(
			renderToString(
				<UIDocument head={<meta name="viewport" content="width=device-width" />}>
					<main />
				</UIDocument>,
			),
		)

		const [first, ...rest] = Array.from(doc.head.children)

		const script = rest.find((element) => element.tagName === 'SCRIPT')

		expect(first?.getAttribute('name')).toBe('viewport')

		expect(script?.textContent).toContain('localStorage')
	})

	it('gives the body the appearance provider and its font script', () => {
		const doc = parse(
			renderToString(
				<UIDocument>
					<ThemeProbe />
				</UIDocument>,
			),
		)

		expect(doc.body.querySelector('[data-testid="theme"]')?.textContent).toBe('system')

		const script = doc.body.firstElementChild

		expect(script?.tagName).toBe('SCRIPT')

		// The browser requests the font script from the head, before the modules of the page.
		const preload = doc.head.querySelector('link[rel="preload"][as="script"]')

		expect(preload?.getAttribute('href')).toBe(script?.getAttribute('src'))

		expect(preload?.getAttribute('fetchpriority')).toBe('high')
	})
})
