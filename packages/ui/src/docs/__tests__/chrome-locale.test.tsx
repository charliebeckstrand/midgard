import { screen } from '@testing-library/react'
import { useIntl } from 'ui/primitives/intl'
import { describe, expect, it, vi } from 'vitest'
import { ApiEntry } from '../kit/api-entry.tsx'
import { ExampleFrame } from '../kit/example.tsx'
import { exampleTitle, PLAYGROUND, tabName } from '../kit/names.ts'
import { Playground } from '../kit/playground.tsx'
import type { BarrelApi } from '../plugin/api.ts'
import type { ExampleMeta } from '../plugin/examples.ts'
import { renderInLocale } from './copy.tsx'

// The text of the kit follows the language of the reader, through the catalogs
// of the docs. The names from the code and the TSDoc stay as they are.

/** The locale of the Spanish docs. */
const SPANISH = 'es-ES'

/** The meta of an example whose code does not load. */
function pendingMeta(title: string, id: string, component?: string): ExampleMeta {
	return { title, id, component, code: () => new Promise(() => {}) }
}

/** Renders an example frame of `meta` in Spanish. */
function renderFrame(meta: ExampleMeta) {
	return renderInLocale(
		<ExampleFrame meta={meta}>
			<span>Instance</span>
		</ExampleFrame>,
		SPANISH,
	)
}

describe('the chrome of the docs in Spanish', () => {
	it('shows the text of an API entry in Spanish, and keeps the names from the code', () => {
		const { container } = renderInLocale(
			<ApiEntry
				component={{
					name: 'Box',
					props: [{ name: 'size', type: 'string', default: "'md'", required: true }],
					events: [{ name: 'onSizeChange', type: '(size: string) => void' }],
					elements: ['div'],
				}}
			/>,
			SPANISH,
		)

		expect(screen.getByRole('heading', { name: 'Eventos' })).toBeDefined()

		expect(screen.getByText('obligatorio')).toBeDefined()

		expect(container.textContent).toContain("por defecto 'md'")

		expect(container.textContent).toContain('También admite los atributos HTML de <div>.')

		expect(screen.getByRole('link', { name: 'size' })).toBeDefined()
	})

	it('says in Spanish when the component takes no props of its own', () => {
		renderInLocale(<ApiEntry component={{ name: 'Spacer', props: [], events: [] }} />, SPANISH)

		expect(screen.getByText('Este componente no tiene props propias.')).toBeDefined()
	})

	it('shows the title of a playground and "Show code" in Spanish', () => {
		renderFrame(pendingMeta('Playground', 'playground', 'Box'))

		expect(screen.getByRole('heading', { name: 'Área de pruebas' })).toBeDefined()

		expect(screen.getByRole('button', { name: 'Mostrar código' })).toBeDefined()
	})

	it('translates the title of an example, which comes from its file name', () => {
		renderFrame(pendingMeta('With icon', 'with-icon'))

		expect(screen.getByRole('heading', { name: 'Con icono' })).toBeDefined()
	})

	it('keeps the English title of an example that the catalog does not hold, and reports it', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		renderFrame(pendingMeta('Not in the catalog', 'not-in-the-catalog'))

		expect(screen.getByRole('heading', { name: 'Not in the catalog' })).toBeDefined()

		expect(error).toHaveBeenCalledWith(
			'docs: the es-ES catalog has no message docs.title.not-in-the-catalog. Run `pnpm intl`.',
		)
	})

	it('translates the name of a tab, which comes from the TABS of its page', () => {
		function Name() {
			return tabName(useIntl(), 'sorting', 'Sorting')
		}

		const { container } = renderInLocale(<Name />, SPANISH)

		expect(container.textContent).toBe('Ordenación')
	})

	it('gives each playground the title of the playground, which the search shows too', () => {
		function Title() {
			return exampleTitle(useIntl(), PLAYGROUND, 'Playground')
		}

		const { container } = renderInLocale(<Title />, SPANISH)

		expect(container.textContent).toBe('Área de pruebas')
	})

	it('shows the label and the options of each field of a playground in Spanish', () => {
		const api: BarrelApi = {
			Thing: {
				name: 'Thing',
				props: [
					{
						name: 'orientation',
						type: 'Responsive<Orientation>',
						values: ['horizontal', 'vertical'],
						responsive: true,
						default: 'THING_ORIENTATION',
						defaultValue: { initial: 'vertical', sm: 'horizontal' },
					},
					{
						name: 'placement',
						type: "'bottom-start' | 'top'",
						values: ['bottom-start', 'top'],
						default: "'bottom-start'",
						defaultValue: 'bottom-start',
					},
					{ name: 'readOnly', type: 'boolean', values: [false, true] },
				],
				events: [],
			},
		}

		function ThingPlayground() {
			return <output />
		}

		Object.assign(ThingPlayground, {
			title: 'Playground',
			id: 'playground',
			component: 'Thing',
			code: () => new Promise(() => {}),
		})

		renderInLocale(<Playground of={ThingPlayground} api={api} />, SPANISH)

		expect(screen.getByRole('combobox', { name: 'Ubicación' }).textContent).toContain(
			'Abajo al inicio',
		)

		expect(screen.getByRole('combobox', { name: 'Orientación' }).textContent).toContain(
			'Vertical, Horizontal desde ancho medio',
		)

		expect(screen.getByRole('combobox', { name: 'Solo lectura' }).textContent).toContain('Ninguno')
	})
})
