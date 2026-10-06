import { describe, expect, it } from 'vitest'
import { Toast, ToastProvider, useToast } from '../../components/toast'
import { UIProvider } from '../../providers/ui'
import { act, attach, renderUI, screen, waitFor } from '../helpers'

const viewports = () => document.querySelectorAll('[data-slot="toast-viewport"]')

/** Renders a probe that gives back the `toast` function of the nearest queue. */
function Probe({ held }: { held: { toast?: ReturnType<typeof useToast>['toast'] } }) {
	held.toast = useToast().toast

	return null
}

describe('UIProvider toast', () => {
	it('gives useToast a queue and a viewport with no setup', () => {
		const held: { toast?: ReturnType<typeof useToast>['toast'] } = {}

		renderUI(
			<UIProvider>
				<Probe held={held} />
			</UIProvider>,
		)

		act(() => {
			held.toast?.({ title: 'Saved', severity: 'success' })
		})

		expect(viewports()).toHaveLength(1)

		expect(screen.getByText('Saved')).toBeInTheDocument()
	})

	it('portals the viewport into the container of the provider', () => {
		const target = attach(document.createElement('div'))

		renderUI(
			<UIProvider portalContainer={target}>
				<span />
			</UIProvider>,
		)

		expect(target.querySelector('[data-slot="toast-viewport"]')).not.toBeNull()
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

	it('mounts one queue and one viewport, at the outermost provider', () => {
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

		expect(viewports()).toHaveLength(1)

		expect(screen.getByText('Nested')).toBeInTheDocument()
	})

	it('lets a ToastProvider in the subtree keep a queue of its own', () => {
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

		expect(viewports()).toHaveLength(2)

		// The local viewport is a child, so it comes before the viewport of the provider.
		expect(viewports()[0]).toHaveTextContent('Local')

		expect(viewports()[1]).not.toHaveTextContent('Local')
	})
})
