import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useIntl } from 'ui/primitives/intl'
import { LocaleProvider } from 'ui/providers/locale'
import { describe, expect, it, vi } from 'vitest'
import { catalogs } from '../app/catalogs.ts'
import { ApiEntry } from '../kit/api-entry.tsx'
import { ExampleFrame } from '../kit/example.tsx'
import { tabName } from '../kit/names.ts'
import { Playground } from '../kit/playground.tsx'
import type { BarrelApi } from '../plugin/api.ts'
import type { ExampleMeta } from '../plugin/examples.ts'

// The text of the kit follows the language of the reader, through the catalogs
// of the docs. The names from the code and the TSDoc stay as they are.

function Spanish({ children }: { children: ReactNode }) {
	return (
		<LocaleProvider locale="es-ES" catalogs={catalogs}>
			{children}
		</LocaleProvider>
	)
}

describe('the chrome of the docs in Spanish', () => {
	it('shows the text of an API entry in Spanish, and keeps the names from the code', () => {
		const { container } = render(
			<Spanish>
				<ApiEntry
					component={{
						name: 'Box',
						props: [{ name: 'size', type: 'string', default: "'md'", required: true }],
						events: [{ name: 'onSizeChange', type: '(size: string) => void' }],
						elements: ['div'],
					}}
				/>
			</Spanish>,
		)

		expect(screen.getByRole('heading', { name: 'Eventos' })).toBeDefined()

		expect(screen.getByText('obligatorio')).toBeDefined()

		expect(container.textContent).toContain("por defecto 'md'")

		expect(container.textContent).toContain('También admite los atributos HTML de <div>.')

		expect(screen.getByRole('link', { name: 'size' })).toBeDefined()
	})

	it('says in Spanish when the component takes no props of its own', () => {
		render(
			<Spanish>
				<ApiEntry component={{ name: 'Spacer', props: [], events: [] }} />
			</Spanish>,
		)

		expect(screen.getByText('Este componente no tiene props propias.')).toBeDefined()
	})

	it('shows the title of a playground and "Show code" in Spanish', () => {
		const meta: ExampleMeta = {
			title: 'Playground',
			id: 'playground',
			component: 'Box',
			code: () => new Promise(() => {}),
		}

		render(
			<Spanish>
				<ExampleFrame meta={meta}>
					<span>Instance</span>
				</ExampleFrame>
			</Spanish>,
		)

		expect(screen.getByRole('heading', { name: 'Área de pruebas' })).toBeDefined()

		expect(screen.getByRole('button', { name: 'Mostrar código' })).toBeDefined()
	})

	it('translates the title of an example, which comes from its file name', () => {
		const meta: ExampleMeta = {
			title: 'With icon',
			id: 'with-icon',
			code: () => new Promise(() => {}),
		}

		render(
			<Spanish>
				<ExampleFrame meta={meta}>
					<span>Instance</span>
				</ExampleFrame>
			</Spanish>,
		)

		expect(screen.getByRole('heading', { name: 'Con icono' })).toBeDefined()
	})

	it('keeps the English title of an example that the catalog does not hold, and reports it', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		const meta: ExampleMeta = {
			title: 'Not in the catalog',
			id: 'not-in-the-catalog',
			code: () => new Promise(() => {}),
		}

		render(
			<Spanish>
				<ExampleFrame meta={meta}>
					<span>Instance</span>
				</ExampleFrame>
			</Spanish>,
		)

		expect(screen.getByRole('heading', { name: 'Not in the catalog' })).toBeDefined()

		expect(error).toHaveBeenCalledWith(
			'docs: the es-ES catalog has no message docs.title.not-in-the-catalog. Run `pnpm intl`.',
		)
	})

	it('translates the name of a tab, which comes from the TABS of its page', () => {
		function Name() {
			return tabName(useIntl(), 'sorting', 'Sorting')
		}

		const { container } = render(
			<Spanish>
				<Name />
			</Spanish>,
		)

		expect(container.textContent).toBe('Ordenación')
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

		render(
			<Spanish>
				<Playground of={ThingPlayground} api={api} />
			</Spanish>,
		)

		expect(screen.getByRole('combobox', { name: 'Ubicación' }).textContent).toContain(
			'Abajo al inicio',
		)

		expect(screen.getByRole('combobox', { name: 'Orientación' }).textContent).toContain(
			'Vertical, Horizontal desde ancho medio',
		)

		expect(screen.getByRole('combobox', { name: 'Solo lectura' }).textContent).toContain('Ninguno')
	})
})
