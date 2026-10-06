import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Component, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ApiTable } from '../kit/api-table.tsx'
import { ExampleFrame } from '../kit/example.tsx'
import type { ExampleCode, ExampleMeta } from '../plugin/examples.ts'

// A panel that suspends opens empty, and React holds its content back for at
// least 300 ms. So "Show code" and an entry of the API reference open only
// when their content is loaded, and a panel never shows with no content.

class Boundary extends Component<{ children: ReactNode }, { error?: unknown }> {
	state: { error?: unknown } = {}

	static getDerivedStateFromError(error: unknown) {
		return { error }
	}

	render() {
		return this.state.error ? <p>Failed</p> : this.props.children
	}
}

describe('ExampleFrame', () => {
	it('opens "Show code" with the code in it when the code module loads', async () => {
		let load: (code: ExampleCode) => void = () => {}

		const meta: ExampleMeta = {
			title: 'Basic',
			code: () =>
				new Promise((resolve) => {
					load = resolve
				}),
		}

		const { container } = render(
			<ExampleFrame meta={meta}>
				<span>Instance</span>
			</ExampleFrame>,
		)

		const trigger = screen.getByRole('button', { name: 'Show code' })

		fireEvent.click(trigger)

		expect(container.querySelector('[data-slot="collapse-panel"]')).toBeNull()

		expect(trigger.getAttribute('aria-expanded')).toBe('false')

		load({
			code: 'const answer = 42',
			highlight: {
				html: '<pre class="shiki"><code>const answer = 42</code></pre>',
				bg: '#0d1117',
				type: 'dark',
			},
		})

		const panel = await waitFor(() => {
			const element = container.querySelector('[data-slot="collapse-panel"]')

			expect(element).not.toBeNull()

			return element
		})

		expect(panel?.textContent).toContain('const answer = 42')
	})

	// A stale tab after a deploy: the chunk is gone, and only a reload gets it.
	it('gives a failed code load to the error boundary when the reader opens "Show code"', async () => {
		let reject: (error: Error) => void = () => {}

		const meta: ExampleMeta = {
			title: 'Basic',
			code: () =>
				new Promise((_, fail) => {
					reject = fail
				}),
		}

		render(
			<Boundary>
				<ExampleFrame meta={meta}>
					<span>Instance</span>
				</ExampleFrame>
			</Boundary>,
		)

		const trigger = screen.getByRole('button', { name: 'Show code' })

		// React reports the error that the boundary catches.
		vi.spyOn(console, 'error').mockImplementation(() => {})

		// A load in the background that fails does nothing.
		fireEvent.pointerEnter(trigger)

		// The load fails inside `act`, so React renders each update of the failure
		// before the check.
		await act(async () => {
			reject(new Error('Failed to fetch dynamically imported module'))
		})

		expect(screen.queryByText('Failed')).toBeNull()

		fireEvent.click(trigger)

		expect(await screen.findByText('Failed')).not.toBeNull()
	})
})

describe('ApiTable', () => {
	it('opens an entry with its props in it', async () => {
		render(
			<ApiTable
				api={{
					Thing: {
						name: 'Thing',
						props: [{ name: 'size', type: 'string', description: 'The size.' }],
						events: [],
					},
				}}
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: '<Thing />' }))

		// The first load of the entry chunk compiles `marked` and the Markdown of `ui`.
		const panel = await screen.findByRole('region', { name: '<Thing />' }, { timeout: 5000 })

		expect(panel.textContent).toContain('size')
	})

	// Before the chunk loads, both clicks start from the same value, and each
	// applies only the entry that it opened.
	it('opens each entry that the reader clicks before the chunk loads', async () => {
		render(
			<ApiTable
				api={{
					First: { name: 'First', props: [], events: [] },
					Second: { name: 'Second', props: [], events: [] },
				}}
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: '<First />' }))

		fireEvent.click(screen.getByRole('button', { name: '<Second />' }))

		expect(
			await screen.findByRole('region', { name: '<First />' }, { timeout: 5000 }),
		).not.toBeNull()

		expect(screen.getByRole('region', { name: '<Second />' })).not.toBeNull()
	})
})
