import { createElement as h, lazy } from 'react'
import { renderToReadableStream } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LazyPanel } from '../../components/places-app/lazy-panel'

/** A panel whose code loads on use, as the app loads its three panels. */
const Panel = lazy(async () => ({ default: () => h('div', { 'data-testid': 'panel' }, 'Panel') }))

/**
 * The HTML that the server sends before any streamed segment: the shell, which
 * the browser can paint before the rest of the stream lands.
 */
async function shell(open: boolean, loaded: boolean): Promise<{ shell: string; html: string }> {
	const stream = await renderToReadableStream(
		h('main', null, h(LazyPanel, { open, loaded, children: h(Panel) })),
	)

	const html = await new Response(stream).text()

	const segment = html.indexOf('<div hidden id="S:')

	return { shell: segment === -1 ? html : html.slice(0, segment), html }
}

describe('LazyPanel', () => {
	it('puts a panel that is open on the first render into the shell', async () => {
		const { shell: painted } = await shell(true, false)

		expect(painted).toContain('data-testid="panel"')

		expect(painted).not.toContain('<template id="B:')
	})

	it('renders nothing for a closed panel whose code has not loaded', async () => {
		const { html } = await shell(false, false)

		expect(html).toBe('<main></main>')
	})

	it('keeps a Suspense boundary around a panel that mounts closed', async () => {
		const { html } = await shell(false, true)

		expect(html).toMatch(/^<main><!--\$/)
	})
})
