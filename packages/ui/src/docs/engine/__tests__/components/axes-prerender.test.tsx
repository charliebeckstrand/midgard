import { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ComponentApi } from '../../api-reference'
import type { Axis } from '../../axes'
import { type AxesPrerender, AxesPrerenderContext, readPrerenderedAxes } from '../../axes-prerender'
import { Axes, DemoApiContext } from '../../components/axes'

const api: ComponentApi[] = [
	{
		name: 'Note',
		props: [
			{ name: 'level', type: '2 | 3 | 4' },
			{ name: 'color', type: "'red' | 'blue'" },
		],
	},
]

/** A fulfilled promise that `use()` reads with no suspend. */
function settled<T>(value: T): Promise<T> {
	return Object.assign(Promise.resolve(value), { status: 'fulfilled', value })
}

/** A page with one `Axes` of a note whose level changes only the heading tag. */
function page(prerender: AxesPrerender) {
	return (
		<AxesPrerenderContext value={prerender}>
			<DemoApiContext value={settled(api)}>
				<Axes
					of="Note"
					render={(props, label) => {
						const { level = 2, color } = props as { level?: number; color?: string }

						const Title = `h${level}` as 'h2'

						return (
							<Title className="text-lg" data-color={color}>
								{label}
							</Title>
						)
					}}
				/>
			</DemoApiContext>
		</AxesPrerenderContext>
	)
}

/** Render the page as the build does: a first pass, its read, and a second pass. */
function prerender(): { html: string; reads: AxesPrerender } {
	const collect = new Map<string, readonly Axis[]>()

	const first = document.createElement('div')

	first.innerHTML = renderToString(page({ path: '/note', collect }))

	const reads = { path: '/note', reads: readPrerenderedAxes(first, collect) }

	return { html: renderToString(page(reads)), reads }
}

/** The titles of the examples in an HTML string. */
function titles(html: string): string[] {
	const root = document.createElement('div')

	root.innerHTML = html

	return [...root.querySelectorAll('[data-slot="example"] h2, [data-slot="example"] h3')]
		.map((heading) => heading.textContent ?? '')
		.filter((title) => ['Playground', 'Level', 'Color'].includes(title))
}

afterEach(() => {
	document.body.innerHTML = ''

	vi.restoreAllMocks()
})

describe('Axes prerender', () => {
	it('shows each axis in the first pass, as a render with no effects does', () => {
		const collect = new Map<string, readonly Axis[]>()

		const html = renderToString(page({ path: '/note', collect }))

		expect(titles(html)).toEqual(['Playground', 'Color', 'Level'])

		expect([...collect.values()][0]?.map((axis) => axis.name)).toEqual(['color', 'level'])
	})

	it('hides the axes of the first read in the second pass', () => {
		const { html, reads } = prerender()

		expect(titles(html)).toEqual(['Playground', 'Color'])

		expect(Object.values(reads.reads ?? {})[0]?.unseen).toEqual(['level'])
	})

	it('hydrates the second pass with no change and no error', async () => {
		const { html, reads } = prerender()

		const container = document.body.appendChild(document.createElement('div'))

		container.innerHTML = html

		const before = container.innerHTML

		const error = vi.spyOn(console, 'error')

		await act(async () => {
			hydrateRoot(container, page(reads))
		})

		expect(error).not.toHaveBeenCalled()

		expect(container.innerHTML).toBe(before)
	})
})
