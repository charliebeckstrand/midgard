// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { names } from '../kit/proper-names.ts'
import { findSameText, readTexts, recordIntl } from './same-text.ts'

// The page smoke test finds the text that a translated page shows as the
// English page does (`same-text.ts`). These cases give each recorded source of
// such a text, in Spanish.

afterEach(() => {
	document.body.innerHTML = ''
})

/** Each text that `html` shows in `language`, as the page smoke test reads it. */
function readHtmlTexts(html: string, language: string): Set<string> {
	document.body.innerHTML = html

	const texts = new Set<string>()

	readTexts(document.body, language, texts)

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

describe('findSameText', () => {
	it('finds a text that both languages show', () => {
		const spanish = new Set(['Guardar', 'Pending'])

		const english = new Set(['Save', 'Pending'])

		expect(findSameText('es', spanish, english, new Set())).toEqual(['Pending'])
	})

	it('takes a name, a formatted value, and a text that the catalog keeps', () => {
		names(['Mia Chen'])

		// The Spanish catalog of ui writes "Total" as the English does.
		const same = new Set(['Mia Chen · 5 mi', 'Total', 'Mia Chen, Pending'])

		expect(findSameText('es', same, same, new Set(['5 mi']))).toEqual(['Mia Chen, Pending'])
	})

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
