// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { attach } from '../../__tests__/helpers/attach.ts'
import { readTexts, recordIntl } from './same-text.ts'

// The page smoke test finds the text that a translated page shows as the
// English page does (`same-text.ts`). These cases read the text of a page, and
// record the text that a formatter gives.

/** Each text that `html` shows in `language`, as the page smoke test reads it. */
function readHtmlTexts(html: string, language: string): Set<string> {
	const container = attach(document.createElement('div'))

	container.innerHTML = html

	const texts = new Set<string>()

	readTexts(container, language, texts)

	return texts
}

describe('readTexts', () => {
	it('reads each text node and each text attribute that holds a word', () => {
		const texts = readHtmlTexts(
			'<p>Guardar</p><button aria-label="Cerrar">×</button><input placeholder="Buscar" /><p>42</p>',
			'es',
		)

		expect([...texts]).toEqual(['Guardar', 'Cerrar', 'Buscar'])
	})

	it('leaves out code, text that a translation keeps, and text in another language', () => {
		const texts = readHtmlTexts(
			`<code>pnpm install</code><kbd>Ctrl</kbd><span translate="no">MM/DD/YYYY</span>
			<div lang="en-US"><button aria-label="Clear date"></button></div><p lang="es-ES">Hola</p>`,
			'es',
		)

		expect([...texts]).toEqual(['Hola'])
	})
})

describe('recordIntl', () => {
	it('records the text that a formatter gives, until it stops', () => {
		const formatted = new Set<string>()

		const stop = recordIntl(formatted)

		const unit = new Intl.NumberFormat('es-ES', { style: 'unit', unit: 'mile' })

		unit.format(5)

		new Intl.ListFormat('es-ES').format(['Ana', 'Luis'])

		stop()

		unit.format(6)

		expect(formatted).toEqual(new Set(['5 mi', 'Ana y Luis']))
	})
})
