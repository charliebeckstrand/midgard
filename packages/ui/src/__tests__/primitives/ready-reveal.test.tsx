import { describe, expect, it, vi } from 'vitest'
import { ReadyReveal } from '../../primitives/ready-reveal'
import { renderUI, screen } from '../helpers'

describe('ReadyReveal', () => {
	it('renders placeholder content', () => {
		renderUI(
			<ReadyReveal ready={false} placeholder={<span>Loading...</span>}>
				<span>Real content</span>
			</ReadyReveal>,
		)

		expect(screen.getByText('Loading...')).toBeInTheDocument()
	})

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
})
