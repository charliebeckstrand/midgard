import { act, type ComponentType, Suspense, use } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DemoErrorBoundary } from '../components/error-boundary'
import { initRegistry, loadDemo, preloadDemo, retryDemo } from '../registry'
import { fireEvent, renderUI, screen } from './helpers'

const Ok: ComponentType = () => <p>demo</p>

/** A loader that fails its first `failures` imports after a macrotask, as a chunk fetch does. */
function loaderFailing(failures: number) {
	let count = 0

	return vi.fn(() => {
		count += 1

		return count > failures
			? Promise.resolve(Ok)
			: new Promise<ComponentType>((_, reject) => setTimeout(() => reject(new Error('chunk')), 0))
	})
}

/**
 * Bind the registry to one demo under `id`. The cache is module scope and
 * outlives a case, so each case takes its own id. The `a-default` demo sorts
 * first, so the initial preload of `initRegistry` takes it, not the demo under
 * test.
 */
function bind(id: string, loader: () => Promise<ComponentType>) {
	initRegistry({
		'./demos/components/a-default.tsx': () => Promise.resolve(Ok),
		[`./demos/components/${id}.tsx`]: loader,
	})
}

function Page({ id }: { id: string }) {
	const Component = use(loadDemo(id))

	return <Component />
}

/** The shape of `App`: one Suspense boundary, and an error boundary whose retry evicts first. */
function Route({ id }: { id: string }) {
	return (
		<Suspense fallback={<p>loading</p>}>
			<DemoErrorBoundary
				fallback={(retry) => (
					<button
						type="button"
						onClick={() => {
							retryDemo(id)

							retry()
						}}
					>
						failed
					</button>
				)}
			>
				<Page id={id} />
			</DemoErrorBoundary>
		</Suspense>
	)
}

// Each render goes through an awaited `act`. A component that suspends inside
// a synchronous `act` is not retried when its promise settles, so the page
// stays on its fallback whatever the registry does.

/** Wait long enough for a retry loop to import again. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 50))

describe('registry', () => {
	it('renders the error boundary after one failed import', async () => {
		const loader = loaderFailing(Number.POSITIVE_INFINITY)

		bind('registry-fails', loader)

		await act(async () => {
			renderUI(<Route id="registry-fails" />)
		})

		await screen.findByText('failed')

		await settle()

		expect(loader).toHaveBeenCalledTimes(1)
	})

	it('re-attempts a failed import on retry', async () => {
		const loader = loaderFailing(1)

		bind('registry-retries', loader)

		await act(async () => {
			renderUI(<Route id="registry-retries" />)
		})

		const retry = await screen.findByText('failed')

		await act(async () => {
			fireEvent.click(retry)
		})

		await screen.findByText('demo')

		expect(loader).toHaveBeenCalledTimes(2)
	})

	it('re-attempts a failed import on prefetch', async () => {
		const loader = loaderFailing(1)

		bind('registry-prefetch', loader)

		await expect(loadDemo('registry-prefetch')).rejects.toThrow('chunk')

		preloadDemo('registry-prefetch')

		await expect(loadDemo('registry-prefetch')).resolves.toBe(Ok)

		expect(loader).toHaveBeenCalledTimes(2)
	})

	it('keeps a fulfilled import on retry', async () => {
		const loader = loaderFailing(0)

		bind('registry-keeps', loader)

		const first = loadDemo('registry-keeps')

		await first

		retryDemo('registry-keeps')

		expect(loadDemo('registry-keeps')).toBe(first)

		expect(loader).toHaveBeenCalledTimes(1)
	})
})
