import { describe, expect, it } from 'vitest'
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

	it('applies custom className in crossfade mode', () => {
		const { container } = renderUI(
			<ReadyReveal ready={false} placeholder={<span>P</span>} className="custom">
				<span>C</span>
			</ReadyReveal>,
		)

		expect(container.firstElementChild?.className).toContain('custom')
	})

	it('renders both elements in crossfade mode', () => {
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

	it('renders in wait mode', () => {
		renderUI(
			<ReadyReveal ready={true} placeholder={<span>P</span>} mode="wait">
				<span>C</span>
			</ReadyReveal>,
		)

		expect(screen.getByText('C')).toBeInTheDocument()
	})
})
