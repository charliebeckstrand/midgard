import { describe, expect, it, vi } from 'vitest'
import { ReadyReveal } from '../../primitives/ready-reveal'
import {
	afterFirstWrite,
	expectAnnouncement,
	getSlot,
	liveRegion,
	renderUI,
	screen,
} from '../helpers'

describe('ReadyReveal', () => {
	it('renders children content', () => {
		renderUI(
			<ReadyReveal ready={true} placeholder={<span>Loading...</span>}>
				<span>Real content</span>
			</ReadyReveal>,
		)

		expect(screen.getByText('Real content')).toBeInTheDocument()
	})

	it('renders both placeholder and children', () => {
		renderUI(
			<ReadyReveal ready={false} placeholder={<span>Placeholder</span>}>
				<span>Children</span>
			</ReadyReveal>,
		)

		expect(screen.getByText('Placeholder')).toBeInTheDocument()

		expect(screen.getByText('Children')).toBeInTheDocument()
	})

	it('sets aria-hidden on placeholder when ready', () => {
		renderUI(
			<ReadyReveal ready={true} placeholder={<span>P</span>}>
				<span>C</span>
			</ReadyReveal>,
		)

		const placeholder = screen.getByText('P').parentElement

		expect(placeholder).toHaveAttribute('aria-hidden', 'true')
	})
})

describe('ReadyReveal onReadyComplete', () => {
	const reveal = (props: { ready: boolean; onReadyComplete: () => void }) => (
		<ReadyReveal placeholder={<span>P</span>} {...props}>
			<span>Real content</span>
		</ReadyReveal>
	)

	it('reports the settle once the placeholder has faded out', () => {
		const onReadyComplete = vi.fn()

		const { rerender } = renderUI(reveal({ ready: false, onReadyComplete }))

		expect(onReadyComplete).not.toHaveBeenCalled()

		rerender(reveal({ ready: true, onReadyComplete }))

		expect(onReadyComplete).toHaveBeenCalledOnce()
	})

	it('says nothing for the return to unready, which lands on the same handler', () => {
		const onReadyComplete = vi.fn()

		const { rerender } = renderUI(reveal({ ready: false, onReadyComplete }))

		rerender(reveal({ ready: true, onReadyComplete }))

		rerender(reveal({ ready: false, onReadyComplete }))

		expect(onReadyComplete).toHaveBeenCalledOnce()
	})

	it('says nothing for a reveal that mounts already ready', () => {
		const onReadyComplete = vi.fn()

		renderUI(reveal({ ready: true, onReadyComplete }))

		expect(onReadyComplete).not.toHaveBeenCalled()
	})

	it('marks the root busy only while not ready', () => {
		const { container, rerender } = renderUI(
			<ReadyReveal ready={false} placeholder={<span>P</span>}>
				<span>C</span>
			</ReadyReveal>,
		)

		const root = getSlot(container, 'ready-reveal')

		expect(root).toHaveAttribute('aria-busy', 'true')

		rerender(
			<ReadyReveal ready={true} placeholder={<span>P</span>}>
				<span>C</span>
			</ReadyReveal>,
		)

		expect(root).not.toHaveAttribute('aria-busy')
	})

	it('announces nothing without a loadingLabel', async () => {
		renderUI(
			<ReadyReveal ready={false} placeholder={<span>P</span>}>
				<span>C</span>
			</ReadyReveal>,
		)

		// Wait past the announcer's first write, then confirm nothing was written.
		await afterFirstWrite()

		// Lazily created on first announce; absent means nothing was announced.
		expect(liveRegion()?.textContent ?? '').toBe('')
	})

	it('announces the loadingLabel through the shared announcer each time it goes unready', async () => {
		const { rerender } = renderUI(
			<ReadyReveal ready={false} loadingLabel="Loading orders" placeholder={<span>P</span>}>
				<span>C</span>
			</ReadyReveal>,
		)

		await expectAnnouncement('Loading orders')

		// The reveal renders no live region of its own.
		expect(getSlot(document.body, 'ready-reveal').querySelector('[role="status"]')).toBeNull()

		liveRegion()?.replaceChildren()

		rerender(
			<ReadyReveal ready={true} loadingLabel="Loading orders" placeholder={<span>P</span>}>
				<span>C</span>
			</ReadyReveal>,
		)

		await Promise.resolve()

		expect(liveRegion()?.textContent).toBe('')

		rerender(
			<ReadyReveal ready={false} loadingLabel="Loading orders" placeholder={<span>P</span>}>
				<span>C</span>
			</ReadyReveal>,
		)

		await expectAnnouncement('Loading orders')
	})
})
