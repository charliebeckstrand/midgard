import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { LocaleProvider } from 'ui/providers/locale'
import { describe, expect, it } from 'vitest'
import { catalogs } from '../app/catalogs.ts'
import { ApiEntry } from '../kit/api-entry.tsx'
import { ExampleFrame } from '../kit/example.tsx'
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

	it('keeps the English title of an example that the catalog does not hold', () => {
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
	})
})
