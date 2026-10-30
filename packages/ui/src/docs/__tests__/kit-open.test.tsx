import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentType, ReactNode } from 'react'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router'
import { beforeAll, describe, expect, onTestFinished, vi } from 'vitest'
import { deferred } from '../../__tests__/helpers/deferred.ts'
import { FailBoundary } from '../../__tests__/helpers/fail-boundary.tsx'
import { it } from '../../__tests__/helpers/fake-clock.ts'
import { tick } from '../../__tests__/helpers/frames.ts'
import { getSlot } from '../../__tests__/helpers/slot-queries.ts'
import { ApiTable } from '../kit/api-table.tsx'
import { ExampleFrame } from '../kit/example.tsx'
import type { BarrelApi } from '../plugin/api.ts'
import type { ExampleCode, ExampleMeta } from '../plugin/examples.ts'

// A panel that suspends opens empty, and React holds its content back for at
// least 300 ms. So "Show code" and an entry of the API reference open only
// when their content is loaded, and a panel never shows with no content.

/** Renders an example frame of `meta`, in `wrapper` when a case gives one. */
function renderFrame(meta: ExampleMeta, wrapper?: ComponentType<{ children: ReactNode }>) {
	return render(
		<ExampleFrame meta={meta}>
			<span>Instance</span>
		</ExampleFrame>,
		{ wrapper },
	)
}

describe('ExampleFrame', () => {
	it('opens "Show code" with the code in it when the code module loads', async () => {
		const code = deferred<ExampleCode>()

		const meta: ExampleMeta = { title: 'Basic', id: 'basic', code: () => code.promise }

		const { container } = renderFrame(meta)

		const trigger = screen.getByRole('button', { name: 'Show code' })

		fireEvent.click(trigger)

		expect(container.querySelector('[data-slot="collapse-panel"]')).toBeNull()

		expect(trigger.getAttribute('aria-expanded')).toBe('false')

		code.resolve({
			code: 'const answer = 42',
			highlight: {
				html: '<pre class="shiki"><code>const answer = 42</code></pre>',
				bg: '#0d1117',
				type: 'dark',
			},
		})

		const panel = await waitFor(() => getSlot(container, 'collapse-panel'))

		expect(panel.textContent).toContain('const answer = 42')
	})

	// A stale tab after a deploy: the chunk is gone, and only a reload gets it.
	it('gives a failed code load to the error boundary when the reader opens "Show code"', async () => {
		const code = deferred<ExampleCode>()

		const meta: ExampleMeta = { title: 'Basic', id: 'basic', code: () => code.promise }

		renderFrame(meta, FailBoundary)

		const trigger = screen.getByRole('button', { name: 'Show code' })

		// React reports the error that the boundary catches.
		vi.spyOn(console, 'error').mockImplementation(() => {})

		// A load in the background that fails does nothing.
		fireEvent.pointerEnter(trigger)

		// The load fails inside `act`, so React renders each update of the failure
		// before the check.
		await act(async () => {
			code.reject(new Error('Failed to fetch dynamically imported module'))
		})

		expect(screen.queryByText('Failed')).toBeNull()

		fireEvent.click(trigger)

		expect(await screen.findByText('Failed')).not.toBeNull()
	})

	// The chunk forgets a failed load, so a load that failed in the background,
	// such as on a bad network, does not stop a later open.
	it('loads the code again when the reader opens "Show code" after a failed background load', async () => {
		const code = deferred<ExampleCode>()

		const load = vi
			.fn<() => Promise<ExampleCode>>()
			.mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
			.mockReturnValue(code.promise)

		const meta: ExampleMeta = { title: 'Basic', id: 'basic', code: load }

		const { container } = renderFrame(meta)

		const trigger = screen.getByRole('button', { name: 'Show code' })

		await act(async () => {
			fireEvent.pointerEnter(trigger)
		})

		fireEvent.click(trigger)

		code.resolve({
			code: 'const answer = 42',
			highlight: {
				html: '<pre class="shiki"><code>const answer = 42</code></pre>',
				bg: '#0d1117',
				type: 'dark',
			},
		})

		const panel = await waitFor(() => getSlot(container, 'collapse-panel'))

		expect(panel.textContent).toContain('const answer = 42')
	})

	// Safari has no `requestIdleCallback`. The kit starts its idle work at once
	// there, and not after the delay of the idle loads of `ui`.
	it('starts the code load at once in a browser with no requestIdleCallback', async ({ clock }) => {
		// The setup restores the stub after the test.
		vi.stubGlobal('requestIdleCallback', undefined)

		const load = vi.fn(() => new Promise<ExampleCode>(() => {}))

		renderFrame({ title: 'Basic', id: 'basic', code: load })

		expect(load).not.toHaveBeenCalled()

		await clock.advance(1)

		expect(load).toHaveBeenCalledOnce()
	})
})

/** Renders the API reference of `api` on a page at `path`, which can hold a hash. */
function renderTable(api: BarrelApi, path = '/thing') {
	render(
		<MemoryRouter initialEntries={[path]}>
			<ApiTable api={api} />
		</MemoryRouter>,
	)
}

const THING: BarrelApi = {
	Thing: {
		name: 'Thing',
		props: [{ name: 'size', type: 'string', description: 'The size.' }],
		events: [],
	},
}

describe('ApiTable', () => {
	// The first load of the entry chunk compiles `marked` and the Markdown of `ui`.
	// It loads once here, so each case waits on its own work only.
	beforeAll(() => import('../kit/api-entry.tsx'))

	it('opens an entry with its props in it', async () => {
		renderTable(THING)

		fireEvent.click(screen.getByRole('button', { name: '<Thing />' }))

		const panel = await screen.findByRole('region', { name: '<Thing />' })

		expect(panel.textContent).toContain('size')
	})

	// Before the chunk loads, both clicks start from the same value, and each
	// applies only the entry that it opened.
	it('opens each entry that the reader clicks before the chunk loads', async () => {
		renderTable({
			First: { name: 'First', props: [], events: [] },
			Second: { name: 'Second', props: [], events: [] },
		})

		fireEvent.click(screen.getByRole('button', { name: '<First />' }))

		fireEvent.click(screen.getByRole('button', { name: '<Second />' }))

		expect(await screen.findByRole('region', { name: '<First />' })).not.toBeNull()

		expect(screen.getByRole('region', { name: '<Second />' })).not.toBeNull()
	})
	// A link to a prop names an element in a closed entry, so the browser
	// cannot scroll to it.
	it('opens the entry that the hash names, and scrolls to the prop', async () => {
		const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')

		renderTable(THING, '/thing#api-Thing-size')

		await screen.findByRole('region', { name: '<Thing />' })

		await waitFor(() =>
			expect(scroll.mock.contexts).toEqual([document.getElementById('api-Thing-size')]),
		)
	})

	// A pick in the search, or a link in the page, can go to the hash that the
	// location has already. The router replaces the entry with the same hash.
	it('opens the entry again on a navigation to the same hash after the reader closed it', async () => {
		const router = createMemoryRouter([{ path: '/thing', element: <ApiTable api={THING} /> }], {
			initialEntries: ['/thing#api-Thing-size'],
		})

		onTestFinished(() => router.dispose())

		render(<RouterProvider router={router} />)

		await screen.findByRole('region', { name: '<Thing />' })

		fireEvent.click(screen.getByRole('button', { name: '<Thing />' }))

		await waitFor(() => expect(screen.queryByRole('region', { name: '<Thing />' })).toBeNull())

		await act(() => router.navigate('/thing#api-Thing-size', { replace: true }))

		expect(await screen.findByRole('region', { name: '<Thing />' })).not.toBeNull()
	})

	it('keeps each entry closed when the hash names no entry of the barrel', async () => {
		renderTable(THING, '/thing#api-Other-size')

		// Wait for the entry chunk, and then one task, so that an entry that the
		// load opens is open.
		await act(async () => {
			await import('../kit/api-entry.tsx')

			await tick()
		})

		expect(screen.queryByRole('region', { name: '<Thing />' })).toBeNull()
	})
})
