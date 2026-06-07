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
