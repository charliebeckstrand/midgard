import { describe, expect, it } from 'vitest'
import { ContentReveal } from '../../primitives/content-reveal'
import { renderUI, screen } from '../helpers'

describe('ContentReveal', () => {
	it('renders placeholder content', () => {
		renderUI(
			<ContentReveal ready={false} placeholder={<span>Loading...</span>}>
				<span>Real content</span>
			</ContentReveal>,
		)

		expect(screen.getByText('Loading...')).toBeInTheDocument()
	})

	it('renders children content', () => {
		renderUI(
			<ContentReveal ready={true} placeholder={<span>Loading...</span>}>
				<span>Real content</span>
			</ContentReveal>,
		)

		expect(screen.getByText('Real content')).toBeInTheDocument()
	})

	it('applies custom className in crossfade mode', () => {
		const { container } = renderUI(
			<ContentReveal ready={false} placeholder={<span>P</span>} className="custom">
				<span>C</span>
			</ContentReveal>,
		)

		expect(container.firstElementChild?.className).toContain('custom')
	})

	it('renders both elements in crossfade mode', () => {
		renderUI(
			<ContentReveal ready={false} placeholder={<span>Placeholder</span>}>
				<span>Children</span>
			</ContentReveal>,
		)

		expect(screen.getByText('Placeholder')).toBeInTheDocument()

		expect(screen.getByText('Children')).toBeInTheDocument()
	})

	it('sets aria-hidden on placeholder when ready', () => {
		renderUI(
			<ContentReveal ready={true} placeholder={<span>P</span>}>
				<span>C</span>
			</ContentReveal>,
		)

		const placeholder = screen.getByText('P').parentElement

		expect(placeholder).toHaveAttribute('aria-hidden', 'true')
	})

	it('renders in wait mode', () => {
		renderUI(
			<ContentReveal ready={true} placeholder={<span>P</span>} mode="wait">
				<span>C</span>
			</ContentReveal>,
		)

		expect(screen.getByText('C')).toBeInTheDocument()
	})
})
