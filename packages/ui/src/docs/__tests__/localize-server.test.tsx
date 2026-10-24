// @vitest-environment node
import { prerender } from 'react-dom/static'
import { LocaleProvider } from 'ui/providers/locale'
import { describe, expect, it } from 'vitest'
import { localize } from '../kit/localize.tsx'

// The server render of a page waits for the copy in the language of the
// request, and the HTML preloads the chunks of the copy. The render runs in
// Node, apart from the renders of the DOM.

function English() {
	return <p>Save</p>
}

function Spanish() {
	return <p>Guardar</p>
}

const Localized = localize(
	English,
	{ es: () => Promise.resolve({ default: Spanish }) },
	{ es: ['/assets/button-es.js'] },
)

/** The HTML of a server render of the page in `locale`, when each load ends. */
async function renderHtml(locale: string): Promise<string> {
	const { prelude } = await prerender(
		<LocaleProvider locale={locale}>
			<Localized />
		</LocaleProvider>,
	)

	return new Response(prelude).text()
}

describe('localize on the server', () => {
	it('renders the copy, and preloads its chunks', async () => {
		const html = await renderHtml('es')

		expect(html).toContain('Guardar')

		expect(html).toContain('<link rel="modulepreload" href="/assets/button-es.js"')
	})

	it('preloads no chunk in a language with no copy', async () => {
		const html = await renderHtml('en')

		expect(html).toContain('Save')

		expect(html).not.toContain('modulepreload')
	})
})
