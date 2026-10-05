import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ApiTable } from '../kit/api-table.tsx'
import { ExampleFrame } from '../kit/example.tsx'
import type { ExampleCode, ExampleMeta } from '../plugin/examples.ts'

// A panel that suspends opens empty, and React holds its content back for at
// least 300 ms. So "Show code" and an entry of the API reference open only
// when their content is loaded, and a panel never shows with no content.

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
			html: '<pre class="shiki"><code>const answer = 42</code></pre>',
		})

		const panel = await waitFor(() => {
			const element = container.querySelector('[data-slot="collapse-panel"]')

			expect(element).not.toBeNull()

			return element
		})

		expect(panel?.textContent).toContain('const answer = 42')
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
})
