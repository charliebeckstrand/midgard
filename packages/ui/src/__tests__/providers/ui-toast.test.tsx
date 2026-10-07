import { describe, expect, it, vi } from 'vitest'
import { Toast, ToastProvider, useToast } from '../../components/toast'
import { UIProvider } from '../../providers/ui'
import { act, attach, renderUI, screen, waitFor } from '../helpers'

// The provider loads its viewport in idle time, or on the first toast when that
// comes first, so each check of the viewport waits for it.

const viewports = () => document.querySelectorAll('[data-slot="toast-viewport"]')

/** Renders a probe that gives back the `toast` function of the nearest queue. */
function Probe({ held }: { held: { toast?: ReturnType<typeof useToast>['toast'] } }) {
	held.toast = useToast().toast

	return null
}

describe('UIProvider toast', () => {
	it('gives useToast a queue and a viewport with no setup', async () => {
		const held: { toast?: ReturnType<typeof useToast>['toast'] } = {}

		renderUI(
			<UIProvider>
				<Probe held={held} />
			</UIProvider>,
		)

		act(() => {
			held.toast?.({ title: 'Saved', severity: 'success' })
		})

		expect(await screen.findByText('Saved')).toBeInTheDocument()

		expect(viewports()).toHaveLength(1)
	})

	it('portals the viewport into the container of the provider', async () => {
		const target = attach(document.createElement('div'))

		const held: { toast?: ReturnType<typeof useToast>['toast'] } = {}

		renderUI(
			<UIProvider portalContainer={target}>
				<Probe held={held} />
			</UIProvider>,
		)

		act(() => {
			held.toast?.({ title: 'Saved' })
		})

		await waitFor(() => expect(target.querySelector('[data-slot="toast-viewport"]')).not.toBeNull())
	})

	it('mounts an empty viewport in idle time, before the first toast', async () => {
		vi.stubGlobal('requestIdleCallback', (callback: () => void) => window.setTimeout(callback))

		vi.stubGlobal('cancelIdleCallback', (handle: number) => window.clearTimeout(handle))

		renderUI(
			<UIProvider>
				<span />
			</UIProvider>,
		)

		await waitFor(() => expect(viewports()).toHaveLength(1))

		expect(viewports()[0]?.querySelectorAll('li')).toHaveLength(0)
	})

	it('applies the maxToasts of its toast prop', async () => {
		const held: { toast?: ReturnType<typeof useToast>['toast'] } = {}

		renderUI(
			<UIProvider toast={{ maxToasts: 1, duration: 60_000 }}>
				<Probe held={held} />
			</UIProvider>,
		)

		act(() => {
			held.toast?.({ title: 'First' })

			held.toast?.({ title: 'Second' })
		})

		await waitFor(() => expect(viewports()[0]?.querySelectorAll('li')).toHaveLength(1))

		expect(viewports()[0]).toHaveTextContent('Second')
	})

	it('mounts one queue and one viewport, at the outermost provider', async () => {
		const held: { toast?: ReturnType<typeof useToast>['toast'] } = {}

		renderUI(
			<UIProvider>
				<UIProvider pathname="/inner">
					<Probe held={held} />
				</UIProvider>
			</UIProvider>,
		)

		act(() => {
			held.toast?.({ title: 'Nested' })
		})

		expect(await screen.findByText('Nested')).toBeInTheDocument()

		expect(viewports()).toHaveLength(1)
	})

	it('lets a ToastProvider in the subtree keep a queue of its own', async () => {
		const held: { toast?: ReturnType<typeof useToast>['toast'] } = {}

		renderUI(
			<UIProvider>
				<ToastProvider>
					<Probe held={held} />
					<Toast />
				</ToastProvider>
			</UIProvider>,
		)

		act(() => {
			held.toast?.({ title: 'Local' })
		})

		await act(async () => {})

		// The queue of the provider gets no toast, so its viewport, if the idle
		// load mounted it, holds no toast.
		const [local, ...others] = [...viewports()].sort(
			(a, b) => b.querySelectorAll('li').length - a.querySelectorAll('li').length,
		)

		expect(local).toHaveTextContent('Local')

		for (const viewport of others) expect(viewport.querySelectorAll('li')).toHaveLength(0)
	})
})
