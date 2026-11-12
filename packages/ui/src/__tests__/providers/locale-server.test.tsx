// @vitest-environment node
import { prerender } from 'react-dom/static'
import { describe, expect, it } from 'vitest'
import { defineMessage, useIntl } from '../../primitives/intl'
import { LocaleProvider } from '../../providers/locale'

const greeting = defineMessage({
	id: 'test.greeting',
	defaultMessage: 'Hello',
	description: 'The greeting of a test app.',
})

function Greeting() {
	return <p>{useIntl().formatMessage(greeting)}</p>
}

/** The text of a stream of HTML. */
async function readStream(stream: ReadableStream<Uint8Array>): Promise<string> {
	return new Response(stream).text()
}

describe('LocaleProvider on the server', () => {
	it('waits for the translation of the locale, so the markup has no English text', async () => {
		const catalogs = { es: async () => ({ default: { 'test.greeting': 'Hola' } }) }

		const { prelude } = await prerender(
			<LocaleProvider locale="es-ES" catalogs={catalogs}>
				<Greeting />
			</LocaleProvider>,
		)

		const html = await readStream(prelude)

		expect(html).toContain('Hola')

		expect(html).not.toContain('Hello')
	})
})
